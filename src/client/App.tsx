import { useEffect, useState } from 'react'

type Health = { status: string; service: string; stage: string }

// Placeholder shell for S0.1. The helper /today and owner /dashboard views
// land in S2 / S3. This just proves the PWA loads and can reach the API.
export function App() {
  const [health, setHealth] = useState<string>('checking…')

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json() as Promise<Health>)
      .then((d) => setHealth(`${d.status} · ${d.stage}`))
      .catch(() => setHealth('offline'))
  }, [])

  return (
    <main className="shell">
      <h1>🔥 Hestia</h1>
      <p>The family meal routine, run by checklist.</p>
      <p className="api">
        API: <strong>{health}</strong>
      </p>
      <p className="note">Scaffold (S0.1). Helper and owner views coming next.</p>
    </main>
  )
}
