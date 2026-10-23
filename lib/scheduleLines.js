import { getSupabase } from './supabase'

// Master Schedule "lines" are tours.sort_order (1-6 standard; extra numbers add columns).
export const STANDARD_LINES = [1, 2, 3, 4, 5, 6]
export const NONE_LINE = 'none'

// sort_order values already used by non-deleted tours (optionally ignoring one tour)
export async function fetchTakenLines(excludeTourId = null) {
  let q = getSupabase().from('tours').select('id, sort_order').is('deleted_at', null).not('sort_order', 'is', null)
  if (excludeTourId) q = q.neq('id', excludeTourId)
  const { data } = await q
  return (data || []).map(t => t.sort_order)
}

// Options for the Schedule line select: free standard lines (plus the tour's own current line),
// the next free number as a "new column" when all six are taken, and "Not on Master Schedule".
export function lineOptions(taken, current = null) {
  const takenSet = new Set(taken)
  const opts = STANDARD_LINES
    .filter(n => !takenSet.has(n) || n === current)
    .map(n => ({ value: String(n), label: `Line ${n}` }))
  const allStandardTaken = STANDARD_LINES.every(n => takenSet.has(n))
  if (allStandardTaken && !(current != null && current > 6)) {
    let next = Math.max(6, ...taken) + 1
    opts.push({ value: String(next), label: `Line ${next} (new column)` })
  } else if (current != null && current > 6) {
    opts.push({ value: String(current), label: `Line ${current} (new column)` })
  }
  opts.push({ value: NONE_LINE, label: 'Not on Master Schedule' })
  return { options: opts, allStandardTaken }
}

export const defaultLine = (options) => options.find(o => o.value !== NONE_LINE)?.value ?? NONE_LINE
export const lineToSortOrder = (value) => (value === NONE_LINE || value === '' || value == null ? null : Number(value))
