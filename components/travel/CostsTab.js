'use client'

// Costs: the totals for the event, a breakdown by category, and each traveler's trip costs. Pure calculation lives in lib/travel/costs.js.
import { useMemo, useState } from 'react'
import { quickToast } from '@/lib/quickToast'
import { getSupabase } from '@/lib/supabase'
import { hotelTotals } from '@/lib/travel/hotelCost'
import { computePerDiem } from '@/lib/travel/perDiem'
import { buildCostSummary, variance } from '@/lib/travel/costs'
import { COST_CATEGORIES } from '@/lib/travel/trips'
import { saveBudget } from '@/lib/travel/budget'
import { TableShell, BodyRow, ExpandRow, EmptyRow } from './DataTable'
import { FS, LINE, SMALL_LABEL, CARD, InlineMoney, personName, money } from './shared'

const muted = { color: 'var(--text-muted-legible)' }
const catLabel = (v) => COST_CATEGORIES.find(c => c.value === v)?.label || v
const signed = (v) => (v === null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${money(Math.abs(v))}`)
const varColor = (v) => (v === null || v === 0 ? 'var(--text-primary)' : v > 0 ? 'var(--color-danger)' : 'var(--color-success)') // actual above estimate = worse

function Tile({ label, children }) {
  return <div style={{ ...CARD, padding: '10px 14px', flex: 1, minWidth: 180 }}><div style={SMALL_LABEL}>{label}</div><div style={{ fontSize: FS.hero, fontWeight: 700, marginTop: 4 }}>{children}</div></div>
}

export default function CostsTab({ eventId, event, data, canEdit, reload }) {
  const { trips, rentals, rooms, hotel, travelers, meals, rates, perDiemSettings, costGroups, budget, assignments, staffList } = data
  const [open, setOpen] = useState({})
  const tripsByStaff = useMemo(() => { const m = new Map(); for (const t of trips) { (m.get(t.staff_id) || m.set(t.staff_id, []).get(t.staff_id)).push(t) } return m }, [trips])
  const hotelRes = useMemo(() => hotelTotals(rooms, hotel || {}, tripsByStaff, costGroups), [rooms, hotel, tripsByStaff, costGroups])
  const perDiem = useMemo(() => computePerDiem({ travelers: travelers.filter(t => t.per_diem_eligible), tripsByStaff, event, rates: rates || perDiemSettings.rates, mealTimes: perDiemSettings.mealTimes, provided: new Map(meals.map(m => [m.meal_date, m])) }), [travelers, tripsByStaff, event, rates, perDiemSettings, meals])
  const summary = useMemo(() => buildCostSummary({ trips, rentals, hotel: hotelRes, perDiemTotal: perDiem.total, budget: budget?.travel_budget ?? null }), [trips, rentals, hotelRes, perDiem, budget])

  const nameOf = (id, s) => personName(s || staffList.find(x => x.id === id) || assignments.find(a => a.staff_id === id)?.staff)
  const roleOf = (id) => assignments.find(a => a.staff_id === id)?.position?.title || '—'

  const saveBudgetValue = async (v) => {
    try { await saveBudget(getSupabase(), eventId, v) } catch (e) { console.error(e); quickToast(`Could not save: ${e.message}`) }
    reload()
  }

  const rows = [
    { key: 'air', label: 'Air · Airfare And Bags', est: summary.air.estimated, act: summary.air.actual },
    { key: 'ground', label: 'Ground · Fuel, Mileage, Parking, Tolls, Rideshare, Other And Rental Cars', est: summary.ground.estimated, act: summary.ground.actual },
    ...summary.hotel.groups.filter(g => g.count).map(g => ({ key: `hotel-${g.group}`, label: `Hotel · ${g.group || 'No Cost Group'}`, est: g.subtotal, act: null })),
    { key: 'perdiem', label: 'Per Diem', est: summary.perDiem.estimated, act: null },
  ]
  const breakdownCols = [
    { key: 'cat', label: 'Category', width: 52, wrap: true, render: r => r.label },
    { key: 'est', label: 'Estimated', width: 16, align: 'right', render: r => money(r.est) },
    { key: 'act', label: 'Actual', width: 16, align: 'right', render: r => (r.act === null ? <span style={muted}>—</span> : money(r.act)) },
    { key: 'var', label: 'Over / Under Estimate', width: 16, align: 'right', render: r => { const v = variance(r.est, r.act); return <span style={{ color: varColor(v) }}>{signed(v)}</span> } },
  ]
  const travelerCols = [
    { key: 'name', label: 'Traveler', width: 30, render: r => <b>{nameOf(r.staff_id, r.staff)}</b> },
    { key: 'role', label: 'Role', width: 22, render: r => roleOf(r.staff_id) },
    { key: 'est', label: 'Estimated', width: 16, align: 'right', render: r => money(r.estimated) },
    { key: 'act', label: 'Actual', width: 16, align: 'right', render: r => (r.actual === null ? <span style={muted}>—</span> : money(r.actual)) },
    { key: 'chev', label: '', width: 16, align: 'right', render: r => <span style={muted}>{open[r.staff_id] ? '▴' : '▾'}</span> },
  ]
  const over = summary.overUnder

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 12 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Tile label="Estimated Total">{money(summary.estimatedTotal)}</Tile>
        <Tile label="Actual Total (Where Entered)">{summary.actualTotal === null ? <span style={muted}>—</span> : money(summary.actualTotal)}</Tile>
        <Tile label="Budget"><div style={{ fontSize: FS.tab, fontWeight: 400 }}><InlineMoney ariaLabel="Travel Budget" disabled={!canEdit} value={budget?.travel_budget} placeholder="0.00" onSave={saveBudgetValue} /></div></Tile>
        <Tile label="Over Or Under Budget">{over === null ? <span style={muted}>Set A Budget</span> : <span style={{ color: over > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{over > 0 ? `Over ${money(over)}` : over < 0 ? `Under ${money(Math.abs(over))}` : 'On Budget'}</span>}</Tile>
      </div>

      <div style={{ ...SMALL_LABEL, margin: '4px 0 8px' }}>Breakdown</div>
      <TableShell cols={breakdownCols} minWidth={700}>
        {rows.map(r => <BodyRow key={r.key} cols={breakdownCols} row={r} hover={false} />)}
        <tr><td colSpan={breakdownCols.length} style={{ padding: '10px', textAlign: 'right', fontWeight: 700, borderBottom: `1px solid ${LINE}` }}>Total · Estimated {money(summary.estimatedTotal)} · Actual {summary.actualTotal === null ? '—' : money(summary.actualTotal)}</td></tr>
      </TableShell>
      <div style={{ margin: '6px 0 16px', fontSize: FS.small, ...muted }}>Actual counts only the lines that have an actual amount. Hotel and Per Diem are estimates until receipts are tracked. Cancelled trips are left out.</div>

      <div style={{ ...SMALL_LABEL, margin: '4px 0 8px' }}>By Traveler · Trip Costs</div>
      <TableShell cols={travelerCols} minWidth={700}>
        {summary.perTraveler.length === 0 && <EmptyRow cols={travelerCols}>No trip costs entered yet. Add cost lines when you add or edit a trip.</EmptyRow>}
        {summary.perTraveler.map(r => (
          <Fragment4 key={r.staff_id}>
            <BodyRow cols={travelerCols} row={r} onClick={() => setOpen(o => ({ ...o, [r.staff_id]: !o[r.staff_id] }))} />
            {open[r.staff_id] && (
              <ExpandRow cols={travelerCols}>
                <div style={{ padding: '10px 16px' }}>
                  {r.lines.length === 0 && <span style={muted}>No cost lines.</span>}
                  {r.lines.map((c, i) => (
                    <div key={c.id || i} style={{ display: 'grid', gridTemplateColumns: '16% 14% 1fr 14% 14%', gap: 10, padding: '3px 0', fontSize: FS.body }}>
                      <span>{catLabel(c.category)}</span><span style={muted}>{c.direction === 'in' ? 'Travel To' : 'Travel From'}</span><span style={muted}>{c.note || (c.category === 'mileage' && c.miles ? `${c.miles} Miles` : '')}</span>
                      <span style={{ textAlign: 'right' }}>{money(c.estimated)}</span><span style={{ textAlign: 'right' }}>{c.actual === null || c.actual === undefined ? '—' : money(c.actual)}</span>
                    </div>
                  ))}
                </div>
              </ExpandRow>
            )}
          </Fragment4>
        ))}
      </TableShell>
    </div>
  )
}

function Fragment4({ children }) { return <>{children}</> }
