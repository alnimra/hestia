import { Today } from './today/Today'
import { Dashboard } from './dashboard/Dashboard'

// Path-based view selection (no router lib). The SPA fallback serves index.html
// for every path, so /dashboard loads here. /dashboard is owner-only via
// Cloudflare Access; / is the open helper checklist.
export function App() {
  if (window.location.pathname.startsWith('/dashboard')) return <Dashboard />
  return <Today />
}
