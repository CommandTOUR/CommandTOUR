'use client'

// UNDO for the staffing grid.
//
// How it works: before a change we snapshot the rows it can touch (the staff_assignments of the events involved, their
// arrival/departure rows, and the tour_positions of their tours); after the change we snapshot again. The difference IS the
// change (including both sides of a swap and any travel rows that were created), so undoing means putting every row back exactly
// as it was: re-insert what was deleted (same ids), set changed rows back, delete what was created.
//
// Restoring a person onto an event goes through canAssign (the double-booking rule) first, so an undo can never create a double booking.
import { canAssign } from '@/lib/staffingGuard'

const PAGE = 1000

async function fetchAll(build) {
  const out = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().order('id', { ascending: true }).range(from, from + PAGE - 1)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < PAGE) break
  }
  return out
}

const byId = (rows) => new Map(rows.map(r => [r.id, r]))

export async function takeSnapshot(supabase, eventIds, tourIds) {
  const ev = [...new Set(eventIds)]
  const tours = [...new Set(tourIds)]
  const [assignments, arrivals, departures, tourPositions] = await Promise.all([
    ev.length ? fetchAll(() => supabase.from('staff_assignments').select('*').in('event_id', ev)) : [],
    ev.length ? fetchAll(() => supabase.from('event_travel_arrivals').select('*').in('event_id', ev)) : [],
    ev.length ? fetchAll(() => supabase.from('event_travel_departures').select('*').in('event_id', ev)) : [],
    tours.length ? fetchAll(() => supabase.from('tour_positions').select('*').in('tour_id', tours)) : [],
  ])
  return { assignments: byId(assignments), arrivals: byId(arrivals), departures: byId(departures), tourPositions: byId(tourPositions) }
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function diffTable(before, after) {
  const created = [], deleted = [], changed = []
  for (const [id, row] of after) {
    if (!before.has(id)) created.push(row)
    else if (!same(before.get(id), row)) changed.push({ before: before.get(id), after: row })
  }
  for (const [id, row] of before) if (!after.has(id)) deleted.push(row)
  return { created, deleted, changed }
}

export function diffSnapshots(before, after) {
  const ops = {
    assignments: diffTable(before.assignments, after.assignments),
    arrivals: diffTable(before.arrivals, after.arrivals),
    departures: diffTable(before.departures, after.departures),
    tourPositions: diffTable(before.tourPositions, after.tourPositions),
  }
  ops.empty = Object.values(ops).every(t => !t.created.length && !t.deleted.length && !t.changed.length)
  return ops
}

const withoutKeys = (row, keys) => Object.fromEntries(Object.entries(row).filter(([k]) => !keys.includes(k)))

// Put everything back. Returns { ok: true } or { ok: false, reason }.
export async function applyUndo(supabase, ops) {
  const A = ops.assignments
  // 1. the double-booking rule, for everyone who is going back onto an event
  const leaving = new Set([...A.created.map(r => r.id), ...A.changed.map(c => c.after.id)])
  const returning = [
    ...A.deleted.filter(r => r.staff_id && r.event_id).map(r => ({ staff: r.staff_id, event: r.event_id })),
    ...A.changed.filter(c => c.before.staff_id && c.before.event_id && c.before.staff_id !== c.after.staff_id).map(c => ({ staff: c.before.staff_id, event: c.before.event_id })),
  ]
  for (const r of returning) {
    const g = await canAssign(r.staff, r.event, { ignoreAssignmentIds: [...leaving] })
    if (!g.ok) return { ok: false, reason: `${g.reason || 'Double-booked'}. Nothing was undone` }
  }

  const problems = []
  const run = async (label, p) => { const { error } = await p; if (error) { console.error('undo failed:', label, error); problems.push(label) } }

  // 2. restore first (so a failure never leaves the person nowhere), then remove what the change created
  for (const r of ops.tourPositions.deleted) await run('tour position', supabase.from('tour_positions').insert([r]))
  for (const r of A.deleted) await run('assignment', supabase.from('staff_assignments').insert([r]))
  for (const c of A.changed) await run('assignment', supabase.from('staff_assignments').update(withoutKeys(c.before, ['id', 'created_at'])).eq('id', c.before.id))
  for (const t of ['arrivals', 'departures']) {
    const table = t === 'arrivals' ? 'event_travel_arrivals' : 'event_travel_departures'
    for (const r of ops[t].deleted) await run(t, supabase.from(table).insert([r]))
    for (const c of ops[t].changed) await run(t, supabase.from(table).update(withoutKeys(c.before, ['id', 'created_at'])).eq('id', c.before.id))
  }
  for (const t of ['arrivals', 'departures']) {
    const table = t === 'arrivals' ? 'event_travel_arrivals' : 'event_travel_departures'
    if (ops[t].created.length) await run(t, supabase.from(table).delete().in('id', ops[t].created.map(r => r.id)))
  }
  if (A.created.length) await run('assignment', supabase.from('staff_assignments').delete().in('id', A.created.map(r => r.id)))
  if (ops.tourPositions.created.length) await run('tour position', supabase.from('tour_positions').delete().in('id', ops.tourPositions.created.map(r => r.id)))
  for (const c of ops.tourPositions.changed) await run('tour position', supabase.from('tour_positions').update(withoutKeys(c.before, ['id', 'created_at'])).eq('id', c.before.id))

  return problems.length ? { ok: false, reason: `Undo only partly worked (${[...new Set(problems)].join(', ')}). Please check` } : { ok: true }
}
