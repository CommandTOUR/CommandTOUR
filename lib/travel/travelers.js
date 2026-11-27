// event_travelers: who needs a room, a rental car, and who is per diem eligible, per event. Uses the caller's Supabase client.
export const TRAVELER_FLAGS = ['needs_room', 'per_diem_eligible', 'needs_rental', 'extra_day']

async function must(q, what) {
  const { data, error } = await q
  if (error) { const e = new Error(`${what}: ${error.message}`); e.cause = error; throw e }
  return data
}

export async function listEventTravelers(supabase, eventId) {
  return (await must(supabase.from('event_travelers').select('*').eq('event_id', eventId), 'Travelers')) || []
}

// Set one flag for one person. The row is created the first time a box is checked.
export async function setTravelerFlag(supabase, eventId, staffId, field, value) {
  if (!TRAVELER_FLAGS.includes(field)) throw new Error(`Unknown flag ${field}`)
  await must(supabase.from('event_travelers').upsert({ event_id: eventId, staff_id: staffId, [field]: !!value }, { onConflict: 'event_id,staff_id' }), 'Save traveler')
}
