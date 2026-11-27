// The event's travel budget (event_budgets).
export async function getBudget(supabase, eventId) {
  const { data, error } = await supabase.from('event_budgets').select('*').eq('event_id', eventId).maybeSingle()
  if (error) throw new Error(`Budget: ${error.message}`)
  return data
}
export async function saveBudget(supabase, eventId, value) {
  const v = value === '' || value === null || value === undefined ? null : Number(value)
  const { error } = await supabase.from('event_budgets').upsert({ event_id: eventId, travel_budget: Number.isFinite(v) ? v : null, updated_at: new Date().toISOString() }, { onConflict: 'event_id' })
  if (error) throw new Error(`Budget: ${error.message}`)
}
