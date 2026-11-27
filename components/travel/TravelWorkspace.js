'use client'

// The travel workspace on the event page: a header band with live counts, then Travelers, Roster, Hotel, Rental Cars and Per Diem tabs.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useProfile } from '@/lib/auth/profile'
import { listTripsForEvent, computeFlags } from '@/lib/travel/trips'
import useUndoable from '@/components/staffing/useUndoable'
import TravelHotelTab from '@/components/TravelHotelTab'
import TravelersTab from './TravelersTab'
import RosterTab from './RosterTab'
import { GLASS, BTN_PRIMARY } from './shared'

const TABS = [
  { key: 'travelers', label: 'Travelers' },
  { key: 'roster', label: 'Roster' },
  { key: 'hotel', label: 'Hotel' },
  { key: 'rental', label: 'Rental Cars' },
  { key: 'perdiem', label: 'Per Diem' },
]

const fmtShort = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')

export default function TravelWorkspace({ eventId, event, tour }) {
  const { role } = useProfile()
  const canEdit = ['admin', 'manager', 'coordinator'].includes(role) // Finance can see, not edit
  const canSee = canEdit || role === 'finance'
  const [tab, setTab] = useState('travelers')
  const [assignments, setAssignments] = useState([])
  const [trips, setTrips] = useState([])
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [modalRequest, setModalRequest] = useState(0)

  const load = useCallback(async () => {
    const supabase = getSupabase()
    try {
      const [a, t, s] = await Promise.all([
        supabase.from('staff_assignments')
          .select(`id, staff_id, status, confirmed, staff:staff_id(id, first_name, last_name, display_name),
            tour_position:tour_position_id(position:position_id(title, sort_order, department:department_id(name, sort_order)))`)
          .eq('event_id', eventId).not('locked', 'is', true).is('deleted_at', null),
        listTripsForEvent(supabase, eventId),
        supabase.from('staff').select('id, first_name, last_name, display_name').order('last_name', { ascending: true }),
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
  const tbdRoles = useMemo(() => assignments.filter(a => !a.staff_id && a.position.title).map(a => ({ id: a.id, title: a.position.title })), [assignments])

  const stats = useMemo(() => {
    let booked = 0, good = 0
    for (const p of people) {
      const f = computeFlags(trips.filter(t => t.staff_id === p.staff_id))
      if (f.booked) booked++
      else if (f.good_to_book) good++
    }
    return { travelers: people.length, booked, good, action: trips.filter(t => t.needs_rework).length }
  }, [people, trips])

  const color = tour?.color || 'var(--color-info)'
  if (!canSee) return <div style={{ fontSize: 15, color: 'var(--text-muted)', padding: 16 }}>You do not have access to travel.</div>

  const dates = [event?.load_in_date && `Load-In ${fmtShort(event.load_in_date)}`, event?.load_out_date && `Load-Out ${fmtShort(event.load_out_date)}`].filter(Boolean).join(' · ')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', gap: 10 }}>
      <div style={{ ...GLASS, border: `2.5px solid ${color}`, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{tour?.name || 'Tour'}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{[event?.city, event?.state].filter(Boolean).join(', ') || 'Event'}</div>
          <div style={{ fontSize: 15, color: 'var(--text-secondary)' }}>{[event?.venue_name, dates].filter(Boolean).join(' · ')}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Travelers', value: stats.travelers, color: 'var(--text-primary)' },
            { label: 'Booked', value: stats.booked, color: 'var(--color-success)' },
            { label: 'Good To Book', value: stats.good, color: 'var(--color-info)' },
            { label: 'Needs Action', value: stats.action, color: stats.action ? 'var(--color-warning)' : 'var(--text-primary)' },
          ].map(s => (
            <div key={s.label} style={{ border: '0.5px solid var(--border-default)', borderRadius: 8, padding: '6px 14px', minWidth: 100, textAlign: 'center', background: 'var(--surface-card)' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} style={{ fontSize: 16, padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: tab === t.key ? 'rgba(26,86,219,0.08)' : 'transparent', color: tab === t.key ? 'var(--color-info)' : 'var(--text-secondary)', fontWeight: tab === t.key ? 600 : 400 }}>{t.label}</button>
          ))}
        </div>
        {tab === 'travelers' && canEdit && <button type="button" onClick={() => setModalRequest(n => n + 1)} style={BTN_PRIMARY}>+ Add Traveler</button>}
      </div>

      {error && <div role="alert" style={{ fontSize: 15, color: 'var(--color-danger)' }}>{error}</div>}
      {loading ? <div style={{ fontSize: 16, color: 'var(--text-muted)' }}>Loading...</div> : (
        <>
          {tab === 'travelers' && <TravelersTab eventId={eventId} people={people} tbdRoles={tbdRoles} trips={trips} staffList={staffList} canEdit={canEdit} undoable={undoable} reload={load} modalRequest={modalRequest} onModalHandled={() => setModalRequest(0)} />}
          {tab === 'roster' && <RosterTab eventId={eventId} people={people} canEdit={canEdit} />}
          {['hotel', 'rental', 'perdiem'].includes(tab) && event && <TravelHotelTab key={tab} eventId={eventId} event={event} initialTab={tab} />}
        </>
      )}
      {toastElement}
      {toast && <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 100000, background: '#33FF99', color: '#0a1628', borderRadius: 10, padding: '10px 20px', fontSize: 15, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}>✓ {toast}</div>}
    </div>
  )
}
