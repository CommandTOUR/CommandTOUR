'use client'

// Which travelers need a hotel room, per diem, or a rental car. These flags live on event_staff_travel and drive the Hotel, Per Diem and Rental Cars tabs.
import { useMemo, useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { quickToast } from '@/lib/quickToast'
import { CARD, LINE, SMALL_LABEL, TH, TD, personName } from './shared'

const statusColor = (status) => (status === 'pending' ? 'var(--text-warning-legible)' : status === 'needs_attention' ? 'var(--color-danger)' : 'var(--text-primary)')

function Check({ checked, onClick, disabled }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div onClick={disabled ? undefined : onClick} role="checkbox" aria-checked={checked}
        style={{ width: 18, height: 18, borderRadius: 4, cursor: disabled ? 'default' : 'pointer', background: checked ? 'rgba(0,208,132,0.2)' : 'transparent', border: checked ? '1px solid #00D084' : '1px solid var(--border-stronger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {checked && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="#00D084" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
    </div>
  )
}

export default function RosterTab({ eventId, people, canEdit }) {
  const [flags, setFlags] = useState([])
  const load = useCallback(async () => {
    const { data } = await getSupabase().from('event_staff_travel').select('*').eq('event_id', eventId)
    setFlags(data || [])
  }, [eventId])
  useEffect(() => { load() }, [load])

  const update = async (staffId, field, value) => {
    const supabase = getSupabase()
    const existing = flags.find(t => t.staff_id === staffId)
    const { error } = existing
      ? await supabase.from('event_staff_travel').update({ [field]: value }).eq('id', existing.id)
      : await supabase.from('event_staff_travel').insert([{ event_id: eventId, staff_id: staffId, travel_type: 'na', [field]: value }])
    if (error) quickToast(`Could not save: ${error.message}`)
    load()
  }

  const grouped = useMemo(() => {
    const groups = {}, order = {}
    people.forEach(s => {
      const dept = s.position?.department || 'Other'
      if (!groups[dept]) { groups[dept] = []; order[dept] = s.position?.deptSortOrder ?? 999 }
      groups[dept].push(s)
    })
    return Object.entries(groups).sort(([a], [b]) => (order[a] ?? 999) - (order[b] ?? 999))
  }, [people])

  const center = { ...TD, textAlign: 'center' }
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <div style={{ ...CARD, overflow: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
          <colgroup><col style={{ width: '24%' }} /><col style={{ width: '34%' }} /><col style={{ width: '14%' }} /><col style={{ width: '14%' }} /><col style={{ width: '14%' }} /></colgroup>
          <thead><tr><th style={TH}>Position</th><th style={TH}>Staff Member</th><th style={{ ...TH, textAlign: 'center' }}>Hotel</th><th style={{ ...TH, textAlign: 'center' }}>Per Diem</th><th style={{ ...TH, textAlign: 'center' }}>Rental</th></tr></thead>
          <tbody>
            {people.length === 0 && <tr><td colSpan={5} style={{ ...TD, color: 'var(--text-muted-legible)' }}>No one is assigned to this event yet.</td></tr>}
            {grouped.map(([dept, members]) => (
              <Group key={dept} dept={dept}>
                {members.map(s => {
                  const f = flags.find(t => t.staff_id === s.staff_id)
                  return (
                    <tr key={s.id}>
                      <td style={TD}>{s.position?.title || '—'}</td>
                      <td style={{ ...TD, fontWeight: 600, color: statusColor(s.status) }}>{personName(s.staff)}</td>
                      <td style={center}><Check checked={!!f?.needs_hotel} disabled={!canEdit} onClick={() => update(s.staff_id, 'needs_hotel', !f?.needs_hotel)} /></td>
                      <td style={center}><Check checked={!!f?.needs_perdiem} disabled={!canEdit} onClick={() => update(s.staff_id, 'needs_perdiem', !f?.needs_perdiem)} /></td>
                      <td style={center}><Check checked={!!f?.needs_rental} disabled={!canEdit} onClick={() => update(s.staff_id, 'needs_rental', !f?.needs_rental)} /></td>
                    </tr>
                  )
                })}
              </Group>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Group({ dept, children }) {
  return (
    <>
      <tr><td colSpan={5} style={{ ...SMALL_LABEL, fontSize: 12, padding: '6px 10px', background: 'color-mix(in srgb, var(--color-info) 6%, transparent)', borderBottom: `1px solid ${LINE}`, color: 'var(--color-info)' }}>{dept}</td></tr>
      {children}
    </>
  )
}
