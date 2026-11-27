'use client'

// Everything the travel workspace shows, loaded in one place and refreshed after every write.
// All reads go through the signed-in user's session client.
import { useCallback, useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { listTripsForEvent, listSegmentSuggestions } from '@/lib/travel/trips'
import { listEventTravelers } from '@/lib/travel/travelers'
import { listGroundLegs, listRentalCars } from '@/lib/travel/ground'
import { getHotel, listRooms } from '@/lib/travel/hotelData'
import { getPerDiemSettings, listMealsProvided } from '@/lib/travel/perDiemData'
import { getBudget } from '@/lib/travel/budget'
import { getSetting, SETTING_DEFAULTS } from '@/lib/settings'

const EMPTY = {
  assignments: [], trips: [], staffList: [], travelers: [], legs: [], rentals: [], hotel: null, rooms: [], meals: [], rates: null,
  perDiemSettings: { rates: { breakfast_rate: 0, lunch_rate: 0, dinner_rate: 0 }, mealTimes: {} }, suggest: { airlines: [], airports: [] },
  mileageRate: SETTING_DEFAULTS.mileage_rate.rate, costGroups: SETTING_DEFAULTS.hotel_cost_groups, budget: null,
}

export default function useTravelData(eventId) {
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const supabase = getSupabase()
    try {
      const [a, trips, staff, travelers, legs, rentals, hotel, rooms, meals, ratesRes, pdSettings, sug, mileage, groups, budget] = await Promise.all([
        supabase.from('staff_assignments')
          .select(`id, staff_id, status, confirmed, staff:staff_id(id, first_name, last_name, display_name),
            tour_position:tour_position_id(position:position_id(title, sort_order, department:department_id(name, sort_order)))`)
          .eq('event_id', eventId).not('locked', 'is', true).is('deleted_at', null),
        listTripsForEvent(supabase, eventId),
        supabase.from('staff').select('id, first_name, last_name, display_name').order('last_name', { ascending: true }),
        listEventTravelers(supabase, eventId),
        listGroundLegs(supabase, eventId),
        listRentalCars(supabase, eventId),
        getHotel(supabase, eventId),
        listRooms(supabase, eventId),
        listMealsProvided(supabase, eventId),
        supabase.from('event_perdiem_rates').select('*').eq('event_id', eventId).maybeSingle(),
        getPerDiemSettings(),
        listSegmentSuggestions(supabase).catch(() => ({ airlines: [], airports: [] })),
        getSetting('mileage_rate', SETTING_DEFAULTS.mileage_rate),
        getSetting('hotel_cost_groups', SETTING_DEFAULTS.hotel_cost_groups),
        getBudget(supabase, eventId),
      ])
      if (a.error) throw a.error
      const assignments = (a.data || []).map(r => ({
        id: r.id, staff_id: r.staff_id, staff: r.staff, status: r.status,
        position: {
          title: r.tour_position?.position?.title || null,
          sortOrder: r.tour_position?.position?.sort_order ?? 999,
          department: r.tour_position?.position?.department?.name || 'Other',
          deptSortOrder: r.tour_position?.position?.department?.sort_order ?? 999,
        },
      })).sort((x, y) => x.position.deptSortOrder - y.position.deptSortOrder || x.position.sortOrder - y.position.sortOrder)
      setData({
        assignments, trips, staffList: staff.data || [], travelers, legs, rentals, hotel, rooms, meals,
        rates: ratesRes.data || null, perDiemSettings: pdSettings, suggest: sug, mileageRate: Number(mileage?.rate) || 0,
        costGroups: Array.isArray(groups) ? groups : SETTING_DEFAULTS.hotel_cost_groups, budget,
      })
      setError('')
    } catch (e) {
      console.error('Could not load travel:', e)
      setError('Could not load travel. Please refresh.')
    }
    setLoading(false)
  }, [eventId])

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}
