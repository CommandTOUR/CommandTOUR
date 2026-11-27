// The event's hotel (event_hotel) and its rooms (event_hotel_rooms). Uses the caller's Supabase client.
async function must(q, what) {
  const { data, error } = await q
  if (error) { const e = new Error(`${what}: ${error.message}`); e.cause = error; throw e }
  return data
}
const blank = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : v)
const NUMERIC = ['single_rate', 'double_rate', 'suite_rate', 'tax_rate', 'other_fee', 'self_parking_rate', 'valet_parking_rate']

export async function getHotel(supabase, eventId) {
  const rows = await must(supabase.from('event_hotel').select('*').eq('event_id', eventId).order('created_at', { ascending: true }).limit(1), 'Hotel')
  return rows?.[0] || null
}
// Save several hotel fields at once (the Hotel Settings form). The hotel row is created on the first save.
export async function saveHotel(supabase, eventId, hotel, fields) {
  const clean = {}
  for (const [k, v] of Object.entries(fields)) clean[k] = NUMERIC.includes(k) ? (blank(v) === null ? null : Number(v)) : blank(v)
  if (hotel?.id) { await must(supabase.from('event_hotel').update(clean).eq('id', hotel.id), 'Save hotel'); return hotel.id }
  const row = await must(supabase.from('event_hotel').insert([{ event_id: eventId, ...clean }]).select().single(), 'Save hotel')
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

// Run the room changes planned by lib/travel/rooming.js, in order. confirmDelete(room) is asked before removing a room that has a confirmation number.
export async function runRoomOps(supabase, eventId, ops, confirmDelete = () => true) {
  for (const o of ops) {
    if (o.op === 'create') await addRoom(supabase, eventId, o.fields)
    else if (o.op === 'update') await updateRoom(supabase, o.id, o.patch)
    else if (o.op === 'delete') {
      if (o.confirmFirst && !confirmDelete(o.room)) continue // keep the (now empty) room
      await deleteRoom(supabase, o.id)
    }
  }
}
