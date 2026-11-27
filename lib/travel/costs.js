// Cost totals for the Costs tab. Pure functions: no database access.
// Budget (estimated) totals count everything; actual totals count only lines that have an actual amount. Cancelled trips are left out.
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const has = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

export const AIRFARE_CATEGORIES = ['airfare']
export const OTHER_TRAVEL_CATEGORIES = ['bags', 'other']
export const GROUND_CATEGORIES = ['fuel', 'mileage', 'parking', 'tolls', 'rideshare']

// miles x the mileage rate, rounded to cents; stored on the cost line so a later rate change never rewrites history
export const mileageAmount = (miles, rate) => round2(num(miles) * num(rate))
// actual minus estimated, only when there is an actual
export const variance = (estimated, actual) => (has(actual) ? round2(num(actual) - num(estimated)) : null)

const sum = (list, f) => round2(list.reduce((a, x) => a + f(x), 0))

// trips: trips with .costs; rentals: event_rental_cars; hotel: result of hotelTotals(); perDiemTotal: number; budget: number | null
export function buildCostSummary({ trips, rentals = [], hotel = { subtotals: [], total: 0 }, perDiemTotal = 0, budget = null }) {
  const live = trips.filter(t => t.status !== 'cancelled')
  const lines = live.flatMap(t => (t.costs || []).map(c => ({ ...c, trip: t })))
  const inCats = (cats) => lines.filter(l => cats.includes(l.category))
  const pair = (list, est, act) => ({ estimated: sum(list, est), actual: list.some(x => has(act(x))) ? sum(list.filter(x => has(act(x))), act) : null })

  const airfare = pair(inCats(AIRFARE_CATEGORIES), l => num(l.estimated), l => l.actual)
  const otherTravel = pair(inCats(OTHER_TRAVEL_CATEGORIES), l => num(l.estimated), l => l.actual)
  const groundLines = pair(inCats(GROUND_CATEGORIES), l => num(l.estimated), l => l.actual)
  const rentalPair = pair(rentals, r => num(r.estimated_cost), r => r.actual_cost)
  const ground = {
    estimated: round2(groundLines.estimated + rentalPair.estimated),
    actual: groundLines.actual === null && rentalPair.actual === null ? null : round2(num(groundLines.actual) + num(rentalPair.actual)),
    rentals: rentalPair, lines: groundLines,
  }
  const perTraveler = new Map()
  for (const t of live) {
    const cur = perTraveler.get(t.staff_id) || { staff_id: t.staff_id, staff: t.staff, estimated: 0, actual: null, lines: [] }
    for (const c of t.costs || []) {
      cur.estimated = round2(cur.estimated + num(c.estimated))
      if (has(c.actual)) cur.actual = round2(num(cur.actual) + num(c.actual))
      cur.lines.push({ ...c, direction: t.direction })
    }
    perTraveler.set(t.staff_id, cur)
  }
  const estimatedTotal = round2(airfare.estimated + otherTravel.estimated + ground.estimated + num(hotel.total) + num(perDiemTotal))
  const actualParts = [airfare.actual, otherTravel.actual, ground.actual].filter(a => a !== null)
  const actualTotal = actualParts.length ? round2(actualParts.reduce((a, b) => a + b, 0)) : null
  return {
    airfare, otherTravel, ground, hotel: { estimated: num(hotel.total), groups: hotel.subtotals }, perDiem: { estimated: num(perDiemTotal) },
    estimatedTotal, actualTotal, budget: has(budget) ? Number(budget) : null,
    overUnder: has(budget) ? round2(estimatedTotal - Number(budget)) : null, // positive = over budget
    perTraveler: [...perTraveler.values()],
  }
}
