// Tiny offline outbox for helper check-offs. Queues ops in localStorage and flushes
// in FIFO order on reconnect / load. Server-side writes are idempotent on
// clientEventId, so a double-flush is a no-op. (localStorage is plenty at this
// scale; IndexedDB is the upgrade if the queue ever gets large.)

export type OutboxOp =
  | { type: 'tap'; date: string; stepKey: string; clientEventId: string }
  | { type: 'undo'; date: string; stepKey: string }

const KEY = 'hestia-outbox'

const read = (): OutboxOp[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as OutboxOp[]
  } catch {
    return []
  }
}
const write = (q: OutboxOp[]): void => localStorage.setItem(KEY, JSON.stringify(q))

export const pendingCount = (): number => read().length

export async function enqueue(op: OutboxOp): Promise<void> {
  write([...read(), op])
  await flushOutbox()
}

let flushing = false
export async function flushOutbox(): Promise<void> {
  if (flushing) return
  flushing = true
  try {
    while (read().length) {
      const op = read()[0]
      const url = op.type === 'tap' ? '/api/tasks' : '/api/tasks/undo'
      const body =
        op.type === 'tap'
          ? { date: op.date, stepKey: op.stepKey, clientEventId: op.clientEventId }
          : { date: op.date, stepKey: op.stepKey }
      try {
        const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        if (!r.ok) break // keep FIFO order; retry later
      } catch {
        break // offline — keep the queue intact
      }
      const cur = read()
      cur.shift()
      write(cur)
    }
  } finally {
    flushing = false
  }
}

export function startOutbox(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('online', () => {
    void flushOutbox()
  })
  void flushOutbox()
}
