'use strict'

// Zustand aller Claude-Code-Sitzungen, gespeist aus den HTTP-Hooks und dem
// Polling des Mods. Rein (kein Electron, kein Netz), damit es testbar bleibt.

const { EventEmitter } = require('node:events')
const { randomUUID } = require('node:crypto')

const STATUS_RANK = { waiting: 4, problem: 3, working: 2, done: 1, idle: 0 }
const MAX_STEPS = 8
const FAIL_STREAK_PROBLEM = 3
const DONE_DECAY_MS = 10 * 60 * 1000
const MOD_ONLINE_MS = 5000
const MOD_GONE_MS = 2 * 60 * 1000
const MODEL_FAMILIES = ['opus', 'sonnet', 'haiku']
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max']
const WAITING_NOTIFICATIONS = new Set([
  'permission_prompt',
  'elicitation_dialog',
  'elicitation_url_dialog',
  'agent_needs_input',
])

function modelFamily(model) {
  if (typeof model !== 'string') return null
  const match = /opus|sonnet|haiku/i.exec(model)
  return match ? match[0].toLowerCase() : null
}

function baseName(dir) {
  if (typeof dir !== 'string' || !dir) return null
  return dir.split(/[\\/]+/).filter(Boolean).pop() || dir
}

function clip(text, max) {
  if (typeof text !== 'string') return ''
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

function shortPath(file) {
  if (typeof file !== 'string') return ''
  const parts = file.split(/[\\/]+/).filter(Boolean)
  return parts.length > 2 ? `…/${parts.slice(-2).join('/')}` : file
}

// Die Vault-Werkzeuge des Mods unter verständlichen Namen.
const VAULT_TOOLS = {
  vault_write: 'Notiz schreiben',
  vault_read: 'Notiz lesen',
  vault_search: 'Vault-Suche',
  vault_list: 'Vault-Liste',
}
const WRITE_MODE_LABEL = { create: 'neu anlegen', replace: 'ersetzen', append: 'anhängen' }

// Anzeigename eines Werkzeugs: MCP-Präfix ab, Vault-Werkzeuge auf Deutsch.
function toolLabel(tool) {
  if (typeof tool !== 'string' || !tool) return 'Werkzeug'
  const short = tool.startsWith('mcp__') ? tool.split('__').slice(-1)[0] : tool
  return VAULT_TOOLS[short] || short
}

// Eine Zeile, die beschreibt, was ein Werkzeugaufruf tut.
function describeTool(tool, input) {
  const i = input && typeof input === 'object' ? input : {}
  if (typeof i.command === 'string') return clip(i.command, 90)
  if (typeof i.file_path === 'string') return shortPath(i.file_path)
  if (typeof i.notebook_path === 'string') return shortPath(i.notebook_path)
  if (typeof i.path === 'string') return clip(i.path, 90)
  if (typeof i.pattern === 'string') return clip(i.pattern, 90)
  if (typeof i.url === 'string') return clip(i.url, 90)
  if (typeof i.query === 'string') return clip(i.query, 90)
  if (typeof i.description === 'string') return clip(i.description, 90)
  if (typeof i.prompt === 'string') return clip(i.prompt, 90)
  const firstString = Object.values(i).find((v) => typeof v === 'string')
  return firstString ? clip(firstString, 90) : tool || ''
}

// Der ausführliche Text für die Freigabekarte.
function approvalDetail(tool, input) {
  const i = input && typeof input === 'object' ? input : {}
  if (typeof i.command === 'string') return i.command.slice(0, 2000)
  if (toolLabel(tool) === VAULT_TOOLS.vault_write && typeof i.path === 'string') {
    const preview = typeof i.content === 'string' ? i.content.split('\n').slice(0, 12).join('\n').slice(0, 1500) : ''
    const mode = WRITE_MODE_LABEL[i.mode] || WRITE_MODE_LABEL.create
    return `${i.path} (${mode})${preview ? `\n\n${preview}` : ''}`
  }
  if (typeof i.file_path === 'string') {
    const body = typeof i.new_string === 'string' ? i.new_string : typeof i.content === 'string' ? i.content : ''
    const preview = body.split('\n').slice(0, 8).join('\n')
    return preview ? `${i.file_path}\n\n${preview.slice(0, 1200)}` : i.file_path
  }
  if (typeof i.url === 'string') return i.url
  try {
    return JSON.stringify(i, null, 2).slice(0, 2000)
  } catch {
    return String(tool)
  }
}

class SessionStore extends EventEmitter {
  constructor({ now = Date.now, modelIds = {} } = {}) {
    super()
    // Vom Hauptprozess gesetzt: der verbundene Vault und der Schreibmodus.
    this.vaultInfo = null
    this.vaultActivity = []
    this.now = now
    this.modelIds = modelIds
    this.sessions = new Map()
    this.approvals = new Map()
  }

  ensure(id, payload = {}, { touch = true } = {}) {
    let s = this.sessions.get(id)
    if (!s) {
      s = {
        id,
        cwd: null,
        title: null,
        status: 'idle',
        prompt: '',
        steps: [],
        failStreak: 0,
        problem: null,
        lastMessage: '',
        notice: '',
        model: null,
        effort: null,
        desiredModel: null,
        desiredEffort: null,
        hints: [],
        lastPollAt: 0,
        createdAt: this.now(),
        updatedAt: this.now(),
        statusAt: this.now(),
      }
      this.sessions.set(id, s)
    }
    if (typeof payload.cwd === 'string' && payload.cwd) s.cwd = payload.cwd
    if (typeof payload.session_title === 'string' && payload.session_title.trim()) s.title = payload.session_title.trim()
    if (payload.effort && typeof payload.effort.level === 'string') s.effort = payload.effort.level
    if (touch) s.updatedAt = this.now()
    return s
  }

  setStatus(s, status) {
    if (s.status !== status) {
      s.status = status
      s.statusAt = this.now()
      if (status === 'done') this.emit('signal', { type: 'done', sessionId: s.id })
      if (status === 'problem') this.emit('signal', { type: 'problem', sessionId: s.id })
    }
  }

  changed() {
    this.emit('change')
  }

  // Ein Ereignis aus einem HTTP-Hook (außer PermissionRequest).
  handleHook(event, payload) {
    if (!payload || typeof payload.session_id !== 'string' || !payload.session_id) return false
    const id = payload.session_id
    if (event === 'SessionEnd') {
      this.removeSession(id)
      return true
    }
    const s = this.ensure(id, payload)
    switch (event) {
      case 'SessionStart':
        if (typeof payload.model === 'string') s.model = payload.model
        if (payload.source === 'clear' || payload.source === 'startup') {
          s.steps = []
          s.prompt = ''
          s.lastMessage = ''
          s.problem = null
          s.failStreak = 0
          this.setStatus(s, 'idle')
        }
        break
      case 'UserPromptSubmit':
        s.prompt = clip(payload.prompt, 240)
        s.steps = []
        s.problem = null
        s.failStreak = 0
        s.notice = ''
        this.setStatus(s, 'working')
        break
      case 'PostToolUse':
        this.pushStep(s, payload, true)
        s.failStreak = 0
        if (s.problem && s.problem.kind === 'tools') s.problem = null
        s.notice = ''
        this.setStatus(s, 'working')
        break
      case 'PostToolUseFailure': {
        this.pushStep(s, payload, false)
        if (payload.is_interrupt) break
        s.failStreak += 1
        if (s.failStreak >= FAIL_STREAK_PROBLEM) {
          s.problem = {
            kind: 'tools',
            title: `${s.failStreak} Fehlschläge in Folge`,
            detail: clip(payload.error, 600),
          }
          this.setStatus(s, 'problem')
        } else if (s.status !== 'problem') {
          this.setStatus(s, 'working')
        }
        break
      }
      case 'Notification': {
        const type = payload.notification_type
        if (WAITING_NOTIFICATIONS.has(type)) {
          s.notice = clip(payload.message, 200)
          this.setStatus(s, 'waiting')
        } else if (type === 'idle_prompt' && s.status !== 'problem' && s.status !== 'idle') {
          this.setStatus(s, 'done')
        }
        break
      }
      case 'Stop':
        s.lastMessage = typeof payload.last_assistant_message === 'string' ? payload.last_assistant_message.slice(0, 2000) : s.lastMessage
        s.notice = ''
        if (s.status !== 'problem' || (s.problem && s.problem.kind === 'tools')) {
          s.problem = null
          this.setStatus(s, 'done')
        }
        break
      case 'StopFailure':
        s.problem = {
          kind: 'api',
          title: payload.error ? `API-Fehler: ${payload.error}` : 'API-Fehler',
          detail: clip(payload.error_details || payload.last_assistant_message || '', 600),
        }
        s.notice = ''
        this.setStatus(s, 'problem')
        break
      default:
        return false
    }
    this.changed()
    return true
  }

  pushStep(s, payload, ok) {
    const tool = typeof payload.tool_name === 'string' ? payload.tool_name : 'Werkzeug'
    s.steps.push({
      id: payload.tool_use_id || randomUUID(),
      tool: toolLabel(tool),
      text: describeTool(tool, payload.tool_input),
      ok,
      error: ok ? '' : clip(payload.error, 200),
      at: this.now(),
    })
    if (s.steps.length > MAX_STEPS) s.steps.splice(0, s.steps.length - MAX_STEPS)
  }

  // Eine offene Freigabe; `respond` wird genau einmal mit der Antwort aufgerufen.
  addApproval(payload, respond) {
    if (!payload || typeof payload.session_id !== 'string') return null
    const s = this.ensure(payload.session_id, payload)
    const id = randomUUID()
    const input = payload.tool_input
    this.approvals.set(id, {
      id,
      sessionId: s.id,
      tool: toolLabel(payload.tool_name),
      summary: typeof input?.description === 'string' ? clip(input.description, 160) : describeTool(payload.tool_name, input),
      detail: approvalDetail(payload.tool_name, input),
      agent: typeof payload.agent_type === 'string' ? payload.agent_type : null,
      createdAt: this.now(),
      respond,
    })
    this.emit('signal', { type: 'approval', sessionId: s.id, approvalId: id })
    this.changed()
    return id
  }

  decide(approvalId, behavior) {
    const a = this.approvals.get(approvalId)
    if (!a || (behavior !== 'allow' && behavior !== 'deny')) return false
    this.approvals.delete(approvalId)
    const s = this.sessions.get(a.sessionId)
    if (s) {
      s.notice = ''
      if (s.status === 'waiting') this.setStatus(s, 'working')
    }
    a.respond(behavior)
    this.changed()
    return true
  }

  // Die Anfrage ist ohne Entscheidung weg (Timeout, im Dialog beantwortet).
  dropApproval(approvalId) {
    const a = this.approvals.get(approvalId)
    if (!a) return false
    this.approvals.delete(approvalId)
    this.changed()
    return true
  }

  removeSession(id) {
    for (const a of [...this.approvals.values()]) if (a.sessionId === id) this.approvals.delete(a.id)
    const had = this.sessions.delete(id)
    if (had) this.changed()
    return had
  }

  queueHint(sessionId, text) {
    const s = this.sessions.get(sessionId)
    const clean = typeof text === 'string' ? text.trim() : ''
    if (!s || !clean) return false
    s.hints.push(clean.slice(0, 8000))
    s.notice = 'Hinweis wird gesendet …'
    this.changed()
    return true
  }

  setDesired(sessionId, { model, effort } = {}) {
    const s = this.sessions.get(sessionId)
    if (!s) return false
    if (model !== undefined) s.desiredModel = MODEL_FAMILIES.includes(model) ? model : null
    if (effort !== undefined) s.desiredEffort = EFFORTS.includes(effort) ? effort : null
    this.changed()
    return true
  }

  // Der Mod meldet sich: was er tatsächlich schickt, und holt Wünsche + Hinweise ab.
  modPoll(payload) {
    if (!payload || typeof payload.session_id !== 'string' || !payload.session_id) return null
    const s = this.ensure(payload.session_id, { cwd: payload.cwd }, { touch: false })
    const wasOffline = this.now() - s.lastPollAt > MOD_ONLINE_MS
    s.lastPollAt = this.now()
    let dirty = wasOffline
    if (typeof payload.model === 'string' && payload.model !== s.model) {
      s.model = payload.model
      dirty = true
    }
    if ((typeof payload.effort === 'string' || typeof payload.effort === 'number') && payload.effort !== s.effort) {
      s.effort = payload.effort
      dirty = true
    }
    const hints = s.hints.splice(0)
    if (hints.length) {
      s.notice = ''
      dirty = true
    }
    if (dirty) this.changed()
    return {
      model: s.desiredModel ? this.modelIds[s.desiredModel] || s.desiredModel : null,
      effort: s.desiredEffort,
      hints,
      vault: this.vaultInfo ? { name: this.vaultInfo.name, writeMode: this.vaultInfo.writeMode } : null,
    }
  }

  setVaultInfo(info) {
    this.vaultInfo = info ? { name: String(info.name), writeMode: info.writeMode === 'free' ? 'free' : 'ask' } : null
  }

  // Was Claude im Vault getan hat, neueste zuerst; fürs Widget.
  recordVaultActivity({ sessionId, op, path = '', query = '' }) {
    const s = typeof sessionId === 'string' ? this.sessions.get(sessionId) : null
    const entry = {
      id: randomUUID(),
      op,
      path: typeof path === 'string' ? path : '',
      query: typeof query === 'string' ? clip(query, 80) : '',
      session: s ? s.title || baseName(s.cwd) || s.id.slice(0, 8) : null,
      at: this.now(),
    }
    this.vaultActivity.unshift(entry)
    if (this.vaultActivity.length > 20) this.vaultActivity.length = 20
    this.emit('vault-activity', entry)
    return entry
  }

  // Regelmäßig aufrufen: „Fertig“ verblasst zu „Ruhig“, verschwundene Sitzungen gehen.
  tick() {
    const now = this.now()
    let dirty = false
    for (const s of [...this.sessions.values()]) {
      const hasApproval = [...this.approvals.values()].some((a) => a.sessionId === s.id)
      if (s.lastPollAt && now - s.lastPollAt > MOD_GONE_MS && !hasApproval) {
        this.sessions.delete(s.id)
        dirty = true
        continue
      }
      if (s.status === 'done' && now - s.statusAt > DONE_DECAY_MS) {
        this.setStatus(s, 'idle')
        dirty = true
      }
      if (s.lastPollAt && now - s.lastPollAt > MOD_ONLINE_MS && now - s.lastPollAt < MOD_ONLINE_MS + 3000) dirty = true
    }
    if (dirty) this.changed()
  }

  statusOf(s) {
    for (const a of this.approvals.values()) if (a.sessionId === s.id) return 'waiting'
    return s.status
  }

  snapshot() {
    const now = this.now()
    const sessions = [...this.sessions.values()].map((s) => {
      const approvals = [...this.approvals.values()]
        .filter((a) => a.sessionId === s.id)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(({ respond, ...rest }) => rest)
      return {
        id: s.id,
        name: s.title || baseName(s.cwd) || s.id.slice(0, 8),
        cwd: s.cwd,
        status: this.statusOf(s),
        prompt: s.prompt,
        steps: s.steps.map((step) => ({ ...step })),
        approvals,
        problem: s.problem ? { ...s.problem } : null,
        lastMessage: s.lastMessage,
        notice: s.notice,
        model: s.model,
        modelFamily: modelFamily(s.model),
        effort: s.effort,
        desiredModel: s.desiredModel,
        desiredEffort: s.desiredEffort,
        pendingHints: s.hints.length,
        modConnected: s.lastPollAt > 0 && now - s.lastPollAt <= MOD_ONLINE_MS,
        updatedAt: s.updatedAt,
        statusAt: s.statusAt,
      }
    })
    sessions.sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status] || b.updatedAt - a.updatedAt)
    const counts = { waiting: 0, problem: 0, working: 0, done: 0, idle: 0 }
    for (const s of sessions) counts[s.status] += 1
    const overall = sessions.length ? sessions[0].status : 'idle'
    return { sessions, counts, overall }
  }
}

module.exports = { SessionStore, modelFamily, describeTool, toolLabel, STATUS_RANK, EFFORTS, MODEL_FAMILIES }
