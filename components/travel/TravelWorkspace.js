'use client'

// The travel workspace on the event page. Structure follows docs/mockups/travel-workspace.html: a header band with a tour-colored
// border and live counts, then a tab strip (Travelers, Roster, Hotel, Rental Cars, Per Diem) with "+ Add Traveler" at the right.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useProfile } from '@/lib/auth/profile'
import { listTripsForEvent, listSegmentSuggestions } from '@/lib/travel/trips'
import useUndoable from '@/components/staffing/useUndoable'
import TravelHotelTab from '@/components/TravelHotelTab'
import TravelersTab from './TravelersTab'
import RosterTab from './RosterTab'
import { LINE, BTN_P } from './shared'

const TABS = [
  { key: 'travelers', label: 'Travelers' },
  { key: 'roster', label: 'Roster' },
  { key: 'hotel', label: 'Hotel' },
  { key: 'rental', label: 'Rental Cars' },
  { key: 'perdiem', label: 'Per Diem' },
]

export default function TravelWorkspace({ eventId, event, tour }) {
  const { role } = useProfile()
  const canEdit = ['admin', 'manager', 'coordinator'].includes(role) // Finance can see, not edit
  const canSee = canEdit || role === 'finance'
  const [tab, setTab] = useState('travelers')
  const [assignments, setAssignments] = useState([])
  const [trips, setTrips] = useState([])
  const [staffList, setStaffList] = useState([])
  const [roomedIds, setRoomedIds] = useState(new Set())
  const [needsByStaff, setNeedsByStaff] = useState({})
  const [suggest, setSuggest] = useState({ airlines: [], airports: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [modalRequest, setModalRequest] = useState(0)

  const load = useCallback(async () => {
    const supabase = getSupabase()
    try {
      const [a, t, s, rooms, flags, sug] = await Promise.all([
        supabase.from('staff_assignments')
          .select(`id, staff_id, status, confirmed, staff:staff_id(id, first_name, last_name, display_name),
            tour_position:tour_position_id(position:position_id(title, sort_order, department:department_id(name, sort_order)))`)
          .eq('event_id', eventId).not('locked', 'is', true).is('deleted_at', null),
        listTripsForEvent(supabase, eventId),
        supabase.from('staff').select('id, first_name, last_name, display_name').order('last_name', { ascending: true }),
        supabase.from('event_hotel_rooms').select('staff_id, staff_id_1, staff_id_2').eq('event_id', eventId),
        supabase.from('event_staff_travel').select('staff_id, needs_hotel, needs_perdiem').eq('event_id', eventId),
        listSegmentSuggestions(supabase).catch(() => ({ airlines: [], airports: [] })),
      ])
      if (a.error) throw a.error
      setAssignments((a.data || []).map(r => ({
        id: r.id, staff_id: r.staff_id, staff: r.staff, status: r.status,
        position: {
          title: r.tour_position?.position?.title || null,
          sortOrder: r.tour_position?.position?.sort_order ?? 999,
          department: r.tour_position?.position?.department?.name || 'Other',
          deptSortOrder: r.tour_position?.position?.department?.sort_order ?? 999,
        },
      })).sort((x, y) => x.position.deptSortOrder - y.position.deptSortOrder || x.position.sortOrder - y.position.sortOrder))
      setTrips(t)
      setStaffList(s.data || [])
      setRoomedIds(new Set((rooms.data || []).flatMap(r => [r.staff_id, r.staff_id_1, r.staff_id_2]).filter(Boolean)))
      setNeedsByStaff(Object.fromEntries((flags.data || []).map(f => [f.staff_id, f])))
      setSuggest(sug)
      setError('')
    } catch (e) {
      console.error('Could not load travel:', e)
      setError('Could not load travel. Please refresh.')
    }
    setLoading(false)
  }, [eventId])
  useEffect(() => { load() }, [load])

  const { undoable, toastElement } = useUndoable({
    tourIdsFor: () => [event?.tour_id],
    onUndone: load,
    onMessage: (m) => { setToast(m); setTimeout(() => setToast(''), 3000) },
  })

  const people = useMemo(() => assignments.filter(a => a.staff_id), [assignments])
  const tbdRoles = useMemo(() => assignments.filter(a => !a.staff_id && a.position.title).map(a => ({ id: a.id, title: a.position.title, department: a.position.department, deptSortOrder: a.position.deptSortOrder, sortOrder: a.position.sortOrder })), [assignments])

  if (!canSee) return <div style={{ fontSize: 15, color: 'var(--text-muted-legible)', padding: 16 }}>You do not have access to travel.</div>

  return (
    <div className="travel-workspace" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 12px', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${LINE}`, flex: 1 }}>
          {TABS.map(t => (
            <div key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              style={{ padding: '9px 16px', fontSize: 16, fontWeight: 600, cursor: 'pointer', marginBottom: -1, color: tab === t.key ? 'var(--color-info)' : 'var(--text-muted-legible)', borderBottom: `3px solid ${tab === t.key ? 'var(--color-info)' : 'transparent'}` }}>{t.label}</div>
          ))}
        </div>
        {tab === 'travelers' && canEdit && <button type="button" onClick={() => setModalRequest(n => n + 1)} style={BTN_P}>+ Add Traveler</button>}
      </div>

      {error && <div role="alert" style={{ fontSize: 15, color: 'var(--color-danger)', marginBottom: 8 }}>{error}</div>}
      {loading ? <div style={{ fontSize: 16, color: 'var(--text-muted-legible)' }}>Loading...</div> : (
        <>
          {tab === 'travelers' && <TravelersTab eventId={eventId} people={people} tbdRoles={tbdRoles} trips={trips} staffList={staffList} canEdit={canEdit} undoable={undoable} reload={load} modalRequest={modalRequest} onModalHandled={() => setModalRequest(0)} roomedIds={roomedIds} needsByStaff={needsByStaff} suggest={suggest} />}
          {tab === 'roster' && <RosterTab eventId={eventId} people={people} canEdit={canEdit} />}
          {['hotel', 'rental', 'perdiem'].includes(tab) && event && <TravelHotelTab key={tab} eventId={eventId} event={event} initialTab={tab} />}
        </>
      )}
      {toastElement}
      {toast && <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 100000, background: '#33FF99', color: '#0a1628', borderRadius: 10, padding: '10px 20px', fontSize: 15, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}>✓ {toast}</div>}
    </div>
  )
}
