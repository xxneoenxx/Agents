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
    ui: { expanded: false, pinned: false, sound: true, scale: 1, figureMode: 'head', tall: false },
    server: { listening: false, error: null, port: null },
    plugin: { state: 'checking', busy: false, message: '', outdated: false },
    update: { mode: 'dev', phase: 'idle', version: null, percent: 0 },
  }
  let selectedId = null
  let closing = false
  const drafts = new Map()
  // Was die Karte bei „Arbeitet“ zeigt: die Schritte oder den Verlauf (je Sitzung).
  const views = new Map()
  // Der Textblock unter dem letzten Rechtsklick (für „Ganze Nachricht markieren“).
  let menuBlock = null
  const painted = { chips: '', card: '', compose: '', foot: '', stage: '' }

  const esc = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

  const selected = () => state.sessions.find((s) => s.id === selectedId) || state.sessions[0] || null

  // ---------- Zeichnen ----------

  function render() {
    island.dataset.mood = state.overall
    island.dataset.expanded = String(Boolean(state.ui.expanded))
    island.dataset.closing = String(closing)
    island.dataset.figure = state.ui.figureMode === 'full' ? 'full' : 'head'

    const top = state.sessions[0]
    byId('pill-status').textContent = MOOD[state.overall]
    byId('pill-name').textContent = top ? top.name : 'Keine Sitzung'
    byId('pill-count').textContent = String(state.sessions.length)

    byId('btn-pin').setAttribute('aria-pressed', String(Boolean(state.ui.pinned)))
    byId('btn-pin').title = state.ui.pinned ? 'Angepinnt – bleibt offen' : 'Anpinnen'
    byId('btn-sound').setAttribute('aria-pressed', String(Boolean(state.ui.sound)))
    byId('btn-sound').title = state.ui.sound ? 'Ton an' : 'Ton aus'
    const full = island.dataset.figure === 'full'
    byId('btn-figure').setAttribute('aria-pressed', String(full))
    byId('btn-figure').title = full ? 'Pille zeigt den ganzen Mini-Claude – umschalten auf nur Kopf' : 'Pille zeigt nur den Kopf – umschalten auf ganzen Mini-Claude'
    byId('btn-tall').setAttribute('aria-pressed', String(Boolean(state.ui.tall)))
    byId('btn-tall').title = state.ui.tall ? 'Wieder normal hoch' : 'Größer – mehr Platz zum Lesen'
    byId('summary').innerHTML = summary()

    // selectedId bleibt stehen, auch wenn die Sitzung noch nicht im Zustand ist
    // (eine neue Freigabe wählt ihre Sitzung, bevor deren Zustand eintrifft).
    const current = selected()
    const currentId = current ? current.id : null
    paint('stage', byId('stage'), stageModel(current), renderStage)
    paint('chips', byId('chips'), state.sessions.map((s) => [s.id, s.name, s.status, s.id === currentId]), renderChips)
    // Erst das Eingabefeld: die Karte misst ihre Scrollboxen mit seiner Höhe.
    paint('compose', byId('card-compose'), composeModel(current), renderCompose)
    paint('card', byId('card-body'), cardModel(current), renderCard)
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
      // Ohne Sitzungen erklärt der Plugin-Zustand, warum nichts ankommt; mit
      // Sitzungen zählt nur noch, ob ein Update bereitsteht.
      plugin: state.sessions.length ? 'active' : state.plugin.state,
      outdated: state.plugin.state === 'active' && Boolean(state.plugin.outdated),
      busy: Boolean(state.plugin.busy),
      mod: current ? current.modConnected : null,
      update: { phase: state.update.phase, version: state.update.version, percent: state.update.percent },
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
    const update = m.outdated
      ? `<button class="conn conn--action" type="button" data-act="update-plugin" data-ok="false"${m.busy ? ' disabled' : ''}>${m.busy ? 'Aktualisiere …' : 'Plugin aktualisieren'}</button>`
      : ''
    const u = m.update
    const v = esc(u.version)
    const app = {
      ready: `<button class="conn conn--action" type="button" data-act="install-update" data-ok="true" title="Version ${v} ist geladen. Klicken: installieren und neu starten.">Update · Neu starten</button>`,
      installing: '<div class="conn" data-ok="true">Update wird installiert …</div>',
      downloading: `<div class="conn" data-ok="true" title="Version ${v}">Update lädt … ${esc(u.percent)} %</div>`,
      available: `<button class="conn conn--action" type="button" data-act="open-releases" data-ok="true" title="Zur Download-Seite">Neue Version ${v}</button>`,
    }[u.phase] || ''
    byId('stage-conn').innerHTML = app + server + plugin + update + mod
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
    const base = { id: s.id, notice: s.notice, pendingHints: s.pendingHints, mod: s.modConnected, queued: s.queued || [] }
    const talk = { history: s.history || [], lastMessage: s.lastMessage }
    if (s.approvals.length) {
      const a = s.approvals[0]
      return { ...base, kind: 'approval', approval: a, total: s.approvals.length }
    }
    switch (s.status) {
      case 'problem':
        return { ...base, kind: 'problem', problem: s.problem }
      case 'working': {
        // Nur in das Modell, was gerade zu sehen ist: neue Schritte zeichnen den
        // Verlauf nicht neu (und heben keine Textauswahl darin auf).
        const view = views.get(s.id) === 'thread' ? 'thread' : 'steps'
        return view === 'thread'
          ? { ...base, ...talk, kind: 'working', view, prompt: s.prompt }
          : { ...base, kind: 'working', view, prompt: s.prompt, steps: s.steps }
      }
      case 'waiting':
        return { ...base, ...talk, kind: 'waiting' }
      case 'done':
        return { ...base, ...talk, kind: 'done', prompt: s.prompt }
      default:
        return { ...base, ...talk, kind: 'idle' }
    }
  }

  function head(status, title, meta = '', tag = TAG[status], extra = '') {
    return (
      `<div class="card__head" data-status="${status}"><span class="tag">${esc(tag)}</span>` +
      (title ? `<span class="card__title" title="${esc(title)}">${esc(title)}</span>` : '') +
      (meta ? `<span class="card__meta">${esc(meta)}</span>` : '') +
      extra +
      '</div>'
    )
  }

  // inThread: der Verlauf zeigt wartende Nachrichten schon als Blasen.
  function notice(m, inThread = false) {
    if (m.pendingHints) {
      if (inThread) return ''
      const text = m.mod ? 'Hinweis wird gesendet …' : 'Hinweis wartet – der Mod dieser Sitzung meldet sich nicht'
      return `<div class="card__notice">${esc(text)}</div>`
    }
    if (!inThread && m.queued.some((q) => q.sent)) {
      return '<div class="card__notice">Deine Nachricht geht raus, sobald Claude fertig ist.</div>'
    }
    return m.notice ? `<div class="card__notice">${esc(m.notice)}</div>` : ''
  }

  // Das Eingabefeld unter der Karte: bei Fertig, Ruhig, Rückfrage und Arbeitet.
  const PLACEHOLDER = {
    done: 'Antworten … (Enter sendet, Umschalt+Enter: neue Zeile)',
    idle: 'Anweisung an Claude … (Enter sendet)',
    waiting: 'Nachricht – geht raus, sobald Claude wieder frei ist',
    working: 'Nachricht – geht raus, sobald Claude fertig ist',
  }

  function composeModel(s) {
    if (!s || s.approvals.length || !PLACEHOLDER[s.status]) return null
    return { id: s.id, placeholder: PLACEHOLDER[s.status] }
  }

  // Mehrzeiliges Eingabefeld: Enter sendet, Umschalt+Enter macht eine neue Zeile.
  // Gleiche Sitzung: nur den Platzhalter tauschen, damit Text, Fokus, Rückgängig
  // und Eingabemethoden beim Tippen unberührt bleiben.
  function renderCompose(el, m) {
    const field = el.querySelector('.compose__field')
    if (m && field && field.dataset.draft === `${m.id}:compose`) {
      field.placeholder = m.placeholder
      return
    }
    const focus = rememberFocus(el)
    el.innerHTML = m
      ? '<div class="compose">' +
        `<textarea class="field compose__field" rows="1" data-grow data-draft="${esc(m.id)}:compose" placeholder="${esc(m.placeholder)}" maxlength="8000"></textarea>` +
        '<button class="btn btn--primary" type="button" data-act="send" title="Senden (Enter)">Senden</button></div>'
      : ''
    el.querySelectorAll('[data-draft]').forEach((f) => {
      f.value = drafts.get(f.dataset.draft) || ''
      fit(f)
    })
    restoreFocus(el, focus)
  }

  const clock = (at) => new Date(at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

  function bubble({ mine, who, when, text, anchor = false, pending = false, event = false }) {
    const kind = event ? 'bubble--event' : mine ? 'bubble--user' : 'bubble--claude'
    const cls = ['bubble', kind, pending ? 'is-pending' : ''].filter(Boolean).join(' ')
    return (
      `<div class="${cls}"${anchor ? ' data-anchor' : ''}>` +
      `<div class="bubble__who">${esc(who)}${when ? ` · ${esc(when)}` : ''}</div>` +
      `<div class="bubble__text">${esc(text)}</div></div>`
    )
  }

  // Der Gesprächsverlauf: deine Prompts rechts, Claudes Antworten links, Neuestes unten.
  function thread(m) {
    let entries = m.history
    // Sitzungen, die vor dem Start der Insel liefen, kennen nur die letzte Antwort.
    if (!entries.length && m.lastMessage) entries = [{ role: 'assistant', text: m.lastMessage, at: 0 }]
    if (!entries.length && !m.queued.length) return ''
    const lastClaude = entries.map((e) => e.role).lastIndexOf('assistant')
    const html = entries.map((e, i) =>
      e.role === 'event'
        ? bubble({ mine: false, event: true, who: 'Meldung an Claude', when: e.at ? clock(e.at) : '', text: e.text })
        : bubble({
            mine: e.role === 'user',
            who: e.role === 'user' ? 'Du' : 'Claude',
            when: e.at ? clock(e.at) : '',
            text: e.text,
            anchor: i === lastClaude,
          }),
    )
    for (const q of m.queued) {
      const when = q.sent ? 'geht raus, sobald Claude frei ist' : m.mod ? 'wird gesendet …' : 'wartet – der Mod meldet sich nicht'
      html.push(bubble({ mine: true, who: 'Du', when, text: q.text, pending: true }))
    }
    const last = entries[entries.length - 1]
    const sig = `${entries.length}:${last ? last.at : 0}:${m.queued.length}`
    return `<div class="thread" data-scroll="thread" data-sig="${sig}" tabindex="-1">${html.join('')}</div>`
  }

  function stepsList(steps) {
    if (!steps.length) return '<div class="thinking"><span></span><span></span><span></span>Denkt nach …</div>'
    return (
      '<ol class="steps" data-scroll="steps">' +
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
    )
  }

  function renderCard(el, m) {
    const focus = rememberFocus(el)
    const scroll = rememberScroll(el)
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
          `<pre class="code" data-scroll="code:${esc(a.id)}">${esc(a.detail)}</pre>` +
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
          `<textarea class="field" data-draft="${esc(m.id)}:hint" placeholder="Hinweis an Claude, z. B. „Nimm npm ci statt npm install“ (Enter sendet)" maxlength="8000"></textarea>` +
          notice(m) +
          '<div class="actions">' +
          '<button class="btn btn--ghost" type="button" data-act="retry">Erneut versuchen</button>' +
          '<button class="btn btn--primary" type="button" data-act="hint">Hinweis geben</button>' +
          '</div>'
        break
      }
      case 'working': {
        const inThread = m.view === 'thread'
        const count = inThread ? 0 : m.steps.length
        const toggle = `<button class="card__switch" type="button" data-act="view">${inThread ? 'Schritte' : 'Verlauf'}</button>`
        html =
          head('working', m.prompt || 'Arbeitet', count ? `${count} ${count === 1 ? 'Schritt' : 'Schritte'}` : '', TAG.working, toggle) +
          (inThread ? thread(m) || '<div class="empty"><span>Noch kein Verlauf.</span></div>' : stepsList(m.steps)) +
          notice(m, inThread)
        break
      }
      case 'waiting': {
        const talk = thread(m)
        html =
          head('waiting', 'Claude braucht dich', '', 'Rückfrage') +
          `<p class="card__lead">${esc(m.notice || 'Eine Rückfrage wartet auf deine Antwort.')}</p>` +
          '<p class="card__muted">Die Rückfrage selbst beantwortest du im Code-Tab der Claude-App.</p>' +
          talk +
          notice({ ...m, notice: '' }, Boolean(talk))
        break
      }
      case 'done': {
        const talk = thread(m)
        html =
          head('done', m.prompt) +
          (talk || '<div class="message">Fertig. Bereit für die nächste Anweisung.</div>') +
          notice(m, Boolean(talk))
        break
      }
      default: {
        const talk = thread(m)
        html =
          head('idle', '') +
          (talk || '<div class="empty"><span>Schläft. Schick eine Anweisung, um die Sitzung zu wecken.</span></div>') +
          notice(m, Boolean(talk))
      }
    }
    el.innerHTML = html
    el.querySelectorAll('[data-draft]').forEach((field) => {
      field.value = drafts.get(field.dataset.draft) || ''
      fit(field)
    })
    restoreFocus(el, focus)
    restoreScroll(el, scroll, m.id)
  }

  // Scrollpositionen überleben das Neuzeichnen. Neue Nachrichten und Schritte
  // scrollen mit, außer man liest gerade weiter oben.
  function rememberScroll(el) {
    const boxes = {}
    el.querySelectorAll('[data-scroll]').forEach((box) => {
      boxes[box.dataset.scroll] = {
        top: box.scrollTop,
        atEnd: box.scrollHeight - box.scrollTop - box.clientHeight < 24,
        sig: box.dataset.sig,
        pending: box.querySelectorAll('.is-pending').length,
      }
    })
    return { session: el.dataset.session, boxes }
  }

  function restoreScroll(el, saved, session) {
    el.dataset.session = session || ''
    const same = saved.session === el.dataset.session
    el.querySelectorAll('[data-scroll]').forEach((box) => {
      const key = box.dataset.scroll
      const prev = same ? saved.boxes[key] : null
      if (!prev) box.scrollTop = initialScroll(box)
      else if (key === 'thread' && prev.sig !== box.dataset.sig) {
        // Selbst geschrieben: die eigene Nachricht zeigen. Sonst nur mitgehen, wer unten war.
        if (box.querySelectorAll('.is-pending').length > prev.pending) box.scrollTop = box.scrollHeight
        else box.scrollTop = prev.atEnd ? threadStart(box) : prev.top
      } else if (key === 'steps' && prev.atEnd) box.scrollTop = box.scrollHeight
      else box.scrollTop = prev.top
    })
  }

  // Frisch geöffnet: Verlauf am Anfang der neuesten Antwort, Schritte unten, sonst oben.
  function initialScroll(box) {
    const key = box.dataset.scroll
    if (key === 'thread') return threadStart(box)
    if (key === 'steps') return box.scrollHeight
    return 0
  }

  // Zugeklappt hat nichts eine Höhe; beim Aufklappen deshalb neu ausrichten.
  function resetScroll() {
    byId('card').querySelectorAll('[data-scroll]').forEach((box) => {
      box.scrollTop = initialScroll(box)
    })
  }

  // Wohin der Verlauf beim Öffnen scrollt: an den Anfang der neuesten Antwort,
  // damit man sie von oben lesen kann; ist sie kurz (oder folgt noch etwas), ganz nach unten.
  function threadStart(box) {
    const end = box.scrollHeight - box.clientHeight
    const anchor = box.querySelector('[data-anchor]')
    if (!anchor || anchor.nextElementSibling) return end
    return Math.max(0, Math.min(end, anchor.offsetTop - 8))
  }

  // Das Eingabefeld wächst mit dem Text, bis etwa fünf Zeilen.
  function fit(field) {
    if (!field.hasAttribute('data-grow')) return
    field.style.height = 'auto'
    field.style.height = `${Math.min(field.scrollHeight + 2, 120)}px`
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
    if (p.state === 'active' && p.outdated) {
      parts.push('<span class="empty__note">Eine neue Plugin-Version ist bereit.</span>')
    }
    if (p.message) parts.push(`<span class="empty__note">${esc(p.message)}</span>`)
    parts.push('</div>')
    if (p.state === 'active' && p.outdated) {
      parts.push(
        `<div class="actions"><button class="btn btn--primary" type="button" data-act="update-plugin"${p.busy ? ' disabled' : ''}>` +
          `${p.busy ? 'Aktualisiere …' : 'Plugin aktualisieren'}</button></div>`,
      )
    } else if (p.state !== 'active' && p.state !== 'checking') {
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
    fit(field)
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
      sendHint(byId('card').querySelector('textarea[data-draft$=":hint"]'))
    } else if (act === 'activate') {
      api.activatePlugin()
    } else if (act === 'update-plugin') {
      api.updatePlugin()
    } else if (act === 'send') {
      sendHint(byId('card').querySelector('.compose__field'))
    } else if (act === 'view' && s) {
      views.set(s.id, views.get(s.id) === 'thread' ? 'steps' : 'thread')
      render()
    }
  })

  byId('card').addEventListener('input', (event) => {
    const field = event.target
    if (field.dataset.draft) {
      drafts.set(field.dataset.draft, field.value)
      // Wächst das Feld, wird der Verlauf kleiner: wer unten war, bleibt unten.
      const atEnd = [...byId('card').querySelectorAll('[data-scroll]')].filter(
        (box) => box.scrollHeight - box.scrollTop - box.clientHeight < 24,
      )
      fit(field)
      atEnd.forEach((box) => (box.scrollTop = box.scrollHeight))
    }
  })

  // Enter sendet, Umschalt+Enter macht eine neue Zeile (auch beim Hinweis-Feld).
  byId('card').addEventListener('keydown', (event) => {
    const field = event.target
    if (!field.dataset || !field.dataset.draft || event.key !== 'Enter' || event.isComposing || event.shiftKey) return
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
  byId('btn-figure').addEventListener('click', () => api.setFigureMode(state.ui.figureMode === 'full' ? 'head' : 'full'))
  byId('btn-tall').addEventListener('click', () => api.setTall(!state.ui.tall))
  byId('stage-conn').addEventListener('click', (event) => {
    const act = event.target.closest('[data-act]')?.dataset.act
    if (act === 'update-plugin') api.updatePlugin()
    if (act === 'install-update') api.installUpdate()
    if (act === 'open-releases') api.openReleases()
  })
  // Rechtsklick auf Text oder ins Eingabefeld: Kopieren/Einfügen. Sonst das App-Menü.
  window.addEventListener('contextmenu', (event) => {
    event.preventDefault()
    const field = event.target.closest('textarea, input')
    const block = event.target.closest('.bubble__text, .message, .code, .card__lead, .empty__cmd')
    // Eine Auswahl zählt nur, wenn der Klick auf dem markierten Text liegt;
    // sonst bliebe das App-Menü überall unerreichbar, solange etwas markiert ist.
    const selection = window.getSelection()
    const range = selection && selection.rangeCount && !selection.isCollapsed ? selection.getRangeAt(0) : null
    const onSelection = Boolean(
      range &&
        [...range.getClientRects()].some(
          (r) => event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom,
        ),
    )
    const selectedHere = onSelection || Boolean(block && range && selection.containsNode(block, true))
    if (field) {
      api.openEditMenu({ editable: true, selected: field.selectionStart !== field.selectionEnd })
    } else if (block || onSelection) {
      menuBlock = block
      api.openEditMenu({ editable: false, selected: selectedHere, block: block ? block.textContent : '' })
    } else {
      api.openMenu()
    }
  })
  api.onEdit((command) => {
    if (command !== 'select-block' || !menuBlock || !menuBlock.isConnected) return
    const range = document.createRange()
    range.selectNodeContents(menuBlock)
    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
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
    const opened = next.ui.expanded && !state.ui.expanded
    const moved =
      next.ui.expanded !== state.ui.expanded ||
      next.overall !== state.overall ||
      next.ui.figureMode !== state.ui.figureMode ||
      next.ui.tall !== state.ui.tall
    state = next
    render()
    if (opened) {
      // Zugeklappt hatte das Feld keine Höhe; erst einpassen, dann scrollen.
      byId('card').querySelectorAll('[data-grow]').forEach(fit)
      resetScroll()
    }
    if (moved) requestAnimationFrame(() => Mascot.refresh())
  }

  Mascot.init()
  api.onState(apply)
  api.onCursor((point) => Mascot.look(point))
  api.onSignal((signal) => chime(signal.type))
  api.onSelect((id) => {
    selectedId = id
    render()
  })
  api.onBlur(collapse)
  api.getState().then(apply)
  render()
})()
