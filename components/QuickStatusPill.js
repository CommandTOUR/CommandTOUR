'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { IconCheck, IconChevronDown, IconLoader2 } from '@tabler/icons-react'
import { quickToast } from '../lib/quickToast'

const FONT = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"

// Pill that opens a menu of values; picking one saves immediately.
//   options     [{ value, label }]
//   styles      { [value]: { color, background, border } }  trigger colors
//   optionStyles  same shape for menu chips (defaults to styles)
//   onSelect    async (next) => void; throw (or return { error }) to signal failure
// The pill shows the new value optimistically and reverts + toasts if the save fails.
export default function QuickStatusPill({
  value, options, styles = {}, optionStyles, onSelect, triggerStyle, caret = false, fallbackValue,
  chars, // optional { [value]: 'C' }: render the trigger as a small status circle with that character
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(null) // optimistic value while saving
  const [pos, setPos] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const savingRef = useRef(false)

  const shown = pending ?? value ?? fallbackValue
  const opt = options.find(o => o.value === shown)
  const st = styles[shown] || styles[fallbackValue] || {}
  const menuStyles = optionStyles || styles
  const saving = pending !== null

  const close = useCallback((refocus) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }, [])

  const openMenu = () => {
    if (saving || !triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const menuH = options.length * 40 + 12
    const top = r.bottom + 4 + menuH > window.innerHeight ? Math.max(8, r.top - 4 - menuH) : r.bottom + 4
    setPos({ top, left: Math.max(8, Math.min(r.left, window.innerWidth - 168)) })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return
      close(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(true) } }
    const onMove = () => close(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, close])

  useEffect(() => {
    if (!open) return
    const items = menuRef.current?.querySelectorAll('[role="option"]')
    const idx = Math.max(0, options.findIndex(o => o.value === shown))
    items?.[idx]?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const choose = async (next) => {
    close(true)
    if (savingRef.current || next === (value ?? fallbackValue)) return
    savingRef.current = true
    setPending(next)
    try {
      const res = await onSelect(next)
      if (res && res.error) throw res.error
    } catch (err) {
      console.error('Quick change failed:', err)
      quickToast('Could not save change. Reverted.')
    } finally {
      savingRef.current = false
      setPending(null)
    }
  }

  const onTriggerKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault(); e.stopPropagation(); openMenu()
    }
  }

  const onMenuKey = (e) => {
    e.stopPropagation()
    const items = [...menuRef.current.querySelectorAll('[role="option"]')]
    const i = items.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus() }
    else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus() }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus() }
    else if (e.key === 'Tab') { close(false) }
  }

  return (
    <>
      <div
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-busy={saving}
        aria-label={`Status: ${opt?.label ?? shown}`}
        title={opt?.label ?? shown}
        onClick={(e) => { e.stopPropagation(); open ? close(false) : openMenu() }}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onTriggerKey}
        style={{
          flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FONT,
          padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
          color: st.color, background: st.background, border: `1px solid ${st.border}`,
          cursor: saving ? 'progress' : 'pointer', userSelect: 'none', opacity: saving ? 0.7 : 1,
          ...(chars ? { width: 22, height: 22, padding: 0, borderRadius: '50%', justifyContent: 'center', gap: 0, fontSize: 11, fontWeight: 700, boxSizing: 'border-box' } : {}),
          ...triggerStyle,
        }}
      >
        {chars ? (chars[shown] ?? (opt?.label ?? shown).charAt(0)) : (opt?.label ?? shown)}
        {!chars && (saving ? <IconLoader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : caret && <IconChevronDown size={12} />)}
      </div>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          onKeyDown={onMenuKey}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, zIndex: 10001, minWidth: 150, padding: 6, fontFamily: FONT,
            background: 'var(--surface-card)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '0.5px solid var(--border-default)', borderRadius: 10, boxShadow: 'var(--glass-tile-shadow)',
          }}
        >
          {options.map(o => {
            const s = menuStyles[o.value] || {}
            const active = o.value === shown
            return (
              <div
                key={o.value}
                role="option"
                aria-selected={active}
                tabIndex={-1}
                onClick={() => choose(o.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(o.value) } }}
                style={{ padding: '6px 10px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, outline: 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-tile-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onFocus={e => e.currentTarget.style.background = 'var(--glass-tile-hover)'}
                onBlur={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: 13, fontWeight: 600, color: s.color, background: s.background, border: `1px solid ${s.border}` }}>
                  {o.label}
                </span>
                {active && <IconCheck size={14} color="var(--color-info)" />}
              </div>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}
