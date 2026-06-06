import { Today } from './today/Today'

// v0: the helper checklist is the primary view. The owner dashboard (#9) becomes
// a separate route (e.g. /dashboard, behind Cloudflare Access) in a later stage.
export function App() {
  return <Today />
}
