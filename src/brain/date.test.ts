import { describe, it, expect } from 'vitest'
import { hcmcDateString, daysSince } from './date'

describe('hcmcDateString (Asia/Ho_Chi_Minh boundary)', () => {
  it('rolls the day at 17:00 UTC = 00:00 HCMC', () => {
    // 23:59 HCMC vs 00:01 HCMC must be different civil dates.
    expect(hcmcDateString(new Date('2026-06-06T16:59:00Z'))).toBe('2026-06-06')
    expect(hcmcDateString(new Date('2026-06-06T17:00:00Z'))).toBe('2026-06-07')
  })

  it('a remote owner in UTC-ish time still sees the Da Lat day', () => {
    // 09:00 UTC = 16:00 HCMC, same day.
    expect(hcmcDateString(new Date('2026-06-06T09:00:00Z'))).toBe('2026-06-06')
  })
})

describe('daysSince', () => {
  it('counts whole civil days from the epoch', () => {
    expect(daysSince('2026-01-01', '2026-01-01')).toBe(0)
    expect(daysSince('2026-01-01', '2026-01-02')).toBe(1)
    expect(daysSince('2026-01-01', '2026-02-01')).toBe(31)
    expect(daysSince('2026-01-01', '2025-12-31')).toBe(-1)
  })
})
