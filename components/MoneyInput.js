'use client'

// Dollar field: "$" inside the left edge, only valid amounts, formats on blur. Used for every money value in Settings and the travel workspace.
import { INPUT } from './settings/styles'

export const formatMoneyInput = (v, min = 2, max = 2) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: min, maximumFractionDigits: max, useGrouping: false }) : ''
}

export default function MoneyInput({ value, onChange, onBlur, disabled, maxDecimals = 2, placeholder = '0.00', inputStyle, prefixLeft = 14, ...rest }) {
  const pattern = new RegExp(`^\\d*\\.?\\d{0,${maxDecimals}}$`)
  const base = inputStyle || INPUT
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <span aria-hidden="true" style={{ position: 'absolute', left: prefixLeft, top: '50%', transform: 'translateY(-50%)', fontSize: base.fontSize || 16, color: 'var(--text-muted-legible)', pointerEvents: 'none' }}>$</span>
      <input
        {...rest}
        type="text" inputMode="decimal" disabled={disabled} value={value ?? ''} placeholder={placeholder}
        onChange={e => { if (pattern.test(e.target.value)) onChange(e.target.value) }}
        onBlur={(e) => { const f = formatMoneyInput(value, 2, maxDecimals); if (f !== (value ?? '')) onChange(f); onBlur?.(e, f) }}
        style={{ ...base, paddingLeft: prefixLeft + 14, ...(disabled ? { opacity: 0.7, cursor: 'default' } : {}) }}
      />
    </div>
  )
}
