import { useEffect, useState, useCallback } from 'react'
import type { DayPlan } from '../../brain/plan'
import type { Lang, NameMap, PuddingRecipe, ServeStyle, Step } from '../../brain/steps'
import { stepsForDay, totalSteps } from '../../brain/steps'
import { enqueue, startOutbox } from '../outbox'

type TodayPlan = DayPlan & { names: NameMap; pudding?: PuddingRecipe }
type Completed = { stepKey: string; completedAt: string }

const UI = {
  en: { meat: 'Meat', parents: 'Bố & Mẹ', juice: 'Juice', dessert: 'Dessert', done: 'done', today: 'Today', loading: 'Loading…', foot: 'Tap a step for details · tap the circle when done · tap ✓ to undo', err: 'Could not load the plan.', assembleNote: 'If it comes as loose parts (delivery), YOU roll & plate it — don’t serve the parts.' },
  vi: { meat: 'Đạm', parents: 'Bố & Mẹ', juice: 'Nước ép', dessert: 'Tráng miệng', done: 'xong', today: 'Hôm nay', loading: 'Đang tải…', foot: 'Bấm vào bước để xem chi tiết · bấm vòng tròn khi xong · bấm ✓ để hoàn tác', err: 'Không tải được kế hoạch.', assembleNote: 'Nếu giao rời từng phần, BẠN tự cuốn/ráp và bày ra dĩa — đừng dọn phần rời.' },
}

const SERVE: Record<ServeStyle, { en: string; vi: string }> = {
  assemble: { en: 'assemble', vi: 'tự cuốn/ráp' },
  reheat: { en: 'reheat', vi: 'hâm nóng' },
  plate_garnish: { en: 'plate', vi: 'bày dĩa' },
  cook_fresh: { en: 'cook', vi: 'nấu' },
  serve_chilled: { en: 'chilled', vi: 'để lạnh' },
}

const addDays = (iso: string, n: number): string => {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function Today() {
  const [plan, setPlan] = useState<TodayPlan | null>(null)
  const [done, setDone] = useState<Record<string, string>>({})
  const [err, setErr] = useState<string | null>(null)
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('hestia-lang') as Lang) || 'en')
  const [today, setToday] = useState<string | null>(null) // actual Da Lat today
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set())

  const load = useCallback((d: string | null) => {
    const q = d ? `?date=${d}` : ''
    Promise.all([
      fetch(`/api/today${q}`).then((r) => r.json() as Promise<TodayPlan>),
      fetch(`/api/tasks${q}`).then((r) => r.json() as Promise<{ completed: Completed[] }>),
    ])
      .then(([p, t]) => {
        setPlan(p)
        setToday((prev) => prev ?? p.date)
        const map: Record<string, string> = {}
        for (const c of t.completed) map[c.stepKey] = c.completedAt
        setDone(map)
        setErr(null)
      })
      .catch(() => setErr(UI[lang].err))
  }, [lang])

  useEffect(() => {
    startOutbox()
    load(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const go = (n: number) => {
    if (!plan) return
    setOpenKeys(new Set())
    load(addDays(plan.date, n))
  }
  const toggleLang = () => {
    const next: Lang = lang === 'en' ? 'vi' : 'en'
    setLang(next)
    localStorage.setItem('hestia-lang', next)
  }
  const toggleOpen = (k: string) =>
    setOpenKeys((s) => {
      const n = new Set(s)
      n.has(k) ? n.delete(k) : n.add(k)
      return n
    })

  const tap = useCallback((stepKey: string) => {
    if (!plan) return
    setDone((d) => ({ ...d, [stepKey]: new Date().toISOString() }))
    void enqueue({ type: 'tap', date: plan.date, stepKey, clientEventId: crypto.randomUUID() })
  }, [plan])
  const undo = useCallback((stepKey: string) => {
    if (!plan) return
    setDone((d) => { const n = { ...d }; delete n[stepKey]; return n })
    void enqueue({ type: 'undo', date: plan.date, stepKey })
  }, [plan])

  if (err) return <main className="today"><p className="err">{err}</p></main>
  if (!plan) return <main className="today"><p className="muted">{UI[lang].loading}</p></main>

  const t = UI[lang]
  const nm = (id: string | null) => (id ? plan.names[id]?.[lang] ?? plan.names[id]?.en ?? id : '—')
  const blocks = stepsForDay(plan, plan.names, lang, plan.pudding)
  const total = totalSteps(blocks)
  const doneCount = blocks.flatMap((b) => b.steps).filter((s) => done[s.key]).length
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const hasDetail = (s: Step) => !!(s.recipe || s.weigh || s.dishes || s.detail)

  const renderDetail = (s: Step) => (
    <div className="detail">
      {s.warn && <div className="warn">⚠️ {s.warn}</div>}
      {s.weigh && (
        <table className="weigh">
          <tbody>
            {s.weigh.map((w) => (
              <tr key={w.name}>
                <td className="w-name">{w.name}</td>
                <td><span className="chip-p">{w.protein}</span></td>
                <td className="w-g">{w.grams === 0 ? '—' : <><b>{w.grams}</b> g</>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {s.dishes && (
        <div className="dishes">
          {s.dishes.map((d) => (
            <div className="dish" key={d.id}>
              <span className="d-name">{d.name}</span>
              {d.serveStyle && <span className={`ss ss-${d.serveStyle}`}>{SERVE[d.serveStyle][lang]}</span>}
              {d.needsAssembly && <span className="d-asm">{t.assembleNote}</span>}
            </div>
          ))}
        </div>
      )}
      {s.recipe && (
        <div className="recipe">
          <div className="r-sub">{lang === 'vi' ? 'Nguyên liệu (mỗi người)' : 'Ingredients (per person)'}</div>
          {s.recipe.ingredients.map((i) => (
            <div className="r-ing" key={i.label}><span>{i.label}</span><span className="r-qty">{i.qty}</span></div>
          ))}
          <div className="r-sub">{lang === 'vi' ? 'Muỗng NAKPRO (mỗi người)' : 'NAKPRO scoops (per person)'}</div>
          {s.recipe.scoops.map((sc) => (
            <div className="r-ing" key={sc.name}><span>{sc.name}</span><span className="r-qty">{sc.scoops}</span></div>
          ))}
        </div>
      )}
      {s.detail && !s.recipe && !s.weigh && !s.dishes && <div className="d-text">{s.detail}</div>}
    </div>
  )

  return (
    <main className="today">
      <header className="t-head">
        <div className="t-top">
          <span className="t-brand">🔥 Hestia</span>
          <span><button className="lang" onClick={toggleLang}>{lang === 'en' ? 'VI' : 'EN'}</button></span>
        </div>
        <div className="t-nav">
          <button className="nav" onClick={() => go(-1)} aria-label="previous day">‹</button>
          <span className="t-date">{plan.date}{today && plan.date !== today ? '' : ` · ${t.today}`}</span>
          <button className="nav" onClick={() => go(1)} aria-label="next day">›</button>
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
              const expandable = hasDetail(s)
              const open = openKeys.has(s.key)
              return (
                <div key={s.key} className={`step${at ? ' s-done' : ''}`}>
                  <div className="s-row">
                    <button className={`cb${at ? ' on' : ''}`} onClick={() => (at ? undo(s.key) : tap(s.key))} aria-label={at ? 'undo' : 'done'}>
                      {at ? '✓' : ''}
                    </button>
                    <button className="s-body" onClick={() => expandable && toggleOpen(s.key)}>
                      <span className="s-label">{s.label}</span>
                      {expandable && <span className={`chev${open ? ' open' : ''}`}>›</span>}
                    </button>
                    {at && <span className="s-time">{fmt(at)}</span>}
                  </div>
                  {open && renderDetail(s)}
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
