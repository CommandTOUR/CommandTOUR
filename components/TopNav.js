'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getSupabase } from '../lib/supabase'

const navLinks = [
  { label: 'Dashboard', href: '/' },
  { label: 'Tours', href: '/tours' },
  { label: 'Staff', href: '/staff' },
  { label: 'Calendar', href: '/calendar' },
  { label: 'Venues', href: '/venues' },
  { label: 'Reports', href: '/reports' },
]

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav style={{
      height: 62,
      background: 'rgba(255,255,255,0.02)',
      borderBottom: '0.5px solid var(--glass-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      gap: 0,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    }}>

      {/* Logo */}
      <div style={{ marginRight: 36, flexShrink: 0 }}>
        <span style={{ fontSize: 30, fontWeight: 300, color: '#FFFFFF', letterSpacing: '0.01em' }}>Command</span>
        <span style={{ fontSize: 30, fontWeight: 700, color: 'var(--mint)', letterSpacing: '0.01em' }}>TOUR</span>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
        {navLinks.map(link => {
          const active = pathname === link.href ||
            (link.href !== '/' && pathname.startsWith(link.href))
          return (
            <Link key={link.href} href={link.href} style={{
              fontSize: 15,
              padding: '7px 14px',
              borderRadius: 7,
              textDecoration: 'none',
              color: active ? 'var(--mint)' : 'rgba(255,255,255,0.5)',
              background: active ? 'rgba(51,255,153,0.08)' : 'transparent',
              fontWeight: active ? 500 : 400,
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'transparent' }}}
            >
              {link.label}
            </Link>
          )
        })}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
        <Link href="/tours/new" style={{
          fontFamily: 'Rubik, sans-serif',
          fontSize: 14,
          fontWeight: 500,
          padding: '8px 16px',
          borderRadius: 7,
          border: 'none',
          cursor: 'pointer',
          background: 'var(--mint)',
          color: '#0a1628',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
        }}>
          + New Tour
        </Link>

        <div
          onClick={handleSignOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 12px 4px 4px',
            borderRadius: 20,
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid var(--glass-border)',
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        >
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(201,168,76,0.2)',
            border: '1px solid var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, color: 'var(--gold)',
          }}>
            MA
          </div>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>Mark A.</span>
        </div>
      </div>

    </nav>
  )
}