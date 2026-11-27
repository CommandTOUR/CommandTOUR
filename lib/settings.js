// Company-wide settings, stored in the app_settings table (key + JSON value). Uses the signed-in user's session.
import { getSupabase } from './supabase'

export async function getSetting(key, fallback = null) {
  const { data, error } = await getSupabase().from('app_settings').select('value').eq('key', key).maybeSingle()
  if (error || !data || data.value === null || data.value === undefined) return fallback
  return data.value
}

export async function setSetting(key, value) {
  const { error } = await getSupabase().from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  return { error }
}

export const SETTING_DEFAULTS = {
  mileage_rate: { rate: 0.76, unit: 'mile' },
  flight_approval_limits: { one_way: 300, round_trip: 450, multi_city: 550 },
  per_diem_defaults: { breakfast: 10, lunch: 20, dinner: 30, meal_times: { breakfast: '07:00', lunch: '12:00', dinner: '18:00' } },
  hotel_cost_groups: ['Production', 'Merchandise', 'FOH', 'Pay On Own'],
}
