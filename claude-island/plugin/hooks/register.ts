import type { EngineInterface, Register } from 'claude-code'

// Claude Island: holt jede Sekunde bei der Island-App ab, welches Modell und
// welcher Aufwand für diese Sitzung gewünscht sind, ob Hinweise warten und
// welcher Obsidian-Vault verbunden ist. Modell und Aufwand setzt der Mod in
// jedem Modellaufruf (turn.step), Hinweise schickt er als Prompt der Person.
// Dazu gibt er Claude vier Werkzeuge für den Vault, die über die Insel laufen.
// Läuft die App nicht, passiert nichts, und die Vault-Werkzeuge sagen das.

const ISLAND = 'http://127.0.0.1:47821'
const POLL_MS = 1000
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const
const PREFIX = 'mcp__island-bridge__'
const ISLAND_DOWN = 'Claude Island läuft nicht. Starte die Insel auf diesem PC, dann klappt der Vault-Zugriff.'

type Effort = (typeof EFFORTS)[number]
type Wish = { model: string | null; effort: Effort | null }
type Json = Record<string, unknown>

let wish: Wish = { model: null, effort: null }
let seen: { model: string | null; effort: string | number | null } = { model: null, effort: null }
let polling = false

const family = (model: string) => /opus|sonnet|haiku/i.exec(model)?.[0]?.toLowerCase() ?? model
const isEffort = (value: unknown): value is Effort => EFFORTS.includes(value as Effort)
const str = (value: unknown) => (typeof value === 'string' ? value : '')

const NOTE_RULES =
  'Paths are relative to the vault root and use "/" (e.g. "Projects/Island.md"); hidden folders like .obsidian are off limits.'

const TOOLS = [
  {
    name: 'vault_search',
    description:
      "Search the user's Obsidian vault (connected through Claude Island) by note name, path and content. " +
      'All words must match, case-insensitive. Returns note paths with a snippet. Use it to find notes before reading or writing.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Words to look for.' },
        limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Most results to return (default 10).' },
      },
      required: ['query'],
    },
  },
  {
    name: 'vault_read',
    description: `Read one note from the user's Obsidian vault. ${NOTE_RULES} ".md" may be left out.`,
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Note path relative to the vault root.' } },
      required: ['path'],
    },
  },
  {
    name: 'vault_list',
    description: `List the subfolders and notes of one folder in the user's Obsidian vault (default: the vault root). ${NOTE_RULES}`,
    inputSchema: {
      type: 'object',
      properties: { folder: { type: 'string', description: 'Folder relative to the vault root; empty for the root.' } },
    },
  },
  {
    name: 'vault_write',
    description:
      `Create or change a note in the user's Obsidian vault. ${NOTE_RULES} ".md" is added if missing. ` +
      'mode "create" (default) fails if the note exists, "append" adds to its end, "replace" overwrites it. ' +
      'Write Obsidian Markdown: [[wikilinks]] to other notes, #tags, optional YAML frontmatter. ' +
      'Depending on a switch in Claude Island the user approves each write there; a refusal means nothing was written.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Note path relative to the vault root.' },
        content: { type: 'string', description: 'Markdown to write.' },
        mode: { type: 'string', enum: ['create', 'append', 'replace'] },
      },
      required: ['path', 'content'],
    },
  },
] as const

type ToolName = (typeof TOOLS)[number]['name']

// Ein Vault-Aufruf an die Insel; Fehler als Text, den Claude versteht.
async function island($: EngineInterface, op: string, input: Json): Promise<{ ok: true; data: Json } | { ok: false; message: string }> {
  let res
  try {
    res = await $.http.fetch(`${ISLAND}/vault/${op}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...input, session_id: await $.session.id() }),
    })
  } catch {
    return { ok: false, message: ISLAND_DOWN }
  }
  let data: Json | null = null
  try {
    data = JSON.parse(res.text) as Json
  } catch {
    data = null
  }
  if (!res.ok || !data) return { ok: false, message: str(data?.message) || `Claude Island antwortete mit ${res.status}.` }
  return { ok: true, data }
}

// Was Claude als Ergebnis liest.
function answerText(tool: ToolName, data: Json, input: Json): string {
  switch (tool) {
    case 'vault_search': {
      const results = Array.isArray(data.results) ? (data.results as Json[]) : []
      if (!results.length) return `Keine Treffer für „${str(input.query)}“.`
      const lines = results.map((r) => `- ${str(r.path)}${r.snippet ? ` — ${str(r.snippet)}` : ''}`)
      return `${results.length} Treffer:\n${lines.join('\n')}${data.partial ? '\n(Suche abgebrochen, es kann weitere Treffer geben.)' : ''}`
    }
    case 'vault_read':
      return `Notiz: ${str(data.path)} (geändert ${str(data.modified)})\n---\n${str(data.content)}`
    case 'vault_list': {
      const folders = Array.isArray(data.folders) ? (data.folders as string[]) : []
      const notes = Array.isArray(data.notes) ? (data.notes as Json[]) : []
      return [
        `Ordner: ${str(data.folder) || '(Vault-Wurzel)'}`,
        `Unterordner: ${folders.length ? folders.join(', ') : '–'}`,
        `Notizen (${notes.length}):`,
        ...notes.map((n) => `- ${str(n.path)}`),
      ].join('\n')
    }
    case 'vault_write':
      return `${data.created ? 'Notiz angelegt' : 'Notiz aktualisiert'}: ${str(data.path)} (${Number(data.bytes) || 0} Bytes)`
  }
}

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    // Die Werkzeuge stehen ab dem ersten Prompt in Claudes Liste.
    await Promise.all(
      TOOLS.map(({ name, description, inputSchema }) =>
        $.tool.register({ name, description, inputSchema: inputSchema as unknown as Json, isDeferred: false }).catch(() => undefined),
      ),
    )
    $.clock.every(POLL_MS, async () => {
      if (polling) return
      polling = true
      try {
        const session_id = await $.session.id()
        const res = await $.http.fetch(`${ISLAND}/mod/poll`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ session_id, cwd: e.cwd, model: seen.model, effort: seen.effort }),
        })
        if (!res.ok) return
        const answer = JSON.parse(res.text) as { model?: unknown; effort?: unknown; hints?: unknown }
        wish = {
          model: typeof answer.model === 'string' && answer.model ? answer.model : null,
          effort: isEffort(answer.effort) ? answer.effort : null,
        }
        const hints = Array.isArray(answer.hints) ? answer.hints : []
        for (const text of hints) {
          if (typeof text !== 'string' || !text.trim()) continue
          // Nicht warten: der Prompt startet erst, wenn die Sitzung frei ist.
          $.prompt.submit({ text, asUser: true }).catch(() => {
            $.ui.toast('Claude Island: Hinweis konnte nicht gesendet werden.')
          })
        }
      } catch {
        // App läuft nicht oder antwortet nicht: still weiter versuchen.
      } finally {
        polling = false
      }
    })
    return next(e)
  })

  for (const { name } of TOOLS) {
    on('tool.call', { tool: `${PREFIX}${name}` }, async ($, e) => {
      const input = e as unknown as Json
      const { tool: _tool, tool_use_id: _id, consent: _consent, agentId: _agent, ...args } = input
      const call = await island($, name.slice('vault_'.length), args)
      if (!call.ok) return { deny: call.message }
      return { result: answerText(name, call.data, args) }
    }).catch(() => ({ deny: 'Claude Island: Der Vault-Aufruf ist fehlgeschlagen.' }))

    // Claude Code fragt hier nicht nach: Lesen ist harmlos, und Schreiben hält
    // die Insel im Modus „Fragen“ selbst an, bis dort entschieden ist. So gibt
    // es eine Rückfrage statt zwei, in jedem Berechtigungsmodus. Eine Regel
    // oder ein Modus, der ablehnt, bleibt bei Ablehnung.
    on('tool.check', { tool: `${PREFIX}${name}` }, async ($, e, next) => {
      const verdict = await next(e)
      return verdict.decision === 'deny' ? verdict : { decision: 'allow', reason: 'Claude Island: Vault-Zugriff über die Insel.' }
    })
  }

  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined) return yield* next(e)
    // Eine andere Version derselben Familie (etwa mit [1m]) bleibt, wie sie ist.
    const model = wish.model && family(wish.model) !== family(e.model) ? wish.model : e.model
    const effort = wish.effort ?? e.effort
    seen = { model, effort: effort ?? null }
    if (model === e.model && effort === e.effort) return yield* next(e)
    return yield* next({ ...e, model, effort })
  })
}
