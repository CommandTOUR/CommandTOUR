import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const [toursRes, eventsRes, venuesRes, showListRes] = await Promise.all([
    supabase.from('tours').select('id, name, color, status, tour_type, year, created_at').order('name', { ascending: true }),
    supabase.from('events').select('id, tour_id, city, state, country, venue_name, venue_id, status, booking_note, load_in_date, load_out_date, saturday_date, sunday_date'),
    supabase.from('venues').select('id, name, place_id, city, state, country'),
    supabase.from('show_list').select('id, event_id, show_date'),
  ])

  if (toursRes.error || eventsRes.error || venuesRes.error || showListRes.error) {
    const error = toursRes.error || eventsRes.error || venuesRes.error || showListRes.error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    tours: toursRes.data || [],
    events: eventsRes.data || [],
    venues: venuesRes.data || [],
    showList: showListRes.data || [],
  })
}
