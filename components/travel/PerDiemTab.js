'use client'

// Per Diem: rates and meal times, the meals the venue provides each day, and what each eligible traveler is owed.
// Calculation lives in lib/travel/perDiem.js (see the rules there).
import { useEffect, useMemo, useRef, useState } from 'react'
import { quickToast } from '@/lib/quickToast'
import { getSupabase } from '@/lib/supabase'
import { computePerDiem, daysBetween, MEALS } from '@/lib/travel/perDiem'
import { getOrCreateRates, saveRate, setMealProvided } from '@/lib/travel/perDiemData'
import { setTravelerFlag } from '@/lib/travel/travelers'
import { formatTime } from '@/lib/travel/time'
import { TableShell, BodyRow, EmptyRow } from './DataTable'
import { FS, LINE, SMALL_LABEL, CARD, Chip, Check, InlineMoney, fmtDay, personName, money } from './shared'

const muted = { color: 'var(--text-muted-legible)' }
const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' }
const LETTER = { breakfast: 'B', lunch: 'L', dinner: 'D' }
const shortDay = (d) => { const m = /^\d{4}-(\d{2})-(\d{2})/.exec(d || ''); return m ? `${+m[1]}/${+m[2]}` : '' }
const stamp = (v) => { const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(v || ''); return m ? `${fmtDay(m[1])} · ${formatTime(m[2])}` : '—' }

export default function PerDiemTab({ eventId, event, data, canEdit, reload }) {
  const { assignments, trips, travelers, meals, rates, perDiemSettings, staffList } = data
  const [busy, setBusy] = useState(false)
  const seeded = useRef(false)

  // first use: copy the company defaults into this event's rates
  useEffect(() => {
    if (rates || seeded.current || !canEdit) return
    seeded.current = true
    getOrCreateRates(getSupabase(), eventId, perDiemSettings).then(reload).catch(e => console.error('Could not create per diem rates:', e))
  }, [rates, canEdit, eventId, perDiemSettings, reload])

  const effRates = rates || perDiemSettings.rates
  const mealTimes = perDiemSettings.mealTimes
  const guard = async (fn) => {
    if (!canEdit) return
    setBusy(true)
    try { await fn() } catch (e) { console.error(e); quickToast(`Could not save: ${e.message}`) }
    setBusy(false)
    reload()
  }

  const roleOf = (id) => assignments.find(a => a.staff_id === id)?.position?.title || '—'
  const eligible = useMemo(() => travelers.filter(t => t.per_diem_eligible), [travelers])
  const tripsByStaff = useMemo(() => { const m = new Map(); for (const t of trips) { (m.get(t.staff_id) || m.set(t.staff_id, []).get(t.staff_id)).push(t) } return m }, [trips])
  const provided = useMemo(() => new Map(meals.map(m => [m.meal_date, m])), [meals])
  const result = useMemo(() => computePerDiem({ travelers: eligible, tripsByStaff, event, rates: effRates, mealTimes, provided }), [eligible, tripsByStaff, event, effRates, mealTimes, provided])

  const eventDays = useMemo(() => {
    const set = new Set(daysBetween(event?.load_in_date, event?.load_out_date))
    for (const r of result.rows) for (const d of r.days) set.add(d.date)
    return [...set].sort()
  }, [event, result])

  const nameOf = (id) => personName(staffList.find(s => s.id === id) || assignments.find(a => a.staff_id === id)?.staff)
  const byStaff = (id) => travelers.find(t => t.staff_id === id)

  const cols = [
    { key: 'name', label: 'Name', width: 20, wrap: true, render: r => (<div style={{ lineHeight: 1.3 }}><b>{nameOf(r.staff_id)}</b><div style={{ fontSize: FS.small, ...muted }}>{roleOf(r.staff_id)}</div>{r.estimated && <Chip tone="yellow">Estimated From Event Dates</Chip>}</div>) },
    { key: 'start', label: 'Travel Start', width: 14, render: r => stamp(r.start) },
    { key: 'end', label: 'Travel End', width: 14, render: r => stamp(r.end) },
    { key: 'strip', label: 'Day-By-Day', width: 34, wrap: true, render: r => (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {r.days.map(d => (
          <div key={d.date} title={`${fmtDay(d.date)}: ${money(d.total)}`} style={{ textAlign: 'center', minWidth: 42 }}>
            <div style={{ fontSize: FS.header, ...muted }}>{shortDay(d.date)}</div>
            <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              {MEALS.map(m => (
                <span key={m} title={`${MEAL_LABEL[m]}: ${d.meals[m].provided ? 'Provided By The Venue' : d.meals[m].owed ? 'Owed' : 'Not Owed'}`}
                  style={{ fontSize: FS.header, fontWeight: 700, width: 14, height: 18, lineHeight: '18px', borderRadius: 3, textAlign: 'center', boxSizing: 'border-box',
                    background: d.meals[m].owed ? 'color-mix(in srgb, var(--color-success) 22%, transparent)' : 'transparent', color: d.meals[m].owed ? 'var(--text-primary)' : 'var(--text-muted-legible)',
                    border: `1px solid ${d.meals[m].owed ? 'var(--color-success)' : LINE}`, textDecoration: d.meals[m].provided ? 'line-through' : 'none' }}>{LETTER[m]}</span>
              ))}
            </div>
          </div>
        ))}
      </div>) },
    { key: 'extra', label: 'Extra Day', width: 8, align: 'center', render: r => <Check checked={!!byStaff(r.staff_id)?.extra_day} disabled={!canEdit} label={`Extra Day For ${nameOf(r.staff_id)}`} onChange={() => guard(() => setTravelerFlag(getSupabase(), eventId, r.staff_id, 'extra_day', !byStaff(r.staff_id)?.extra_day))} /> },
    { key: 'total', label: 'Total Owed', width: 10, align: 'right', render: r => <b>{money(r.total)}</b> },
  ]

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 12 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        {MEALS.map(m => (
          <div key={m} style={{ ...CARD, padding: '8px 12px', minWidth: 180 }}>
            <div style={SMALL_LABEL}>{MEAL_LABEL[m]} · {formatTime(mealTimes[m])}</div>
            <div style={{ marginTop: 4 }}><InlineMoney ariaLabel={`${MEAL_LABEL[m]} Rate`} disabled={!canEdit || !rates || busy} value={effRates[`${m}_rate`]} onSave={v => guard(() => saveRate(getSupabase(), eventId, `${m}_rate`, v))} /></div>
          </div>
        ))}
        <div style={{ ...CARD, padding: '8px 12px' }}>
          <div style={SMALL_LABEL}>Full Day</div>
          <div style={{ fontSize: FS.title, fontWeight: 700, marginTop: 6 }}>{money(MEALS.reduce((a, m) => a + (Number(effRates[`${m}_rate`]) || 0), 0))}</div>
        </div>
        <div style={{ ...CARD, padding: '8px 12px', marginLeft: 'auto' }}>
          <div style={SMALL_LABEL}>Total Owed · {eligible.length} {eligible.length === 1 ? 'Traveler' : 'Travelers'}</div>
          <div style={{ fontSize: FS.title, fontWeight: 700, marginTop: 6 }}>{money(result.total)}</div>
        </div>
      </div>
      <div style={{ fontSize: FS.small, ...muted, marginBottom: 12 }}>Rates start from the company defaults and can be changed for this event. Meal times come from Settings, Travel.</div>

      <div style={{ ...CARD, padding: '10px 12px', marginBottom: 12 }}>
        <div style={{ ...SMALL_LABEL, marginBottom: 8 }}>Meals Provided By The Venue</div>
        {eventDays.length === 0 ? <span style={muted}>Add load-in and load-out dates to the event to mark meals the venue provides.</span> : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {eventDays.map(d => (
              <div key={d} style={{ border: `1px solid ${LINE}`, borderRadius: 6, padding: '6px 10px', minWidth: 118 }}>
                <div style={{ fontSize: FS.small, fontWeight: 600, marginBottom: 4 }}>{fmtDay(d)}</div>
                {MEALS.map(m => (
                  <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: FS.body, cursor: canEdit ? 'pointer' : 'default' }}>
                    <Check checked={!!provided.get(d)?.[`${m}_provided`]} disabled={!canEdit || busy} label={`${MEAL_LABEL[m]} Provided On ${fmtDay(d)}`} onChange={() => guard(() => setMealProvided(getSupabase(), eventId, d, m, !provided.get(d)?.[`${m}_provided`]))} />
                    {MEAL_LABEL[m]}
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <TableShell cols={cols} minWidth={1000}>
        {result.rows.length === 0 && <EmptyRow cols={cols}>No one is per diem eligible yet. Check Per Diem for a traveler on the Travelers tab.</EmptyRow>}
        {result.rows.map(r => <BodyRow key={r.staff_id} cols={cols} row={r} hover={false} />)}
        {result.rows.length > 0 && <tr><td colSpan={cols.length} style={{ padding: '10px', textAlign: 'right', fontWeight: 700, borderBottom: `1px solid ${LINE}` }}>Per Diem Total · {money(result.total)}</td></tr>}
      </TableShell>
      <div style={{ marginTop: 10, fontSize: FS.small, ...muted }}>A meal is owed when travel starts before the meal time and ends after it, unless the venue provides it. Travel Start and End come from the trips; without trips, the event dates are used.</div>
    </div>
  )
}
