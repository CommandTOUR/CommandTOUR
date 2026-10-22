import { getSupabase } from './supabase'

// ── Normalisation ───────────────────────────────────────────────────────────

const ADDR_WORDS = {
  street: 'st', avenue: 'ave', boulevard: 'blvd', drive: 'dr', road: 'rd', lane: 'ln', court: 'ct',
  place: 'pl', highway: 'hwy', parkway: 'pkwy', square: 'sq', circle: 'cir', way: 'way',
  north: 'n', south: 's', east: 'e', west: 'w', northeast: 'ne', northwest: 'nw', southeast: 'se', southwest: 'sw',
}

export function normalizeAddress(a) {
  return (a || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
    .map(w => ADDR_WORDS[w] || w).join(' ')
}

export function normalizeName(n) {
  return (n || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/).filter(w => w && w !== 'the').join(' ')
}

const bigrams = (s) => {
  const t = s.replace(/\s+/g, '')
  const out = new Map()
  for (let i = 0; i < t.length - 1; i++) { const g = t.slice(i, i + 2); out.set(g, (out.get(g) || 0) + 1) }
  return out
}

// Dice coefficient on character bigrams (trigram-style fuzzy match)
function similarity(a, b) {
  if (!a || !b) return 0
  const A = bigrams(a), B = bigrams(b)
  let overlap = 0
  for (const [g, n] of A) overlap += Math.min(n, B.get(g) || 0)
  const total = [...A.values()].reduce((x, y) => x + y, 0) + [...B.values()].reduce((x, y) => x + y, 0)
  return total ? (2 * overlap) / total : 0
}

function namesSimilar(a, b) {
  const x = normalizeName(a), y = normalizeName(b)
  if (!x || !y) return false
  if (x === y) return true
  if (Math.min(x.length, y.length) >= 5 && (x.includes(y) || y.includes(x))) return true
  return similarity(x, y) >= 0.75
}

// ── former_names support (column may not exist yet) ─────────────────────────

let formerNamesSupported = null
export async function supportsFormerNames() {
  if (formerNamesSupported !== null) return formerNamesSupported
  const { error } = await getSupabase().from('venues').select('id, former_names').limit(1)
  formerNamesSupported = !error
  return formerNamesSupported
}

// ── Duplicate detection ─────────────────────────────────────────────────────
// Order: (a) same Google place_id, (b) same normalised street address + city,
// (c) similar name (incl. former names) in the same city. Returns [{ venue, reason }].

export async function findDuplicateVenues({ place_id, name, address, city }) {
  const supabase = getSupabase()
  const found = new Map()
  const add = (venue, reason) => { if (!found.has(venue.id)) found.set(venue.id, { venue, reason }) }

  if (place_id) {
    const { data } = await supabase.from('venues').select('*').eq('place_id', place_id)
    ;(data || []).forEach(v => add(v, 'place_id'))
  }

  const cityTrim = (city || '').trim()
  if (cityTrim) {
    const { data } = await supabase.from('venues').select('*').ilike('city', cityTrim.replace(/[%_]/g, ''))
    const sameCity = data || []
    const addrKey = normalizeAddress(address)
    if (addrKey) sameCity.filter(v => normalizeAddress(v.address) === addrKey).forEach(v => add(v, 'address'))
    if (name) {
      sameCity.filter(v => namesSimilar(name, v.name) || (v.former_names || []).some(f => namesSimilar(name, f)))
        .forEach(v => add(v, 'name'))
    }
  }
  return [...found.values()]
}

export const REASON_LABEL = {
  place_id: 'same Google place',
  address: 'same street address',
  name: 'similar name in this city',
}

// ── Search existing venues ──────────────────────────────────────────────────

export async function searchVenues(q, limit = 8) {
  const supabase = getSupabase()
  const words = q.trim().toLowerCase().replace(/[,()%*]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const withFormer = await supportsFormerNames()
  const cols = withFormer ? 'id, name, city, state, country, address, place_id, former_names' : 'id, name, city, state, country, address, place_id'

  let query = supabase.from('venues').select(cols)
  for (const w of words) query = query.or(`name.ilike.*${w}*,city.ilike.*${w}*,address.ilike.*${w}*`)
  const { data } = await query.order('name').limit(limit)
  const results = new Map((data || []).map(v => [v.id, v]))

  // Former names: array column, so match client-side over the (few) venues that have any
  if (withFormer) {
    const { data: renamed } = await supabase.from('venues').select(cols).neq('former_names', '{}')
    ;(renamed || []).forEach(v => {
      const hay = (v.former_names || []).join(' ').toLowerCase()
      if (words.every(w => hay.includes(w))) results.set(v.id, v)
    })
  }
  return [...results.values()].slice(0, limit)
}

// ── Rename (same venue, new name) ───────────────────────────────────────────

export async function renameVenue(venue, newName) {
  const supabase = getSupabase()
  const patch = { name: newName }
  if (await supportsFormerNames()) {
    const former = new Set([...(venue.former_names || []), venue.name].filter(Boolean))
    former.delete(newName)
    patch.former_names = [...former]
  }
  const { data, error } = await supabase.from('venues').update(patch).eq('id', venue.id).select('*').single()
  return { venue: data, error, savedFormerName: 'former_names' in patch }
}
