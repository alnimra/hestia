import { describe, it, expect } from 'vitest'
import app from '../src/worker/index'

describe('GET /api/health', () => {
  it('returns JSON status ok (not the SPA index.html)', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type') ?? '').toContain('application/json')
    const body = (await res.json()) as { status: string; service: string }
    expect(body.status).toBe('ok')
    expect(body.service).toBe('hestia')
  })

  it('unknown /api routes return JSON 404, not HTML', async () => {
    const res = await app.request('/api/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type') ?? '').toContain('application/json')
  })
})
