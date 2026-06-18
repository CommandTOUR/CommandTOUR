export async function confirmStaffMember({ supabase, eventId, staffId, confirm = true }) {
  if (confirm) {
    const [arrRes, depRes] = await Promise.all([
      supabase.from('event_travel_arrivals').select('id').eq('event_id', eventId).eq('staff_id', staffId).maybeSingle(),
      supabase.from('event_travel_departures').select('id').eq('event_id', eventId).eq('staff_id', staffId).maybeSingle(),
    ])
    if (!arrRes.data) {
      const { error } = await supabase.from('event_travel_arrivals').insert([{ event_id: eventId, staff_id: staffId }])
      if (error) return { error }
    } else {
      await supabase.from('event_travel_arrivals').update({ flagged: false }).eq('id', arrRes.data.id)
    }
    if (!depRes.data) {
      const { error } = await supabase.from('event_travel_departures').insert([{ event_id: eventId, staff_id: staffId }])
      if (error) return { error }
    } else {
      await supabase.from('event_travel_departures').update({ flagged: false }).eq('id', depRes.data.id)
    }
    return { error: null }
  } else {
    await Promise.all([
      supabase.from('event_travel_arrivals').update({ flagged: true }).eq('event_id', eventId).eq('staff_id', staffId),
      supabase.from('event_travel_departures').update({ flagged: true }).eq('event_id', eventId).eq('staff_id', staffId),
    ])
    return { error: null }
  }
}
