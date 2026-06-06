import { useState, useEffect, useCallback } from 'react'
import type { DayPlan } from '../../brain/plan'
import type { NameMap } from '../../brain/steps'
import { stepsForDay, totalSteps } from '../../brain/steps'

type State = DayPlan & {
  names: NameMap
  completed: { stepKey: string; completedAt: string }[]
  bill: { total: number; items: { amountVnd: number; note: string | null; at: string }[] }
}

const PROTEINS = ['chicken', 'fish', 'pork', 'beef'] as const

export function Dashboard() {
  const [s, setS] = useState<State | null>(null)
  const [amount, setAmount] = useState('')

  const load = useCallback(() => {
    fetch('/api/state').then((r) => r.json() as Promise<State>).then(setS).catch(() => {})
  }, [])

  // Live monitoring: poll only while the tab is visible (keeps well under the free
  // Worker request limit).
  useEffect(() => {
    load()
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, 15000)
    return () => clearInterval(id)
  }, [load])

  const apply = useCallback(
    async (url: string, body: object) => {
      try {
        const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        const j = (await r.json()) as Partial<State>
        if (j && j.proteinId) setS((p) => (p ? { ...p, ...j } : p))
      } catch {
        /* ignore */
      }
      load()
    },
    [load],
  )

  if (!s) return <main className="dash"><p className="muted">Loading…</p></main>

  const nm = (id: string | null) => (id ? s.names[id]?.en ?? id : '—')
  const blocks = stepsForDay(s, s.names, 'en')
  const total = totalSteps(blocks)
  const stepLabel: Record<string, string> = {}
  for (const b of blocks) for (const st of b.steps) stepLabel[st.key] = st.label
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const vnd = (n: number) => '₫' + n.toLocaleString()
  const last = s.completed.length ? s.completed[s.completed.length - 1] : null

  return (
    <main className="dash">
      <header className="d-head">
        <div className="d-top"><span className="t-brand">🔥 Hestia · Owner</span><span className="t-date">{s.date}</span></div>
        <div className="d-prog"><b>{s.completed.length}</b><span> / {total} steps done</span></div>
        {last && <div className="d-last">Last: {stepLabel[last.stepKey] ?? last.stepKey} · {fmt(last.completedAt)}</div>}
      </header>

      <section className="panel">
        <h4>Today’s plan {s.source === 'override' && <em>· override</em>}</h4>
        <div className="d-plan">Meat: <b>{nm(s.proteinId)}</b> · Bố/Mẹ: <b>{nm(s.parentProteinId)}</b> · Juice: {nm(s.juiceId)} · Dessert: {nm(s.dessertId)} · {s.places} places{s.guestCount ? ` (+${s.guestCount} guests)` : ''}</div>
        <div className="d-people">
          {s.people.map((p) => (
            <div className="d-person" key={p.personId}>
              <span className="dp-name">{p.name}</span>
              <span className="dp-meat">{nm(p.protein)} · {p.meatGramsPerMeal}g/meal</span>
              {p.wouldExceed && <span className="dp-flag">dishes cover it</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h4>Adjust today</h4>
        <label className="d-row"><span>Meat</span>
          <select value={s.proteinId} onChange={(e) => apply('/api/plan/override', { proteinId: e.target.value })}>
            {PROTEINS.map((x) => <option key={x} value={x}>{nm(x)}</option>)}
          </select>
        </label>
        <div className="d-att">
          {s.roster.map((p) => (
            <button key={p.id} className={`tog${p.eating ? ' on' : ''}`} onClick={() => apply('/api/attendance', { personId: p.id, eating: !p.eating })}>
              {p.name} {p.eating ? '✓' : '✕'}
            </button>
          ))}
        </div>
        <label className="d-row"><span>Guests</span>
          <input type="number" min={0} value={s.guestCount} onChange={(e) => apply('/api/plan/override', { guestCount: Math.max(0, Number(e.target.value) || 0) })} />
        </label>
        <button className="d-reset" onClick={() => apply('/api/plan/reset', {})}>↺ Reset to autopilot</button>
      </section>

      <section className="panel">
        <h4>Activity</h4>
        {s.completed.length === 0 && <p className="muted">Nothing done yet today.</p>}
        <div className="d-tl">
          {s.completed.map((c) => (
            <div className="d-ev" key={c.stepKey}><span className="d-tm">{fmt(c.completedAt)}</span><span>{stepLabel[c.stepKey] ?? c.stepKey}</span></div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h4>Bill today</h4>
        <div className="d-bill"><b>{vnd(s.bill.total)}</b><span> · {s.bill.items.length} entr{s.bill.items.length === 1 ? 'y' : 'ies'}</span></div>
        <form className="d-row" onSubmit={(e) => { e.preventDefault(); const n = Number(amount); if (n > 0) { void apply('/api/receipts', { amountVnd: n }); setAmount('') } }}>
          <input type="number" placeholder="Add ₫ spent" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button type="submit">Add</button>
        </form>
      </section>
    </main>
  )
}
