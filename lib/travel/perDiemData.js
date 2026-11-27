// Per diem rates and meals the venue provides, per event. Rates are created on first use from the company default (app_settings.per_diem_defaults).
import { getSetting, SETTING_DEFAULTS } from '../settings.js'
import { DEFAULT_MEAL_TIMES } from './perDiem.js'

async function must(q, what) {
  const { data, error } = await q
  if (error) { const e = new Error(`${what}: ${error.message}`); e.cause = error; throw e }
  return data
}

export async function getPerDiemSettings() {
  const d = await getSetting('per_diem_defaults', SETTING_DEFAULTS.per_diem_defaults)
  return { rates: { breakfast_rate: Number(d.breakfast) || 0, lunch_rate: Number(d.lunch) || 0, dinner_rate: Number(d.dinner) || 0 }, mealTimes: { ...DEFAULT_MEAL_TIMES, ...(d.meal_times || {}) } }
}

export async function getOrCreateRates(supabase, eventId, defaults) {
  const existing = await must(supabase.from('event_perdiem_rates').select('*').eq('event_id', eventId).maybeSingle(), 'Per diem rates')
  if (existing) return existing
  return must(supabase.from('event_perdiem_rates').upsert({ event_id: eventId, ...defaults.rates }, { onConflict: 'event_id' }).select().single(), 'Per diem rates')
}
export async function saveRate(supabase, eventId, field, value) {
  await must(supabase.from('event_perdiem_rates').update({ [field]: Number(value) || 0 }).eq('event_id', eventId), 'Save rate')
}

export async function listMealsProvided(supabase, eventId) {
  return (await must(supabase.from('event_perdiem_meals').select('*').eq('event_id', eventId), 'Meals provided')) || []
}
// Mark one meal on one date provided (or not). The row is created on the first mark.
export async function setMealProvided(supabase, eventId, date, meal, value) {
  await must(supabase.from('event_perdiem_meals').upsert({ event_id: eventId, meal_date: date, [`${meal}_provided`]: !!value }, { onConflict: 'event_id,meal_date' }), 'Save meal')
}
