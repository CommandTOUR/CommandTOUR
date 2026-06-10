import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const [toursRes, eventsRes, venuesRes] = await Promise.all([
    supabase.from('tours').select('id, name, color, status, tour_type').order('name', { ascending: true }),
    supabase.from('events').select('id, tour_id, city, state, country, venue_name, venue_id, status, booking_note, load_in_date, load_out_date, saturday_date, sunday_date'),
    supabase.from('venues').select('id, name, place_id, city, state, country'),
  ])

  if (toursRes.error || eventsRes.error || venuesRes.error) {
    const error = toursRes.error || eventsRes.error || venuesRes.error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    tours: toursRes.data || [],
    events: eventsRes.data || [],
    venues: venuesRes.data || [],
  })
}
