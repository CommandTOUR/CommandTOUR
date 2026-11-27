// Ground transport: how each traveler gets to and from the airport (ground_legs) and the rental cars (event_rental_cars).
// Uses the caller's Supabase client.
export const GROUND_METHODS = [
  { value: 'hotel_shuttle', label: 'Hotel Shuttle' }, { value: 'rental_car', label: 'Rental Car' }, { value: 'rideshare', label: 'Rideshare' },
  { value: 'own_vehicle', label: 'Own Vehicle' }, { value: 'carpool', label: 'Carpool' }, { value: 'other', label: 'Other' },
]
export const methodLabel = (v) => GROUND_METHODS.find(m => m.value === v)?.label || v

async function must(q, what) {
  const { data, error } = await q
  if (error) { const e = new Error(`${what}: ${error.message}`); e.cause = error; throw e }
  return data
}
const blank = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : v)

export async function listGroundLegs(supabase, eventId) {
  return (await must(supabase.from('ground_legs').select('*').eq('event_id', eventId), 'Ground transport')) || []
}

// One leg per person per direction. A leg is only created once a method is chosen.
export async function upsertGroundLeg(supabase, eventId, staffId, direction, fields) {
  const row = { event_id: eventId, staff_id: staffId, direction }
  for (const k of ['method', 'rental_car_id', 'pickup_time', 'pickup_location', 'contact', 'notes']) if (k in fields) row[k] = blank(fields[k])
  if (row.method && row.method !== 'rental_car') row.rental_car_id = null // only Rental Car links to a car
  await must(supabase.from('ground_legs').upsert(row, { onConflict: 'event_id,staff_id,direction' }), 'Save ground leg')
}
export async function deleteGroundLeg(supabase, id) { await must(supabase.from('ground_legs').delete().eq('id', id), 'Remove ground leg') }

export async function listRentalCars(supabase, eventId) {
  return (await must(supabase.from('event_rental_cars').select('*').eq('event_id', eventId).order('created_at', { ascending: true }), 'Rental cars')) || []
}
export async function addRentalCar(supabase, eventId, fields = {}) {
  return must(supabase.from('event_rental_cars').insert([{ event_id: eventId, ...fields }]).select().single(), 'Add rental car')
}
const NUMERIC = ['estimated_cost', 'actual_cost']
export async function updateRentalCar(supabase, id, patch) {
  const clean = {}
  for (const [k, v] of Object.entries(patch)) clean[k] = NUMERIC.includes(k) ? (blank(v) === null ? null : Number(v)) : blank(v)
  await must(supabase.from('event_rental_cars').update(clean).eq('id', id), 'Save rental car')
}
export async function deleteRentalCar(supabase, id) { await must(supabase.from('event_rental_cars').delete().eq('id', id), 'Remove rental car') }
