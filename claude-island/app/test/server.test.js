'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const { SessionStore } = require('../src/sessions')
const { createIslandServer } = require('../src/server')

function request(port, path, { method = 'POST', body, headers = {}, agent } = {}) {
  return new Promise((resolve, reject) => {
    const text = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path,
        method,
        agent,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(text), ...headers },
      },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => resolve({ status: res.statusCode, text: data, json: data ? JSON.parse(data) : undefined }))
      },
    )
    req.on('error', reject)
    req.end(text)
  })
}

async function withServer(fn, { getVault = null } = {}) {
  const store = new SessionStore({ modelIds: { opus: 'claude-opus-5-5', sonnet: 'claude-sonnet-5-5', haiku: 'claude-haiku-5-5' } })
  const island = createIslandServer(store, { port: 0, getVault })
  const { port } = await island.listen()
  try {
    await fn({ store, port })
  } finally {
    await island.close()
  }
}

const waitFor = async (check) => {
  for (let i = 0; i < 100; i++) {
    if (check()) return
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error('Bedingung nicht erreicht')
}

const permissionPayload = {
  session_id: 'abc123',
  transcript_path: '/tmp/t.jsonl',
  cwd: '/Users/neo/insel',
  permission_mode: 'default',
  hook_event_name: 'PermissionRequest',
  tool_name: 'Bash',
  tool_input: { command: 'rm -rf node_modules', description: 'Remove node_modules directory' },
  permission_suggestions: [],
}

test('Status-Hooks antworten sofort mit leerem 200', async () => {
  await withServer(async ({ store, port }) => {
    const r = await request(port, '/hook/UserPromptSubmit', {
      body: { session_id: 'abc123', cwd: '/x/insel', hook_event_name: 'UserPromptSubmit', prompt: 'Hallo' },
    })
    assert.equal(r.status, 200)
    assert.equal(r.text, '')
    assert.equal(store.snapshot().sessions[0].status, 'working')
  })
})

test('PermissionRequest bleibt offen und antwortet mit allow', async () => {
  await withServer(async ({ store, port }) => {
    const pending = request(port, '/hook/PermissionRequest', { body: permissionPayload })
    await waitFor(() => store.snapshot().sessions[0]?.approvals.length === 1)
    const approval = store.snapshot().sessions[0].approvals[0]
    assert.equal(store.snapshot().sessions[0].status, 'waiting')
    store.decide(approval.id, 'allow')
    const r = await pending
    assert.equal(r.status, 200)
    assert.deepEqual(r.json, { hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } } })
  })
})

test('PermissionRequest antwortet mit deny samt Begründung', async () => {
  await withServer(async ({ store, port }) => {
    const pending = request(port, '/hook/PermissionRequest', { body: permissionPayload })
    await waitFor(() => store.snapshot().sessions[0]?.approvals.length === 1)
    store.decide(store.snapshot().sessions[0].approvals[0].id, 'deny')
    const r = await pending
    assert.deepEqual(r.json.hookSpecificOutput.decision, { behavior: 'deny', message: 'Abgelehnt in Claude Island.' })
  })
})

test('Bricht Claude Code die Anfrage ab, verschwindet die Freigabe', async () => {
  await withServer(async ({ store, port }) => {
    const text = JSON.stringify(permissionPayload)
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: '/hook/PermissionRequest',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(text) },
    })
    req.on('error', () => {})
    req.end(text)
    await waitFor(() => store.snapshot().sessions[0]?.approvals.length === 1)
    req.destroy()
    await waitFor(() => store.snapshot().sessions[0].approvals.length === 0)
  })
})

test('Mod-Poll liefert Wünsche und Hinweise', async () => {
  await withServer(async ({ store, port }) => {
    await request(port, '/hook/SessionStart', { body: { session_id: 's', cwd: '/p', source: 'startup' } })
    store.setDesired('s', { model: 'haiku', effort: 'low' })
    store.queueHint('s', 'Bitte versuche es erneut.')
    const r = await request(port, '/mod/poll', { body: { session_id: 's', model: 'claude-opus-5-5', effort: 'high' } })
    assert.deepEqual(r.json, { model: 'claude-haiku-5-5', effort: 'low', hints: ['Bitte versuche es erneut.'], vault: null })
    const bad = await request(port, '/mod/poll', { body: {} })
    assert.equal(bad.status, 400)
  })
})

test('Browser-Anfragen, fremde Hosts und falsche Inhalte werden abgewiesen', async () => {
  await withServer(async ({ store, port }) => {
    const fromPage = await request(port, '/hook/Stop', { body: { session_id: 'evil' }, headers: { Origin: 'https://example.com' } })
    assert.equal(fromPage.status, 403)
    const rebinding = await request(port, '/hook/Stop', { body: { session_id: 'evil' }, headers: { Host: 'evil.example:80' } })
    assert.equal(rebinding.status, 403)
    const plain = await request(port, '/hook/Stop', { body: 'x', headers: { 'Content-Type': 'text/plain' } })
    assert.equal(plain.status, 415)
    const broken = await request(port, '/hook/Stop', { body: '{nope' })
    assert.equal(broken.status, 400)
    const unknown = await request(port, '/hook/PreToolUse', { body: { session_id: 'x' } })
    assert.equal(unknown.status, 404)
    const health = await request(port, '/health', { method: 'GET' })
    assert.deepEqual(health.json, { ok: true, app: 'claude-island' })
    assert.equal(store.snapshot().sessions.length, 0)
  })
})

test('Vault-Endpunkte: suchen, lesen, schreiben, Fehler und Aktivität', async () => {
  const fs = require('node:fs')
  const os = require('node:os')
  const path = require('node:path')
  const { Vault } = require('../src/vault')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'island-srv-vault-'))
  fs.mkdirSync(path.join(root, 'Rezepte'))
  fs.writeFileSync(path.join(root, 'Rezepte', 'Pasta.md'), 'Nudeln mit Tomaten')
  const vault = new Vault(root)
  await vault.scan()
  let current = null
  await withServer(
    async ({ store, port }) => {
      const sid = { session_id: 'abc' }
      const none = await request(port, '/vault/status', { body: sid })
      assert.deepEqual([none.status, none.json.error], [409, 'no-vault'])
      current = vault

      store.setVaultInfo({ name: vault.name, writeMode: 'free' })
      assert.deepEqual((await request(port, '/vault/status', { body: sid })).json, { name: vault.name, count: 1, truncated: false })
      const found = await request(port, '/vault/search', { body: { ...sid, query: 'tomaten' } })
      assert.deepEqual(found.json.results.map((r) => [r.path, r.match]), [['Rezepte/Pasta.md', 'content']])
      const read = await request(port, '/vault/read', { body: { ...sid, path: 'Rezepte/Pasta.md' } })
      assert.equal(read.json.content, 'Nudeln mit Tomaten')
      const written = await request(port, '/vault/write', { body: { ...sid, path: 'Ideen/Neu', content: '# Neu' } })
      assert.deepEqual(written.json, { path: 'Ideen/Neu.md', created: true, bytes: 5 })
      assert.equal(fs.readFileSync(path.join(root, 'Ideen', 'Neu.md'), 'utf8'), '# Neu')
      const listed = await request(port, '/vault/list', { body: sid })
      assert.deepEqual(listed.json.folders, ['Ideen', 'Rezepte'])

      const bad = await request(port, '/vault/read', { body: { ...sid, path: '../../etc/passwd' } })
      assert.deepEqual([bad.status, bad.json.error], [400, 'bad-path'])
      const exists = await request(port, '/vault/write', { body: { ...sid, path: 'Ideen/Neu.md', content: 'x', mode: 'create' } })
      assert.deepEqual([exists.status, exists.json.error], [400, 'exists'])
      const anon = await request(port, '/vault/read', { body: { path: 'Rezepte/Pasta.md' } })
      assert.equal(anon.status, 400)
      const fromPage = await request(port, '/vault/read', { body: { ...sid, path: 'Rezepte/Pasta.md' }, headers: { Origin: 'https://evil.example' } })
      assert.equal(fromPage.status, 403)

      assert.deepEqual(store.vaultActivity.map((a) => [a.op, a.path || a.query]), [
        ['write', 'Ideen/Neu.md'],
        ['read', 'Rezepte/Pasta.md'],
        ['search', 'tomaten'],
      ])
    },
    { getVault: () => current },
  )
  vault.close()
})

test('Modus „Fragen“: Schreiben wartet auf die Insel, Ablehnen schreibt nichts', async () => {
  const fs = require('node:fs')
  const os = require('node:os')
  const path = require('node:path')
  const { Vault } = require('../src/vault')
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'island-ask-vault-'))
  const vault = new Vault(root)
  await vault.scan()
  await withServer(
    async ({ store, port }) => {
      store.setVaultInfo({ name: vault.name, writeMode: 'ask' })
      const sid = { session_id: 'abc' }

      const pending = request(port, '/vault/write', { body: { ...sid, path: 'Ideen/Ja', content: '# Ja\nZeile' } })
      await waitFor(() => store.snapshot().sessions[0]?.approvals.length === 1)
      const card = store.snapshot().sessions[0].approvals[0]
      assert.equal(card.tool, 'Notiz schreiben')
      assert.equal(card.detail, 'Ideen/Ja.md (neu anlegen)\n\n# Ja\nZeile')
      assert.equal(fs.existsSync(path.join(root, 'Ideen', 'Ja.md')), false)
      store.decide(card.id, 'allow')
      const ok = await pending
      assert.deepEqual([ok.status, ok.json.path], [200, 'Ideen/Ja.md'])
      assert.equal(fs.readFileSync(path.join(root, 'Ideen', 'Ja.md'), 'utf8'), '# Ja\nZeile')

      const pending2 = request(port, '/vault/write', { body: { ...sid, path: 'Nein.md', content: 'x' } })
      await waitFor(() => store.snapshot().sessions[0]?.approvals.length === 1)
      store.decide(store.snapshot().sessions[0].approvals[0].id, 'deny')
      const no = await pending2
      assert.deepEqual([no.status, no.json.error], [403, 'denied'])
      assert.equal(fs.existsSync(path.join(root, 'Nein.md')), false)

      // Ungültiges wird abgelehnt, bevor jemand gefragt wird.
      const bad = await request(port, '/vault/write', { body: { ...sid, path: '../raus.md', content: 'x' } })
      assert.deepEqual([bad.status, bad.json.error], [400, 'bad-path'])
      assert.equal(store.snapshot().sessions[0].approvals.length, 0)
    },
    { getVault: () => vault },
  )
})
