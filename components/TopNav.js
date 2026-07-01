'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { IconSun, IconMoon } from '@tabler/icons-react'
import { getSupabase } from '../lib/supabase'

const navLinks = [
  { label: 'Dashboard', href: '/' },
  { label: 'Tours', href: '/tours' },
  { label: 'Staff', href: '/staff' },
  { label: 'Calendar', href: '/calendar' },
  { label: 'Venues', href: '/venues' },
  { label: 'Booking & Contracts', href: '/bc' },
  { label: 'Reports', href: '/reports' },
]

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [theme, setTheme] = useState('dark')
  const dropdownRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark'
    setTheme(saved)

    const handleThemeChange = () => {
      const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
      setTheme(current)
    }
    window.addEventListener('themeChanged', handleThemeChange)
    return () => window.removeEventListener('themeChanged', handleThemeChange)
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

  // PERSISTENT DEV TOGGLE: intentionally kept for beta testing, do not remove in cleanup passes
  const handleThemeToggle = () => {
    if (theme === 'light') {
      document.documentElement.removeAttribute('data-theme')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.setAttribute('data-theme', 'light')
      localStorage.setItem('theme', 'light')
    }
    window.dispatchEvent(new Event('themeChanged'))
  }

  const handleSignOut = async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav style={{
      position: 'fixed',
      top: 16,
      left: 16,
      right: 16,
      zIndex: 100,
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      background: 'var(--bg-card)',
      backdropFilter: 'blur(14px) saturate(1.3)',
      WebkitBackdropFilter: 'blur(14px) saturate(1.3)',
      border: '1px solid var(--border-card)',
      borderRadius: 14,
      boxShadow: 'inset 0 1px 0 var(--card-glass-highlight), 0 4px 14px var(--card-glass-shadow)',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 0,
    }}>

      {/* Logo */}
      <div style={{ marginRight: 8, flexShrink: 0 }}>
        <img
          src={theme === 'light'
            ? '/images/CommandTOUR_Branding-2-LightMode.png'
            : '/images/CommandTOUR_Branding-1-DarkMode.png'
          }
          alt="CommandTOUR"
          style={{ height: 48, width: 'auto', objectFit: 'contain', display: 'block', filter: theme === 'light' ? 'drop-shadow(0 1px 2px rgba(26,36,34,0.45))' : 'none' }}
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
              color: active ? 'var(--color-mint)' : 'var(--text-secondary)',
              background: 'transparent',
              fontWeight: active ? 700 : 400,
              transition: 'color 0.15s',
              whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              {link.label}
            </Link>
          )
        })}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>

        {/* PERSISTENT DEV TOGGLE: intentionally kept for beta testing, do not remove in cleanup passes */}
        <button
          onClick={handleThemeToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
            marginRight: 8,
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          {theme === 'light'
            ? <IconMoon size={18} stroke={1.5} />
            : <IconSun size={18} stroke={1.5} />
          }
        </button>

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
              background: dropdownOpen ? 'var(--bg-card-hover)' : 'var(--bg-card)',
              border: '0.5px solid var(--border-card)',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
            onMouseLeave={e => { if (!dropdownOpen) e.currentTarget.style.background = 'var(--bg-card)' }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: theme === 'light' ? 'var(--text-primary)' : 'rgba(255,255,255,0.08)',
              border: '1px solid var(--border-card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600,
              color: theme === 'light' ? '#FFFFFF' : 'var(--text-primary)',
              transition: 'background 0.2s',
            }}>
              MA
            </div>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Mark A.</span>
          </div>

          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              background: 'var(--bg-card)',
              backdropFilter: 'blur(14px) saturate(1.3)',
              WebkitBackdropFilter: 'blur(14px) saturate(1.3)',
              border: '1px solid var(--border-card)',
              borderRadius: 8,
              padding: 8,
              minWidth: 160,
              zIndex: 100,
              boxShadow: 'inset 0 1px 0 var(--card-glass-highlight), 0 4px 14px var(--card-glass-shadow)',
            }}>
              <div
                onClick={() => { setDropdownOpen(false); router.push('/settings') }}
                style={{ padding: '10px 14px', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Settings
              </div>
              <div
                onClick={handleSignOut}
                style={{ padding: '10px 14px', borderRadius: 6, color: 'var(--color-red)', fontSize: 13, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
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
