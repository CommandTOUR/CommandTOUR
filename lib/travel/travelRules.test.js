import test from 'node:test'
import assert from 'node:assert/strict'
import { computeTraveler, travelWindow, MEALS } from './perDiem.js'
import { nightsBetween, roomDates, nightlyTotal, roomEstimate, hotelTotals } from './hotelCost.js'
import { mileageAmount, variance, buildCostSummary } from './costs.js'
import { parseTime } from './time.js'

const rates = { breakfast_rate: 10, lunch_rate: 20, dinner_rate: 30 }
const times = { breakfast: '07:00', lunch: '12:00', dinner: '18:00' }
const event = { load_in_date: '2027-01-04', load_out_date: '2027-01-06' }
const seg = (o) => ({ airline: 'AA', ...o })
const trip = (direction, segments, extra = {}) => ({ id: `${direction}${Math.random()}`, direction, status: 'booked', mode: 'flying', segments, needs_rework: false, confirmation: null, ...extra })
const owed = (r, date) => MEALS.filter(m => r.days.find(d => d.date === date).meals[m].owed)

test('start at 9:00 on day one: breakfast is not owed, lunch and dinner are', () => {
  const r = computeTraveler({ traveler: { staff_id: 'a' }, trips: [trip('in', [seg({ depart_date: '2027-01-04', depart_time: '09:00' })]), trip('out', [seg({ arrive_date: '2027-01-06', arrive_time: '23:00' })])], event, rates, mealTimes: times })
  assert.deepEqual(owed(r, '2027-01-04'), ['lunch', 'dinner'])
  assert.equal(r.days[0].total, 50)
  assert.equal(r.estimated, false)
})

test('end at 13:00 on the last day: breakfast and lunch are owed, dinner is not', () => {
  const r = computeTraveler({ traveler: { staff_id: 'a' }, trips: [trip('in', [seg({ depart_date: '2027-01-04', depart_time: '05:00' })]), trip('out', [seg({ arrive_date: '2027-01-06', arrive_time: '13:00' })])], event, rates, mealTimes: times })
  assert.deepEqual(owed(r, '2027-01-06'), ['breakfast', 'lunch'])
  assert.deepEqual(owed(r, '2027-01-05'), ['breakfast', 'lunch', 'dinner'])
})

test('a meal the venue provides is not owed', () => {
  const provided = new Map([['2027-01-05', { lunch_provided: true }]])
  const r = computeTraveler({ traveler: { staff_id: 'a' }, trips: [trip('in', [seg({ depart_date: '2027-01-04', depart_time: '05:00' })]), trip('out', [seg({ arrive_date: '2027-01-06', arrive_time: '23:00' })])], event, rates, mealTimes: times, provided })
  assert.deepEqual(owed(r, '2027-01-05'), ['breakfast', 'dinner'])
  assert.equal(r.days.find(d => d.date === '2027-01-05').total, 40)
})

test('an extra day adds one more full day of meals', () => {
  const t = [trip('in', [seg({ depart_date: '2027-01-04', depart_time: '05:00' })]), trip('out', [seg({ arrive_date: '2027-01-06', arrive_time: '10:00' })])]
  const base = computeTraveler({ traveler: { staff_id: 'a' }, trips: t, event, rates, mealTimes: times })
  const extra = computeTraveler({ traveler: { staff_id: 'a', extra_day: true }, trips: t, event, rates, mealTimes: times })
  assert.equal(extra.days.length, base.days.length + 1)
  assert.deepEqual(owed(extra, '2027-01-07'), ['breakfast', 'lunch', 'dinner'])
  assert.equal(extra.total - base.total, 50 + 60) // the rest of the last day (lunch, dinner) plus the full extra day
})

test('no trips entered: uses the event dates and is tagged Estimated', () => {
  const r = computeTraveler({ traveler: { staff_id: 'a' }, trips: [], event, rates, mealTimes: times })
  assert.equal(r.estimated, true)
  assert.equal(r.start, '2027-01-04T00:00')
  assert.equal(r.end, '2027-01-06T23:59')
  assert.equal(r.days.length, 3)
  assert.equal(r.total, 180)
})

test('cancelled and needs-rework trips are ignored; earliest start and latest end win', () => {
  const w = travelWindow([
    trip('in', [seg({ depart_date: '2027-01-05', depart_time: '08:00' })]), trip('in', [seg({ depart_date: '2027-01-03', depart_time: '08:00' })], { status: 'cancelled' }),
    trip('out', [seg({ arrive_date: '2027-01-07', arrive_time: '10:00' })]), trip('out', [seg({ arrive_date: '2027-01-09', arrive_time: '10:00' })], { needs_rework: true }),
  ])
  assert.equal(w.start, '2027-01-05T08:00')
  assert.equal(w.end, '2027-01-07T10:00')
})

test('hotel: nights, dates, nightly total and estimate', () => {
  assert.equal(nightsBetween('2027-01-04', '2027-01-11'), 7)
  assert.equal(nightsBetween('2027-01-11', '2027-01-04'), 0)
  assert.equal(nightsBetween(null, '2027-01-04'), 0)
  const hotel = { single_rate: 100, double_rate: 120, suite_rate: 300, tax_rate: 10, other_fee: 5, self_parking_rate: 15, valet_parking_rate: 40, check_in_date: '2027-01-01', check_out_date: '2027-01-02' }
  const guestTrips = [trip('in', [seg({ arrive_date: '2027-01-05' })]), trip('in', [seg({ arrive_date: '2027-01-04' })]), trip('out', [seg({ depart_date: '2027-01-10' })]), trip('out', [seg({ depart_date: '2027-01-11' })])]
  const auto = roomDates({}, guestTrips, hotel)
  assert.deepEqual([auto.checkIn, auto.checkOut, auto.autoIn, auto.autoOut], ['2027-01-04', '2027-01-11', true, true])
  const stored = roomDates({ check_in_date: '2027-01-06' }, guestTrips, hotel)
  assert.deepEqual([stored.checkIn, stored.autoIn, stored.checkOut], ['2027-01-06', false, '2027-01-11'])
  assert.deepEqual(roomDates({}, [], hotel).checkIn, '2027-01-01') // falls back to the hotel's dates
  assert.equal(nightlyTotal({ room_type: '1 Bed' }, hotel), 115) // 100 x 1.10 + 5
  assert.equal(nightlyTotal({ room_type: '2 Bed', parking: 'self' }, hotel), 152) // 120 x 1.10 + 5 + 15
  assert.equal(nightlyTotal({ room_type: 'Suite', rate_override: 200, parking: 'valet' }, hotel), 265) // 200 x 1.10 + 5 + 40
  assert.equal(roomEstimate({ room_type: '1 Bed' }, hotel, { checkIn: '2027-01-04', checkOut: '2027-01-11' }), 805)
  assert.equal(roomEstimate({ room_type: '1 Bed', cost_group: 'Pay On Own' }, hotel, { checkIn: '2027-01-04', checkOut: '2027-01-11' }), 0)
})

test('hotel totals: roommates share one room cost, grouped by cost group', () => {
  const hotel = { single_rate: 100, tax_rate: 0 }
  const rooms = [
    { id: 1, staff_id_1: 'a', staff_id_2: 'b', room_type: '1 Bed', cost_group: 'Production', check_in_date: '2027-01-04', check_out_date: '2027-01-06' },
    { id: 2, staff_id_1: 'c', room_type: '1 Bed', cost_group: 'Merchandise', check_in_date: '2027-01-04', check_out_date: '2027-01-05' },
    { id: 3, staff_id_1: 'd', room_type: '1 Bed', check_in_date: '2027-01-04', check_out_date: '2027-01-05' },
  ]
  const t = hotelTotals(rooms, hotel, new Map(), ['Production', 'Merchandise', 'FOH'])
  assert.equal(t.total, 400)
  assert.deepEqual(t.subtotals.map(s => [s.group, s.subtotal]), [['Production', 200], ['Merchandise', 100], ['FOH', 0], ['', 100]])
  assert.equal(t.roomNights, 4)
})

test('costs: mileage uses the stored rate, variance only when there is an actual', () => {
  assert.equal(mileageAmount(10, 0.76), 7.6)
  assert.equal(variance(100, 120), 20)
  assert.equal(variance(100, null), null)
  const trips = [
    { staff_id: 'a', status: 'booked', direction: 'in', costs: [{ category: 'airfare', estimated: 400, actual: 380 }, { category: 'bags', estimated: 35, actual: null }, { category: 'mileage', estimated: 7.6, actual: null }] },
    { staff_id: 'a', status: 'cancelled', direction: 'out', costs: [{ category: 'airfare', estimated: 999, actual: 999 }] },
  ]
  const s = buildCostSummary({ trips, rentals: [{ estimated_cost: 200, actual_cost: 210 }], hotel: { total: 805, subtotals: [] }, perDiemTotal: 100, budget: 1500 })
  assert.equal(s.air.estimated, 435)
  assert.equal(s.air.actual, 380)
  assert.equal(s.ground.estimated, 207.6)
  assert.equal(s.ground.actual, 210)
  assert.equal(s.estimatedTotal, 1547.6)
  assert.equal(s.actualTotal, 590)
  assert.equal(s.overUnder, 47.6)
  assert.equal(buildCostSummary({ trips: [], budget: null }).overUnder, null)
})

test('time entry accepts 24-hour and 12-hour input', () => {
  for (const x of ['1430', '2:30p', '2:30 PM', '230pm', '14:30']) assert.equal(parseTime(x).value, '14:30')
  assert.equal(parseTime('25:00').ok, false)
})
