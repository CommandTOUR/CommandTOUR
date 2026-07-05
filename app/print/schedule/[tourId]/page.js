import { createClient } from '@supabase/supabase-js'
import PrintClient from './PrintClient'

export default async function PrintSchedulePage({ params }) {
  console.log('SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: tour } = await supabase
    .from('tours')
    .select('id, name, tour_type, region, color, logo_url, year')
    .eq('id', params.tourId)
    .single()

  const { data: events } = await supabase
    .from('events')
    .select('id, date, city, state, country, venue_name, status, show_count, notes')
    .eq('tour_id', params.tourId)
    .order('date', { ascending: true })

  return <PrintClient tour={tour} events={events || []} />
}
