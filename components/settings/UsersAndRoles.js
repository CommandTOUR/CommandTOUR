'use client'

import { useEffect, useState, useCallback } from 'react'
import { getSupabase } from '../../lib/supabase'
import { useProfile, ROLES, ROLE_LABELS } from '../../lib/auth/profile'
import { SectionCard, INPUT, LABEL } from './styles'

const GRID = '1.6fr 140px 1.6fr 110px'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const staffLabel = (s) => s.display_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unnamed'

export default function UsersAndRoles() {
  const { isAdmin, realRole, userId, viewingAs, setViewAs } = useProfile()
  const [users, setUsers] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const supabase = getSupabase()
    const [u, s] = await Promise.all([
      supabase.rpc('admin_list_users'),
      supabase.from('staff').select('id, first_name, last_name, display_name').order('last_name', { ascending: true }),
    ])
    if (u.error) setError(`Could not load users. ${u.error.message}`)
    setUsers(u.data || [])
    setStaff(s.data || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const update = async (userId, patch) => {
    setError('')
    const { error: err } = await getSupabase().from('user_profiles')
      .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (err) setError(/user_profiles_staff_id_key|duplicate/i.test(err.message) ? 'That staff member is already linked to another login.' : `Could not save. ${err.message}`)
    await load()
  }

  if (!isAdmin && realRole !== 'admin') return <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>Only Admins can manage users and roles.</div>

  const linkedElsewhere = (uid) => new Set(users.filter(u => u.user_id !== uid && u.staff_id).map(u => u.staff_id))
  const select = { ...INPUT, fontSize: 14, padding: '6px 10px', width: '100%', cursor: 'pointer' }

  return (
    <>
      <SectionCard title="View As (Preview Only)" description="See the screens another role would see. This only changes what is shown to you. Your data access does not change.">
        <label style={LABEL}>Preview Screens As</label>
        <select value={viewingAs || ''} onChange={e => setViewAs(e.target.value || null)} style={{ ...INPUT, width: 220, cursor: 'pointer' }}>
          <option value="">Myself (Admin)</option>
          {ROLES.filter(r => r !== 'admin').map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </SectionCard>

      <SectionCard title="Logins" description="Add new logins in the Supabase dashboard (Authentication → Users → Add User). They appear here, and you can then set a role and link a staff member.">
        {error && <div role="alert" style={{ fontSize: 15, color: 'var(--color-danger)', marginBottom: 10 }}>{error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: '0 12px', padding: '0 0 10px' }}>
          {['Email', 'Role', 'Linked Staff Member', 'Created'].map(h => (
            <div key={h} style={{ fontSize: 12.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
          ))}
        </div>
        {loading && <div style={{ fontSize: 15, color: 'var(--text-muted)', padding: '8px 0' }}>Loading...</div>}
        {!loading && users.length === 0 && <div style={{ fontSize: 15, color: 'var(--text-muted)', padding: '8px 0' }}>No logins found.</div>}
        {users.map((u, i) => {
          const taken = linkedElsewhere(u.user_id)
          const isMe = u.user_id === userId
          const unlinked = !u.staff_id
          return (
            <div key={u.user_id} style={{ display: 'grid', gridTemplateColumns: GRID, gap: '0 12px', padding: '10px 8px', margin: '0 -8px', borderTop: i > 0 ? '0.5px solid var(--border-default)' : 'none', alignItems: 'center', background: unlinked ? 'var(--status-1hold-bg)' : 'transparent', borderRadius: unlinked ? 8 : 0 }}>
              <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.email}
                {isMe && <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--color-success)', background: 'var(--status-confirmed-bg)', border: '0.5px solid var(--status-confirmed-border)', borderRadius: 999, padding: '1px 6px' }}>You</span>}
              </div>
              <select value={u.role || ''} disabled={isMe} title={isMe ? 'You cannot change your own role' : undefined}
                onChange={e => update(u.user_id, { role: e.target.value })} style={{ ...select, opacity: isMe ? 0.6 : 1 }}>
                {!u.role && <option value="" disabled>No Role</option>}
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <select value={u.staff_id || ''} onChange={e => update(u.user_id, { staff_id: e.target.value || null })} style={select}>
                <option value="">Not Linked</option>
                {staff.filter(s => !taken.has(s.id)).map(s => <option key={s.id} value={s.id}>{staffLabel(s)}</option>)}
              </select>
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{fmtDate(u.created_at)}</div>
            </div>
          )
        })}
      </SectionCard>
    </>
  )
}
