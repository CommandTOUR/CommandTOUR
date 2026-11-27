'use client'

// Which travelers need a hotel room, per diem, or a rental car. These flags live on event_staff_travel and drive the Hotel, Per Diem and Rental Cars tabs.
import { useMemo, useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase'
import { quickToast } from '@/lib/quickToast'
import { GLASS, HEADER_CELL, personName } from './shared'

const GRID = '1.2fr 1.6fr 0.6fr 0.7fr 0.6fr'
const statusColor = (status) => (status === 'pending' ? 'var(--color-warning)' : status === 'needs_attention' ? 'var(--color-danger)' : 'var(--text-primary)')

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: '0 6px', padding: '12px 16px 6px', alignItems: 'center', flexShrink: 0 }}>
        <div style={HEADER_CELL}>Position</div>
        <div style={{ ...HEADER_CELL, paddingLeft: 16 }}>Staff Member</div>
        <div style={{ ...HEADER_CELL, textAlign: 'center' }}>Hotel</div>
        <div style={{ ...HEADER_CELL, textAlign: 'center' }}>Per Diem</div>
        <div style={{ ...HEADER_CELL, textAlign: 'center' }}>Rental</div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', ...GLASS }}>
        <div style={{ height: '100%', overflowY: 'auto' }}>
          {people.length === 0 && <div style={{ padding: '16px', fontSize: 15, color: 'var(--text-muted)' }}>No one is assigned to this event yet.</div>}
          {grouped.map(([dept, members], i) => (
            <div key={dept}>
              <div style={{ padding: '6px 14px', background: 'rgba(26,86,219,0.05)', borderTop: i === 0 ? 'none' : '0.5px solid var(--border-default)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-info)' }}>{dept}</span>
              </div>
              {members.map(s => {
                const f = flags.find(t => t.staff_id === s.staff_id)
                return (
                  <div key={s.id} style={{ display: 'grid', gridTemplateColumns: GRID, gap: '0 6px', alignItems: 'center', padding: '7px 16px', borderTop: '0.5px solid var(--border-default)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.position?.title || '—'}</div>
                    <div style={{ fontSize: 15, color: statusColor(s.status), paddingLeft: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{personName(s.staff)}</div>
                    <Check checked={!!f?.needs_hotel} disabled={!canEdit} onClick={() => update(s.staff_id, 'needs_hotel', !f?.needs_hotel)} />
                    <Check checked={!!f?.needs_perdiem} disabled={!canEdit} onClick={() => update(s.staff_id, 'needs_perdiem', !f?.needs_perdiem)} />
                    <Check checked={!!f?.needs_rental} disabled={!canEdit} onClick={() => update(s.staff_id, 'needs_rental', !f?.needs_rental)} />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
