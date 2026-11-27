'use client'

// The travel workspace on the event page. Structure follows docs/mockups/travel-workspace.html: a tab strip with the count on each tab
// and "+ Add Traveler" at the right of the Travelers tab. Every tab reads from one shared data load that refreshes after each write.
import { useMemo, useState } from 'react'
import { useProfile } from '@/lib/auth/profile'
import { isEntered } from '@/lib/travel/trips'
import useUndoable from '@/components/staffing/useUndoable'
import TravelHotelTab from '@/components/TravelHotelTab'
import TravelersTab from './TravelersTab'
import GroundTab from './GroundTab'
import useTravelData from './useTravelData'
import { LINE, BTN_P } from './shared'

export default function TravelWorkspace({ eventId, event }) {
  const { role } = useProfile()
  const canEdit = ['admin', 'manager', 'coordinator'].includes(role) // Finance can see, not edit
  const canSee = canEdit || role === 'finance'
  const [tab, setTab] = useState('travelers')
  const [toast, setToast] = useState('')
  const [modalRequest, setModalRequest] = useState(0)
  const { data, loading, error, reload } = useTravelData(eventId)

  const { undoable, toastElement } = useUndoable({
    tourIdsFor: () => [event?.tour_id],
    onUndone: reload,
    onMessage: (m) => { setToast(m); setTimeout(() => setToast(''), 3000) },
  })

  const travelerCount = useMemo(() => {
    const ids = new Set(data.assignments.filter(a => a.staff_id).map(a => a.staff_id))
    for (const t of data.trips) if (isEntered(t) && !t.needs_rework) ids.add(t.staff_id)
    return ids.size
  }, [data.assignments, data.trips])

  if (!canSee) return <div style={{ fontSize: 15, color: 'var(--text-muted-legible)', padding: 16 }}>You do not have access to travel.</div>

  const TABS = [
    { key: 'travelers', label: `Travelers (${travelerCount})` },
    { key: 'ground', label: `Ground Transport (${data.trips.filter(t => isEntered(t) && !t.needs_rework).length})` },
    { key: 'hotel', label: 'Hotel' },
    { key: 'perdiem', label: 'Per Diem' },
  ]

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
          {tab === 'travelers' && <TravelersTab eventId={eventId} data={data} canEdit={canEdit} undoable={undoable} reload={reload} modalRequest={modalRequest} onModalHandled={() => setModalRequest(0)} />}
          {tab === 'ground' && <GroundTab eventId={eventId} data={data} canEdit={canEdit} reload={reload} />}
          {['hotel', 'perdiem'].includes(tab) && event && <TravelHotelTab key={tab} eventId={eventId} event={event} initialTab={tab} />}
        </>
      )}
      {toastElement}
      {toast && <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 100000, background: '#33FF99', color: '#0a1628', borderRadius: 10, padding: '10px 20px', fontSize: 15, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}>✓ {toast}</div>}
    </div>
  )
}
