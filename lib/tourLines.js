import { getSupabase } from './supabase'

// A "tour line" is identified by tours.sort_order (1-6). Each line has ONE persistent tour;
// events are placed by date, so the year comes from the events, not the tour.

export const NO_TOUR_MSG = 'No tour set up for this line'

// The single non-deleted tour for a line, or null when the line has none.
export async function getTourForLine(sortOrder) {
  if (sortOrder == null) return null
  const { data, error } = await getSupabase().from('tours').select('*')
    .eq('sort_order', sortOrder).is('deleted_at', null)
    .order('created_at', { ascending: true }).limit(1)
  if (error) throw error
  return data?.[0] || null
}
