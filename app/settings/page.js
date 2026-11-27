'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '../../lib/supabase'
import { useNav } from '../../context/NavContext'
import { useProfile } from '../../lib/auth/profile'
import CompanySettings from '../../components/settings/CompanySettings'
import UsersAndRoles from '../../components/settings/UsersAndRoles'
import { SectionCard, INPUT, LABEL, BTN_PRIMARY, BTN_GHOST } from '../../components/settings/styles'
import {
  IconUser, IconPalette, IconUsers, IconBuildingStadium, IconRoute,
  IconCoin, IconFileText, IconBell, IconUsersGroup, IconPlug,
  IconSun, IconMoon,
} from '@tabler/icons-react'

const TOUR_TYPES = ['HWMTL', 'HWSS', 'International', 'Domestic']
const YEARS = ['2025', '2026', '2027', '2028']
const LANDING_PAGES = ['Dashboard', 'Tours', 'All Events', 'Calendar']
const SORT_OPTIONS = ['Last Name', 'First Name', 'Department']

const DEPT_COLOR_PRESETS = ['#eab308', '#1a56db', '#fde047', '#8b5cf6', '#ec4899', '#f97316', '#ef4444', '#14b8a6', '#22c55e', '#94a3b8']
const REGION_COLOR_PRESETS = ['#1a56db', '#8b5cf6', '#ec4899', '#f97316', '#ef4444', '#14b8a6', '#22c55e', '#eab308']

// TODO: staff/page.js and venues/page.js should fetch dept/region colors from
// staff_departments.color and app_settings (key: region_colors) instead of
// using hardcoded DEPT_COLORS/REGION_COLORS maps. This will be wired in the next pass.

const NAV_ITEMS = [
  { label: 'Account', tab: 'account', icon: IconUser },
  { label: 'Appearance', tab: 'appearance', icon: IconPalette },
  { label: 'Staff', tab: 'staff', icon: IconUsers },
  { label: 'Venues', tab: 'venues', icon: IconBuildingStadium },
  { label: 'Tours', tab: 'tours', icon: IconRoute },
  { label: 'Company Settings', tab: 'company', icon: IconCoin },
  { label: 'Master Schedule', tab: 'booking', icon: IconFileText },
  { label: 'Notifications', tab: 'notifications', icon: IconBell },
  { label: 'Users And Roles', tab: 'users', icon: IconUsersGroup, adminOnly: true },
  { label: 'Integrations', tab: 'integrations', icon: IconPlug },
]

const GLASS = {
  background: 'var(--glass-tile-bg)',
  backdropFilter: 'blur(12px) saturate(1.4)',
  border: 'var(--tile-border)',
  borderRadius: 'var(--tile-radius)',
  boxShadow: 'var(--glass-tile-shadow)',
}

function ColorSwatchPicker({ color, presets, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ width: 20, height: 20, borderRadius: '50%', background: color, cursor: 'pointer', border: '1.5px solid var(--border-default)', flexShrink: 0 }}
      />
      {open && (
        <div style={{ position: 'absolute', top: 26, left: 0, zIndex: 10, width: 140, padding: 8, background: 'var(--surface-card)', border: '0.5px solid var(--border-default)', borderRadius: 8, boxShadow: 'var(--glass-tile-shadow)' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {presets.map(c => (
              <div
                key={c}
                onClick={() => { onChange(c); setOpen(false) }}
                style={{ width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer', border: c === color ? '2px solid var(--text-primary)' : '1px solid var(--border-default)' }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Custom:</span>
            <input
              type="color"
              value={color}
              onChange={e => onChange(e.target.value)}
              style={{ width: 28, height: 28, borderRadius: 6, border: '0.5px solid var(--border-default)', cursor: 'pointer', padding: 2, background: 'transparent' }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{color}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const { setNav, clearNav } = useNav()
  const [activeSection, setActiveSection] = useState('account')

  // Account
  const [user, setUser]               = useState(null)
  const [staffRecord, setStaffRecord] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [nameSaved, setNameSaved]     = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPw, setConfirmPw]     = useState('')
  const [pwMsg, setPwMsg]             = useState(null)

  // Appearance
  const [theme, setTheme]                   = useState('light')
  const [defaultYear, setDefaultYear]       = useState('2026')
  const [defaultLanding, setDefaultLanding] = useState('Dashboard')

  // Tours (task-template defaults + order/colors)
  const [taskTemplates, setTaskTemplates]       = useState([])
  const [templateDefaults, setTemplateDefaults] = useState({})
  const [tours, setTours]                       = useState([])
  const [tourSortEdits, setTourSortEdits]       = useState({})
  const [tourColorEdits, setTourColorEdits]     = useState({})
  const [tourOrderSaved, setTourOrderSaved]     = useState(false)
  const [tourColorsSaved, setTourColorsSaved]   = useState(false)

  // Staff settings
  const [departments, setDepartments]         = useState([])
  const [deptColors, setDeptColors]           = useState({})
  const [deptNameEdits, setDeptNameEdits]     = useState({})
  const [newDeptName, setNewDeptName]         = useState('')
  const [deptsSaved, setDeptsSaved]           = useState(false)
  const [staffDefaultSort, setStaffDefaultSort]     = useState('Last Name')
  const [staffDefaultFilter, setStaffDefaultFilter] = useState('All')

  // Venues settings
  const [regions, setRegions]         = useState([])
  const [venueTypes, setVenueTypes]   = useState([])
  const [newRegionName, setNewRegionName] = useState('')
  const [regionColorsSaved, setRegionColorsSaved] = useState(false)

  const { isAdmin } = useProfile()

  useEffect(() => {
    setNav({
      backLabel: 'Dashboard',
      backHref: '/',
      title: 'Settings',
      activeTab: activeSection,
      onTabChange: (tab) => setActiveSection(tab),
      items: NAV_ITEMS.filter(i => !i.adminOnly || isAdmin),
    })
    return () => clearNav()
  }, [activeSection, isAdmin])

  useEffect(() => {
    const check = () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
    check()
    window.addEventListener('themeChanged', check)
    return () => window.removeEventListener('themeChanged', check)
  }, [])

  useEffect(() => {
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

      const { data: deptData } = await supabase
        .from('staff_departments').select('id, name, sort_order, color').order('sort_order', { ascending: true })
      if (deptData) {
        setDepartments(deptData)
        const colorMap = {}
        deptData.forEach((d, i) => {
          colorMap[d.id] = d.color || DEPT_COLOR_PRESETS[i % DEPT_COLOR_PRESETS.length]
        })
        setDeptColors(colorMap)
      }

      const { data: venueData } = await supabase.from('venues').select('region, venue_type')
      const uniqueRegions = [...new Set((venueData || []).map(v => v.region).filter(Boolean))].sort()
      const uniqueTypes = [...new Set((venueData || []).map(v => v.venue_type).filter(Boolean))].sort()

      const { data: regionColorData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'region_colors')
        .maybeSingle()
      const savedRegionColors = regionColorData?.value || {}
      setRegions(uniqueRegions.map((name, i) => ({ name, color: savedRegionColors[name] || REGION_COLOR_PRESETS[i % REGION_COLOR_PRESETS.length] })))
      setVenueTypes(uniqueTypes)

      const { data: tourData } = await supabase
        .from('tours').select('id, name, color, sort_order').order('sort_order', { ascending: true, nullsFirst: false })
      setTours(tourData || [])

      setDefaultYear(localStorage.getItem('defaultEventsYear') || '2026')
      setDefaultLanding(localStorage.getItem('defaultLandingPage') || 'Dashboard')
      setStaffDefaultSort(localStorage.getItem('staffDefaultSort') || 'Last Name')
      setStaffDefaultFilter(localStorage.getItem('staffDefaultFilter') || 'All')
      try { setTemplateDefaults(JSON.parse(localStorage.getItem('taskTemplateDefaults') || '{}')) } catch {}
    }
    init()
  }, [])

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

  // ── Appearance handlers ───────────────────────────────────────────────────

  const applyTheme = (newTheme) => {
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
    window.dispatchEvent(new Event('themeChanged'))
    setTheme(newTheme)
  }

  const handleDefaultYear = (val) => { setDefaultYear(val); localStorage.setItem('defaultEventsYear', val) }
  const handleDefaultLanding = (val) => { setDefaultLanding(val); localStorage.setItem('defaultLandingPage', val) }

  // ── Tours handlers ────────────────────────────────────────────────────────

  const handleTemplateDefault = (tourType, templateId) => {
    const next = { ...templateDefaults, [tourType]: templateId }
    setTemplateDefaults(next)
    localStorage.setItem('taskTemplateDefaults', JSON.stringify(next))
  }

  const handleSaveTourOrder = async () => {
    const supabase = getSupabase()
    const entries = Object.entries(tourSortEdits)
    for (const [id, val] of entries) {
      await supabase.from('tours').update({ sort_order: Number(val) }).eq('id', id)
    }
    const { data } = await supabase
      .from('tours').select('id, name, color, sort_order').order('sort_order', { ascending: true, nullsFirst: false })
    setTours(data || [])
    setTourSortEdits({})
    setTourOrderSaved(true)
    setTimeout(() => setTourOrderSaved(false), 2000)
  }

  const handleSaveTourColors = async () => {
    const supabase = getSupabase()
    const entries = Object.entries(tourColorEdits)
    for (const [id, val] of entries) {
      await supabase.from('tours').update({ color: val }).eq('id', id)
    }
    const { data } = await supabase
      .from('tours').select('id, name, color, sort_order').order('sort_order', { ascending: true, nullsFirst: false })
    setTours(data || [])
    setTourColorEdits({})
    setTourColorsSaved(true)
    setTimeout(() => setTourColorsSaved(false), 2000)
  }

  // ── Staff settings handlers ───────────────────────────────────────────────

  const handleDeptColorChange = (id, color) => setDeptColors(prev => ({ ...prev, [id]: color }))
  const handleDeptNameChange = (id, val) => setDeptNameEdits(prev => ({ ...prev, [id]: val }))

  const handleAddDepartment = () => {
    if (!newDeptName.trim()) return
    const tempId = `new-${Date.now()}`
    setDepartments(prev => [...prev, { id: tempId, name: newDeptName.trim() }])
    setDeptColors(prev => ({ ...prev, [tempId]: DEPT_COLOR_PRESETS[Object.keys(prev).length % DEPT_COLOR_PRESETS.length] }))
    setNewDeptName('')
  }

  const handleDeleteDepartment = (id) => setDepartments(prev => prev.filter(d => d.id !== id))

  const handleSaveDepartments = async () => {
    const supabase = getSupabase()
    await Promise.all(
      departments
        .filter(d => !String(d.id).startsWith('new-'))
        .map(d =>
          supabase.from('staff_departments')
            .update({ color: deptColors[d.id] || null })
            .eq('id', d.id)
        )
    )
    setDeptsSaved(true)
    setTimeout(() => setDeptsSaved(false), 2000)
  }

  const handleStaffDefaultSort = (val) => { setStaffDefaultSort(val); localStorage.setItem('staffDefaultSort', val) }
  const handleStaffDefaultFilter = (val) => { setStaffDefaultFilter(val); localStorage.setItem('staffDefaultFilter', val) }

  // ── Venues settings handlers ──────────────────────────────────────────────

  const handleRegionNameChange = (idx, val) => setRegions(prev => prev.map((r, i) => i === idx ? { ...r, name: val } : r))
  const handleRegionColorChange = (idx, color) => setRegions(prev => prev.map((r, i) => i === idx ? { ...r, color } : r))

  const handleAddRegion = () => {
    if (!newRegionName.trim()) return
    setRegions(prev => [...prev, { name: newRegionName.trim(), color: REGION_COLOR_PRESETS[prev.length % REGION_COLOR_PRESETS.length] }])
    setNewRegionName('')
  }

  const handleVenueTypeChange = (idx, val) => setVenueTypes(prev => prev.map((t, i) => i === idx ? val : t))

  const handleSaveRegionColors = async () => {
    const supabase = getSupabase()
    const value = Object.fromEntries(regions.map(r => [r.name, r.color]))
    await supabase.from('app_settings').upsert(
      { key: 'region_colors', value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
    setRegionColorsSaved(true)
    setTimeout(() => setRegionColorsSaved(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 4px 0', flexShrink: 0 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>Settings</div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '12px 0 0' }}>
        <div style={{ height: '100%', overflowY: 'auto', padding: '0 4px' }}>

          {activeSection === 'account' && (
            <>
              <SectionCard title="Display Name">
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={LABEL}>Full Name</label>
                    <input
                      style={INPUT}
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                      placeholder="First Last"
                    />
                  </div>
                  <button onClick={handleSaveName} style={BTN_PRIMARY}>
                    {nameSaved ? '✓ Saved' : 'Save'}
                  </button>
                </div>
              </SectionCard>

              <SectionCard title="Email Address">
                <label style={LABEL}>Email</label>
                <input style={{ ...INPUT, opacity: 0.5, cursor: 'not-allowed' }} value={user?.email || ''} readOnly />
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>Email cannot be changed here.</div>
              </SectionCard>

              <SectionCard title="Change Password">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={LABEL}>New Password</label>
                    <input style={INPUT} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
                  </div>
                  <div>
                    <label style={LABEL}>Confirm Password</label>
                    <input style={INPUT} type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter password" />
                  </div>
                  {pwMsg && (
                    <div style={{ fontSize: 14, color: pwMsg.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {pwMsg.type === 'success' ? '✓ ' : ''}{pwMsg.text}
                    </div>
                  )}
                  <button onClick={handleUpdatePassword} style={{ ...BTN_PRIMARY, alignSelf: 'flex-start' }}>
                    Update Password
                  </button>
                </div>
              </SectionCard>
            </>
          )}

          {activeSection === 'appearance' && (
            <>
              <SectionCard title="Theme">
                <label style={LABEL}>Color Mode</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[['light', 'Light Mode', IconSun], ['dark', 'Dark Mode', IconMoon]].map(([val, lbl, Icon]) => {
                    const active = theme === val
                    return (
                      <div
                        key={val}
                        onClick={() => applyTheme(val)}
                        style={{
                          ...GLASS, flex: 1, padding: '16px 20px', cursor: 'pointer', borderRadius: 'var(--tile-radius)',
                          display: 'flex', alignItems: 'center', gap: 10,
                          border: active ? '1.5px solid var(--color-info)' : '0.5px solid var(--border-default)',
                          background: active ? 'rgba(26,86,219,0.08)' : GLASS.background,
                        }}
                      >
                        <Icon size={20} stroke={1.5} color={active ? 'var(--color-info)' : 'var(--text-secondary)'} />
                        <div style={{ fontSize: 16, fontWeight: active ? 600 : 400, color: active ? 'var(--color-info)' : 'var(--text-primary)' }}>{lbl}</div>
                      </div>
                    )
                  })}
                </div>
              </SectionCard>

              <SectionCard title="Default Year">
                <label style={LABEL}>Default Year on All Events</label>
                <select value={defaultYear} onChange={e => handleDefaultYear(e.target.value)} style={{ ...INPUT, width: 'auto', cursor: 'pointer' }}>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </SectionCard>

              <SectionCard title="Default Landing Page">
                <label style={LABEL}>Default Landing Page</label>
                <select value={defaultLanding} onChange={e => handleDefaultLanding(e.target.value)} style={{ ...INPUT, width: 'auto', cursor: 'pointer' }}>
                  {LANDING_PAGES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>Requires sign out and back in to take effect.</div>
              </SectionCard>
            </>
          )}

          {activeSection === 'staff' && (
            <>
              <SectionCard title="Departments" description="Manage staff departments and their colors.">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {departments.map(dept => (
                    <div key={dept.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <ColorSwatchPicker
                        color={deptColors[dept.id] || DEPT_COLOR_PRESETS[0]}
                        presets={DEPT_COLOR_PRESETS}
                        onChange={c => handleDeptColorChange(dept.id, c)}
                      />
                      <input
                        style={{ ...INPUT, flex: 1 }}
                        value={deptNameEdits[dept.id] ?? dept.name}
                        onChange={e => handleDeptNameChange(dept.id, e.target.value)}
                      />
                      <button
                        onClick={() => handleDeleteDepartment(dept.id)}
                        style={{ background: 'transparent', border: '0.5px solid var(--color-danger)', color: 'var(--color-danger)', borderRadius: 8, fontSize: 14, padding: '6px 12px', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                  {departments.length === 0 && (
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No departments found.</div>
                  )}
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <input
                      style={{ ...INPUT, flex: 1 }}
                      value={newDeptName}
                      onChange={e => setNewDeptName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddDepartment()}
                      placeholder="New department name"
                    />
                    <button onClick={handleAddDepartment} style={BTN_GHOST}>+ Add Department</button>
                  </div>
                  <button onClick={handleSaveDepartments} style={{ ...BTN_PRIMARY, alignSelf: 'flex-start', marginTop: 8 }}>
                    {deptsSaved ? '✓ Saved' : 'Save Changes'}
                  </button>
                </div>
              </SectionCard>

              <SectionCard title="Display Defaults">
                <div style={{ display: 'flex', gap: 24 }}>
                  <div style={{ flex: 1 }}>
                    <label style={LABEL}>Default Sort Order</label>
                    <select value={staffDefaultSort} onChange={e => handleStaffDefaultSort(e.target.value)} style={{ ...INPUT, cursor: 'pointer' }}>
                      {SORT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={LABEL}>Default Filter</label>
                    <select value={staffDefaultFilter} onChange={e => handleStaffDefaultFilter(e.target.value)} style={{ ...INPUT, cursor: 'pointer' }}>
                      <option value="All">All</option>
                      {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {activeSection === 'venues' && (
            <>
              <SectionCard title="Regions" description="Manage venue regions and their colors.">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {regions.map((region, idx) => (
                    <div key={`${region.name}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <ColorSwatchPicker
                        color={region.color}
                        presets={REGION_COLOR_PRESETS}
                        onChange={c => handleRegionColorChange(idx, c)}
                      />
                      <input
                        style={{ ...INPUT, flex: 1 }}
                        value={region.name}
                        onChange={e => handleRegionNameChange(idx, e.target.value)}
                      />
                    </div>
                  ))}
                  {regions.length === 0 && (
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No regions found.</div>
                  )}
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <input
                      style={{ ...INPUT, flex: 1 }}
                      value={newRegionName}
                      onChange={e => setNewRegionName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddRegion()}
                      placeholder="New region name"
                    />
                    <button onClick={handleAddRegion} style={BTN_GHOST}>+ Add Region</button>
                  </div>
                  <button onClick={handleSaveRegionColors} style={{ ...BTN_PRIMARY, alignSelf: 'flex-start', marginTop: 8 }}>
                    {regionColorsSaved ? '✓ Saved' : 'Save Changes'}
                  </button>
                </div>
              </SectionCard>

              <SectionCard title="Venue Types">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {venueTypes.map((type, idx) => (
                    <input
                      key={idx}
                      style={INPUT}
                      value={type}
                      onChange={e => handleVenueTypeChange(idx, e.target.value)}
                    />
                  ))}
                  {venueTypes.length === 0 && (
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No venue types found.</div>
                  )}
                </div>
              </SectionCard>
            </>
          )}

          {activeSection === 'tours' && (
            <>
              <SectionCard title="Task Templates" description="These templates auto-populate when creating a new event of this tour type.">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {TOUR_TYPES.map(type => (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 120, fontSize: 15, color: 'var(--text-secondary)', flexShrink: 0 }}>{type}</div>
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
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No task templates found. Create templates to enable this feature.</div>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Tour Order" description="Set the sort order tours appear in across the app.">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {tours.map(tour => (
                    <div key={tour.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: tour.color || 'var(--accent)', flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 15, color: 'var(--text-primary)' }}>{tour.name}</div>
                      <input
                        type="number"
                        style={{ ...INPUT, width: 80 }}
                        value={tourSortEdits[tour.id] ?? tour.sort_order ?? ''}
                        onChange={e => setTourSortEdits(prev => ({ ...prev, [tour.id]: e.target.value }))}
                      />
                    </div>
                  ))}
                  {tours.length === 0 && (
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No tours found.</div>
                  )}
                  <button onClick={handleSaveTourOrder} style={{ ...BTN_PRIMARY, alignSelf: 'flex-start', marginTop: 4 }}>
                    {tourOrderSaved ? '✓ Saved' : 'Save Order'}
                  </button>
                </div>
              </SectionCard>

              <SectionCard title="Tour Colors" description="Set the identity color for each tour.">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {tours.map(tour => (
                    <div key={tour.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, fontSize: 15, color: 'var(--text-primary)' }}>{tour.name}</div>
                      <input
                        type="color"
                        style={{ width: 40, height: 28, padding: 0, border: '0.5px solid var(--border-default)', borderRadius: 6, cursor: 'pointer', background: 'transparent' }}
                        value={tourColorEdits[tour.id] ?? tour.color ?? '#1a56db'}
                        onChange={e => setTourColorEdits(prev => ({ ...prev, [tour.id]: e.target.value }))}
                      />
                    </div>
                  ))}
                  {tours.length === 0 && (
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No tours found.</div>
                  )}
                  <button onClick={handleSaveTourColors} style={{ ...BTN_PRIMARY, alignSelf: 'flex-start', marginTop: 4 }}>
                    {tourColorsSaved ? '✓ Saved' : 'Save Colors'}
                  </button>
                </div>
              </SectionCard>
            </>
          )}

          {activeSection === 'company' && <CompanySettings />}

          {activeSection === 'booking' && (
            <SectionCard title="Defaults">
              <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>Master Schedule settings coming soon.</div>
            </SectionCard>
          )}

          {activeSection === 'notifications' && (
            <SectionCard title="Alerts">
              <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>Notification preferences coming soon.</div>
            </SectionCard>
          )}

          {activeSection === 'users' && isAdmin && <UsersAndRoles />}

          {activeSection === 'integrations' && (
            <SectionCard title="Connected Services">
              <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>API integrations coming soon.</div>
            </SectionCard>
          )}

        </div>
      </div>

    </div>
  )
}
