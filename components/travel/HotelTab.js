'use client'

// Hotel: the hotel's details and rates, travelers who still need a room, and the rooming list grouped by cost group with estimates.
import { useMemo, useState } from 'react'
import { quickToast } from '@/lib/quickToast'
import { getSupabase } from '@/lib/supabase'
import { saveHotelField, addRoom, updateRoom, deleteRoom } from '@/lib/travel/hotelData'
import { hotelTotals, nightlyRate, ROOM_TYPES, PAY_ON_OWN } from '@/lib/travel/hotelCost'
import { TableShell, BodyRow, GroupRow, EmptyRow } from './DataTable'
import { LINE, SMALL_LABEL, BTN_S, CARD, Chip, Check, InlineInput, InlineMoney, personName, money } from './shared'

const muted = { color: 'var(--text-muted-legible)' }
const sel = { fontFamily: 'inherit', fontSize: 15, width: '100%', boxSizing: 'border-box', padding: '4px 8px', border: `1px solid ${LINE}`, borderRadius: 6, background: 'var(--surface-card)', color: 'var(--text-primary)', outline: 'none' }
const NO_GROUP = 'No Cost Group'

function Field({ label, children, span = 1 }) {
  return <div style={{ gridColumn: `span ${span}`, minWidth: 0 }}><div style={{ ...SMALL_LABEL, marginBottom: 4 }}>{label}</div>{children}</div>
}

export default function HotelTab({ eventId, data, canEdit, reload }) {
  const { hotel, rooms, assignments, staffList, travelers, trips, costGroups } = data
  const [busy, setBusy] = useState(false)
  const [holdMode, setHoldMode] = useState(() => new Set())
  const people = useMemo(() => assignments.filter(a => a.staff_id), [assignments])
  const nameOf = (id) => personName(staffList.find(s => s.id === id) || people.find(p => p.staff_id === id)?.staff)

  const guard = async (fn) => {
    if (!canEdit) return
    setBusy(true)
    try { await fn() } catch (e) { console.error(e); quickToast(`Could not save: ${e.message}`) }
    setBusy(false)
    reload()
  }
  const saveField = (field, value) => guard(() => saveHotelField(getSupabase(), eventId, hotel, field, value))
  const upd = (id, patch) => guard(() => updateRoom(getSupabase(), id, patch))

  const tripsByStaff = useMemo(() => { const m = new Map(); for (const t of trips) { (m.get(t.staff_id) || m.set(t.staff_id, []).get(t.staff_id)).push(t) } return m }, [trips])
  const totals = useMemo(() => hotelTotals(rooms, hotel || {}, tripsByStaff, costGroups), [rooms, hotel, tripsByStaff, costGroups])

  const roomed = useMemo(() => new Set(rooms.flatMap(r => [r.staff_id_1, r.staff_id_2]).filter(Boolean)), [rooms])
  const needsRoom = useMemo(() => travelers.filter(t => t.needs_room && !roomed.has(t.staff_id)).map(t => t.staff_id), [travelers, roomed])

  const guestSelect = (r, slot) => {
    const key = `staff_id_${slot}`
    const isHold = slot === 1 && !r.staff_id_1 && (holdMode.has(r.id) || !!r.notes)
    if (isHold) {
      return (
        <div style={{ display: 'flex', gap: 4 }}>
          <InlineInput ariaLabel="Hold Label" disabled={!canEdit} value={r.notes} placeholder="Hold - Label" onSave={v => upd(r.id, { notes: v })} />
          {canEdit && <span role="button" aria-label="Choose A Guest Instead" title="Choose A Guest Instead" onClick={() => { setHoldMode(s => { const n = new Set(s); n.delete(r.id); return n }); if (r.notes) upd(r.id, { notes: '' }) }} style={{ cursor: 'pointer', ...muted }}>×</span>}
        </div>
      )
    }
    const ids = new Set(people.map(p => p.staff_id))
    return (
      <select aria-label={`Guest ${slot}`} disabled={!canEdit} value={r[key] || ''} style={sel}
        onChange={e => { const v = e.target.value; if (v === '__hold__') setHoldMode(s => new Set(s).add(r.id)); else upd(r.id, { [key]: v || null }) }}>
        <option value="">{slot === 1 ? 'Select Guest' : 'No Roommate'}</option>
        <optgroup label="On This Event">{people.map(p => <option key={p.staff_id} value={p.staff_id}>{personName(p.staff)}</option>)}</optgroup>
        <optgroup label="Someone Not On This Event">{staffList.filter(s => !ids.has(s.id)).map(s => <option key={s.id} value={s.id}>{personName(s)}</option>)}</optgroup>
        {slot === 1 && <option value="__hold__">Hold (Type A Label)</option>}
      </select>
    )
  }

  const cols = [
    { key: 'n', label: '#', width: 3, render: x => x.index },
    { key: 'g1', label: 'Guest 1', width: 12, render: x => guestSelect(x.room, 1) },
    { key: 'g2', label: 'Guest 2', width: 11, render: x => guestSelect(x.room, 2) },
    { key: 'group', label: 'Cost Group', width: 9, render: x => (
      <select aria-label="Cost Group" disabled={!canEdit} value={x.room.cost_group || ''} onChange={e => upd(x.room.id, { cost_group: e.target.value || null })} style={sel}>
        <option value="">{NO_GROUP}</option>{[...new Set([...costGroups, x.room.cost_group].filter(Boolean))].map(g => <option key={g} value={g}>{g}</option>)}
      </select>) },
    { key: 'type', label: 'Type', width: 7, render: x => (
      <select aria-label="Room Type" disabled={!canEdit} value={ROOM_TYPES.includes(x.room.room_type) ? x.room.room_type : '1 Bed'} onChange={e => upd(x.room.id, { room_type: e.target.value })} style={sel}>
        {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>) },
    { key: 'in', label: 'Check In', width: 10, render: x => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><InlineInput type="date" ariaLabel="Check In" disabled={!canEdit} value={x.info.dates.checkIn} onSave={v => upd(x.room.id, { check_in_date: v })} />{x.info.dates.autoIn && x.info.dates.checkIn && <Chip tone="grey" title="From the guests' trips. Edit to override.">Auto</Chip>}</div>) },
    { key: 'out', label: 'Check Out', width: 10, render: x => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><InlineInput type="date" ariaLabel="Check Out" disabled={!canEdit} value={x.info.dates.checkOut} onSave={v => upd(x.room.id, { check_out_date: v })} />{x.info.dates.autoOut && x.info.dates.checkOut && <Chip tone="grey" title="From the guests' trips. Edit to override.">Auto</Chip>}</div>) },
    { key: 'early', label: 'Early Check-In', width: 6, align: 'center', render: x => <Check checked={!!x.room.early_check_in} disabled={!canEdit} label="Early Check-In" onChange={() => upd(x.room.id, { early_check_in: !x.room.early_check_in })} /> },
    { key: 'conf', label: 'Confirmation', width: 9, render: x => <InlineInput ariaLabel="Confirmation" disabled={!canEdit} value={x.room.confirmation_number} onSave={v => upd(x.room.id, { confirmation_number: v })} /> },
    { key: 'parking', label: 'Parking', width: 7, render: x => (
      <select aria-label="Parking" disabled={!canEdit} value={x.room.parking || ''} onChange={e => upd(x.room.id, { parking: e.target.value || null })} style={sel}>
        <option value="">None</option><option value="self">Self</option><option value="valet">Valet</option>
      </select>) },
    { key: 'rate', label: 'Rate', width: 8, align: 'right', render: x => <InlineMoney ariaLabel="Rate Override" disabled={!canEdit} value={x.room.rate_override} placeholder={nightlyRate(x.room, hotel || {}).toFixed(2)} onSave={v => upd(x.room.id, { rate_override: v })} /> },
    { key: 'estimate', label: 'Estimate', width: 7, align: 'right', render: x => (String(x.room.cost_group || '').toLowerCase() === PAY_ON_OWN.toLowerCase() ? <span style={muted}>Pays Own</span> : money(x.info.estimate)) },
    { key: 'remove', label: '', width: 1.5, align: 'center', render: x => (canEdit ? <span role="button" aria-label="Remove Room" title="Remove Room" onClick={() => { if (confirm('Remove this room?')) guard(() => deleteRoom(getSupabase(), x.room.id)) }} style={{ cursor: 'pointer', color: 'var(--color-danger)' }}>×</span> : null) },
  ]

  // rooms grouped by cost group, in the Settings order, then anything left over
  const groups = totals.subtotals.map(s => ({ ...s, name: s.group || NO_GROUP, list: totals.rows.filter(r => (r.room.cost_group || '') === s.group) }))
    .filter(g => g.list.length || g.group)
  let counter = 0

  const text = (field, label, span) => <Field label={label} span={span}><InlineInput ariaLabel={label} disabled={!canEdit} value={hotel?.[field]} placeholder="—" onSave={v => saveField(field, v)} /></Field>
  const dateF = (field, label) => <Field label={label}><InlineInput type="date" ariaLabel={label} disabled={!canEdit} value={hotel?.[field]} onSave={v => saveField(field, v)} /></Field>
  const moneyF = (field, label) => <Field label={label}><InlineMoney ariaLabel={label} disabled={!canEdit} value={hotel?.[field]} onSave={v => saveField(field, v)} /></Field>

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 12 }}>
      <div style={{ ...CARD, padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ ...SMALL_LABEL, marginBottom: 10 }}>Hotel</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px 14px' }}>
          {text('hotel_name', 'Hotel Name')}{text('address', 'Address')}{text('phone', 'Phone')}{text('onsite_contact', 'Onsite Contact')}
          {moneyF('single_rate', 'Single Rate')}{moneyF('double_rate', 'Double Rate')}{moneyF('suite_rate', 'Suite Rate')}
          <Field label="Tax Percent"><InlineInput ariaLabel="Tax Percent" disabled={!canEdit} value={hotel?.tax_rate} placeholder="0" onSave={v => { const n = String(v).replace(/[^0-9.]/g, ''); saveField('tax_rate', n) }} /></Field>
          {moneyF('other_fee', 'Other Fee Per Night')}{moneyF('self_parking_rate', 'Self Parking Rate')}{moneyF('valet_parking_rate', 'Valet Parking Rate')}<div />
          {dateF('check_in_date', 'Group Check In')}{dateF('check_out_date', 'Group Check Out')}{dateF('cutoff_date', 'Cutoff Date')}{dateF('reservation_date', 'Reservation Date')}
          {dateF('rooming_list_sent_on', 'Rooming List Sent On')}{text('notes', 'Notes', 3)}
        </div>
      </div>

      {needsRoom.length > 0 && (
        <div style={{ ...CARD, padding: '8px 12px', marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={SMALL_LABEL}>Needs A Room · {needsRoom.length}</span>
          {needsRoom.map(id => (
            <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Chip tone="yellow">{nameOf(id)}</Chip>
              {canEdit && <button type="button" disabled={busy} onClick={() => guard(() => addRoom(getSupabase(), eventId, { staff_id_1: id }))} style={BTN_S}>Add Room</button>}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 8px' }}>
        <div style={SMALL_LABEL}>Rooming List · {rooms.length} {rooms.length === 1 ? 'Room' : 'Rooms'} · {totals.roomNights} Room Nights</div>
        {canEdit && <button type="button" disabled={busy} onClick={() => guard(() => addRoom(getSupabase(), eventId, {}))} style={BTN_S}>Add Room</button>}
      </div>
      <TableShell cols={cols} minWidth={1350}>
        {rooms.length === 0 && <EmptyRow cols={cols}>No rooms yet.</EmptyRow>}
        {groups.map(g => (
          <Fragment3 key={g.group || 'none'}>
            <GroupRow cols={cols} right={<>{g.count} {g.count === 1 ? 'Room' : 'Rooms'} · {g.nights} Nights · {money(g.subtotal)}{canEdit && g.group ? <button type="button" disabled={busy} onClick={() => guard(() => addRoom(getSupabase(), eventId, { cost_group: g.group }))} style={{ ...BTN_S, marginLeft: 10, padding: '2px 8px' }}>Add Room</button> : null}</>}>{g.name}</GroupRow>
            {g.list.map(info => <BodyRow key={info.room.id} cols={cols} row={{ room: info.room, info, index: ++counter }} hover={false} />)}
          </Fragment3>
        ))}
        {rooms.length > 0 && (
          <tr><td colSpan={cols.length} style={{ padding: '10px', textAlign: 'right', fontWeight: 700, borderBottom: `1px solid ${LINE}` }}>Hotel Total · {totals.roomNights} Room Nights · {money(totals.total)}</td></tr>
        )}
      </TableShell>
      <div style={{ marginTop: 10, fontSize: 13, ...muted }}>Check In and Check Out fill from the earliest arrival and latest departure of the guests and can be edited. Estimates use the rates above plus tax, the other fee and parking per night. Rooms in the Pay On Own group are not counted.</div>
    </div>
  )
}

function Fragment3({ children }) { return <>{children}</> }
