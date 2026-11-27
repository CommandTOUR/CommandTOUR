'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useProfile, ROLE_LABELS } from '../lib/auth/profile'
import { getSupabase } from '../lib/supabase'

// Shows "No Access Yet" to signed-in users who have no profile or the Crew role. Everyone else sees the app.
// This is a screen gate only; database row-level security is what actually protects the data.
export default function AccessGate({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const { status, profile, role, viewingAs, setViewAs, email } = useProfile()

  const signOut = async () => {
    await getSupabase().auth.signOut()
    setViewAs(null)
    router.push('/login')
  }

  if (pathname === '/login') return children
  if (status === 'loading') return <div style={{ position: 'fixed', inset: 0, background: 'var(--page-bg)' }} />

  const blocked = status === 'ready' && (!profile || role === 'crew')
  if (!blocked) {
    return (
      <>
        {viewingAs && <PreviewBanner label={ROLE_LABELS[viewingAs]} onExit={() => setViewAs(null)} />}
        {children}
      </>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'var(--page-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      {viewingAs && <PreviewBanner label={ROLE_LABELS[viewingAs]} onExit={() => setViewAs(null)} />}
      <div style={{ background: 'var(--glass-tile-bg)', backdropFilter: 'blur(12px) saturate(1.4)', border: 'var(--tile-border)', borderRadius: 'var(--tile-radius)', boxShadow: 'var(--glass-tile-shadow)', padding: '32px 36px', width: 440, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>No Access Yet</div>
        <div style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
          {email ? <>You are signed in as <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. </> : null}
          An admin needs to give your login access before you can use CommandTOUR.
        </div>
        <button onClick={signOut} style={{ background: 'var(--color-info)', color: '#ffffff', border: 'none', borderRadius: 8, fontSize: 15, padding: '9px 18px', cursor: 'pointer' }}>Sign Out</button>
      </div>
    </div>
  )
}

function PreviewBanner({ label, onExit }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 600, display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center', padding: '4px 12px', fontSize: 13, fontWeight: 600, background: 'var(--status-1hold-bg)', color: 'var(--color-warning)', borderBottom: '0.5px solid var(--status-1hold-border)' }}>
      <span>Previewing As {label}: Screens Only, Data Access Is Unchanged</span>
      <button onClick={onExit} style={{ fontSize: 13, padding: '1px 10px', borderRadius: 6, border: '0.5px solid var(--color-warning)', background: 'transparent', color: 'var(--color-warning)', cursor: 'pointer' }}>Exit Preview</button>
    </div>
  )
}
