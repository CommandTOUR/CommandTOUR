// Per diem. Pure functions: no database access.
//
// For each eligible traveler:
//   Travel Start = earliest first-segment departure (date and time) among their To trips.
//   Travel End   = latest last-segment arrival (date and time) among their From trips; an extra day pushes it to the end of the next day.
//   When either is missing, the event's load-in date at 00:00 (start) and load-out date at 23:59 (end) are used and the row is tagged Estimated.
// A meal on a day is OWED when start <= (that day at the meal time) AND end >= (that day at the meal time)
// AND that meal is not marked provided for that date. The amount is that meal's rate.
import { isLive } from './trips.js'

export const MEALS = ['breakfast', 'lunch', 'dinner']
export const DEFAULT_MEAL_TIMES = { breakfast: '07:00', lunch: '12:00', dinner: '18:00' }
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100
const hm = (t) => (t ? String(t).slice(0, 5) : '')

function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
export function daysBetween(startDate, endDate) {
  const out = []
  if (!startDate || !endDate || startDate > endDate) return out
  for (let d = startDate; d <= endDate && out.length < 400; d = addDays(d, 1)) out.push(d)
  return out
}

// trips: this person's trips for the event. Returns { start: 'YYYY-MM-DDTHH:MM' | null, end: ... | null }
export function travelWindow(trips, extraDay = false) {
  const live = (trips || []).filter(isLive)
  const starts = live.filter(t => t.direction === 'in').map(t => t.segments[0]).filter(s => s?.depart_date)
    .map(s => `${s.depart_date}T${hm(s.depart_time) || '00:00'}`).sort()
  const ends = live.filter(t => t.direction === 'out').map(t => t.segments[t.segments.length - 1]).filter(s => s?.arrive_date)
    .map(s => `${s.arrive_date}T${hm(s.arrive_time) || '23:59'}`).sort()
  let end = ends.length ? ends[ends.length - 1] : null
  if (end && extraDay) end = `${addDays(end.slice(0, 10), 1)}T23:59`
  return { start: starts[0] || null, end }
}

//   traveler { staff_id, extra_day }, trips for that person, event { load_in_date, load_out_date },
//   rates { breakfast_rate, lunch_rate, dinner_rate }, mealTimes { breakfast, lunch, dinner }, provided Map date -> { breakfast_provided, ... }
export function computeTraveler({ traveler, trips, event, rates, mealTimes = DEFAULT_MEAL_TIMES, provided = new Map() }) {
  const w = travelWindow(trips, !!traveler.extra_day)
  let start = w.start, end = w.end, estimated = false
  if (!start) { start = event?.load_in_date ? `${event.load_in_date}T00:00` : null; estimated = true }
  if (!end) {
    end = event?.load_out_date ? `${event.load_out_date}T23:59` : null
    if (end && traveler.extra_day) end = `${addDays(end.slice(0, 10), 1)}T23:59`
    estimated = true
  }
  const times = { ...DEFAULT_MEAL_TIMES, ...(mealTimes || {}) }
  const days = (start && end ? daysBetween(start.slice(0, 10), end.slice(0, 10)) : []).map(date => {
    const row = provided.get(date) || {}
    const meals = {}
    let total = 0
    for (const m of MEALS) {
      const at = `${date}T${hm(times[m])}`
      const isProvided = !!row[`${m}_provided`]
      const owed = start <= at && end >= at && !isProvided
      const amount = owed ? num(rates?.[`${m}_rate`]) : 0
      meals[m] = { owed, provided: isProvided, amount }
      total += amount
    }
    return { date, meals, total: round2(total) }
  })
  return { staff_id: traveler.staff_id, start, end, estimated, days, total: round2(days.reduce((a, d) => a + d.total, 0)) }
}

export function computePerDiem({ travelers, tripsByStaff, event, rates, mealTimes, provided }) {
  const rows = travelers.map(t => computeTraveler({ traveler: t, trips: tripsByStaff.get(t.staff_id) || [], event, rates, mealTimes, provided }))
  return { rows, total: round2(rows.reduce((a, r) => a + r.total, 0)) }
}
