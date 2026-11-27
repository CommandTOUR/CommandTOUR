// Time entry that accepts 24-hour ("1430", "14:30") and 12-hour ("2:30p", "2:30 PM", "230pm") input.
// Stored exactly as entered (local time, no conversion) as "HH:MM"; shown as "h:mm AM".
export function parseTime(input) {
  const raw = String(input ?? '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, '')
  if (!raw) return { value: '', ok: true }
  const m = /^(\d{1,2})(?::?(\d{2}))?([ap])?m?$/.exec(raw)
  if (!m) return { value: '', ok: false }
  let h = +m[1]
  let min = m[2] === undefined ? 0 : +m[2]
  const half = m[3]
  // "230" / "1430" without a colon: the last two digits are the minutes
  if (m[2] === undefined && /^\d{3,4}$/.test(raw.replace(/[ap]m?$/, ''))) {
    const digits = raw.replace(/[ap]m?$/, '')
    h = +digits.slice(0, digits.length - 2)
    min = +digits.slice(-2)
  }
  if (min > 59) return { value: '', ok: false }
  if (half) {
    if (h < 1 || h > 12) return { value: '', ok: false }
    if (half === 'p' && h < 12) h += 12
    if (half === 'a' && h === 12) h = 0
  } else if (h > 23) return { value: '', ok: false }
  return { value: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`, ok: true }
}

// "14:30" or "14:30:00" -> "2:30 PM"; anything else is returned as is
export function formatTime(value) {
  const m = /^(\d{1,2}):(\d{2})/.exec(value || '')
  if (!m) return value || ''
  const h = +m[1]
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`
}
