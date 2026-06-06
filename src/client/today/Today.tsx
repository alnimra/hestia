import { useEffect, useState, useCallback } from 'react'
import type { DayPlan } from '../../brain/plan'
import type { Lang, NameMap } from '../../brain/steps'
import { stepsForDay, totalSteps } from '../../brain/steps'
import { enqueue, startOutbox } from '../outbox'

type TodayPlan = DayPlan & { names: NameMap }
type Completed = { stepKey: string; completedAt: string }

const UI = {
  en: { meat: 'Meat', parents: 'Bố & Mẹ', juice: 'Juice', dessert: 'Dessert', done: 'done', loading: 'Loading today’s plan…', foot: 'Tap the circle when a step is done · tap a ✓ to undo', err: 'Could not load today’s plan.' },
  vi: { meat: 'Đạm', parents: 'Bố & Mẹ', juice: 'Nước ép', dessert: 'Tráng miệng', done: 'xong', loading: 'Đang tải kế hoạch hôm nay…', foot: 'Bấm vòng tròn khi xong một bước · bấm ✓ để hoàn tác', err: 'Không tải được kế hoạch hôm nay.' },
}

export function Today() {
  const [plan, setPlan] = useState<TodayPlan | null>(null)
  const [done, setDone] = useState<Record<string, string>>({})
  const [err, setErr] = useState<string | null>(null)
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('hestia-lang') as Lang) || 'en')

  useEffect(() => {
    startOutbox()
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
      .catch(() => setErr(UI[lang].err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleLang = () => {
    const next: Lang = lang === 'en' ? 'vi' : 'en'
    setLang(next)
    localStorage.setItem('hestia-lang', next)
  }

  const tap = useCallback(
    (stepKey: string) => {
      if (!plan) return
      setDone((d) => ({ ...d, [stepKey]: new Date().toISOString() }))
      void enqueue({ type: 'tap', date: plan.date, stepKey, clientEventId: crypto.randomUUID() })
    },
    [plan],
  )

  const undo = useCallback(
    (stepKey: string) => {
      if (!plan) return
      setDone((d) => {
        const next = { ...d }
        delete next[stepKey]
        return next
      })
      void enqueue({ type: 'undo', date: plan.date, stepKey })
    },
    [plan],
  )

  if (err) return <main className="today"><p className="err">{err}</p></main>
  if (!plan) return <main className="today"><p className="muted">{UI[lang].loading}</p></main>

  const t = UI[lang]
  const nm = (id: string | null) => (id ? plan.names[id]?.[lang] ?? plan.names[id]?.en ?? id : '—')
  const blocks = stepsForDay(plan, plan.names, lang)
  const total = totalSteps(blocks)
  const doneCount = blocks.flatMap((b) => b.steps).filter((s) => done[s.key]).length
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <main className="today">
      <header className="t-head">
        <div className="t-top">
          <span className="t-brand">🔥 Hestia</span>
          <span>
            <button className="lang" onClick={toggleLang}>{lang === 'en' ? 'VI' : 'EN'}</button>
            <span className="t-date">{plan.date}</span>
          </span>
        </div>
        <div className="t-plan">
          {t.meat}: <b>{nm(plan.proteinId)}</b> · {t.parents}: <b>{nm(plan.parentProteinId)}</b> · {t.juice}: {nm(plan.juiceId)} · {t.dessert}: {nm(plan.dessertId)}
        </div>
        <div className="t-prog"><i style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} /></div>
        <div className="t-prog-lab"><span>{doneCount} / {total} {t.done}</span></div>
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
                  <button className={`cb${at ? ' on' : ''}`} onClick={() => (at ? undo(s.key) : tap(s.key))} aria-label={at ? 'undo' : 'done'}>
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
      <p className="t-foot">{t.foot}</p>
    </main>
  )
}
