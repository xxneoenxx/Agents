import { test, expect, mock } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, TurnStepInput, TurnStepResult } from 'claude-code'

type Poll = { session_id: string; cwd: string; model: string | null; effort: string | number | null }

// Die Island-App unter den Plugins: beantwortet /mod/poll mit `answer()`.
function island(on: On, answer: () => object, ok = true) {
  const polls: Poll[] = []
  on('http.fetch', async ($, e) => {
    expect(e.url).toBe('http://127.0.0.1:47821/mod/poll')
    polls.push(JSON.parse(e.init?.body ?? '{}') as Poll)
    if (!ok) throw new Error('ECONNREFUSED')
    return { value: { status: 200, ok: true, headers: {}, text: JSON.stringify(answer()) } }
  })
  return polls
}

// Die Engine unter den Plugins: Sitzung, Prompts und Modellaufrufe.
function engine(on: On) {
  const steps: TurnStepInput[] = []
  const prompts: { text: string; asUser: boolean }[] = []
  on('session.id', () => ({ value: 'sitzung-1' }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('prompt.submit', ($, e) => {
    prompts.push({ text: e.text, asUser: e.origin.kind === 'plugin' && e.origin.asUser === true })
    return { text: e.text }
  })
  on('turn.step', async function* ($, e): AsyncGenerator<never, TurnStepResult> {
    steps.push({ ...e })
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })
  return { steps, prompts }
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
  const polls = island(on, () => ({ model: 'claude-haiku-5-5', effort: 'low', hints: [] }))

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
  const polls = island(on, () => ({}), false)

  await $.session.start(START)
  await clock.advance(3000)
  expect(polls.length).toBe(3)
  await runStep($, STEP)
  expect(steps[0]).toMatchObject({ model: 'claude-opus-5-5', effort: 'high' })
  expect(prompts).toEqual([])
})
