// Rooming list logic. Pure functions: no database access.
//
// planDrop turns a drag and drop (or the "Assign To" menu) into a list of room changes:
//   drag   { staffId, fromRoomId | null }          a name tile (fromRoomId null) or a guest taken out of a room
//   target { type: 'group', group }                a cost group header or its "Drop Here To Start A Room" row (group '' = no group)
//          { type: 'room', roomId }                an existing room: adds a roommate (or fills a hold row)
//          { type: 'unassign' }                    the Needs A Room sidebar: takes the guest out of the room
// It returns { ops, error, ensureNeedsRoom }. ops are executed in order: { op: 'create', fields } | { op: 'update', id, patch } | { op: 'delete', id, confirmFirst }.
// A guest who is moved out of a room that becomes empty (no guests, no hold label) deletes that room; if it has a confirmation number the caller asks first.

const hasGuest = (r) => !!(r.staff_id_1 || r.staff_id_2)
const isEmpty = (r) => !hasGuest(r) && !String(r.notes || '').trim()

function removeGuest(room, staffId) {
  let patch
  if (room.staff_id_1 === staffId) patch = { staff_id_1: room.staff_id_2 || null, staff_id_2: null } // the roommate moves up to Guest 1
  else if (room.staff_id_2 === staffId) patch = { staff_id_2: null }
  else return null
  const after = { ...room, ...patch }
  if (isEmpty(after)) return { op: 'delete', id: room.id, confirmFirst: !!String(room.confirmation_number || '').trim(), room }
  return { op: 'update', id: room.id, patch }
}

// returns { patch } or { error }
function addGuest(room, staffId) {
  if (room.staff_id_1 === staffId || room.staff_id_2 === staffId) return { patch: null }
  if (!room.staff_id_1) return { patch: { staff_id_1: staffId, notes: null } } // a hold row gets its guest
  if (!room.staff_id_2) return { patch: { staff_id_2: staffId, room_type: room.room_type === 'Suite' ? 'Suite' : '2 Bed' } }
  return { error: 'That room is full.' }
}

// Can this room take another guest? (drives the drop highlight)
export const roomHasSpace = (room) => !room.staff_id_1 || !room.staff_id_2

export function planDrop(rooms, drag, target) {
  const byId = new Map(rooms.map(r => [r.id, r]))
  const from = drag.fromRoomId ? byId.get(drag.fromRoomId) : null
  const ops = []
  if (target.type === 'unassign') {
    if (!from) return { ops: [], error: null, ensureNeedsRoom: false }
    const rm = removeGuest(from, drag.staffId)
    return { ops: rm ? [rm] : [], error: null, ensureNeedsRoom: true }
  }
  if (target.type === 'room') {
    if (from && from.id === target.roomId) return { ops: [], error: null, ensureNeedsRoom: false }
    const to = byId.get(target.roomId)
    if (!to) return { ops: [], error: 'That room no longer exists.', ensureNeedsRoom: false }
    const add = addGuest(to, drag.staffId)
    if (add.error) return { ops: [], error: add.error, ensureNeedsRoom: false }
    if (from) { const rm = removeGuest(from, drag.staffId); if (rm) ops.push(rm) }
    if (add.patch) ops.push({ op: 'update', id: to.id, patch: add.patch })
    return { ops, error: null, ensureNeedsRoom: false }
  }
  if (target.type === 'group') {
    if (from) { const rm = removeGuest(from, drag.staffId); if (rm) ops.push(rm) }
    ops.push({ op: 'create', fields: { cost_group: target.group || null, staff_id_1: drag.staffId, room_type: '1 Bed' } })
    return { ops, error: null, ensureNeedsRoom: false }
  }
  return { ops: [], error: null, ensureNeedsRoom: false }
}

// A whole room dragged onto another cost group header changes its group
export function planRoomToGroup(room, group) {
  if ((room.cost_group || '') === (group || '')) return { ops: [] }
  return { ops: [{ op: 'update', id: room.id, patch: { cost_group: group || null } }] }
}

// ── export rows ───────────────────────────────────────────────────────────
//   rows: hotelTotals(...).rows ({ room, dates, nights, estimate }); guestName(staffId) -> string; groupOrder: cost group names in Settings order
export function sheetRows(rows, guestName, groupOrder = []) {
  const nameOf = (r, slot) => (slot === 1 ? (r.staff_id_1 ? guestName(r.staff_id_1) : String(r.notes || '').trim()) : (r.staff_id_2 ? guestName(r.staff_id_2) : ''))
  const rank = (g) => { const i = groupOrder.indexOf(g || ''); return i === -1 ? groupOrder.length : i }
  const out = rows.map(x => ({
    costGroup: x.room.cost_group || '', guest1: nameOf(x.room, 1), guest2: nameOf(x.room, 2), type: x.room.room_type || '1 Bed',
    checkIn: x.dates.checkIn || '', checkOut: x.dates.checkOut || '', nights: x.nights, early: !!x.room.early_check_in,
    confirmation: x.room.confirmation_number || '', parking: x.room.parking === 'self' ? 'Self' : x.room.parking === 'valet' ? 'Valet' : '',
  }))
  out.sort((a, b) => rank(a.costGroup) - rank(b.costGroup) || (a.checkIn || '9999').localeCompare(b.checkIn || '9999') || a.guest1.localeCompare(b.guest1))
  const ins = out.map(r => r.checkIn).filter(Boolean).sort()
  const outs = out.map(r => r.checkOut).filter(Boolean).sort()
  return { rows: out, totals: { rooms: out.length, roomNights: out.reduce((a, r) => a + r.nights, 0), firstCheckIn: ins[0] || '', lastCheckOut: outs[outs.length - 1] || '' } }
}

// ── the Room checkbox rule ─────────────────────────────────────────────────
// A person who is in a room always has Room checked. Unchecking Room takes them out of their room (same rules as dragging them to the sidebar).
export function roomOf(rooms, staffId) { return rooms.find(r => r.staff_id_1 === staffId || r.staff_id_2 === staffId) || null }

export function planUncheckRoom(rooms, staffId) {
  const room = roomOf(rooms, staffId)
  if (!room) return { ops: [], room: null }
  const rm = removeGuest(room, staffId)
  return { ops: rm ? [rm] : [], room }
}

// People who are in a room but do not have Room checked yet (the flag is set for them on load)
export function reconcileNeedsRoom(rooms, travelers) {
  const checked = new Set(travelers.filter(t => t.needs_room).map(t => t.staff_id))
  const inRooms = new Set(rooms.flatMap(r => [r.staff_id_1, r.staff_id_2]).filter(Boolean))
  return [...inRooms].filter(id => !checked.has(id))
}

// Everyone a set of planned room changes puts into a room (they must end up with Room checked)
export function guestsAdded(ops) {
  const ids = new Set()
  for (const o of ops) {
    const f = o.op === 'create' ? o.fields : o.op === 'update' ? o.patch : null
    if (f?.staff_id_1) ids.add(f.staff_id_1)
    if (f?.staff_id_2) ids.add(f.staff_id_2)
  }
  return [...ids]
}
