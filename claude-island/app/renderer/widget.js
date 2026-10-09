'use strict'

// Das Vault-Widget: zeigt den verbundenen Obsidian-Vault, was Claude darin
// zuletzt gelesen oder geschrieben hat, die zuletzt geänderten Notizen und
// eine Suche. Ein Klick öffnet die Notiz in Obsidian.

;(() => {
  const api = window.vault
  const byId = (id) => document.getElementById(id)

  const ICONS = {
    write: '<path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" />',
    read: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="2.5" />',
    search: '<circle cx="11" cy="11" r="6" /><path d="M16 16l4 4" />',
    note: '<path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" />',
  }
  const OP_TEXT = { write: 'geschrieben', read: 'gelesen', search: 'gesucht' }

  let state = { vault: null, vaults: [], writeMode: 'ask', recent: [], activity: [], error: null }
  let query = ''
  let found = null
  let searchSeq = 0
  let searchTimer = null
  let searching = false

  const esc = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
  const icon = (name) => `<svg class="w-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.note}</svg>`

  function ago(ms) {
    const s = Math.max(0, (Date.now() - ms) / 1000)
    if (s < 45) return 'jetzt'
    if (s < 3600) return `${Math.round(s / 60)} Min.`
    if (s < 86400) return `${Math.round(s / 3600)} Std.`
    if (s < 172800) return 'gestern'
    return new Date(ms).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
  }

  const noteItem = (n, sub = n.folder || 'Vault-Wurzel') =>
    `<button class="w-item" type="button" data-open="${esc(n.path)}" title="${esc(n.path)} – in Obsidian öffnen">` +
    `${icon('note')}<span class="w-text"><span class="w-main">${esc(n.name)}</span><span class="w-sub">${esc(sub)}</span></span>` +
    `<span class="w-time">${esc(ago(n.mtimeMs))}</span></button>`

  function activityItem(a) {
    const main = a.op === 'search' ? `„${a.query}“` : (a.path.split('/').pop() || a.path).replace(/\.md$/i, '')
    const sub = [OP_TEXT[a.op], a.session].filter(Boolean).join(' · ')
    const open = a.op !== 'search' && a.path ? ` data-open="${esc(a.path)}"` : ''
    return (
      `<button class="w-item" type="button" data-op="${esc(a.op)}"${open} title="${esc(a.path || a.query)}">` +
      `${icon(a.op)}<span class="w-text"><span class="w-main">${esc(main)}</span><span class="w-sub">${esc(sub)}</span></span>` +
      `<span class="w-time">${esc(ago(a.at))}</span></button>`
    )
  }

  function render() {
    const v = state.vault
    byId('widget').dataset.hasVault = String(Boolean(v))
    byId('w-name').textContent = v ? v.name : 'Obsidian'
    byId('w-count').textContent = v ? `${v.count.toLocaleString('de-DE')} Notizen` : ''
    for (const b of byId('w-mode').querySelectorAll('[data-mode]')) {
      b.setAttribute('aria-pressed', String(b.dataset.mode === state.writeMode))
    }

    const list = byId('w-list')
    if (!v) {
      list.innerHTML =
        '<div class="w-empty"><strong>Kein Vault verbunden</strong>' +
        `<span>${esc(state.error || 'Claude Island hat keinen Obsidian-Vault gefunden. Wähle den Ordner deines Vaults.')}</span>` +
        '<button class="btn btn--primary" type="button" data-act="choose">Ordner wählen …</button></div>'
      return
    }
    if (query) {
      if (!found) {
        list.innerHTML = '<div class="w-note">Suche …</div>'
        return
      }
      const cut = found.partial ? '<div class="w-note">Suche aus Zeitgründen abgebrochen; es kann weitere Treffer geben.</div>' : ''
      list.innerHTML = found.results.length
        ? found.results.map((n) => noteItem(n, n.snippet || n.folder || 'Vault-Wurzel')).join('') + cut
        : `<div class="w-note">Keine Treffer für „${esc(query)}“.</div>${cut}`
      return
    }
    const parts = []
    if (state.activity.length) {
      parts.push('<div class="w-section">Claude</div>', ...state.activity.map(activityItem))
    }
    parts.push('<div class="w-section">Zuletzt geändert</div>')
    parts.push(state.recent.length ? state.recent.map((n) => noteItem(n)).join('') : '<div class="w-note">Noch keine Notizen.</div>')
    if (v.truncated) parts.push('<div class="w-note">Sehr großer Vault: nur die ersten 50 000 Notizen sind erfasst.</div>')
    list.innerHTML = parts.join('')
  }

  // Nur das Ergebnis der zuletzt gestellten Suche zählt.
  async function runSearch() {
    const seq = ++searchSeq
    const q = query
    searching = true
    let result = null
    try {
      result = q ? await api.search(q) : null
    } finally {
      if (seq === searchSeq) searching = false
    }
    if (seq !== searchSeq || q !== query) return
    found = result
    render()
  }

  byId('w-q').addEventListener('input', (event) => {
    query = event.target.value.trim()
    found = null
    searchSeq += 1
    clearTimeout(searchTimer)
    searchTimer = setTimeout(runSearch, 160)
    render()
  })
  byId('w-q').addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.target.value = ''
      query = ''
      found = null
      searchSeq += 1
      render()
    }
  })
  byId('w-list').addEventListener('click', (event) => {
    const el = event.target.closest('[data-open], [data-act]')
    if (!el) return
    if (el.dataset.act === 'choose') api.choose()
    else if (el.dataset.open) api.open(el.dataset.open)
  })
  byId('w-mode').addEventListener('click', (event) => {
    const b = event.target.closest('[data-mode]')
    if (b) api.setWriteMode(b.dataset.mode)
  })
  byId('w-switch').addEventListener('click', () => api.menu())
  byId('w-close').addEventListener('click', () => api.hide())

  function apply(next) {
    if (!next) return
    const vaultChanged = next.vault?.path !== state.vault?.path
    state = next
    if (vaultChanged) {
      query = ''
      found = null
      byId('w-q').value = ''
    }
    // Neue Notizen können neue Treffer sein; aber nicht jede Änderung stapelt eine Suche.
    if (query && !searching) {
      clearTimeout(searchTimer)
      searchTimer = setTimeout(runSearch, 400)
    }
    render()
  }

  api.onState(apply)
  api.getState().then(apply)
  // Relative Zeiten aktuell halten.
  setInterval(render, 30_000)
  render()
})()
