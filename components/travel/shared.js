'use client'

import { useEffect as useEffectInline, useState as useStateInline } from 'react'
import MoneyInput, { formatMoneyInput } from '@/components/MoneyInput'
// Shared look and helpers for the Travel Workspace. Structure, proportions and spacing follow docs/mockups/travel-workspace.html;
// colors and type come from the app's own tokens.
// Type scale for the travel workspace: values live in app/globals.css (--font-size-table and friends)
export const FS = { body: 'var(--font-size-table)', small: 'var(--font-size-table-small)', header: 'var(--font-size-table-header)', tab: 'var(--font-size-tab)', title: 'var(--font-size-title)', hero: 'var(--font-size-hero)' }
export const FONT = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"
export const LINE = 'var(--border-default)'
export const CARD = { background: 'var(--surface-card)', border: `1px solid ${LINE}`, borderRadius: 8 }
export const SMALL_LABEL = { fontSize: FS.header, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted-legible)' }
export const INPUT = { fontSize: FS.body, padding: '8px 10px', borderRadius: 6, border: `1px solid ${LINE}`, background: 'var(--surface-card)', color: 'var(--text-primary)', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }
export const BTN = { fontFamily: 'inherit', fontSize: FS.body, fontWeight: 600, borderRadius: 6, padding: '8px 14px', border: `1px solid ${LINE}`, background: 'var(--surface-card)', color: 'var(--text-primary)', cursor: 'pointer' }
export const BTN_P = { ...BTN, background: 'var(--color-info)', borderColor: 'var(--color-info)', color: 'var(--text-on-info)' }
export const BTN_S = { ...BTN, padding: '5px 10px', fontSize: FS.small }

// Chips (mockup .chip / c-g / c-b / c-a / c-p / c-n / c-r)
const tone = (c, text = c) => ({ color: text, background: `color-mix(in srgb, ${c} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 38%, transparent)` })
export const CHIP_TONES = {
  green: tone('var(--color-success)'), blue: tone('var(--color-info)'), yellow: { color: '#1a1a1a', background: '#FFD60A', border: '1px solid #FFD60A' },
  purple: tone('#a855f7', 'var(--text-purple-legible)'), grey: { color: 'var(--text-muted-legible)', background: 'rgba(100,116,139,0.10)', border: `1px solid ${LINE}` }, red: tone('var(--color-danger)'),
}
export const STATUS_TONE = { hold: 'yellow', good_to_book: 'blue', needs_approval: 'purple', booked: 'green', cancelled: 'red' }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export function fmtDay(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '')
  if (!m) return '—'
  return `${DAYS[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()]}, ${MONTHS[+m[2] - 1]} ${+m[3]}`
}
// Money is always a dollar amount: $1,234.50 (a dash when empty)
export const money = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? '—' : '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
export const personName = (s) => (s ? (s.display_name?.trim() || `${s.first_name || ''} ${s.last_name || ''}`.trim()) : '') || 'Unnamed'

export function Chip({ tone: t = 'grey', children, onClick, anchorRef, title }) {
  return (
    <span ref={anchorRef} title={title} role={onClick ? 'button' : undefined} onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: FS.small, fontWeight: 600, padding: '2px 9px', borderRadius: 999, whiteSpace: 'nowrap', cursor: onClick ? 'pointer' : 'default', userSelect: 'none', ...CHIP_TONES[t] }}>{children}</span>
  )
}

// Round pill used for the Both / Travel To / Travel From control and the status filters: same height and radius, selected = filled
export function Pill({ children, selected, onClick, tone: t = 'blue', title }) {
  const c = CHIP_TONES[t] || CHIP_TONES.blue
  const yellow = t === 'yellow'
  return (
    <button type="button" title={title} onClick={onClick} aria-pressed={!!selected}
      style={{ fontFamily: 'inherit', fontSize: FS.small, fontWeight: 600, height: 28, padding: '0 14px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap', boxSizing: 'border-box',
        border: `1px solid ${yellow ? '#c9a400' : c.color}`, background: selected ? (yellow ? '#FFD60A' : c.color) : 'transparent', color: selected ? (yellow ? '#1a1a1a' : 'var(--text-on-info)') : (yellow ? 'var(--text-primary)' : c.color) }}>{children}</button>
  )
}

// Checkbox: identical 18px box everywhere (Room, Per Diem, Rental, eligibility)
export function Check({ checked, onChange, disabled, label }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div role="checkbox" aria-checked={checked} aria-label={label} tabIndex={disabled ? -1 : 0}
        onClick={(e) => { e.stopPropagation(); if (!disabled) onChange() }}
        onKeyDown={(e) => { if (!disabled && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); onChange() } }}
        style={{ width: 18, height: 18, boxSizing: 'border-box', borderRadius: 4, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1, background: checked ? 'color-mix(in srgb, var(--color-success) 22%, transparent)' : 'transparent', border: `1.5px solid ${checked ? 'var(--color-success)' : 'var(--border-stronger)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {checked && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="var(--color-success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
    </div>
  )
}

// A text field that reads as plain text until hovered or focused, and saves when you leave it (only if the value changed)
export function InlineInput({ value, onSave, placeholder = '—', disabled, type = 'text', style, ariaLabel }) {
  const [v, setV] = useStateInline(value ?? '')
  useEffectInline(() => { setV(value ?? '') }, [value])
  return (
    <input className="plain-cell" type={type} aria-label={ariaLabel} value={v} disabled={disabled} placeholder={placeholder}
      onChange={e => setV(e.target.value)}
      onBlur={() => { if (String(v) !== String(value ?? '')) onSave(v) }}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      style={style} />
  )
}

// A dollar field that looks like a cell and saves (formatted, e.g. "450.00") when you leave it, only if it changed
export function InlineMoney({ value, onSave, disabled, ariaLabel, placeholder }) {
  const shown = value === null || value === undefined || value === '' ? '' : formatMoneyInput(value)
  const [v, setV] = useStateInline(shown)
  useEffectInline(() => { setV(shown) }, [shown])
  return (
    <MoneyInput aria-label={ariaLabel} disabled={disabled} value={v} onChange={setV} prefixLeft={2} placeholder={placeholder} className="plain-cell"
      inputStyle={{ fontSize: FS.body, textAlign: 'right' }}
      onBlur={(e, f) => { if (f !== shown) onSave(f) }} />
  )
}
