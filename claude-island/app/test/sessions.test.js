'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { SessionStore, describeTool, modelFamily } = require('../src/sessions')

function clockStore() {
  let t = 1_000_000
  const store = new SessionStore({
    now: () => t,
    modelIds: { opus: 'claude-opus-5-5', sonnet: 'claude-sonnet-5-5', haiku: 'claude-haiku-5-5' },
  })
  return { store, advance: (ms) => (t += ms) }
}

const base = { session_id: 's1', cwd: 'C:\\Users\\neo\\projekte\\island', transcript_path: 'x.jsonl' }
const only = (store) => store.snapshot().sessions[0]

test('Lebenslauf einer Sitzung: Ruhig → Arbeitet → Fertig', () => {
  const { store } = clockStore()
  store.handleHook('SessionStart', { ...base, hook_event_name: 'SessionStart', source: 'startup', model: 'claude-opus-5-5' })
  assert.equal(only(store).status, 'idle')
  assert.equal(only(store).name, 'island')
  assert.equal(only(store).modelFamily, 'opus')

  store.handleHook('UserPromptSubmit', { ...base, prompt: 'Baue die Insel' })
  assert.equal(only(store).status, 'working')
  assert.equal(only(store).prompt, 'Baue die Insel')

  store.handleHook('PostToolUse', { ...base, tool_name: 'Bash', tool_input: { command: 'npm test' }, tool_use_id: 't1' })
  store.handleHook('PostToolUse', { ...base, tool_name: 'Edit', tool_input: { file_path: 'C:\\a\\b\\c\\main.js' }, tool_use_id: 't2' })
  assert.deepEqual(only(store).steps.map((s) => [s.tool, s.text, s.ok]), [
    ['Bash', 'npm test', true],
    ['Edit', '…/c/main.js', true],
  ])

  store.handleHook('Stop', { ...base, stop_hook_active: false, last_assistant_message: 'Erledigt.' })
  assert.equal(only(store).status, 'done')
  assert.equal(only(store).lastMessage, 'Erledigt.')

  store.handleHook('SessionEnd', { ...base, reason: 'other' })
  assert.equal(store.snapshot().sessions.length, 0)
})

test('session_title hat Vorrang vor dem Ordnernamen', () => {
  const { store } = clockStore()
  store.handleHook('UserPromptSubmit', { ...base, prompt: 'x', session_title: 'Insel bauen' })
  assert.equal(only(store).name, 'Insel bauen')
})

test('Drei Werkzeugfehler in Folge: Hängt fest; ein Erfolg löst es', () => {
  const { store } = clockStore()
  store.handleHook('UserPromptSubmit', { ...base, prompt: 'x' })
  for (let i = 0; i < 2; i++) store.handleHook('PostToolUseFailure', { ...base, tool_name: 'Bash', tool_input: { command: 'npm i' }, error: 'Exit code 1' })
  assert.equal(only(store).status, 'working')
  store.handleHook('PostToolUseFailure', { ...base, tool_name: 'Bash', tool_input: { command: 'npm i' }, error: 'Exit code 1' })
  assert.equal(only(store).status, 'problem')
  assert.equal(only(store).problem.kind, 'tools')
  store.handleHook('PostToolUse', { ...base, tool_name: 'Bash', tool_input: { command: 'npm ci' } })
  assert.equal(only(store).status, 'working')
  assert.equal(only(store).problem, null)
})

test('Unterbrochene Werkzeuge zählen nicht als Fehlschlag', () => {
  const { store } = clockStore()
  store.handleHook('UserPromptSubmit', { ...base, prompt: 'x' })
  for (let i = 0; i < 4; i++) store.handleHook('PostToolUseFailure', { ...base, tool_name: 'Bash', error: 'Interrupted', is_interrupt: true })
  assert.equal(only(store).status, 'working')
})

test('StopFailure ist ein Problem mit Fehlerart', () => {
  const { store } = clockStore()
  store.handleHook('StopFailure', { ...base, error: 'rate_limit', error_details: '429 Too Many Requests' })
  assert.equal(only(store).status, 'problem')
  assert.equal(only(store).problem.title, 'API-Fehler: rate_limit')
  assert.equal(only(store).problem.detail, '429 Too Many Requests')
})

test('Notification: Rückfrage wartet, idle_prompt ist fertig', () => {
  const { store } = clockStore()
  store.handleHook('UserPromptSubmit', { ...base, prompt: 'x' })
  store.handleHook('Notification', { ...base, message: 'Claude needs your input', notification_type: 'elicitation_dialog' })
  assert.equal(only(store).status, 'waiting')
  store.handleHook('PostToolUse', { ...base, tool_name: 'Read', tool_input: { file_path: '/a' } })
  store.handleHook('Notification', { ...base, message: 'waiting', notification_type: 'idle_prompt' })
  assert.equal(only(store).status, 'done')
  store.handleHook('Notification', { ...base, message: 'ok', notification_type: 'auth_success' })
  assert.equal(only(store).status, 'done')
})

test('Freigabe: wartet bis zur Entscheidung, Antwort genau einmal', () => {
  const { store } = clockStore()
  const signals = []
  store.on('signal', (s) => signals.push(s.type))
  store.handleHook('UserPromptSubmit', { ...base, prompt: 'x' })
  const answers = []
  const id = store.addApproval(
    { ...base, hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: { command: 'rm -rf node_modules', description: 'Remove node_modules' } },
    (b) => answers.push(b),
  )
  const s = only(store)
  assert.equal(s.status, 'waiting')
  assert.equal(s.approvals[0].summary, 'Remove node_modules')
  assert.equal(s.approvals[0].detail, 'rm -rf node_modules')
  assert.equal('respond' in s.approvals[0], false)
  assert.ok(signals.includes('approval'))

  assert.equal(store.decide(id, 'allow'), true)
  assert.equal(store.decide(id, 'deny'), false)
  assert.deepEqual(answers, ['allow'])
  assert.equal(only(store).status, 'working')
})

test('Verworfene Freigabe verschwindet ohne Antwort', () => {
  const { store } = clockStore()
  const answers = []
  const id = store.addApproval({ ...base, tool_name: 'Write', tool_input: { file_path: '/x', content: 'a\nb' } }, (b) => answers.push(b))
  assert.equal(only(store).approvals[0].detail, '/x\n\na\nb')
  store.dropApproval(id)
  assert.equal(only(store).approvals.length, 0)
  assert.deepEqual(answers, [])
})

test('Mod-Poll: Wünsche als volle Modell-ID, Hinweise genau einmal', () => {
  const { store } = clockStore()
  store.handleHook('SessionStart', { ...base, source: 'startup' })
  assert.deepEqual(store.modPoll({ session_id: 's1', model: 'claude-sonnet-5-5', effort: 'high' }), { model: null, effort: null, hints: [] })
  assert.equal(only(store).modelFamily, 'sonnet')
  assert.equal(only(store).effort, 'high')
  assert.equal(only(store).modConnected, true)

  store.setDesired('s1', { model: 'opus', effort: 'xhigh' })
  store.queueHint('s1', '  Nimm die zweite Variante  ')
  store.queueHint('s1', '   ')
  assert.equal(only(store).pendingHints, 1)
  assert.deepEqual(store.modPoll({ session_id: 's1' }), { model: 'claude-opus-5-5', effort: 'xhigh', hints: ['Nimm die zweite Variante'] })
  assert.deepEqual(store.modPoll({ session_id: 's1' }).hints, [])

  store.setDesired('s1', { model: 'gpt', effort: 'ultra' })
  assert.deepEqual(store.modPoll({ session_id: 's1' }), { model: null, effort: null, hints: [] })
})

test('Fertig verblasst zu Ruhig; verstummter Mod entfernt die Sitzung', () => {
  const { store, advance } = clockStore()
  store.handleHook('Stop', { ...base })
  advance(11 * 60 * 1000)
  store.tick()
  assert.equal(only(store).status, 'idle')

  store.modPoll({ session_id: 's1' })
  advance(6000)
  store.tick()
  assert.equal(only(store).modConnected, false)
  advance(3 * 60 * 1000)
  store.tick()
  assert.equal(store.snapshot().sessions.length, 0)
})

test('Gesamtstimmung nach Priorität: wartet > Problem > arbeitet > fertig > ruhig', () => {
  const { store } = clockStore()
  store.handleHook('Stop', { ...base, session_id: 'a' })
  store.handleHook('UserPromptSubmit', { ...base, session_id: 'b', prompt: 'x' })
  assert.equal(store.snapshot().overall, 'working')
  store.handleHook('StopFailure', { ...base, session_id: 'c', error: 'overloaded' })
  assert.equal(store.snapshot().overall, 'problem')
  store.addApproval({ ...base, session_id: 'a', tool_name: 'Bash', tool_input: { command: 'ls' } }, () => {})
  const snap = store.snapshot()
  assert.equal(snap.overall, 'waiting')
  assert.deepEqual(snap.sessions.map((s) => s.status), ['waiting', 'problem', 'working'])
  assert.deepEqual(snap.counts, { waiting: 1, problem: 1, working: 1, done: 0, idle: 0 })
})

test('Hilfsfunktionen', () => {
  assert.equal(modelFamily('claude-haiku-5-5'), 'haiku')
  assert.equal(modelFamily('claude-opus-5-5[1m]'), 'opus')
  assert.equal(modelFamily('unbekannt'), null)
  assert.equal(describeTool('Grep', { pattern: 'TODO' }), 'TODO')
  assert.equal(describeTool('WebSearch', { query: 'electron' }), 'electron')
  assert.equal(describeTool('Mystery', {}), 'Mystery')
})
