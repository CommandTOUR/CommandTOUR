'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
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

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [avatarColor, setAvatarColor] = useState('#C9A84C')
  const dropdownRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('avatarColor')
    if (saved) setAvatarColor(saved)

    const handleColorChange = () => {
      const updated = localStorage.getItem('avatarColor')
      if (updated) setAvatarColor(updated)
    }
    window.addEventListener('avatarColorChanged', handleColorChange)
    return () => window.removeEventListener('avatarColorChanged', handleColorChange)
  }, [])

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#f1f5f9' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#94a3b8' }}
            >
              {link.label}
            </Link>
          )
        })}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>

        {/* User dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 12px 4px 4px',
              borderRadius: 20,
              background: dropdownOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.14)',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => { if (!dropdownOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: `${avatarColor}33`,
              border: `1px solid ${avatarColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, color: avatarColor,
              transition: 'background 0.2s, border-color 0.2s',
            }}>
              MA
            </div>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>Mark A.</span>
          </div>

          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              background: '#0d1f3a',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              padding: 8,
              minWidth: 160,
              zIndex: 100,
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}>
              <div
                onClick={() => { setDropdownOpen(false); router.push('/settings') }}
                style={{ padding: '10px 14px', borderRadius: 6, color: '#f1f5f9', fontSize: 13, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Settings
              </div>
              <div
                onClick={handleSignOut}
                style={{ padding: '10px 14px', borderRadius: 6, color: '#f87171', fontSize: 13, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Sign Out
              </div>
            </div>
          )}
        </div>
      </div>

    </nav>
  )
}
