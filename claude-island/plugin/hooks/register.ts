import type { Register } from 'claude-code'

// Claude Island: holt jede Sekunde bei der Island-App ab, welches Modell und
// welcher Aufwand für diese Sitzung gewünscht sind und ob Hinweise warten.
// Modell und Aufwand setzt der Mod in jedem Modellaufruf (turn.step), Hinweise
// schickt er als Prompt der Person. Läuft die App nicht, passiert nichts.

const ISLAND = 'http://127.0.0.1:47821'
const POLL_MS = 1000
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const

type Effort = (typeof EFFORTS)[number]
type Wish = { model: string | null; effort: Effort | null }

let wish: Wish = { model: null, effort: null }
let seen: { model: string | null; effort: string | number | null } = { model: null, effort: null }
let polling = false

const family = (model: string) => /opus|sonnet|haiku/i.exec(model)?.[0]?.toLowerCase() ?? model
const isEffort = (value: unknown): value is Effort => EFFORTS.includes(value as Effort)

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
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
