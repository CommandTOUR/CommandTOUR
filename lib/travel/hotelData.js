// The event's hotel (event_hotel) and its rooms (event_hotel_rooms). Uses the caller's Supabase client.
async function must(q, what) {
  const { data, error } = await q
  if (error) { const e = new Error(`${what}: ${error.message}`); e.cause = error; throw e }
  return data
}
const blank = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : v)
const NUMERIC = ['single_rate', 'double_rate', 'suite_rate', 'tax_rate', 'other_fee', 'self_parking_rate', 'valet_parking_rate', 'rate_override']

export async function getHotel(supabase, eventId) {
  const rows = await must(supabase.from('event_hotel').select('*').eq('event_id', eventId).order('created_at', { ascending: true }).limit(1), 'Hotel')
  return rows?.[0] || null
}
// Save one field of the hotel; the hotel row is created on the first edit.
export async function saveHotelField(supabase, eventId, hotel, field, value) {
  const v = NUMERIC.includes(field) ? (blank(value) === null ? null : Number(value)) : blank(value)
  if (hotel?.id) { await must(supabase.from('event_hotel').update({ [field]: v }).eq('id', hotel.id), 'Save hotel'); return hotel.id }
  const row = await must(supabase.from('event_hotel').insert([{ event_id: eventId, [field]: v }]).select().single(), 'Save hotel')
  return row.id
}

export async function listRooms(supabase, eventId) {
  return (await must(supabase.from('event_hotel_rooms').select('*').eq('event_id', eventId).order('created_at', { ascending: true }), 'Rooms')) || []
}
export async function addRoom(supabase, eventId, fields = {}) {
  return must(supabase.from('event_hotel_rooms').insert([{ event_id: eventId, room_type: '1 Bed', ...fields }]).select().single(), 'Add room')
}
export async function updateRoom(supabase, id, patch) {
  const clean = {}
  for (const [k, v] of Object.entries(patch)) clean[k] = NUMERIC.includes(k) ? (blank(v) === null ? null : Number(v)) : (typeof v === 'boolean' ? v : blank(v))
  await must(supabase.from('event_hotel_rooms').update(clean).eq('id', id), 'Save room')
}
export async function deleteRoom(supabase, id) { await must(supabase.from('event_hotel_rooms').delete().eq('id', id), 'Remove room') }
