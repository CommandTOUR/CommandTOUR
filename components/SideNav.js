'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  IconLayoutDashboard,
  IconRoute,
  IconCalendarEvent,
  IconUsers,
  IconBuilding,
  IconFileInvoice,
  IconReportMoney,
  IconChartBar,
  IconSettings,
  IconSun,
  IconMoon,
} from '@tabler/icons-react'

const NAV = [
  {
    section: 'Operations',
    items: [
      { label: 'Dashboard', href: '/', Icon: IconLayoutDashboard },
      { label: 'Tours', href: '/tours', Icon: IconRoute },
      { label: 'Calendar', href: '/calendar', Icon: IconCalendarEvent },
      { label: 'Staff', href: '/staff', Icon: IconUsers },
    ]
  },
  {
    section: 'Logistics',
    items: [
      { label: 'Venues', href: '/venues', Icon: IconBuilding },
      { label: 'Booking', href: '/bc', Icon: IconFileInvoice },
    ]
  },
  {
    section: 'Finance',
    items: [
      { label: 'Budget', href: '/budget', Icon: IconReportMoney },
      { label: 'Reports', href: '/reports', Icon: IconChartBar },
    ]
  },
]

export default function SideNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light'
    setTheme(saved)
  }, [])

  const handleThemeToggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
    setTheme(next)
  }

  if (pathname === '/login') return null

  return (
    <nav style={{
      width: 200,
      minWidth: 200,
      background: 'var(--surface-nav)',
      borderRadius: 'var(--radius-lg)',
      border: '0.5px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
    }}>

      {/* Logo */}
      <div style={{ padding: '16px 14px 12px', borderBottom: '0.5px solid var(--border-default)' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <img
            src={theme === 'dark' ? '/images/V1_CommandTOUR_Dark1.png' : '/images/V1_CommandTOUR_Light1.png'}
            alt="CommandTOUR"
            style={{ width: '100%', maxWidth: 200, height: 'auto', display: 'block' }}
          />
        </Link>
      </div>

      {/* Nav sections */}
      {NAV.map((group, gi) => (
        <div key={group.section}>
          {gi > 0 && <div style={{ height: '0.5px', background: 'var(--border-default)', margin: '4px 10px' }} />}
          <div style={{ padding: '8px 8px 4px' }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--text-secondary)', padding: '0 6px', marginBottom: 3
            }}>
              {group.section}
            </div>
            {group.items.map(item => {
              const active = item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(item.href)
              const Icon = item.Icon
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    gap: 8, padding: '6px 8px',
                    borderRadius: 6, marginBottom: 1,
                    fontSize: 14, fontWeight: active ? 600 : 400,
                    color: active ? 'var(--color-info)' : 'var(--text-secondary)',
                    background: active ? 'rgba(26,86,219,0.08)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.1s, color 0.1s',
                  }}>
                    <Icon size={14} stroke={1.75} style={{ flexShrink: 0, width: 16 }} aria-hidden="true" />
                    {item.label}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ))}

      {/* Bottom — theme toggle + user + settings */}
      <div style={{ marginTop: 'auto', padding: '10px 8px', borderTop: '0.5px solid var(--border-default)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px' }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: 'transparent',
            border: theme === 'dark' ? '1.5px solid rgba(255,255,255,0.9)' : '1.5px solid rgba(0,0,0,0.85)',
            color: theme === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)',
            fontSize: 8, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            letterSpacing: '0.02em',
          }}>MA</div>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
            Mark A.
          </span>
          <button
            onClick={handleThemeToggle}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
              padding: 4, display: 'flex', alignItems: 'center', color: 'var(--text-muted)',
            }}
            aria-label="Toggle theme"
          >
            {theme === 'dark'
              ? <IconSun size={16} stroke={1.75} />
              : <IconMoon size={16} stroke={1.75} />
            }
          </button>
          <Link href="/settings" style={{ marginLeft: 6, display: 'flex', alignItems: 'center' }}>
            <IconSettings size={16} stroke={1.75} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </nav>
  )
}
