'use strict'

;(() => {
  const api = window.island
  const byId = (id) => document.getElementById(id)
  const island = byId('island')

  const MOOD = {
    waiting: 'Wartet auf dich',
    problem: 'Hängt fest',
    working: 'Arbeitet',
    done: 'Fertig',
    idle: 'Ruhig',
  }
  const TAG = { waiting: 'Freigabe', problem: 'Problem', working: 'Arbeitet', done: 'Fertig', idle: 'Ruhig' }
  const COUNT_WORD = { waiting: 'wartet', problem: 'Problem', working: 'arbeitet', done: 'fertig', idle: 'ruhig' }
  const MODELS = [
    ['opus', 'Opus'],
    ['sonnet', 'Sonnet'],
    ['haiku', 'Haiku'],
  ]
  const EFFORTS = [
    ['low', 'Niedrig'],
    ['medium', 'Mittel'],
    ['high', 'Hoch'],
    ['xhigh', 'Sehr hoch'],
    ['max', 'Max'],
  ]

  let state = {
    sessions: [],
    counts: {},
    overall: 'idle',
    ui: { expanded: false, pinned: false, sound: true, scale: 1 },
    server: { listening: false, error: null, port: null },
    plugin: { state: 'checking', busy: false, message: '' },
  }
  let selectedId = null
  let closing = false
  const drafts = new Map()
  const painted = { chips: '', card: '', foot: '', stage: '' }

  const esc = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

  const selected = () => state.sessions.find((s) => s.id === selectedId) || state.sessions[0] || null

  // ---------- Zeichnen ----------

  function render() {
    island.dataset.mood = state.overall
    island.dataset.expanded = String(Boolean(state.ui.expanded))
    island.dataset.closing = String(closing)

    const top = state.sessions[0]
    byId('pill-status').textContent = MOOD[state.overall]
    byId('pill-name').textContent = top ? top.name : 'Keine Sitzung'
    byId('pill-count').textContent = String(state.sessions.length)

    byId('btn-pin').setAttribute('aria-pressed', String(Boolean(state.ui.pinned)))
    byId('btn-pin').title = state.ui.pinned ? 'Angepinnt – bleibt offen' : 'Anpinnen'
    byId('btn-sound').setAttribute('aria-pressed', String(Boolean(state.ui.sound)))
    byId('btn-sound').title = state.ui.sound ? 'Ton an' : 'Ton aus'
    byId('summary').innerHTML = summary()

    // selectedId bleibt stehen, auch wenn die Sitzung noch nicht im Zustand ist
    // (eine neue Freigabe wählt ihre Sitzung, bevor deren Zustand eintrifft).
    const current = selected()
    const currentId = current ? current.id : null
    paint('stage', byId('stage'), stageModel(current), renderStage)
    paint('chips', byId('chips'), state.sessions.map((s) => [s.id, s.name, s.status, s.id === currentId]), renderChips)
    paint('card', byId('card'), cardModel(current), renderCard)
    paint('foot', byId('foot'), footModel(current), renderFoot)
  }

  // Nur neu zeichnen, was sich geändert hat; Eingaben und Fokus überleben das.
  function paint(key, el, model, draw) {
    const signature = JSON.stringify(model)
    if (painted[key] === signature) return
    painted[key] = signature
    draw(el, model)
  }

  function summary() {
    const n = state.sessions.length
    if (!n) return 'Keine Sitzungen'
    const parts = ['waiting', 'problem', 'working', 'done', 'idle']
      .filter((k) => state.counts[k])
      .map((k) => `${state.counts[k]} ${COUNT_WORD[k]}`)
    return `<b>${n}</b> ${n === 1 ? 'Sitzung' : 'Sitzungen'} · ${esc(parts.join(' · '))}`
  }

  function stageModel(current) {
    const top = state.sessions[0]
    const sameMood = state.counts[state.overall] || 0
    const approvals = state.sessions.reduce((sum, s) => sum + s.approvals.length, 0)
    let sub = 'Keine Sitzung offen'
    if (top) {
      sub = sameMood > 1 ? `${top.name} und ${sameMood - 1} weitere` : top.name
      if (state.overall === 'waiting' && approvals) sub = `${approvals} ${approvals === 1 ? 'Freigabe' : 'Freigaben'} · ${sub}`
    }
    return {
      mood: MOOD[state.overall],
      sub,
      server: state.server,
      plugin: state.plugin.state,
      mod: current ? current.modConnected : null,
    }
  }

  function renderStage(el, m) {
    byId('stage-mood').textContent = m.mood
    byId('stage-sub').textContent = m.sub
    const server = m.server.listening
      ? `<div class="conn" data-ok="true">Server :${esc(m.server.port)}</div>`
      : `<div class="conn" data-ok="false">${esc(m.server.error || 'Server startet …')}</div>`
    const mod =
      m.mod === null ? '' : `<div class="conn" data-ok="${m.mod}">${m.mod ? 'Mod verbunden' : 'Mod nicht verbunden'}</div>`
    const plugin =
      m.plugin === 'active' || m.plugin === 'checking' || m.plugin === 'unknown'
        ? ''
        : `<div class="conn" data-ok="false">${m.plugin === 'no-cli' ? 'claude-CLI fehlt' : 'Plugin nicht aktiv'}</div>`
    byId('stage-conn').innerHTML = server + plugin + mod
  }

  function renderChips(el, rows) {
    el.innerHTML = rows
      .map(
        ([id, name, status, isSelected]) =>
          `<button class="chip" type="button" role="tab" data-id="${esc(id)}" data-status="${status}" aria-selected="${isSelected}" title="${esc(name)} – ${MOOD[status]}">` +
          `<span class="chip__dot"></span><span class="chip__name">${esc(name)}</span></button>`,
      )
      .join('')
    el.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }

  function cardModel(s) {
    if (!s) return { kind: 'empty', server: state.server, plugin: state.plugin }
    const base = { id: s.id, notice: s.notice, pendingHints: s.pendingHints, mod: s.modConnected }
    if (s.approvals.length) {
      const a = s.approvals[0]
      return { ...base, kind: 'approval', approval: a, total: s.approvals.length }
    }
    switch (s.status) {
      case 'problem':
        return { ...base, kind: 'problem', problem: s.problem }
      case 'working':
        return { ...base, kind: 'working', prompt: s.prompt, steps: s.steps }
      case 'waiting':
        return { ...base, kind: 'waiting' }
      case 'done':
        return { ...base, kind: 'done', prompt: s.prompt, message: s.lastMessage }
      default:
        return { ...base, kind: 'idle' }
    }
  }

  function head(status, title, meta = '', tag = TAG[status]) {
    return (
      `<div class="card__head" data-status="${status}"><span class="tag">${esc(tag)}</span>` +
      (title ? `<span class="card__title">${esc(title)}</span>` : '') +
      (meta ? `<span class="card__meta">${esc(meta)}</span>` : '') +
      '</div>'
    )
  }

  function notice(m) {
    if (m.pendingHints) {
      const text = m.mod ? 'Hinweis wird gesendet …' : 'Hinweis wartet – der Mod dieser Sitzung meldet sich nicht'
      return `<div class="card__notice">${esc(text)}</div>`
    }
    return m.notice ? `<div class="card__notice">${esc(m.notice)}</div>` : ''
  }

  function compose(m, placeholder, label) {
    return (
      `<div class="compose"><input class="field" data-draft="${esc(m.id)}:compose" placeholder="${esc(placeholder)}" maxlength="8000" />` +
      `<button class="btn btn--primary" type="button" data-act="send">${esc(label)}</button></div>`
    )
  }

  function renderCard(el, m) {
    const focus = rememberFocus(el)
    let html = ''
    switch (m.kind) {
      case 'empty':
        html = emptyCard(m)
        break
      case 'approval': {
        const a = m.approval
        const meta = [m.total > 1 ? `1 von ${m.total}` : '', a.agent ? `Agent: ${a.agent}` : ''].filter(Boolean).join(' · ')
        html =
          head('waiting', a.tool, meta) +
          (a.summary && a.summary !== a.detail ? `<p class="card__lead">${esc(a.summary)}</p>` : '') +
          `<pre class="code">${esc(a.detail)}</pre>` +
          '<div class="actions">' +
          `<button class="btn btn--ghost btn--danger" type="button" data-act="deny" data-approval="${esc(a.id)}">Ablehnen</button>` +
          `<button class="btn btn--primary" type="button" data-act="allow" data-approval="${esc(a.id)}">Freigeben</button>` +
          '</div>'
        break
      }
      case 'problem': {
        const p = m.problem || { title: 'Etwas hakt', detail: '' }
        html =
          head('problem', p.title) +
          (p.detail ? `<pre class="code code--error">${esc(p.detail)}</pre>` : '') +
          `<textarea class="field" data-draft="${esc(m.id)}:hint" placeholder="Hinweis an Claude, z. B. „Nimm npm ci statt npm install“ (Strg+Enter)" maxlength="8000"></textarea>` +
          notice(m) +
          '<div class="actions">' +
          '<button class="btn btn--ghost" type="button" data-act="retry">Erneut versuchen</button>' +
          '<button class="btn btn--primary" type="button" data-act="hint">Hinweis geben</button>' +
          '</div>'
        break
      }
      case 'working': {
        const steps = m.steps
        const list = steps.length
          ? '<ol class="steps">' +
            steps
              .map((step, i) => {
                const cls = ['step', step.ok ? '' : 'is-failed', i === steps.length - 1 && step.ok ? 'is-current' : '']
                  .filter(Boolean)
                  .join(' ')
                const title = step.ok ? step.text : `${step.text}\n${step.error}`
                return `<li class="${cls}" title="${esc(title)}"><span class="step__dot"></span><span class="step__tool">${esc(step.tool)}</span><span class="step__text">${esc(step.text)}</span></li>`
              })
              .join('') +
            '</ol>'
          : '<div class="thinking"><span></span><span></span><span></span>Denkt nach …</div>'
        html = head('working', m.prompt || 'Arbeitet', steps.length ? `${steps.length} ${steps.length === 1 ? 'Schritt' : 'Schritte'}` : '') + list + notice(m)
        break
      }
      case 'waiting':
        html =
          head('waiting', 'Claude braucht dich', '', 'Rückfrage') +
          `<p class="card__lead">${esc(m.notice || 'Eine Rückfrage wartet auf deine Antwort.')}</p>` +
          '<p class="card__muted">Antworte im Code-Tab der Claude-App.</p>'
        break
      case 'done':
        html =
          head('done', m.prompt) +
          `<div class="message">${esc(m.message || 'Fertig. Bereit für die nächste Anweisung.')}</div>` +
          notice(m) +
          compose(m, 'Nächste Anweisung …', 'Senden')
        break
      default:
        html =
          head('idle', '') +
          '<div class="empty"><span>Schläft. Schick eine Anweisung, um die Sitzung zu wecken.</span></div>' +
          notice(m) +
          compose(m, 'Anweisung an Claude …', 'Senden')
    }
    el.innerHTML = html
    el.querySelectorAll('[data-draft]').forEach((field) => {
      field.value = drafts.get(field.dataset.draft) || ''
    })
    restoreFocus(el, focus)
    const list = el.querySelector('.steps')
    if (list) list.scrollTop = list.scrollHeight
  }

  // Ohne Sitzung: sagen, warum nichts ankommt, und das Plugin aktivieren lassen.
  function emptyCard(m) {
    const p = m.plugin
    const parts = ['<div class="empty"><strong>Noch keine Sitzung</strong>']
    if (!m.server.listening) parts.push(`<span>Der lokale Server läuft nicht: ${esc(m.server.error || 'startet …')}</span>`)
    if (p.state === 'active') {
      parts.push(
        '<span>Plugin <code>island-bridge</code> ist aktiv. Starte im Code-Tab eine <b>lokale</b> Sitzung; schon offene Sitzungen einmal neu starten.</span>',
        '<span class="empty__note">Cloud-Sitzungen laufen auf Anthropic-Servern und erreichen die Insel auf deinem PC nicht.</span>',
      )
    } else if (p.state === 'no-cli') {
      parts.push(
        '<span>Zum Aktivieren braucht die Insel die <code>claude</code>-CLI. In PowerShell installieren:</span>',
        '<code class="empty__cmd">irm https://claude.ai/install.ps1 | iex</code>',
      )
    } else if (p.state === 'checking') {
      parts.push('<span>Prüfe, ob das Plugin <code>island-bridge</code> aktiv ist …</span>')
    } else {
      parts.push('<span>Damit sich Sitzungen hier melden, muss das Plugin <code>island-bridge</code> aktiv sein.</span>')
    }
    if (p.message) parts.push(`<span class="empty__note">${esc(p.message)}</span>`)
    parts.push('</div>')
    if (p.state !== 'active' && p.state !== 'checking') {
      parts.push(
        `<div class="actions"><button class="btn btn--primary" type="button" data-act="activate"${p.busy ? ' disabled' : ''}>` +
          `${p.busy ? 'Aktiviere …' : p.state === 'no-cli' ? 'Erneut prüfen' : 'Plugin aktivieren'}</button></div>`,
      )
    }
    return parts.join('')
  }

  function rememberFocus(el) {
    const active = document.activeElement
    if (!active || !el.contains(active) || !active.dataset.draft) return null
    return { key: active.dataset.draft, start: active.selectionStart, end: active.selectionEnd }
  }

  function restoreFocus(el, focus) {
    if (!focus) return
    const field = [...el.querySelectorAll('[data-draft]')].find((f) => f.dataset.draft === focus.key)
    if (!field) return
    field.focus()
    field.setSelectionRange(focus.start, focus.end)
  }

  function footModel(s) {
    if (!s) return { id: null }
    return {
      id: s.id,
      model: s.desiredModel || s.modelFamily,
      currentModel: s.modelFamily,
      effort: s.desiredEffort || (typeof s.effort === 'string' ? s.effort : null),
      currentEffort: s.effort,
      rawModel: s.model,
      mod: s.modConnected,
    }
  }

  function renderFoot(el, m) {
    const disabled = m.id ? 'false' : 'true'
    const seg = (items, key, value, current) =>
      items
        .map(
          ([v, label]) =>
            `<button class="seg__btn" type="button" data-${key}="${v}" aria-pressed="${value === v}" data-current="${current === v}">${label}</button>`,
        )
        .join('')
    const hint = m.id
      ? `Gilt für diese Sitzung ab dem nächsten Schritt${m.rawModel ? ` · läuft gerade: ${m.rawModel}` : ''}${m.mod ? '' : ' · Mod nicht verbunden'}`
      : ''
    el.innerHTML =
      `<div class="foot__group" title="${esc(hint)}"><span class="foot__label">Modell</span>` +
      `<div class="seg" role="group" aria-label="Modell" aria-disabled="${disabled}">${seg(MODELS, 'model', m.model, m.currentModel)}</div></div>` +
      `<div class="foot__group" title="${esc(hint)}"><span class="foot__label">Aufwand</span>` +
      `<div class="seg" role="group" aria-label="Aufwand" aria-disabled="${disabled}">${seg(EFFORTS, 'effort', m.effort, m.currentEffort)}</div></div>`
  }

  // ---------- Handlungen ----------

  function sendHint(field) {
    const s = selected()
    if (!s || !field) return
    const text = field.value.trim()
    if (!text) {
      field.focus()
      return
    }
    api.hint(s.id, text)
    drafts.delete(field.dataset.draft)
    field.value = ''
  }

  byId('card').addEventListener('click', (event) => {
    const button = event.target.closest('[data-act]')
    if (!button) return
    const s = selected()
    const act = button.dataset.act
    if (act === 'allow' || act === 'deny') {
      button.closest('.actions').querySelectorAll('button').forEach((b) => (b.disabled = true))
      api.decide(button.dataset.approval, act)
    } else if (act === 'retry' && s) {
      api.retry(s.id)
    } else if (act === 'hint') {
      sendHint(byId('card').querySelector('textarea[data-draft]'))
    } else if (act === 'activate') {
      api.activatePlugin()
    } else if (act === 'send') {
      sendHint(byId('card').querySelector('input[data-draft]'))
    }
  })

  byId('card').addEventListener('input', (event) => {
    const field = event.target
    if (field.dataset.draft) drafts.set(field.dataset.draft, field.value)
  })

  byId('card').addEventListener('keydown', (event) => {
    const field = event.target
    if (!field.dataset || !field.dataset.draft || event.key !== 'Enter') return
    if (field.tagName === 'TEXTAREA' && !(event.ctrlKey || event.metaKey)) return
    event.preventDefault()
    sendHint(field)
  })

  byId('chips').addEventListener('click', (event) => {
    const chip = event.target.closest('.chip')
    if (!chip) return
    selectedId = chip.dataset.id
    render()
  })

  byId('foot').addEventListener('click', (event) => {
    const button = event.target.closest('.seg__btn')
    const s = selected()
    if (!button || !s) return
    if (button.dataset.model) api.setDesired(s.id, { model: button.dataset.model })
    if (button.dataset.effort) api.setDesired(s.id, { effort: button.dataset.effort })
  })

  byId('pill').addEventListener('click', () => api.setExpanded(true))
  byId('btn-collapse').addEventListener('click', collapse)
  byId('btn-pin').addEventListener('click', () => api.setPinned(!state.ui.pinned))
  byId('btn-sound').addEventListener('click', () => api.setSound(!state.ui.sound))
  window.addEventListener('contextmenu', (event) => {
    event.preventDefault()
    api.openMenu()
  })
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.ui.expanded) collapse()
  })

  function collapse() {
    if (!state.ui.expanded || closing) return
    closing = true
    render()
    setTimeout(() => api.setExpanded(false), 140)
  }

  // ---------- Ton ----------

  let audio = null
  const CHIMES = {
    approval: [[659, 0], [880, 0.11]],
    done: [[523, 0], [659, 0.09], [784, 0.18]],
    problem: [[392, 0], [311, 0.16]],
  }

  function chime(kind) {
    if (!state.ui.sound || !CHIMES[kind]) return
    try {
      audio = audio || new AudioContext()
      const now = audio.currentTime + 0.02
      for (const [freq, at] of CHIMES[kind]) {
        const osc = audio.createOscillator()
        const gain = audio.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0, now + at)
        gain.gain.linearRampToValueAtTime(0.07, now + at + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.38)
        osc.connect(gain).connect(audio.destination)
        osc.start(now + at)
        osc.stop(now + at + 0.42)
      }
    } catch {
      // Kein Audiogerät: dann eben still.
    }
  }

  // ---------- Verdrahtung ----------

  function apply(next) {
    if (!next) return
    if (!next.ui.expanded) closing = false
    if (next.ui.expanded && !state.ui.expanded) closing = false
    state = next
    render()
  }

  Funke.init()
  api.onState(apply)
  api.onCursor((point) => Funke.look(point, state.ui.scale || 1))
  api.onSignal((signal) => chime(signal.type))
  api.onSelect((id) => {
    selectedId = id
    render()
  })
  api.onBlur(collapse)
  api.getState().then(apply)
  render()
})()
