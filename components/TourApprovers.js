'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabase } from '../lib/supabase'
import { useProfile } from '../lib/auth/profile'

const staffLabel = (s) => s.display_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unnamed'
const LABEL = { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }

// Who can approve travel requests for this tour. Admins and Managers edit; Coordinators and Finance see it.
export default function TourApprovers({ tourId }) {
  const { isManager, isOps } = useProfile()
  const [approvers, setApprovers] = useState([])
  const [staff, setStaff] = useState([])
  const [pick, setPick] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const supabase = getSupabase()
    const [a, s] = await Promise.all([
      supabase.from('tour_approvers').select('id, staff_id, staff:staff_id(id, first_name, last_name, display_name)').eq('tour_id', tourId).order('created_at', { ascending: true }),
      supabase.from('staff').select('id, first_name, last_name, display_name').order('last_name', { ascending: true }),
    ])
    if (a.error) { setError(`Could not load approvers. ${a.error.message}`); return }
    setApprovers(a.data || [])
    setStaff(s.data || [])
  }, [tourId])
  useEffect(() => { if (isOps) load() }, [load, isOps])

  if (!isOps) return null

  const add = async () => {
    if (!pick) return
    setError('')
    const { error: err } = await getSupabase().from('tour_approvers').insert([{ tour_id: tourId, staff_id: pick }])
    if (err && err.code !== '23505') setError(`Could not add approver. ${err.message}`)
    setPick('')
    load()
  }
  const remove = async (id) => {
    setError('')
    const { error: err } = await getSupabase().from('tour_approvers').delete().eq('id', id)
    if (err) setError(`Could not remove approver. ${err.message}`)
    load()
  }
  const taken = new Set(approvers.map(a => a.staff_id))

  return (
    <div>
      <label style={LABEL}>Approvers</label>
      {approvers.length === 0 && <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 8 }}>No approvers yet.</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: isManager ? 12 : 0 }}>
        {approvers.map(a => (
          <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, padding: '5px 12px', borderRadius: 999, border: '0.5px solid var(--border-default)', background: 'var(--surface-card)', color: 'var(--text-primary)' }}>
            {a.staff ? staffLabel(a.staff) : 'Unknown'}
            {isManager && <span onClick={() => remove(a.id)} role="button" aria-label="Remove Approver" style={{ cursor: 'pointer', color: 'var(--color-danger)', fontSize: 14 }}>Remove</span>}
          </span>
        ))}
      </div>
      {isManager && (
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={pick} onChange={e => setPick(e.target.value)} style={{ flex: 1, fontSize: 16, padding: '10px 14px', borderRadius: 8, border: '0.5px solid var(--border-default)', background: 'var(--surface-card)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
            <option value="">Select Staff Member</option>
            {staff.filter(s => !taken.has(s.id)).map(s => <option key={s.id} value={s.id}>{staffLabel(s)}</option>)}
          </select>
          <button onClick={add} disabled={!pick} style={{ background: 'transparent', border: '0.5px solid var(--color-info)', color: 'var(--color-info)', borderRadius: 8, fontSize: 15, padding: '8px 16px', cursor: pick ? 'pointer' : 'default', opacity: pick ? 1 : 0.5 }}>Add Approver</button>
        </div>
      )}
      {error && <div role="alert" style={{ fontSize: 15, color: 'var(--color-danger)', marginTop: 8 }}>{error}</div>}
    </div>
  )
}
