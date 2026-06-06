import { useEffect, useState, useCallback } from 'react'
import type { DayPlan } from '../../brain/plan'
import { stepsForDay, totalSteps } from '../../brain/steps'

type TodayPlan = DayPlan & { names: Record<string, string> }
type Completed = { stepKey: string; completedAt: string }

export function Today() {
  const [plan, setPlan] = useState<TodayPlan | null>(null)
  const [done, setDone] = useState<Record<string, string>>({})
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/today').then((r) => r.json() as Promise<TodayPlan>),
      fetch('/api/tasks').then((r) => r.json() as Promise<{ completed: Completed[] }>),
    ])
      .then(([p, t]) => {
        setPlan(p)
        const map: Record<string, string> = {}
        for (const c of t.completed) map[c.stepKey] = c.completedAt
        setDone(map)
      })
      .catch(() => setErr('Could not load today’s plan.'))
  }, [])

  const tap = useCallback(
    async (stepKey: string) => {
      if (!plan) return
      setDone((d) => ({ ...d, [stepKey]: new Date().toISOString() })) // optimistic
      try {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ date: plan.date, stepKey, clientEventId: crypto.randomUUID() }),
        })
        const j = (await res.json()) as { completedAt: string }
        setDone((d) => ({ ...d, [stepKey]: j.completedAt })) // authoritative server time
      } catch {
        /* keep optimistic; the offline outbox (#8) will flush + reconcile */
      }
    },
    [plan],
  )

  const undo = useCallback(
    async (stepKey: string) => {
      if (!plan) return
      setDone((d) => {
        const next = { ...d }
        delete next[stepKey]
        return next
      })
      try {
        await fetch('/api/tasks/undo', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ date: plan.date, stepKey }),
        })
      } catch {
        /* ignore */
      }
    },
    [plan],
  )

  if (err) return <main className="today"><p className="err">{err}</p></main>
  if (!plan) return <main className="today"><p className="muted">Loading today’s plan…</p></main>

  const blocks = stepsForDay(plan, plan.names)
  const total = totalSteps(blocks)
  const doneCount = blocks.flatMap((b) => b.steps).filter((s) => done[s.key]).length
  const nm = (id: string | null) => (id ? plan.names[id] ?? id : '—')
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <main className="today">
      <header className="t-head">
        <div className="t-top">
          <span className="t-brand">🔥 Hestia</span>
          <span className="t-date">{plan.date}</span>
        </div>
        <div className="t-plan">
          Meat: <b>{nm(plan.proteinId)}</b> · Bố &amp; Mẹ: <b>{nm(plan.parentProteinId)}</b> · Juice: {nm(plan.juiceId)} · Dessert: {nm(plan.dessertId)}
        </div>
        <div className="t-prog"><i style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} /></div>
        <div className="t-prog-lab"><span>{doneCount} of {total} done</span></div>
      </header>

      {blocks.map((block) => {
        const allDone = block.steps.every((s) => done[s.key])
        return (
          <section key={block.key} className={`block${allDone ? ' all-done' : ''}`}>
            <div className="b-head">
              <span className="b-time">{block.time}</span>
              <span className="b-title">{block.title}</span>
              {block.serveAt && <span className="b-serve">{block.serveAt}</span>}
            </div>
            {block.steps.map((s) => {
              const at = done[s.key]
              return (
                <div key={s.key} className={`step${at ? ' s-done' : ''}`}>
                  <button
                    className={`cb${at ? ' on' : ''}`}
                    onClick={() => (at ? undo(s.key) : tap(s.key))}
                    aria-label={at ? 'undo step' : 'mark done'}
                  >
                    {at ? '✓' : ''}
                  </button>
                  <div className="s-body">
                    <div className="s-label">{s.label}</div>
                    {s.detail && <div className="s-detail">{s.detail}</div>}
                  </div>
                  {at && <span className="s-time">{fmt(at)}</span>}
                </div>
              )
            })}
          </section>
        )
      })}
      <p className="t-foot">Tap the circle when a step is done · tap a ✓ to undo.</p>
    </main>
  )
}
