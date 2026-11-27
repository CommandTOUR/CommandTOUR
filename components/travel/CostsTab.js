'use client'

// Costs, built from the mockup: summary tiles, then one table of categories (Airfare, Ground, Other Travel, Hotel, Per Diem) that open to
// their line items, then each traveler's trip costs. Calculation lives in lib/travel/costs.js.
import { useMemo, useState } from 'react'
import { quickToast } from '@/lib/quickToast'
import { getSupabase } from '@/lib/supabase'
import { hotelTotals } from '@/lib/travel/hotelCost'
import { computePerDiem } from '@/lib/travel/perDiem'
import { buildCostSummary, variance, AIRFARE_CATEGORIES, OTHER_TRAVEL_CATEGORIES, GROUND_CATEGORIES } from '@/lib/travel/costs'
import { COST_CATEGORIES, isLive, updateTripCost } from '@/lib/travel/trips'
import { updateRentalCar } from '@/lib/travel/ground'
import { saveBudget } from '@/lib/travel/budget'
import { TableShell, BodyRow, ExpandRow, EmptyRow } from './DataTable'
import { FS, LINE, SMALL_LABEL, CARD, BTN_S, InlineInput, InlineMoney, personName, money } from './shared'

const muted = { color: 'var(--text-muted-legible)' }
const catLabel = (v) => COST_CATEGORIES.find(c => c.value === v)?.label || v
const signed = (v) => (v === null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${money(Math.abs(v))}`)
const varColor = (v) => (v === null || v === 0 ? 'var(--text-primary)' : v > 0 ? 'var(--color-danger)' : 'var(--color-success)') // actual above budget = worse
const textBtn = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: FS.small, fontWeight: 600, color: 'var(--color-info)' }

function Tile({ label, children }) {
  return <div style={{ ...CARD, padding: '10px 14px', flex: 1, minWidth: 180 }}><div style={SMALL_LABEL}>{label}</div><div style={{ fontSize: FS.hero, fontWeight: 700, marginTop: 4 }}>{children}</div></div>
}

// Actual against Budget: fills to the budget, turns red past it; empty when there is no actual yet
function Meter({ budget, actual }) {
  if (actual === null || actual === undefined || !(budget > 0)) return <div aria-hidden="true" style={{ height: 8, borderRadius: 999, background: 'rgba(100,116,139,0.18)' }} />
  const pct = Math.min(100, (actual / budget) * 100)
  return (
    <div role="img" aria-label={`Actual is ${Math.round((actual / budget) * 100)} percent of budget`} style={{ height: 8, borderRadius: 999, background: 'rgba(100,116,139,0.18)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: actual > budget ? 'var(--color-danger)' : 'var(--color-info)' }} />
    </div>
  )
}

export default function CostsTab({ eventId, event, data, canEdit, reload, openTab }) {
  const { trips, rentals, rooms, hotel, travelers, meals, rates, perDiemSettings, costGroups, budget, assignments, staffList } = data
  const [open, setOpen] = useState({})
  const [openTraveler, setOpenTraveler] = useState({})
  const toggle = (k) => setOpen(o => ({ ...o, [k]: !o[k] }))
  const tripsByStaff = useMemo(() => { const m = new Map(); for (const t of trips) { (m.get(t.staff_id) || m.set(t.staff_id, []).get(t.staff_id)).push(t) } return m }, [trips])
  const hotelRes = useMemo(() => hotelTotals(rooms, hotel || {}, tripsByStaff, costGroups), [rooms, hotel, tripsByStaff, costGroups])
  const perDiem = useMemo(() => computePerDiem({ travelers: travelers.filter(t => t.per_diem_eligible), tripsByStaff, event, rates: rates || perDiemSettings.rates, mealTimes: perDiemSettings.mealTimes, provided: new Map(meals.map(m => [m.meal_date, m])) }), [travelers, tripsByStaff, event, rates, perDiemSettings, meals])
  const summary = useMemo(() => buildCostSummary({ trips, rentals, hotel: hotelRes, perDiemTotal: perDiem.total, budget: budget?.travel_budget ?? null }), [trips, rentals, hotelRes, perDiem, budget])

  const nameOf = (id, s) => personName(s || staffList.find(x => x.id === id) || assignments.find(a => a.staff_id === id)?.staff)
  const roleOf = (id) => assignments.find(a => a.staff_id === id)?.position?.title || '—'
  const fail = (e) => { console.error(e); quickToast(`Could not save: ${e.message}`) }
  const save = async (fn) => { try { await fn() } catch (e) { fail(e) } reload() }

  // all cost lines from trips that are not cancelled, with the person they belong to
  const lines = useMemo(() => trips.filter(t => t.status !== 'cancelled').flatMap(t => (t.costs || []).map(c => ({ ...c, trip: t }))), [trips])
  const linesIn = (cats) => lines.filter(l => cats.includes(l.category)).sort((a, b) => nameOf(a.trip.staff_id, a.trip.staff).localeCompare(nameOf(b.trip.staff_id, b.trip.staff)))

  // ── one flat list of rows, so every line sits in the same columns as its category ──
  const rows = []
  const cat = (key, label, est, act, children) => rows.push({ kind: 'cat', key, label, est, act, children })
  cat('airfare', 'Airfare', summary.airfare.estimated, summary.airfare.actual, () => linesIn(AIRFARE_CATEGORIES).map(l => ({ kind: 'cost', key: l.id, line: l })))
  cat('ground', 'Ground', summary.ground.estimated, summary.ground.actual, () => [
    ...rentals.map(c => ({ kind: 'rental', key: c.id, car: c })), ...linesIn(GROUND_CATEGORIES).map(l => ({ kind: 'cost', key: l.id, line: l }))])
  cat('other', 'Other Travel', summary.otherTravel.estimated, summary.otherTravel.actual, () => linesIn(OTHER_TRAVEL_CATEGORIES).map(l => ({ kind: 'cost', key: l.id, line: l })))
  cat('hotel', 'Hotel', hotelRes.total, null, () => hotelRes.subtotals.filter(g => g.count).map(g => ({ kind: 'hgroup', key: `hg-${g.group}`, group: g, rooms: hotelRes.rows.filter(r => (r.room.cost_group || '') === g.group) })))
  cat('perdiem', 'Per Diem', perDiem.total, null, () => perDiem.rows.map(r => ({ kind: 'pd', key: r.staff_id, row: r })))

  const flat = []
  for (const r of rows) {
    flat.push(r)
    if (open[r.key]) for (const c of r.children()) { flat.push(c); if (c.kind === 'hgroup' && open[c.key]) for (const room of c.rooms) flat.push({ kind: 'room', key: room.room.id, info: room.room, data: room }) }
  }

  const guestLabel = (r) => [r.staff_id_1 ? nameOf(r.staff_id_1) : (r.notes || 'Hold'), r.staff_id_2 ? nameOf(r.staff_id_2) : null].filter(Boolean).join(' & ')
  const indent = (n) => ({ paddingLeft: n * 18, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 })

  const cols = [
    { key: 'label', label: 'Category', width: 44, wrap: true, render: x => {
      if (x.kind === 'cat') return <button type="button" onClick={() => toggle(x.key)} style={{ ...textBtn, color: 'var(--text-primary)', fontSize: FS.body, display: 'flex', gap: 8, alignItems: 'center' }}><span style={muted}>{open[x.key] ? '▾' : '▸'}</span><b>{x.label}</b></button>
      if (x.kind === 'cost') return <div style={indent(2)}><span style={{ ...muted, whiteSpace: 'nowrap' }}>{nameOf(x.line.trip.staff_id, x.line.trip.staff)} · {catLabel(x.line.category)}</span><InlineInput ariaLabel="Note" disabled={!canEdit} value={x.line.note} placeholder="Note" onSave={v => save(() => updateTripCost(getSupabase(), x.line.id, { note: v }))} /></div>
      if (x.kind === 'rental') return <div style={indent(2)}><span style={{ whiteSpace: 'nowrap' }}>Rental Car · {x.car.vendor || 'No Vendor'}</span><span style={muted}>{x.car.staff_id ? nameOf(x.car.staff_id) : 'No Driver'}</span></div>
      if (x.kind === 'hgroup') return <button type="button" onClick={() => toggle(x.key)} style={{ ...textBtn, color: 'var(--text-primary)', fontSize: FS.body, paddingLeft: 18, display: 'flex', gap: 8, alignItems: 'center' }}><span style={muted}>{open[x.key] ? '▾' : '▸'}</span>{x.group.group || 'No Cost Group'}<span style={muted}> · {x.group.count} {x.group.count === 1 ? 'Room' : 'Rooms'} · {x.group.nights} Nights</span></button>
      if (x.kind === 'room') return <div style={indent(4)}><span>{guestLabel(x.info)}</span><span style={muted}>· {x.data.nights} Nights</span>{canEdit && <button type="button" onClick={() => openTab?.('hotel')} style={textBtn}>Edit In Hotel</button>}</div>
      if (x.kind === 'pd') return <div style={indent(2)}><span>{nameOf(x.row.staff_id)}</span><span style={muted}>· {roleOf(x.row.staff_id)}</span>{canEdit && <button type="button" onClick={() => openTab?.('perdiem')} style={textBtn}>Edit In Per Diem</button>}</div>
      return null
    } },
    { key: 'budget', label: 'Budget', width: 14, align: 'right', render: x => {
      if (x.kind === 'cat') return <b>{money(x.est)}</b>
      if (x.kind === 'cost') return <InlineMoney ariaLabel="Budget" disabled={!canEdit} value={x.line.estimated} onSave={v => save(() => updateTripCost(getSupabase(), x.line.id, { estimated: v }))} />
      if (x.kind === 'rental') return <InlineMoney ariaLabel="Budget" disabled={!canEdit} value={x.car.estimated_cost} onSave={v => save(() => updateRentalCar(getSupabase(), x.car.id, { estimated_cost: v }))} />
      if (x.kind === 'hgroup') return money(x.group.subtotal)
      if (x.kind === 'room') return money(x.data.estimate)
      if (x.kind === 'pd') return money(x.row.total)
      return null
    } },
    { key: 'actual', label: 'Actual', width: 14, align: 'right', render: x => {
      if (x.kind === 'cat') return x.act === null ? <span style={muted}>—</span> : <b>{money(x.act)}</b>
      if (x.kind === 'cost') return <InlineMoney ariaLabel="Actual" disabled={!canEdit} value={x.line.actual} onSave={v => save(() => updateTripCost(getSupabase(), x.line.id, { actual: v }))} />
      if (x.kind === 'rental') return <InlineMoney ariaLabel="Actual" disabled={!canEdit} value={x.car.actual_cost} onSave={v => save(() => updateRentalCar(getSupabase(), x.car.id, { actual_cost: v }))} />
      return <span style={muted}>—</span>
    } },
    { key: 'var', label: '+ / −', width: 12, align: 'right', render: x => {
      let v = null
      if (x.kind === 'cat') v = variance(x.est, x.act)
      else if (x.kind === 'cost') v = variance(x.line.estimated, x.line.actual)
      else if (x.kind === 'rental') v = variance(x.car.estimated_cost, x.car.actual_cost)
      return <span style={{ color: varColor(v) }}>{signed(v)}</span>
    } },
    { key: 'meter', label: 'Actual vs Budget', width: 16, render: x => (x.kind === 'cat' ? <Meter budget={x.est} actual={x.act} /> : null) },
  ]

  const over = summary.overUnder
  const saveBudgetValue = (v) => save(() => saveBudget(getSupabase(), eventId, v))

  const travelerCols = [
    { key: 'name', label: 'Traveler', width: 30, render: r => <b>{nameOf(r.staff_id, r.staff)}</b> },
    { key: 'role', label: 'Role', width: 22, render: r => roleOf(r.staff_id) },
    { key: 'budget', label: 'Budget', width: 16, align: 'right', render: r => money(r.estimated) },
    { key: 'actual', label: 'Actual', width: 16, align: 'right', render: r => (r.actual === null ? <span style={muted}>—</span> : money(r.actual)) },
    { key: 'chev', label: '', width: 16, align: 'right', render: r => <span style={muted}>{openTraveler[r.staff_id] ? '▴' : '▾'}</span> },
  ]

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 12 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <Tile label="Budget Total">{money(summary.estimatedTotal)}</Tile>
        <Tile label="Actual Total (Where Entered)">{summary.actualTotal === null ? <span style={muted}>—</span> : money(summary.actualTotal)}</Tile>
        <Tile label="Approved Budget"><div style={{ fontSize: FS.body, fontWeight: 400 }}><InlineMoney ariaLabel="Approved Budget" disabled={!canEdit} value={budget?.travel_budget} placeholder="0.00" onSave={saveBudgetValue} /></div></Tile>
        <Tile label="Over Or Under Approved Budget">{over === null ? <span style={muted}>Set An Approved Budget</span> : <span style={{ color: over > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{over > 0 ? `Over ${money(over)}` : over < 0 ? `Under ${money(Math.abs(over))}` : 'On Budget'}</span>}</Tile>
      </div>

      <TableShell cols={cols} minWidth={860}>
        {flat.map(x => <BodyRow key={`${x.kind}-${x.key}`} cols={cols} row={x} hover={false} rowStyle={x.kind === 'cat' ? { background: 'var(--surface-raised, rgba(0,0,0,0.03))' } : {}} />)}
        <tr><td colSpan={cols.length} style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontSize: FS.body, borderBottom: `1px solid ${LINE}` }}>Total · Budget {money(summary.estimatedTotal)} · Actual {summary.actualTotal === null ? '—' : money(summary.actualTotal)}</td></tr>
      </TableShell>
      <div style={{ margin: '6px 0 16px', fontSize: FS.small, ...muted }}>Open a category to see and edit its lines. Actual counts only the lines that have an actual amount; Hotel and Per Diem are budget amounts until receipts are tracked. Cancelled trips are left out.</div>

      <div style={{ ...SMALL_LABEL, margin: '4px 0 8px' }}>By Traveler · Trip Costs</div>
      <TableShell cols={travelerCols} minWidth={700}>
        {summary.perTraveler.length === 0 && <EmptyRow cols={travelerCols}>No trip costs entered yet. Add cost lines when you add or edit a trip.</EmptyRow>}
        {summary.perTraveler.map(r => (
          <Frag key={r.staff_id}>
            <BodyRow cols={travelerCols} row={r} onClick={() => setOpenTraveler(o => ({ ...o, [r.staff_id]: !o[r.staff_id] }))} />
            {openTraveler[r.staff_id] && (
              <ExpandRow cols={travelerCols}>
                <div style={{ padding: '8px 16px' }}>
                  {r.lines.length === 0 && <span style={muted}>No cost lines.</span>}
                  {r.lines.map((c, i) => (
                    <div key={c.id || i} style={{ display: 'grid', gridTemplateColumns: '16% 14% 1fr 14% 14%', gap: 10, padding: '2px 0', fontSize: FS.body }}>
                      <span>{catLabel(c.category)}</span><span style={muted}>{c.direction === 'in' ? 'Travel To' : 'Travel From'}</span><span style={muted}>{c.note || (c.category === 'mileage' && c.miles ? `${c.miles} Miles` : '')}</span>
                      <span style={{ textAlign: 'right' }}>{money(c.estimated)}</span><span style={{ textAlign: 'right' }}>{c.actual === null || c.actual === undefined ? '—' : money(c.actual)}</span>
                    </div>
                  ))}
                </div>
              </ExpandRow>
            )}
          </Frag>
        ))}
      </TableShell>
    </div>
  )
}

function Frag({ children }) { return <>{children}</> }
