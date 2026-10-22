// Tiny transient message (errors by default; variant 'info' for notices). No provider needed.
export function quickToast(message, variant = 'error') {
  if (typeof document === 'undefined') return
  const el = document.createElement('div')
  el.setAttribute('role', 'alert')
  el.textContent = message
  Object.assign(el.style, {
    position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)', zIndex: '100001',
    maxWidth: 'calc(100vw - 32px)', padding: '10px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
    fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
    color: variant === 'info' ? 'var(--color-info)' : 'var(--color-danger)', background: 'var(--surface-card)', border: `0.5px solid ${variant === 'info' ? 'var(--color-info)' : 'var(--color-danger)'}`,
    boxShadow: 'var(--glass-tile-shadow)', backdropFilter: 'blur(20px)',
  })
  document.body.appendChild(el)
  setTimeout(() => { el.remove() }, 4000)
}
