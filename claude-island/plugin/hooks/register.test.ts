import { test, expect, mock } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, TurnStepInput, TurnStepResult } from 'claude-code'

type Poll = { session_id: string; cwd: string; model: string | null; effort: string | number | null }
type Json = Record<string, unknown>
type VaultAnswer = (op: string, body: Json) => { status: number; body: object }

// Die Island-App unter den Plugins: beantwortet /mod/poll mit `answer()` und
// /vault/<op> mit `vault` (ohne: kein Vault verbunden).
function island(on: On, answer: () => object, ok = true, vault?: VaultAnswer) {
  const polls: Poll[] = []
  const vaultCalls: { op: string; body: Json }[] = []
  on('http.fetch', async ($, e) => {
    const body = JSON.parse(e.init?.body ?? '{}') as Json
    const reply = (status: number, data: object) => ({
      value: { status, ok: status < 300, headers: {}, text: JSON.stringify(data) },
    })
    if (e.url === 'http://127.0.0.1:47821/mod/poll') {
      polls.push(body as Poll)
      if (!ok) throw new Error('ECONNREFUSED')
      return reply(200, answer())
    }
    const op = /^http:\/\/127\.0\.0\.1:47821\/vault\/(\w+)$/.exec(e.url)?.[1]
    expect(op).toBeDefined()
    vaultCalls.push({ op: op ?? '', body })
    if (!ok) throw new Error('ECONNREFUSED')
    const r = vault ? vault(op ?? '', body) : { status: 409, body: { error: 'no-vault', message: 'Kein Obsidian-Vault verbunden.' } }
    return reply(r.status, r.body)
  })
  return { polls, vaultCalls }
}

// Die Engine unter den Plugins: Sitzung, Prompts und Modellaufrufe.
function engine(on: On) {
  const steps: TurnStepInput[] = []
  const prompts: { text: string; asUser: boolean }[] = []
  const tools: { name: string; isDeferred: unknown }[] = []
  on('session.id', () => ({ value: 'sitzung-1' }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('tool.register', ($, e) => {
    tools.push({ name: e.name, isDeferred: e.isDeferred })
    return { value: { tool: `mcp__island-bridge__${e.name}` } }
  })
  on('prompt.submit', ($, e) => {
    prompts.push({ text: e.text, asUser: e.origin.kind === 'plugin' && e.origin.asUser === true })
    return { text: e.text }
  })
  on('turn.step', async function* ($, e): AsyncGenerator<never, TurnStepResult> {
    steps.push({ ...e })
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })
  return { steps, prompts, tools }
}

const STEP: TurnStepInput = { turnId: 't1', index: 0, model: 'claude-opus-5-5', effort: 'high', messageCount: 3 }

async function runStep($: Engine, input: TurnStepInput) {
  const stream = $.turn.step(input)
  for await (const _ of stream) {
    // Keine Teile: die Testengine antwortet ohne Stream.
  }
  return stream.result
}

const START = { cwd: 'C:\\Users\\neo\\insel', surface: null, isInteractive: true } as const

test('übernimmt Modell und Aufwand aus der App in jedem Modellaufruf', async ($, on) => {
  const clock = mock.clock(on)
  const { steps } = engine(on)
  const { polls } = island(on, () => ({ model: 'claude-haiku-5-5', effort: 'low', hints: [] }))

  await $.session.start(START)
  await clock.advance(1000)
  expect(polls[0]).toEqual({ session_id: 'sitzung-1', cwd: 'C:\\Users\\neo\\insel', model: null, effort: null })

  await runStep($, STEP)
  expect(steps[0]).toMatchObject({ model: 'claude-haiku-5-5', effort: 'low', turnId: 't1', index: 0 })

  // Beim nächsten Abholen meldet der Mod, was er tatsächlich schickt.
  await clock.advance(1000)
  expect(polls[1]).toMatchObject({ model: 'claude-haiku-5-5', effort: 'low' })
})

test('lässt eine andere Version derselben Familie stehen', async ($, on) => {
  const clock = mock.clock(on)
  const { steps } = engine(on)
  island(on, () => ({ model: 'claude-opus-5-5', effort: null, hints: [] }))

  await $.session.start(START)
  await clock.advance(1000)
  await runStep($, { ...STEP, model: 'claude-opus-5-5[1m]' })
  expect(steps[0]).toMatchObject({ model: 'claude-opus-5-5[1m]', effort: 'high' })
})

test('ohne Wunsch und für Subagenten bleibt alles, wie es ist', async ($, on) => {
  const clock = mock.clock(on)
  const { steps } = engine(on)
  let answer: object = { model: null, effort: null, hints: [] }
  island(on, () => answer)

  await $.session.start(START)
  await clock.advance(1000)
  await runStep($, STEP)
  expect(steps[0]).toMatchObject({ model: 'claude-opus-5-5', effort: 'high' })

  answer = { model: 'claude-sonnet-5-5', effort: 'max', hints: [] }
  await clock.advance(1000)
  await runStep($, { ...STEP, index: 1, agentId: 'agent-7' })
  expect(steps[1]).toMatchObject({ model: 'claude-opus-5-5', effort: 'high', agentId: 'agent-7' })
})

test('schickt Hinweise als Prompt der Person, jeden genau einmal', async ($, on) => {
  const clock = mock.clock(on)
  const { prompts } = engine(on)
  let hints = ['Nimm npm ci statt npm install.', '  ']
  island(on, () => {
    const answer = { model: null, effort: null, hints }
    hints = []
    return answer
  })

  await $.session.start(START)
  await clock.advance(1000)
  await clock.advance(1000)
  expect(prompts).toEqual([{ text: 'Nimm npm ci statt npm install.', asUser: true }])
})

test('läuft die App nicht, geht die Sitzung einfach weiter', async ($, on) => {
  const clock = mock.clock(on)
  const { steps, prompts } = engine(on)
  const { polls } = island(on, () => ({}), false)

  await $.session.start(START)
  await clock.advance(3000)
  expect(polls.length).toBe(3)
  await runStep($, STEP)
  expect(steps[0]).toMatchObject({ model: 'claude-opus-5-5', effort: 'high' })
  expect(prompts).toEqual([])
})

const TOOL = <N extends string>(name: N) => `mcp__island-bridge__${name}` as const

test('meldet vier Vault-Werkzeuge an, sichtbar ab dem ersten Prompt', async ($, on) => {
  mock.clock(on)
  const { tools } = engine(on)
  island(on, () => ({}))
  await $.session.start(START)
  expect(tools.map((t) => t.name)).toEqual(['vault_search', 'vault_read', 'vault_list', 'vault_write'])
  expect(tools.every((t) => t.isDeferred === false)).toBe(true)
})

test('Vault-Werkzeuge rufen die Insel und geben Claude lesbaren Text', async ($, on) => {
  mock.clock(on)
  engine(on)
  const { vaultCalls } = island(
    on,
    () => ({}),
    true,
    (op) => {
      if (op === 'search') return { status: 200, body: { partial: false, results: [{ path: 'Rezepte/Pasta.md', snippet: 'Nudeln mit Tomaten' }] } }
      if (op === 'read') return { status: 200, body: { path: 'Rezepte/Pasta.md', content: 'Nudeln', modified: '2026-10-09T10:00:00.000Z' } }
      if (op === 'write') return { status: 200, body: { path: 'Ideen/Neu.md', created: true, bytes: 5 } }
      return { status: 400, body: { error: 'bad-path', message: 'Pfade mit ".." sind nicht erlaubt.' } }
    },
  )
  await $.session.start(START)

  const found = await $.tool.call({ tool: TOOL('vault_search'), query: 'pasta' })
  expect(found.result).toBe('1 Treffer:\n- Rezepte/Pasta.md — Nudeln mit Tomaten')
  expect(vaultCalls[0]).toEqual({ op: 'search', body: { query: 'pasta', session_id: 'sitzung-1' } })

  const read = await $.tool.call({ tool: TOOL('vault_read'), path: 'Rezepte/Pasta' })
  expect(read.result).toBe('Notiz: Rezepte/Pasta.md (geändert 2026-10-09T10:00:00.000Z)\n---\nNudeln')

  const written = await $.tool.call({ tool: TOOL('vault_write'), path: 'Ideen/Neu', content: '# Neu', mode: 'create' })
  expect(written.result).toBe('Notiz angelegt: Ideen/Neu.md (5 Bytes)')
  expect(vaultCalls[2]?.body).toEqual({ path: 'Ideen/Neu', content: '# Neu', mode: 'create', session_id: 'sitzung-1' })

  const refused = await $.tool.call({ tool: TOOL('vault_list'), folder: '../raus' })
  expect(refused.deny).toBe('Pfade mit ".." sind nicht erlaubt.')
})

test('ohne Insel sagen die Werkzeuge, was zu tun ist', async ($, on) => {
  mock.clock(on)
  engine(on)
  island(on, () => ({}), false)
  await $.session.start(START)
  const res = await $.tool.call({ tool: TOOL('vault_read'), path: 'a.md' })
  expect(res.deny).toBe('Claude Island läuft nicht. Starte die Insel auf diesem PC, dann klappt der Vault-Zugriff.')
})

test('Claude Code fragt nicht doppelt: Vault-Werkzeuge sind erlaubt, Ablehnung bleibt', async ($, on) => {
  mock.clock(on)
  engine(on)
  island(on, () => ({ hints: [], vault: { name: 'Gehirn', writeMode: 'ask' } }))
  let beneath: 'ask' | 'deny' | 'allow' = 'ask'
  on('tool.check', () => ({ decision: beneath }))
  await $.session.start(START)

  const check = (name: string) => $.tool.check({ tool: TOOL(name), input: {} })
  for (const name of ['vault_read', 'vault_search', 'vault_list', 'vault_write']) expect((await check(name)).decision).toBe('allow')
  beneath = 'deny'
  expect((await check('vault_write')).decision).toBe('deny')
  expect((await check('vault_read')).decision).toBe('deny')
})

test('abgelehnter Schreibwunsch kommt als Ablehnung bei Claude an', async ($, on) => {
  mock.clock(on)
  engine(on)
  island(on, () => ({}), true, () => ({ status: 403, body: { error: 'denied', message: 'Abgelehnt in Claude Island. Nichts geschrieben.' } }))
  await $.session.start(START)
  const res = await $.tool.call({ tool: TOOL('vault_write'), path: 'a.md', content: 'x' })
  expect(res.deny).toBe('Abgelehnt in Claude Island. Nichts geschrieben.')
})
