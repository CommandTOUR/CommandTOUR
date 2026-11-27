'use client'

// Hotel: a summary bar, the rooming list grouped by cost group (left) and a sidebar of travelers who still need a room plus totals (right).
// Drag a name onto a cost group to start a room, onto a room to add a roommate, between rooms to move, or back to the sidebar to unassign.
// Plans for every drop come from lib/travel/rooming.js; every change has the Undo toast.
import { useMemo, useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { quickToast } from '@/lib/quickToast'
import { getSupabase } from '@/lib/supabase'
import { saveHotel, addRoom, updateRoom, deleteRoom, runRoomOps } from '@/lib/travel/hotelData'
import { setTravelerFlag } from '@/lib/travel/travelers'
import { hotelTotals, nightlyRate, ROOM_TYPES, PAY_ON_OWN } from '@/lib/travel/hotelCost'
import { planDrop, planRoomToGroup, roomHasSpace, sheetRows } from '@/lib/travel/rooming'
import { useAnchoredMenu } from '@/components/staffing/popup'
import { Z_MENU } from '@/components/staffing/shared'
import { TableShell, BodyRow, GroupRow, EmptyRow } from './DataTable'
import HotelSettingsModal from './HotelSettingsModal'
import { downloadRoomingXlsx } from './roomingExport'
import { FS, LINE, SMALL_LABEL, BTN_S, BTN_P, CARD, Chip, Check, InlineInput, InlineMoney, fmtDay, personName, money } from './shared'

const muted = { color: 'var(--text-muted-legible)' }
const sel = { fontFamily: 'inherit', fontSize: FS.body, width: '100%', boxSizing: 'border-box', padding: '3px 6px', border: `1px solid ${LINE}`, borderRadius: 6, background: 'var(--surface-card)', color: 'var(--text-primary)', outline: 'none' }
const NO_GROUP = 'No Cost Group'
const DROP_OK = { outline: '2px solid var(--color-info)', outlineOffset: -2, background: 'color-mix(in srgb, var(--color-info) 8%, transparent)' }
const DROP_HOT = { outline: '2px solid var(--color-info)', outlineOffset: -2, background: 'color-mix(in srgb, var(--color-info) 20%, transparent)' }
const handle = { cursor: 'grab', color: 'var(--text-muted-legible)', fontSize: FS.body, userSelect: 'none', lineHeight: 1, flexShrink: 0 }

// "Assign To…" click fallback for a name tile
function AssignMenu({ staffId, groups, rooms, nameOf, onAssign }) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)
  const menuRef = useRef(null)
  const open1 = rooms.filter(roomHasSpace)
  const style = useAnchoredMenu(anchorRef, open, 240, Math.min(320, (groups.length + open1.length) * 30 + 40))
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!menuRef.current?.contains(e.target) && !anchorRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  const item = { padding: '5px 8px', borderRadius: 6, cursor: 'pointer', fontSize: FS.body, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
  const hover = { onMouseEnter: e => { e.currentTarget.style.background = 'var(--glass-tile-hover)' }, onMouseLeave: e => { e.currentTarget.style.background = 'transparent' } }
  return (
    <>
      <button ref={anchorRef} type="button" onClick={() => setOpen(o => !o)} style={{ ...BTN_S, padding: '2px 8px' }}>Assign To…</button>
      {open && style && createPortal(
        <div ref={menuRef} role="menu" style={{ ...style, zIndex: Z_MENU, overflowY: 'auto', background: 'var(--surface-card)', border: `1px solid ${LINE}`, borderRadius: 10, padding: 4, boxShadow: '0 8px 28px rgba(0,0,0,0.35)', boxSizing: 'border-box' }}>
          <div style={{ ...SMALL_LABEL, padding: '4px 8px' }}>Start A New Room In</div>
          {groups.map(g => <div key={g || 'none'} role="menuitem" {...hover} style={item} onClick={() => { setOpen(false); onAssign({ type: 'group', group: g }) }}>{g || NO_GROUP}</div>)}
          {open1.length > 0 && <div style={{ ...SMALL_LABEL, padding: '8px 8px 4px' }}>Add As A Roommate</div>}
          {open1.map(r => <div key={r.id} role="menuitem" {...hover} style={item} onClick={() => { setOpen(false); onAssign({ type: 'room', roomId: r.id }) }}>{r.staff_id_1 ? nameOf(r.staff_id_1) : (r.notes || 'Hold Row')}{r.cost_group ? ` · ${r.cost_group}` : ''}</div>)}
        </div>, document.body)}
    </>
  )
}

export default function HotelTab({ eventId, event, data, canEdit, reload, undoable }) {
  const { hotel, rooms, assignments, staffList, travelers, trips, costGroups } = data
  const [busy, setBusy] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [holdMode, setHoldMode] = useState(() => new Set())
  const [drag, setDrag] = useState(null) // { staffId, fromRoomId, roomId } while something is being dragged
  const [hover, setHover] = useState('')
  const [search, setSearch] = useState('')
  const dragRef = useRef(null)
  const people = useMemo(() => assignments.filter(a => a.staff_id), [assignments])
  const nameOf = (id) => personName(staffList.find(s => s.id === id) || people.find(p => p.staff_id === id)?.staff)

  const tripsByStaff = useMemo(() => { const m = new Map(); for (const t of trips) { (m.get(t.staff_id) || m.set(t.staff_id, []).get(t.staff_id)).push(t) } return m }, [trips])
  const totals = useMemo(() => hotelTotals(rooms, hotel || {}, tripsByStaff, costGroups), [rooms, hotel, tripsByStaff, costGroups])
  const sheet = useMemo(() => sheetRows(totals.rows, nameOf, costGroups), [totals, costGroups, staffList, assignments]) // eslint-disable-line react-hooks/exhaustive-deps
  const roomed = useMemo(() => new Set(rooms.flatMap(r => [r.staff_id_1, r.staff_id_2]).filter(Boolean)), [rooms])
  const needsRoom = useMemo(() => travelers.filter(t => t.needs_room && !roomed.has(t.staff_id)).map(t => t.staff_id), [travelers, roomed])
  const strangers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    const taken = new Set([...people.map(p => p.staff_id), ...needsRoom, ...roomed])
    return staffList.filter(s => !taken.has(s.id) && personName(s).toLowerCase().includes(q)).slice(0, 6)
  }, [search, staffList, people, needsRoom, roomed])

  const guard = async (fn, message) => {
    if (!canEdit) return
    setBusy(true)
    try { await undoable(message, [eventId], fn) } catch (e) { console.error(e); quickToast(`Could not save: ${e.message}`) }
    setBusy(false)
    reload()
  }
  const sb = () => getSupabase()
  const upd = (id, patch, message = 'Room updated') => guard(() => updateRoom(sb(), id, patch), message)

  // ── drag and drop ───────────────────────────────────────────────────────
  const startDrag = (d) => (e) => {
    dragRef.current = d; setDrag(d)
    e.dataTransfer.effectAllowed = 'move'
    try { e.dataTransfer.setData('text/plain', d.staffId || d.roomId || '') } catch {}
  }
  const endDrag = () => { dragRef.current = null; setDrag(null); setHover('') }
  const validTarget = (t) => {
    if (!drag) return false
    if (drag.roomId) return t.type === 'group' // a whole room only changes cost group
    if (t.type === 'group') return true
    if (t.type === 'unassign') return !!drag.fromRoomId
    const room = rooms.find(r => r.id === t.roomId)
    return !!room && room.id !== drag.fromRoomId && roomHasSpace(room)
  }
  const dropProps = (t, key) => ({
    onDragOver: (e) => { if (validTarget(t)) { e.preventDefault(); if (hover !== key) setHover(key) } },
    onDragLeave: () => { if (hover === key) setHover('') },
    onDrop: (e) => { e.preventDefault(); const d = dragRef.current; endDrag(); if (d && canEdit) performDrop(d, t) },
  })
  const dropStyle = (t, key) => (validTarget(t) ? (hover === key ? DROP_HOT : DROP_OK) : {})

  const performDrop = async (d, t) => {
    if (d.roomId) {
      const room = rooms.find(r => r.id === d.roomId)
      const plan = room ? planRoomToGroup(room, t.group) : { ops: [] }
      if (plan.ops.length) await guard(() => runRoomOps(sb(), eventId, plan.ops), 'Room moved to another cost group')
      return
    }
    const plan = planDrop(rooms, d, t)
    if (plan.error) { quickToast(plan.error); return }
    if (!plan.ops.length && !plan.ensureNeedsRoom) return
    await guard(async () => {
      await runRoomOps(sb(), eventId, plan.ops, () => confirm('This room has a confirmation number. Remove the room too? Cancel keeps the empty room.'))
      if (plan.ensureNeedsRoom) await setTravelerFlag(sb(), eventId, d.staffId, 'needs_room', true)
    }, `${nameOf(d.staffId)}: ${t.type === 'unassign' ? 'Removed From Room' : t.type === 'group' ? 'New Room' : 'Added To Room'}`)
  }

  // ── cells ───────────────────────────────────────────────────────────────
  const guestCell = (r, slot) => {
    const key = `staff_id_${slot}`
    const staffId = r[key]
    const isHold = slot === 1 && !r.staff_id_1 && (holdMode.has(r.id) || !!r.notes)
    if (isHold) {
      return (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <InlineInput ariaLabel="Hold Label" disabled={!canEdit} value={r.notes} placeholder="Hold - Label" onSave={v => upd(r.id, { notes: v })} />
          {canEdit && <span role="button" aria-label="Choose A Guest Instead" title="Choose A Guest Instead" onClick={() => { setHoldMode(s => { const n = new Set(s); n.delete(r.id); return n }); if (r.notes) upd(r.id, { notes: '' }) }} style={{ cursor: 'pointer', ...muted }}>×</span>}
        </div>
      )
    }
    const ids = new Set(people.map(p => p.staff_id))
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {staffId && canEdit && <span draggable onDragStart={startDrag({ staffId, fromRoomId: r.id })} onDragEnd={endDrag} title="Drag To Move This Guest" aria-hidden="true" style={handle}>⠿</span>}
        <select aria-label={`Guest ${slot}`} disabled={!canEdit} value={staffId || ''} style={sel}
          onChange={e => { const v = e.target.value; if (v === '__hold__') setHoldMode(s => new Set(s).add(r.id)); else upd(r.id, { [key]: v || null }, 'Guest changed') }}>
          <option value="">{slot === 1 ? 'Select Guest' : 'No Roommate'}</option>
          <optgroup label="On This Event">{people.map(p => <option key={p.staff_id} value={p.staff_id}>{personName(p.staff)}</option>)}</optgroup>
          <optgroup label="Someone Not On This Event">{staffList.filter(s => !ids.has(s.id)).map(s => <option key={s.id} value={s.id}>{personName(s)}</option>)}</optgroup>
          {slot === 1 && <option value="__hold__">Hold (Type A Label)</option>}
        </select>
      </div>
    )
  }

  const cols = [
    { key: 'n', label: '#', width: 4, render: x => (canEdit ? <span draggable onDragStart={startDrag({ roomId: x.room.id })} onDragEnd={endDrag} title="Drag This Room To Another Cost Group" style={{ ...handle, cursor: 'grab' }}>{x.index}</span> : x.index) },
    { key: 'g1', label: 'Guest 1', width: 16, render: x => guestCell(x.room, 1) },
    { key: 'g2', label: 'Guest 2', width: 14, render: x => guestCell(x.room, 2) },
    { key: 'type', label: 'Type', width: 7, render: x => (
      <select aria-label="Room Type" disabled={!canEdit} value={ROOM_TYPES.includes(x.room.room_type) ? x.room.room_type : '1 Bed'} onChange={e => upd(x.room.id, { room_type: e.target.value }, 'Room type changed')} style={sel}>
        {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>) },
    { key: 'in', label: 'Check In', width: 10, render: x => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><InlineInput type="date" ariaLabel="Check In" disabled={!canEdit} value={x.info.dates.checkIn} onSave={v => upd(x.room.id, { check_in_date: v })} />{x.info.dates.autoIn && x.info.dates.checkIn && <Chip tone="grey" title="From the guests' trips. Edit to override.">Auto</Chip>}</div>) },
    { key: 'out', label: 'Check Out', width: 10, render: x => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><InlineInput type="date" ariaLabel="Check Out" disabled={!canEdit} value={x.info.dates.checkOut} onSave={v => upd(x.room.id, { check_out_date: v })} />{x.info.dates.autoOut && x.info.dates.checkOut && <Chip tone="grey" title="From the guests' trips. Edit to override.">Auto</Chip>}</div>) },
    { key: 'nights', label: 'Nights', width: 5, align: 'center', render: x => x.info.nights },
    { key: 'early', label: 'Early Check-In', width: 6, align: 'center', render: x => <Check checked={!!x.room.early_check_in} disabled={!canEdit} label="Early Check-In" onChange={() => upd(x.room.id, { early_check_in: !x.room.early_check_in })} /> },
    { key: 'conf', label: 'Confirmation', width: 10, render: x => <InlineInput ariaLabel="Confirmation" disabled={!canEdit} value={x.room.confirmation_number} onSave={v => upd(x.room.id, { confirmation_number: v })} /> },
    { key: 'parking', label: 'Parking', width: 7, render: x => (
      <select aria-label="Parking" disabled={!canEdit} value={x.room.parking || ''} onChange={e => upd(x.room.id, { parking: e.target.value || null }, 'Parking changed')} style={sel}>
        <option value="">None</option><option value="self">Self</option><option value="valet">Valet</option>
      </select>) },
    { key: 'rate', label: 'Rate', width: 8, align: 'right', render: x => <InlineMoney ariaLabel="Rate Override" disabled={!canEdit} value={x.room.rate_override} placeholder={nightlyRate(x.room, hotel || {}).toFixed(2)} onSave={v => upd(x.room.id, { rate_override: v })} /> },
    { key: 'budget', label: 'Budget', width: 7, align: 'right', render: x => (String(x.room.cost_group || '').toLowerCase() === PAY_ON_OWN.toLowerCase() ? <span style={muted}>Pays Own</span> : money(x.info.estimate)) },
    { key: 'remove', label: '', width: 2, align: 'center', render: x => (canEdit ? <span role="button" aria-label="Remove Room" title="Remove Room" onClick={() => { if (confirm('Remove this room?')) guard(() => deleteRoom(sb(), x.room.id), 'Room removed') }} style={{ cursor: 'pointer', color: 'var(--color-danger)' }}>×</span> : null) },
  ]

  const groups = totals.subtotals.map(s => ({ ...s, name: s.group || NO_GROUP, list: totals.rows.filter(r => (r.room.cost_group || '') === s.group) })).filter(g => g.list.length || g.group)
  let counter = 0
  const toggleGroup = (g) => setCollapsed(prev => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n })

  // ── summary bar and exports ─────────────────────────────────────────────
  const chip = (label, value) => <span key={label} style={{ border: `1px solid ${LINE}`, borderRadius: 6, padding: '3px 8px', fontSize: FS.small, whiteSpace: 'nowrap' }}><span style={muted}>{label} </span><b>{value}</b></span>
  const hasHotel = !!(hotel && (hotel.hotel_name || hotel.address || hotel.phone || hotel.single_rate != null || hotel.double_rate != null))
  const saveSettings = async (f) => {
    setBusy(true)
    try { await undoable('Hotel details saved', [eventId], () => saveHotel(sb(), eventId, hotel, f)); setSettingsOpen(false) } catch (e) { console.error(e); quickToast(`Could not save: ${e.message}`) }
    setBusy(false)
    reload()
  }
  const downloadPdf = async () => {
    try {
      const res = await fetch(`/api/event-packet/${eventId}/hotel?tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`)
      if (!res.ok || !(res.headers.get('Content-Type') || '').includes('pdf')) throw new Error(res.redirected ? 'Your session expired. Sign in again.' : 'Could not build the rooming list')
      const star = /filename\*=UTF-8''([^;]+)/i.exec(res.headers.get('Content-Disposition') || '')
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a'); a.href = url; a.download = star ? decodeURIComponent(star[1]) : 'Rooming List.pdf'; document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (e) { quickToast(`Download failed: ${e.message}`) }
  }
  const downloadExcel = async () => {
    try { await downloadRoomingXlsx({ event, hotel, sheet, fileName: `${[event?.city, event?.state].filter(Boolean).join(' ') || 'Event'} Rooming List.xlsx` }) } catch (e) { console.error(e); quickToast(`Download failed: ${e.message}`) }
  }

  const dropRow = (g) => {
    const t = { type: 'group', group: g.group }
    const show = drag && !drag.roomId ? true : g.list.length === 0
    if (!show) return null
    return (
      <tr key={`drop-${g.group || 'none'}`} {...dropProps(t, `drop-${g.group}`)} style={dropStyle(t, `drop-${g.group}`)}>
        <td colSpan={cols.length} style={{ padding: '7px 10px', fontSize: FS.small, ...muted, borderBottom: `1px solid ${LINE}`, textAlign: 'center', fontStyle: 'italic' }}>Drop Here To Start A Room</td>
      </tr>
    )
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 12 }}>
      <div style={{ ...CARD, padding: '8px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {hasHotel ? (
          <>
            <div style={{ minWidth: 0, marginRight: 6 }}>
              <div style={{ fontSize: FS.title, fontWeight: 700 }}>{hotel.hotel_name || 'Hotel'}</div>
              <div style={{ fontSize: FS.small, ...muted }}>{[hotel.address, hotel.phone].filter(Boolean).join(' · ') || '—'}</div>
            </div>
            {chip('Single', money(hotel.single_rate))}{chip('Double', money(hotel.double_rate))}{chip('Suite', money(hotel.suite_rate))}
            {chip('Tax', hotel.tax_rate != null ? `${hotel.tax_rate}%` : '—')}
            {chip('Parking', `Self ${money(hotel.self_parking_rate)} · Valet ${money(hotel.valet_parking_rate)}`)}
            {chip('Cutoff Date', hotel.cutoff_date ? fmtDay(hotel.cutoff_date) : '—')}
            {chip('Rooming List Sent', hotel.rooming_list_sent_on ? fmtDay(hotel.rooming_list_sent_on) : 'Not Sent')}
          </>
        ) : <span style={{ fontSize: FS.body, ...muted }}>No hotel details yet.</span>}
        <span style={{ flex: 1 }} />
        {canEdit && <button type="button" onClick={() => setSettingsOpen(true)} style={hasHotel ? BTN_S : BTN_P}>{hasHotel ? 'Hotel Settings' : 'Add Hotel Details'}</button>}
      </div>

      <div className="travel-hotel-layout">
        <div style={{ minWidth: 0 }}>
          <div style={{ ...SMALL_LABEL, margin: '0 0 8px' }}>Rooming List · {rooms.length} {rooms.length === 1 ? 'Room' : 'Rooms'} · {totals.roomNights} Room Nights</div>
          <TableShell cols={cols} minWidth={1100}>
            {groups.length === 0 && <EmptyRow cols={cols}>No cost groups yet. Add groups in Settings, Travel.</EmptyRow>}
            {groups.map(g => {
              const t = { type: 'group', group: g.group }
              const open = !collapsed.has(g.group || '')
              return (
                <Frag key={g.group || 'none'}>
                  <GroupRow cols={cols} onClick={() => toggleGroup(g.group || '')} rowProps={dropProps(t, `head-${g.group}`)} rowStyle={dropStyle(t, `head-${g.group}`)}
                    right={<>{g.count} {g.count === 1 ? 'Room' : 'Rooms'} · {g.nights} Nights · {money(g.subtotal)}{canEdit && g.group ? <button type="button" disabled={busy} onClick={(e) => { e.stopPropagation(); guard(() => addRoom(sb(), eventId, { cost_group: g.group, notes: `Hold - ${g.group}` }), 'Hold row added') }} style={{ ...BTN_S, marginLeft: 10, padding: '1px 8px' }}>+ Hold</button> : null}</>}>
                    {open ? '▾' : '▸'} {g.name}
                  </GroupRow>
                  {open && g.list.map(info => <BodyRow key={info.room.id} cols={cols} row={{ room: info.room, info, index: ++counter }} hover={false} rowProps={dropProps({ type: 'room', roomId: info.room.id }, `room-${info.room.id}`)} rowStyle={dropStyle({ type: 'room', roomId: info.room.id }, `room-${info.room.id}`)} />)}
                  {open && dropRow(g)}
                </Frag>
              )
            })}
            {rooms.length > 0 && <tr><td colSpan={cols.length} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, fontSize: FS.body, borderBottom: `1px solid ${LINE}` }}>Hotel Total · {totals.roomNights} Room Nights · {money(totals.total)}</td></tr>}
          </TableShell>
          <div style={{ marginTop: 8, fontSize: FS.small, ...muted }}>Check In and Check Out fill from the earliest arrival and latest departure of the guests and can be edited. Budget uses the rates above plus tax, the other fee and parking per night. Rooms in the Pay On Own group are not counted.</div>
        </div>

        <aside className="travel-hotel-side" style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <div {...dropProps({ type: 'unassign' }, 'sidebar')} style={{ ...CARD, padding: '10px 12px', ...dropStyle({ type: 'unassign' }, 'sidebar') }}>
            <div style={{ ...SMALL_LABEL, marginBottom: 8 }}>Needs A Room · {needsRoom.length}</div>
            {needsRoom.length === 0 && <div style={{ fontSize: FS.body, ...muted, marginBottom: 8 }}>{drag?.fromRoomId ? 'Drop Here To Unassign' : 'Everyone who needs a room has one. Check Room on the Travelers tab to add people.'}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {needsRoom.map(id => (
                <div key={id} draggable={canEdit} onDragStart={startDrag({ staffId: id, fromRoomId: null })} onDragEnd={endDrag}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--text-primary)', borderRadius: 6, padding: '4px 8px', background: 'var(--surface-card)', cursor: canEdit ? 'grab' : 'default', opacity: drag?.staffId === id && !drag.fromRoomId ? 0.4 : 1 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: FS.body, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nameOf(id)}</span>
                  {canEdit && <AssignMenu staffId={id} groups={[...costGroups, ''].filter((g, i, a) => a.indexOf(g) === i)} rooms={rooms} nameOf={nameOf} onAssign={(t) => performDrop({ staffId: id, fromRoomId: null }, t)} />}
                </div>
              ))}
            </div>
            {canEdit && (
              <div style={{ marginTop: 10 }}>
                <input aria-label="Add Someone Not On This Event" value={search} onChange={e => setSearch(e.target.value)} placeholder="Add Someone Not On This Event" style={{ ...sel, padding: '5px 8px' }} />
                {strangers.map(s => (
                  <div key={s.id} role="button" onClick={() => { setSearch(''); guard(() => setTravelerFlag(sb(), eventId, s.id, 'needs_room', true), `${personName(s)}: Needs A Room`) }}
                    style={{ padding: '4px 8px', fontSize: FS.body, cursor: 'pointer', borderRadius: 6 }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-tile-hover)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>{personName(s)}</div>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...CARD, padding: '10px 12px' }}>
            <div style={{ ...SMALL_LABEL, marginBottom: 8 }}>Totals</div>
            {[['Rooms', sheet.totals.rooms], ['Room Nights', sheet.totals.roomNights], ['First Check-In', sheet.totals.firstCheckIn ? fmtDay(sheet.totals.firstCheckIn) : '—'], ['Last Check-Out', sheet.totals.lastCheckOut ? fmtDay(sheet.totals.lastCheckOut) : '—']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: FS.body }}><span style={muted}>{k}</span><b>{v}</b></div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 0', marginTop: 4, borderTop: `1px solid ${LINE}`, fontSize: FS.body, fontWeight: 700 }}><span>Budget Total</span><span>{money(totals.total)}</span></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button type="button" onClick={downloadPdf} disabled={!rooms.length} style={BTN_S}>Download Rooming List (PDF)</button>
              <button type="button" onClick={downloadExcel} disabled={!rooms.length} style={BTN_S}>Excel</button>
            </div>
          </div>
        </aside>
      </div>

      {settingsOpen && <HotelSettingsModal hotel={hotel} saving={busy} onSave={saveSettings} onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

function Frag({ children }) { return <>{children}</> }
