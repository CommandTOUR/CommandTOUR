import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabaseServer'
import PrintClient from './PrintClient'

export default async function PrintSchedulePage({ params, searchParams }) {
  const { tourId } = await params
  const { year } = await searchParams

  // Runs as the logged-in user so row-level security applies
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tour } = await supabase
    .from('tours')
    .select('id, name, tour_type, region, color, logo_url')
    .eq('id', tourId)
    .single()

  // The page reads event.date / event.show_count; events store these as load_in_date / num_shows
  const { data: events } = await supabase
    .from('events')
    .select('id, date:load_in_date, city, state, country, venue_name, status, show_count:num_shows, notes')
    .eq('tour_id', tourId)
    .order('load_in_date', { ascending: true })

  // ?year=YYYY pre-selects a year (e.g. the tour page's selected year)
  return <PrintClient tour={tour} events={events || []} initialYear={typeof year === 'string' ? year : null} />
}
