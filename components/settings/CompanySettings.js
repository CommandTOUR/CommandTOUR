'use client'

import { useEffect, useState } from 'react'
import { IconArrowUp, IconArrowDown, IconTrash } from '@tabler/icons-react'
import { getSetting, setSetting, SETTING_DEFAULTS as D } from '../../lib/settings'
import { useProfile } from '../../lib/auth/profile'
import { SectionCard, INPUT, LABEL, BTN_PRIMARY, BTN_GHOST } from './styles'
import MoneyInput, { formatMoneyInput } from '../MoneyInput'

const num = (v) => (v === '' || v === null || v === undefined ? '' : String(v))
const money = formatMoneyInput

export default function CompanySettings() {
  const { isManager } = useProfile()
  const canEdit = isManager
  const [loaded, setLoaded] = useState(false)
  const [mileage, setMileage] = useState(money(D.mileage_rate.rate, 2, 3))
  const [limits, setLimits] = useState({ one_way: '', round_trip: '', multi_city: '' })
  const [perDiem, setPerDiem] = useState({ breakfast: '', lunch: '', dinner: '', meal_times: { ...D.per_diem_defaults.meal_times } })
  const [groups, setGroups] = useState([...D.hotel_cost_groups])
  const [newGroup, setNewGroup] = useState('')
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      const [m, l, p, g] = await Promise.all([
        getSetting('mileage_rate', D.mileage_rate),
        getSetting('flight_approval_limits', D.flight_approval_limits),
        getSetting('per_diem_defaults', D.per_diem_defaults),
        getSetting('hotel_cost_groups', D.hotel_cost_groups),
      ])
      setMileage(money(m.rate, 2, 3))
      setLimits({ one_way: money(l.one_way), round_trip: money(l.round_trip), multi_city: money(l.multi_city) })
      setPerDiem({ breakfast: money(p.breakfast), lunch: money(p.lunch), dinner: money(p.dinner), meal_times: { ...D.per_diem_defaults.meal_times, ...(p.meal_times || {}) } })
      setGroups(Array.isArray(g) ? g : D.hotel_cost_groups)
      setLoaded(true)
    })()
  }, [])

  const save = async (key, value, label) => {
    setError('')
    const { error: err } = await setSetting(key, value)
    if (err) { setError(`Could not save ${label}. ${err.message}`); return }
    setSaved(key)
    setTimeout(() => setSaved(s => (s === key ? '' : s)), 2000)
  }
  const SaveBtn = ({ k, onClick }) => canEdit
    ? <button onClick={onClick} style={{ ...BTN_PRIMARY, marginTop: 16 }}>{saved === k ? '✓ Saved' : 'Save'}</button>
    : null
  const ro = { disabled: !canEdit, style: { ...INPUT, ...(canEdit ? {} : { opacity: 0.7, cursor: 'default' }) } }

  const moveGroup = (i, d) => setGroups(prev => { const n = [...prev]; const j = i + d; if (j < 0 || j >= n.length) return prev; [n[i], n[j]] = [n[j], n[i]]; return n })
  const addGroup = () => {
    const v = newGroup.trim()
    if (!v || groups.some(g => g.toLowerCase() === v.toLowerCase())) return
    setGroups(prev => [...prev, v]); setNewGroup('')
  }

  if (!loaded) return <div style={{ fontSize: 15, color: 'var(--text-muted)' }}>Loading...</div>

  return (
    <>
      {!canEdit && <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 12 }}>You can view these settings. Only Admins and Managers can change them.</div>}
      {error && <div role="alert" style={{ fontSize: 15, color: 'var(--color-danger)', marginBottom: 12 }}>{error}</div>}

      <SectionCard title="Mileage Rate" description="Dollars per mile for reimbursed driving.">
        <div style={{ maxWidth: 240 }}>
          <label style={LABEL}>Rate</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MoneyInput disabled={!canEdit} maxDecimals={3} value={mileage} onChange={setMileage} />
            <span style={{ fontSize: 15, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>per mile</span>
          </div>
        </div>
        <SaveBtn k="mileage_rate" onClick={() => save('mileage_rate', { rate: toNum(mileage), unit: 'mile' }, 'the mileage rate')} />
      </SectionCard>

      <SectionCard title="Flight Approval Limits" description="Fares above these amounts need approval.">
        <div style={{ display: 'flex', gap: 16 }}>
          {[['one_way', 'One-Way'], ['round_trip', 'Round Trip'], ['multi_city', 'Multi-City']].map(([k, label]) => (
            <div key={k} style={{ flex: 1 }}>
              <label style={LABEL}>{label}</label>
              <MoneyInput disabled={!canEdit} value={limits[k]} onChange={v => setLimits(p => ({ ...p, [k]: v }))} />
            </div>
          ))}
        </div>
        <SaveBtn k="flight_approval_limits" onClick={() => save('flight_approval_limits', { one_way: toNum(limits.one_way), round_trip: toNum(limits.round_trip), multi_city: toNum(limits.multi_city) }, 'the flight approval limits')} />
      </SectionCard>

      <SectionCard title="Per Diem Defaults" description="Starting meal amounts and times. Each event can override the amounts.">
        <div style={{ display: 'flex', gap: 16 }}>
          {[['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner']].map(([k, label]) => (
            <div key={k} style={{ flex: 1 }}>
              <label style={LABEL}>{label}</label>
              <MoneyInput disabled={!canEdit} value={perDiem[k]} onChange={v => setPerDiem(p => ({ ...p, [k]: v }))} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          {[['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner']].map(([k, label]) => (
            <div key={k} style={{ flex: 1 }}>
              <label style={LABEL}>{label} Time</label>
              <input {...ro} type="time" value={perDiem.meal_times[k] || ''} onChange={e => setPerDiem(p => ({ ...p, meal_times: { ...p.meal_times, [k]: e.target.value } }))} />
            </div>
          ))}
        </div>
        <SaveBtn k="per_diem_defaults" onClick={() => save('per_diem_defaults', { breakfast: toNum(perDiem.breakfast), lunch: toNum(perDiem.lunch), dinner: toNum(perDiem.dinner), meal_times: perDiem.meal_times }, 'the per diem defaults')} />
      </SectionCard>

      <SectionCard title="Hotel Cost Groups" description="Who pays for a hotel room. Rename, reorder, or add groups.">
        {groups.map((g, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
            <input {...ro} value={g} onChange={e => setGroups(prev => prev.map((x, j) => j === i ? e.target.value : x))} />
            {canEdit && (
              <>
                <button onClick={() => moveGroup(i, -1)} disabled={i === 0} aria-label="Move Up" style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: 'var(--text-muted)', opacity: i === 0 ? 0.4 : 1, padding: 4 }}><IconArrowUp size={16} stroke={1.75} /></button>
                <button onClick={() => moveGroup(i, 1)} disabled={i === groups.length - 1} aria-label="Move Down" style={{ background: 'none', border: 'none', cursor: i === groups.length - 1 ? 'default' : 'pointer', color: 'var(--text-muted)', opacity: i === groups.length - 1 ? 0.4 : 1, padding: 4 }}><IconArrowDown size={16} stroke={1.75} /></button>
                <button onClick={() => setGroups(prev => prev.filter((_, j) => j !== i))} aria-label="Remove Group" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: 4 }}><IconTrash size={16} stroke={1.75} /></button>
              </>
            )}
          </div>
        ))}
        {canEdit && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input style={INPUT} value={newGroup} onChange={e => setNewGroup(e.target.value)} placeholder="New Group Name" onKeyDown={e => e.key === 'Enter' && addGroup()} />
            <button onClick={addGroup} style={{ ...BTN_GHOST, whiteSpace: 'nowrap' }}>Add Group</button>
          </div>
        )}
        <SaveBtn k="hotel_cost_groups" onClick={() => {
          const clean = groups.map(g => g.trim()).filter(Boolean)
          setGroups(clean)
          save('hotel_cost_groups', clean, 'the hotel cost groups')
        }} />
      </SectionCard>
    </>
  )
}
