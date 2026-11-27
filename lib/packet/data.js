// Data access for the Event Packet. Every function takes the caller's Supabase client, so row-level security applies.
import { staffName, eventDateRange } from './format'

export async function must(q, what) {
  const { data, error } = await q
  if (error) throw new Error(`${what}: ${error.message}`)
  return data
}

const filled = (...vals) => vals.some(v => v !== null && v !== undefined && String(v).trim() !== '')

// Event, tour, venue, venue contacts, shows and assigned staff: shared by every document.
export async function loadEventContext(supabase, eventId) {
  const event = await must(supabase.from('events').select('*').eq('id', eventId).maybeSingle(), 'Event')
  if (!event) { const err = new Error('Event not found'); err.status = 404; throw err }
  const [tour, venue, venueContacts, shows, assignments] = await Promise.all([
    must(supabase.from('tours').select('id, name, color').eq('id', event.tour_id).maybeSingle(), 'Tour'),
    event.venue_id ? must(supabase.from('venues').select('*').eq('id', event.venue_id).maybeSingle(), 'Venue') : null,
    event.venue_id ? must(supabase.from('venue_contacts').select('*').eq('venue_id', event.venue_id).order('created_at', { ascending: true }), 'Venue contacts') : [],
    must(supabase.from('show_list').select('*').eq('event_id', eventId).order('show_date', { ascending: true }).order('show_time', { ascending: true }), 'Shows'),
    must(supabase.from('staff_assignments').select('staff_id, staff:staff_id(id, first_name, last_name, display_name)')
      .eq('event_id', eventId).not('staff_id', 'is', null).is('deleted_at', null).not('locked', 'is', true), 'Staff assignments'),
  ])
  const assigned = new Map()
  for (const a of assignments || []) if (a.staff_id && !assigned.has(a.staff_id)) assigned.set(a.staff_id, staffName(a.staff) || 'Unnamed')
  const sortedShows = [...(shows || [])].sort((a, b) => (a.show_date || '').localeCompare(b.show_date || '') || (a.show_time || '').localeCompare(b.show_time || ''))
  return { event, tour: tour || {}, venue, venueContacts: venueContacts || [], shows: sortedShows, assigned, range: eventDateRange(event, sortedShows) }
}

const CONTACT_ROLES = [
  ['building_manager', 'Building manager'], ['event_manager', 'Event manager'], ['production_manager', 'Production manager'],
  ['marketing_manager', 'Marketing manager'], ['box_office_manager', 'Box office manager'], ['security_manager', 'Security manager'],
]

export async function loadSchedule(supabase, ctx) {
  const { event, venue, venueContacts, shows } = ctx
  const [items, noteRows] = await Promise.all([
    must(supabase.from('schedule_items').select('*').eq('event_id', event.id).order('day_date', { ascending: true }).order('sort_order', { ascending: true }), 'Schedule items'),
    must(supabase.from('event_notes').select('content').eq('event_id', event.id), 'Event notes'),
  ])
  const notes = [event.notes, ...(noteRows || []).map(n => n.content)].map(s => (s || '').trim()).filter(Boolean).join('\n\n')
  const contacts = []
  for (const [key, role] of CONTACT_ROLES) {
    const name = venue?.[`contact_${key}`], phone = venue?.[`contact_${key}_phone`], email = venue?.[`contact_${key}_email`]
    if (filled(name, phone, email)) contacts.push({ role, name, phone, email })
  }
  for (const c of venueContacts) contacts.push({ role: c.title || 'Venue contact', name: c.name, phone: c.phone, email: c.email })
  const address = venue?.full_address || [venue?.address, venue?.city, venue?.state, venue?.zip].filter(Boolean).join(', ')
  const missing = []
  if (shows.length === 0) missing.push('show times')
  if (!event.load_out_date) missing.push('load-out date')
  if (!venue && !event.venue_name) missing.push('venue')
  else if (!address) missing.push('venue address')
  if (contacts.length === 0) missing.push('contacts')
  return { items: items || [], notes, contacts, venueName: event.venue_name || venue?.name, address, venuePhone: venue?.phone, timeZone: event.time_zone || event.timezone || null, missing }
}

// Rows with real data only (travel_type alone is a placeholder), grouped by day.
export async function loadTravel(supabase, ctx, kind) {
  const isArr = kind === 'arrivals'
  const table = isArr ? 'event_travel_arrivals' : 'event_travel_departures'
  const timeCol = isArr ? 'arrival_time' : 'departure_time'
  const rows = await must(supabase.from(table).select('*, staff:staff_id(first_name, last_name, display_name)').eq('event_id', ctx.event.id), kind)
  // Rows flagged needs_rework belong to someone who was moved off this event (their booked travel is kept, flagged): never print them here.
  // The query is select('*') and the flag is tested in JS, so this works before the needs_rework column exists too.
  const live = (rows || []).filter(r => r.needs_rework !== true)
  const real = live.filter(r => filled(r.travel_date, r[timeCol], r.flight_number, r.airline, r.airport, r.transport, r.notes))
    .map(r => ({ staffId: r.staff_id, name: staffName(r.staff), date: r.travel_date || null, time: r[timeCol], mode: r.travel_type && r.travel_type !== 'na' ? r.travel_type : null, airline: r.airline, flight: r.flight_number, airport: r.airport, transport: r.transport, notes: r.notes }))
    .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || (a.time || '99').localeCompare(b.time || '99') || a.name.localeCompare(b.name))
  const days = []
  for (const r of real) {
    let g = days[days.length - 1]
    if (!g || g.date !== r.date) { g = { date: r.date, rows: [] }; days.push(g) }
    g.rows.push(r)
  }
  const entered = new Set(real.map(r => r.staffId))
  const withoutEntry = [...ctx.assigned.keys()].filter(id => !entered.has(id)).length
  const total = ctx.assigned.size
  const missing = total === 0 ? ['no staff assigned'] : withoutEntry > 0 ? [`${total - withoutEntry} of ${total} ${kind}`] : []
  return { days, count: real.length, withoutEntry, total, missing }
}

export async function loadRentals(supabase, ctx) {
  const rows = await must(supabase.from('event_rental_cars').select('*, staff:staff_id(first_name, last_name, display_name)').eq('event_id', ctx.event.id), 'Rentals')
  const cars = (rows || []).map(r => ({ name: staffName(r.staff), vendor: r.vendor, carClass: r.car_class, pickupDate: r.pickup_date || null, pickupLocation: r.pickup_location, returnDate: r.return_date, returnLocation: r.return_location, confirmation: r.confirmation_number, notes: r.notes }))
    .sort((a, b) => (a.pickupDate || '9999').localeCompare(b.pickupDate || '9999') || a.name.localeCompare(b.name))
  const days = []
  for (const r of cars) {
    let g = days[days.length - 1]
    if (!g || g.date !== r.pickupDate) { g = { date: r.pickupDate, rows: [] }; days.push(g) }
    g.rows.push(r)
  }
  const missing = cars.length === 0 ? ['no rentals'] : cars.some(r => !r.confirmation) ? ['rental confirmation numbers'] : []
  return { days, count: cars.length, missing }
}

export async function loadHotel(supabase, ctx) {
  const [hotels, rooms] = await Promise.all([
    must(supabase.from('event_hotel').select('*').eq('event_id', ctx.event.id).order('created_at', { ascending: true }).limit(1), 'Hotel'),
    must(supabase.from('event_hotel_rooms').select('*, s1:staff_id_1(id, first_name, last_name, display_name), s2:staff_id_2(id, first_name, last_name, display_name)').eq('event_id', ctx.event.id), 'Rooms'),
  ])
  const hotel = hotels?.[0] || null
  const list = (rooms || []).map(r => ({ name1: staffName(r.s1), name2: staffName(r.s2), beds: r.room_type, checkIn: r.check_in_date, checkOut: r.check_out_date, ids: [r.staff_id_1, r.staff_id_2, r.staff_id].filter(Boolean) }))
    .sort((a, b) => (a.checkIn || '9999').localeCompare(b.checkIn || '9999') || (a.name1 || '~').localeCompare(b.name1 || '~'))
  const roomed = new Set(list.flatMap(r => r.ids))
  const unroomed = [...ctx.assigned.entries()].filter(([id]) => !roomed.has(id)).map(([, n]) => n).sort((a, b) => a.localeCompare(b))
  const missing = []
  if (!hotel?.hotel_name) missing.push('no hotel')
  if (list.length === 0) missing.push('no rooming list')
  else if (unroomed.length) missing.push(`${unroomed.length} staff without a room`)
  return { hotel, rooms: list, unroomed, count: list.length, missing }
}
