// Day math, pinned to Asia/Ho_Chi_Minh (UTC+7, no DST). The whole rotation rides
// on this, so it is isolated and heavily tested. NEVER use local Date methods
// (Workers run UTC); compute the civil date from an explicit instant.

const HCMC_OFFSET_MIN = 7 * 60 // UTC+7, fixed (Vietnam has no DST)

/** The civil date (YYYY-MM-DD) in Asia/Ho_Chi_Minh for a given UTC instant. */
export function hcmcDateString(instant: Date): string {
  const shifted = new Date(instant.getTime() + HCMC_OFFSET_MIN * 60_000)
  return shifted.toISOString().slice(0, 10)
}

function civilToUTCms(dateISO: string): number {
  const [y, m, d] = dateISO.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Whole days from epoch (civil date) to a target civil date. Can be negative. */
export function daysSince(epochISO: string, dateISO: string): number {
  return Math.round((civilToUTCms(dateISO) - civilToUTCms(epochISO)) / 86_400_000)
}
