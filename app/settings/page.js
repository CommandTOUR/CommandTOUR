'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TopNav from '../../components/TopNav'
import { getSupabase } from '../../lib/supabase'

const AVATAR_COLORS = [
  '#33FF99', '#FFD60A', '#BF5AF2', '#3B82F6',
  '#FF9500', '#FF3B30', '#14B8A6', '#EC4899',
]

const TOUR_TYPES = ['HWMTL', 'HWSS', 'International', 'Domestic']

const SECTIONS = [
  { id: 'account',     label: 'Account' },
  { id: 'preferences', label: 'App Preferences' },
  { id: 'defaults',    label: 'Tour & Event Defaults' },
  { id: 'users',       label: 'User Management' },
]

const YEARS          = ['2025', '2026', '2027', '2028']
const LANDING_PAGES  = ['Dashboard', 'Tours', 'All Events', 'Calendar']
const ROLES          = ['admin', 'editor', 'viewer']
const ROLE_COLORS    = { admin: '#33FF99', editor: '#FFD60A', viewer: '#94a3b8' }

const INPUT = {
  fontFamily: 'Plus Jakarta Sans, sans-serif',
  fontSize: 13,
  padding: '10px 14px',
  borderRadius: 8,
  border: '0.5px solid rgba(255,255,255,0.15)',
  background: '#0d1f3a',
  color: '#f1f5f9',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const LABEL = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#94a3b8',
  display: 'block',
  marginBottom: 8,
}

const CARD = {
  background: 'rgba(255,255,255,0.06)',
  border: '0.5px solid rgba(255,255,255,0.10)',
  borderRadius: 12,
  padding: 24,
  marginBottom: 24,
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>{subtitle}</div>
      <div style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }} />
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('account')

  // Account
  const [user, setUser]               = useState(null)
  const [staffRecord, setStaffRecord] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [nameSaved, setNameSaved]     = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPw, setConfirmPw]     = useState('')
  const [pwMsg, setPwMsg]             = useState(null)
  const [avatarColor, setAvatarColor] = useState('#33FF99')

  // Preferences
  const [theme, setTheme]                 = useState('dark')
  const [defaultYear, setDefaultYear]     = useState('2026')
  const [defaultLanding, setDefaultLanding] = useState('Dashboard')

  // Defaults
  const [taskTemplates, setTaskTemplates]       = useState([])
  const [templateDefaults, setTemplateDefaults] = useState({})

  // Users
  const [staffList, setStaffList]         = useState([])
  const [staffRoles, setStaffRoles]       = useState({})
  const [inviteEmail, setInviteEmail]     = useState('')
  const [inviteRole, setInviteRole]       = useState('editor')
  const [inviteModal, setInviteModal]     = useState(null)
  const [pendingInvites, setPendingInvites] = useState([])
  const [removeModal, setRemoveModal]     = useState(null)
  const [linkCopied, setLinkCopied]       = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark'
    if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light')
    init()
  }, [])

  const init = async () => {
    const supabase = getSupabase()

    const { data: { user: authUser } } = await supabase.auth.getUser()
    setUser(authUser)

    if (authUser?.email) {
      const { data: staff } = await supabase
        .from('staff').select('*').eq('email', authUser.email).single()
      setStaffRecord(staff)
      if (staff) setDisplayName(`${staff.first_name || ''} ${staff.last_name || ''}`.trim())
    }

    const { data: templates } = await supabase
      .from('task_templates').select('id, name').order('name')
    setTaskTemplates(templates || [])

    const { data: staffData } = await supabase
      .from('staff').select('id, first_name, last_name, email, created_at').order('last_name')
    setStaffList(staffData || [])

    const { data: invitesData } = await supabase
      .from('pending_invites').select('*').order('invited_at', { ascending: false })
    setPendingInvites(invitesData || [])

    setAvatarColor(localStorage.getItem('avatarColor') || '#33FF99')
    setTheme(localStorage.getItem('theme') === 'light' ? 'light' : 'dark')
    setDefaultYear(localStorage.getItem('defaultEventsYear') || '2026')
    setDefaultLanding(localStorage.getItem('defaultLandingPage') || 'Dashboard')
    try { setTemplateDefaults(JSON.parse(localStorage.getItem('taskTemplateDefaults') || '{}')) } catch {}
    try { setStaffRoles(JSON.parse(localStorage.getItem('staffRoles') || '{}')) } catch {}
  }

  // ── Account handlers ──────────────────────────────────────────────────────

  const handleSaveName = async () => {
    if (!staffRecord) return
    const parts = displayName.trim().split(/\s+/)
    const first_name = parts[0] || ''
    const last_name  = parts.slice(1).join(' ') || ''
    const supabase = getSupabase()
    await supabase.from('staff').update({ first_name, last_name }).eq('id', staffRecord.id)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  const handleUpdatePassword = async () => {
    setPwMsg(null)
    if (newPassword.length < 8) { setPwMsg({ type: 'error', text: 'Password must be at least 8 characters.' }); return }
    if (newPassword !== confirmPw) { setPwMsg({ type: 'error', text: 'Passwords do not match.' }); return }
    const supabase = getSupabase()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPwMsg({ type: 'error', text: error.message }); return }
    setPwMsg({ type: 'success', text: 'Password updated successfully.' })
    setNewPassword(''); setConfirmPw('')
    setTimeout(() => setPwMsg(null), 3000)
  }

  const handleAvatarColor = (color) => {
    setAvatarColor(color)
    localStorage.setItem('avatarColor', color)
    window.dispatchEvent(new Event('avatarColorChanged'))
  }

  // ── Preferences handlers ──────────────────────────────────────────────────

  const applyTheme = (newTheme) => {
    if (newTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem('theme', newTheme)
    window.dispatchEvent(new Event('themeChanged'))
    setTheme(newTheme)
  }

  // ── Defaults handlers ─────────────────────────────────────────────────────

  const handleTemplateDefault = (tourType, templateId) => {
    const next = { ...templateDefaults, [tourType]: templateId }
    setTemplateDefaults(next)
    localStorage.setItem('taskTemplateDefaults', JSON.stringify(next))
  }

  // ── Users handlers ────────────────────────────────────────────────────────

  const getRoleForStaff = (staffId) => staffRoles[staffId] || 'editor'

  const handleRoleChange = (staff, newRole) => {
    const next = { ...staffRoles, [staff.id]: newRole }
    setStaffRoles(next)
    localStorage.setItem('staffRoles', JSON.stringify(next))
  }

  const handleInvite = () => {
    if (!inviteEmail.trim()) return
    setInviteModal({ email: inviteEmail.trim(), role: inviteRole })
  }

  const handleConfirmInvite = async () => {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('pending_invites').insert([{ email: inviteModal.email, role: inviteModal.role }])
    if (!error) {
      const { data } = await supabase
        .from('pending_invites').select('*').order('invited_at', { ascending: false })
      setPendingInvites(data || [])
    }
    setInviteEmail('')
    setInviteModal(null)
  }

  const handleRemoveUser = (staff) => {
    const next = { ...staffRoles }
    delete next[staff.id]
    setStaffRoles(next)
    localStorage.setItem('staffRoles', JSON.stringify(next))
    setRemoveModal(null)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const initials = staffRecord
    ? `${(staffRecord.first_name || '')[0] || ''}${(staffRecord.last_name || '')[0] || ''}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?'

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

  // ── Section renderers ─────────────────────────────────────────────────────

  const AccountSection = () => (
    <>
      <SectionHeader title="Account" subtitle="Manage your personal information and security settings." />

      {/* Display Name */}
      <div style={CARD}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Display Name</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={LABEL}>Full Name</label>
            <input
              style={INPUT}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              placeholder="First Last"
              onFocus={e => e.target.style.borderColor = '#33FF99'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
            />
          </div>
          <button
            onClick={handleSaveName}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '10px 18px', borderRadius: 8, border: 'none', background: nameSaved ? 'rgba(51,255,153,0.22)' : 'rgba(51,255,153,0.12)', color: '#33FF99', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s' }}
          >
            {nameSaved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Email */}
      <div style={CARD}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Email Address</div>
        <label style={LABEL}>Email</label>
        <input style={{ ...INPUT, opacity: 0.5, cursor: 'not-allowed' }} value={user?.email || ''} readOnly />
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>Email cannot be changed here.</div>
      </div>

      {/* Password */}
      <div style={CARD}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Change Password</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={LABEL}>New Password</label>
            <input style={INPUT} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters"
              onFocus={e => e.target.style.borderColor = '#33FF99'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
          </div>
          <div>
            <label style={LABEL}>Confirm Password</label>
            <input style={INPUT} type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter password"
              onFocus={e => e.target.style.borderColor = '#33FF99'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'} />
          </div>
          {pwMsg && (
            <div style={{ fontSize: 12, color: pwMsg.type === 'error' ? '#f87171' : '#33FF99' }}>
              {pwMsg.type === 'success' ? '✓ ' : ''}{pwMsg.text}
            </div>
          )}
          <button
            onClick={handleUpdatePassword}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '10px 18px', borderRadius: 8, border: 'none', background: 'rgba(51,255,153,0.12)', color: '#33FF99', cursor: 'pointer', alignSelf: 'flex-start' }}
          >
            Update Password
          </button>
        </div>
      </div>

      {/* Avatar */}
      <div style={CARD}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Avatar</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${avatarColor}22`, border: `2px solid ${avatarColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: avatarColor, flexShrink: 0, transition: 'all 0.2s' }}>
            {initials}
          </div>
          <div>
            <label style={LABEL}>Avatar Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {AVATAR_COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => handleAvatarColor(c)}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', outline: avatarColor === c ? '3px solid #fff' : '3px solid transparent', outlineOffset: 2, transition: 'outline 0.15s' }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )

  const PreferencesSection = () => (
    <>
      <SectionHeader title="App Preferences" subtitle="Customize your CommandTOUR experience." />

      {/* Theme */}
      <div style={CARD}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Theme</div>
        <label style={LABEL}>Color Mode</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['dark', 'Dark'], ['light', 'Light']].map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => applyTheme(val)}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '8px 24px', borderRadius: 999, cursor: 'pointer', border: theme === val ? '1px solid rgba(51,255,153,0.30)' : '1px solid rgba(255,255,255,0.10)', background: theme === val ? 'rgba(51,255,153,0.15)' : 'rgba(255,255,255,0.06)', color: theme === val ? '#33FF99' : '#64748b', fontWeight: theme === val ? 600 : 400, transition: 'all 0.15s' }}
            >
              {lbl}
            </button>
          ))}
        </div>
        {theme === 'light' && (
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>Light mode is coming soon.</div>
        )}
      </div>

      {/* Default Year */}
      <div style={CARD}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Default Year</div>
        <label style={LABEL}>Default Year on All Events</label>
        <select
          value={defaultYear}
          onChange={e => { setDefaultYear(e.target.value); localStorage.setItem('defaultEventsYear', e.target.value) }}
          style={{ ...INPUT, width: 'auto', cursor: 'pointer' }}
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Default Landing Page */}
      <div style={CARD}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Default Landing Page</div>
        <label style={LABEL}>Default Landing Page</label>
        <select
          value={defaultLanding}
          onChange={e => { setDefaultLanding(e.target.value); localStorage.setItem('defaultLandingPage', e.target.value) }}
          style={{ ...INPUT, width: 'auto', cursor: 'pointer' }}
        >
          {LANDING_PAGES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>Requires sign out and back in to take effect.</div>
      </div>
    </>
  )

  const DefaultsSection = () => (
    <>
      <SectionHeader title="Tour & Event Defaults" subtitle="Configure default templates and settings for new tours and events." />

      <div style={CARD}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>Task Templates</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>
          These templates auto-populate when creating a new event of this tour type.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {TOUR_TYPES.map(type => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 120, fontSize: 13, color: '#94a3b8', flexShrink: 0 }}>{type}</div>
              <select
                value={templateDefaults[type] || ''}
                onChange={e => handleTemplateDefault(type, e.target.value)}
                style={{ ...INPUT, flex: 1, width: 'auto', cursor: 'pointer' }}
              >
                <option value="">— No template —</option>
                {taskTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          ))}
          {taskTemplates.length === 0 && (
            <div style={{ fontSize: 12, color: '#64748b' }}>No task templates found. Create templates to enable this feature.</div>
          )}
        </div>
      </div>

      <div style={{ ...CARD, opacity: 0.55 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>Position Templates</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>Default position sets by tour type — coming soon.</div>
      </div>
    </>
  )

  const UsersSection = () => (
    <>
      <SectionHeader title="User Management" subtitle="Manage team members and their access levels." />

      {/* Current Users */}
      <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>Current Users</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 110px 100px 80px', gap: '0 12px', padding: '10px 20px', background: '#0d1f3a', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
          {['Name', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
            <div key={h} style={{ fontSize: 10.5, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
          ))}
        </div>
        {staffList.length === 0 && (
          <div style={{ padding: 20, fontSize: 13, color: '#64748b' }}>No users found.</div>
        )}
        {staffList.map((staff, i) => {
          const role = getRoleForStaff(staff.id)
          const isCurrentUser = staff.email === user?.email
          return (
            <div
              key={staff.id}
              style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 110px 100px 80px', gap: '0 12px', padding: '12px 20px', borderBottom: i < staffList.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none', alignItems: 'center', background: 'transparent', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                {staff.first_name} {staff.last_name}
                {isCurrentUser && (
                  <span style={{ fontSize: 10, color: '#33FF99', background: 'rgba(51,255,153,0.10)', border: '1px solid rgba(51,255,153,0.20)', borderRadius: 999, padding: '1px 6px' }}>You</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{staff.email || '—'}</div>
              <div>
                <select
                  value={role}
                  onChange={e => handleRoleChange(staff, e.target.value)}
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '4px 8px', borderRadius: 6, border: `1px solid ${ROLE_COLORS[role]}44`, background: `${ROLE_COLORS[role]}18`, color: ROLE_COLORS[role], outline: 'none', cursor: 'pointer' }}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{fmtDate(staff.created_at)}</div>
              <div>
                {!isCurrentUser && (
                  <button
                    onClick={() => setRemoveModal(staff)}
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '0.5px solid rgba(248,113,113,0.30)', background: 'transparent', color: '#f87171', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>Pending Invites</div>
          </div>
          {pendingInvites.map((invite, i) => (
            <div key={invite.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < pendingInvites.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div style={{ flex: 1, fontSize: 13, color: '#94a3b8' }}>{invite.email}</div>
              <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999, background: `${ROLE_COLORS[invite.role] || '#94a3b8'}18`, color: ROLE_COLORS[invite.role] || '#94a3b8', border: `1px solid ${ROLE_COLORS[invite.role] || '#94a3b8'}30` }}>
                {invite.role}
              </span>
              <span style={{ fontSize: 11, color: '#FFD60A', padding: '2px 8px', borderRadius: 999, background: 'rgba(255,214,10,0.10)', border: '1px solid rgba(255,214,10,0.20)' }}>
                Pending
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Invite */}
      <div style={CARD}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Invite Team Member</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={LABEL}>Email Address</label>
            <input
              style={INPUT}
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="name@example.com"
              onFocus={e => e.target.style.borderColor = '#33FF99'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
            />
          </div>
          <div>
            <label style={LABEL}>Role</label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              style={{ ...INPUT, width: 'auto', cursor: 'pointer' }}
            >
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          <button
            onClick={handleInvite}
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '10px 18px', borderRadius: 8, border: 'none', background: 'rgba(51,255,153,0.12)', color: '#33FF99', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Send Invite
          </button>
        </div>
      </div>
    </>
  )

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <TopNav />

      <div style={{ marginTop: 64, display: 'flex', minHeight: 'calc(100vh - 64px)' }}>

        {/* Sidebar */}
        <div style={{ width: 240, flexShrink: 0, background: 'rgba(255,255,255,0.04)', borderRight: '0.5px solid rgba(255,255,255,0.08)', padding: '32px 16px', position: 'sticky', top: 64, height: 'calc(100vh - 64px)', overflowY: 'auto', boxSizing: 'border-box' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 24, paddingLeft: 16 }}>Settings</div>
          {SECTIONS.map(s => (
            <div
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: activeSection === s.id ? '#f1f5f9' : '#94a3b8', background: activeSection === s.id ? 'rgba(255,255,255,0.08)' : 'transparent', fontWeight: activeSection === s.id ? 600 : 400, marginBottom: 2, transition: 'all 0.15s' }}
              onMouseEnter={e => { if (activeSection !== s.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if (activeSection !== s.id) e.currentTarget.style.background = 'transparent' }}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 48px' }}>
          <div style={{ maxWidth: 720 }}>
            {activeSection === 'account'     && <AccountSection />}
            {activeSection === 'preferences' && <PreferencesSection />}
            {activeSection === 'defaults'    && <DefaultsSection />}
            {activeSection === 'users'       && <UsersSection />}
          </div>
        </div>
      </div>

      {/* Invite modal */}
      {inviteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setInviteModal(null)}>
          <div style={{ background: '#0d1f3a', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 32, width: 460, display: 'flex', flexDirection: 'column', gap: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Invite Team Member</div>
            <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
              To invite <strong style={{ color: '#f1f5f9' }}>{inviteModal.email}</strong>, send them this signup link:
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.10)', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#33FF99', wordBreak: 'break-all' }}>
              commandtour.vercel.app/signup
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText('commandtour.vercel.app/signup'); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) }}
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '10px', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.15)', background: linkCopied ? 'rgba(51,255,153,0.10)' : 'rgba(255,255,255,0.06)', color: linkCopied ? '#33FF99' : '#f1f5f9', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {linkCopied ? '✓ Copied!' : 'Copy Link'}
            </button>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setInviteModal(null)} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '9px 16px', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleConfirmInvite} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '9px 16px', borderRadius: 8, border: 'none', background: 'rgba(51,255,153,0.12)', color: '#33FF99', cursor: 'pointer' }}>Mark as Invited</button>
            </div>
          </div>
        </div>
      )}

      {/* Remove modal */}
      {removeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setRemoveModal(null)}>
          <div style={{ background: '#0d1f3a', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 32, width: 400, display: 'flex', flexDirection: 'column', gap: 16 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Remove User</div>
            <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>
              Remove <strong style={{ color: '#f1f5f9' }}>{removeModal.first_name} {removeModal.last_name}</strong> from CommandTOUR? This removes their role but does not delete their account.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setRemoveModal(null)} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '9px 16px', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleRemoveUser(removeModal)} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13, padding: '9px 16px', borderRadius: 8, border: '0.5px solid rgba(248,113,113,0.30)', background: 'rgba(248,113,113,0.08)', color: '#f87171', cursor: 'pointer' }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
