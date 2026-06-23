'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'

const navLinks = [
  { label: 'Dashboard', href: '/' },
  { label: 'Tours', href: '/tours' },
  { label: 'Staff', href: '/staff' },
  { label: 'Calendar', href: '/calendar' },
  { label: 'Venues', href: '/venues' },
  { label: 'All Events', href: '/booking' },
  { label: 'Reports', href: '/reports' },
]

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isLight, setIsLight] = useState(false)

  useEffect(() => {
    setIsLight(document.documentElement.getAttribute('data-theme') === 'light')
  }, [])

  const toggleTheme = () => {
    const next = !isLight
    if (next) {
      document.documentElement.setAttribute('data-theme', 'light')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
      localStorage.removeItem('theme')
    }
    setIsLight(next)
  }

  const handleSignOut = async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav style={{
      minHeight: 64,
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      background: '#0d1f38',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 0,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    }}>

      {/* Logo */}
      <div style={{ marginRight: 8, flexShrink: 0 }}>
        <img
          src="/images/CommandTOUR_Branding-1-DarkMode.png"
          alt="CommandTOUR"
          style={{ height: 55, width: 'auto', objectFit: 'contain', display: 'block' }}
        />
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
        {navLinks.map(link => {
          const active =
            link.href === '/' ? pathname === '/' :
            link.href === '/staff' ? pathname === '/staff' || pathname.startsWith('/staff/') :
            pathname.startsWith(link.href)

          return (
            <Link key={link.href} href={link.href} style={{
              fontSize: 15,
              padding: '7px 14px',
              borderRadius: 7,
              textDecoration: 'none',
              color: active ? '#33FF99' : '#94a3b8',
              background: 'transparent',
              fontWeight: active ? 700 : 400,
              transition: 'color 0.15s',
              whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#f1f5f9' }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#94a3b8' }}}
            >
              {link.label}
            </Link>
          )
        })}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: '50%',
            border: '0.5px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
        >
          {isLight ? <MoonIcon /> : <SunIcon />}
        </button>

        {/* User avatar + sign out */}
        <div
          onClick={handleSignOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 12px 4px 4px',
            borderRadius: 20,
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.14)',
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
