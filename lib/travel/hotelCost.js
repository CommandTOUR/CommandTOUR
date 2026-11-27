// Hotel dates and costs. Pure functions: no database access.
//
// Room dates: stored dates on the room win. Otherwise check-in is the earliest arrival (To trips) of the room's guests, check-out the latest
// departure (From trips), and then the hotel's own dates.
// Nightly rate comes from the room type (1 Bed = single rate, 2 Bed = double rate, Suite = suite rate).
// Nightly total = rate x (1 + tax % / 100) + other fee, plus the parking rate per night when parking is set.
// A room costs nights x nightly total; roommates share that one cost. Rooms in the "Pay On Own" cost group are not an estimated expense.
import { tripDate, isLive } from './trips.js'

export const ROOM_TYPES = ['1 Bed', '2 Bed', 'Suite']
export const PAY_ON_OWN = 'Pay On Own'
const num = (v) => { const n = Number(v); return Number.isFinite(n) && v !== null && v !== '' && v !== undefined ? n : 0 }
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

export function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0
  const a = Date.parse(`${checkIn}T00:00:00Z`), b = Date.parse(`${checkOut}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.max(0, Math.round((b - a) / 86400000))
}

// guestTrips: the trips of everyone in the room (any direction)
export function roomDates(room, guestTrips, hotel) {
  const live = (guestTrips || []).filter(isLive)
  const ins = live.filter(t => t.direction === 'in').map(tripDate).filter(Boolean).sort()
  const outs = live.filter(t => t.direction === 'out').map(tripDate).filter(Boolean).sort()
  const autoIn = ins[0] || hotel?.check_in_date || null
  const autoOut = outs[outs.length - 1] || hotel?.check_out_date || null
  return {
    checkIn: room?.check_in_date || autoIn, checkOut: room?.check_out_date || autoOut,
    autoIn: !room?.check_in_date, autoOut: !room?.check_out_date,
  }
}

export function nightlyRate(room, hotel) {
  const t = String(room?.room_type || '1 Bed').trim().toLowerCase()
  if (t === 'suite') return num(hotel?.suite_rate)
  if (t === '2 bed' || t === 'double' || t === 'twin') return num(hotel?.double_rate)
  return num(hotel?.single_rate)
}

export function nightlyTotal(room, hotel) {
  const parking = room?.parking === 'valet' ? num(hotel?.valet_parking_rate) : room?.parking === 'self' ? num(hotel?.self_parking_rate) : 0
  return round2(nightlyRate(room, hotel) * (1 + num(hotel?.tax_rate) / 100) + num(hotel?.other_fee) + parking)
}

export function roomEstimate(room, hotel, dates) {
  if (String(room?.cost_group || '').trim().toLowerCase() === PAY_ON_OWN.toLowerCase()) return 0
  return round2(nightsBetween(dates.checkIn, dates.checkOut) * nightlyTotal(room, hotel))
}

// rooms: event_hotel_rooms rows. tripsByStaff: Map staff_id -> trips. groups: the cost group names in order.
export function hotelTotals(rooms, hotel, tripsByStaff, groups = []) {
  const rows = rooms.map(room => {
    const guests = [room.staff_id_1, room.staff_id_2].filter(Boolean)
    const dates = roomDates(room, guests.flatMap(id => tripsByStaff.get(id) || []), hotel)
    const nights = nightsBetween(dates.checkIn, dates.checkOut)
    const estimate = roomEstimate(room, hotel, dates)
    return { room, dates, nights, nightly: nightlyTotal(room, hotel), estimate }
  })
  const names = [...groups]
  for (const r of rows) { const g = r.room.cost_group; if (g && !names.includes(g)) names.push(g) }
  const subtotals = names.map(group => {
    const list = rows.filter(r => (r.room.cost_group || '') === group)
    return { group, count: list.length, nights: list.reduce((a, r) => a + r.nights, 0), subtotal: round2(list.reduce((a, r) => a + r.estimate, 0)) }
  })
  const none = rows.filter(r => !r.room.cost_group)
  if (none.length) subtotals.push({ group: '', count: none.length, nights: none.reduce((a, r) => a + r.nights, 0), subtotal: round2(none.reduce((a, r) => a + r.estimate, 0)) })
  return { rows, subtotals, total: round2(rows.reduce((a, r) => a + r.estimate, 0)), roomNights: rows.reduce((a, r) => a + r.nights, 0) }
}
