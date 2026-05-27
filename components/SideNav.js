'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { section: 'Main', items: [
    { label: 'Dashboard', href: '/', icon: '⌂' },
    { label: 'All Tours', href: '/tours', icon: '◉' },
    { label: 'Staffing Grid', href: '/staffing', icon: '☷' },
    { label: 'Calendar', href: '/calendar', icon: '⊞' },
  ]},
  { section: 'Resources', items: [
    { label: 'Staff', href: '/staff', icon: '◎' },
    { label: 'Venues', href: '/venues', icon: '⬡' },
    { label: 'Reports', href: '/reports', icon: '⎙' },
  ]},
  { section: 'Admin', items: [
    { label: 'Settings', href: '/settings', icon: '⚙' },
  ]},
]

export default function SideNav() {
  const pathname = usePathname()

  return (
    <nav style={{
      width: 'var(--nav-width)',
      height: '100vh',
      background: 'rgba(255,255,255,0.03)',
      borderRight: '0.5px solid var(--glass-border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
    }}>

      {/* Logo */}
      <div style={{
        padding: '20px 18px',
        borderBottom: '0.5px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
      }}>
        <img
          src="/CommandTourLogo-2.png"
          alt="CommandTOUR"
          style={{ height: 32, width: 'auto', maxWidth: '184px' }}
        />
      </div>

      {/* Nav sections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {navItems.map(section => (
          <div key={section.section} style={{ marginBottom: 8, paddingTop: 12 }}>
            <div style={{
              fontSize: 11, fontWeight: 500, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--text-muted)',
              padding: '0 8px', marginBottom: 4,
            }}>
              {section.section}
            </div>
            {section.items.map(item => {
              const active = pathname === item.href
              return (
                <Link key={item.href} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 10px', borderRadius: 8,
                  fontSize: 14, textDecoration: 'none',
                  marginBottom: 1, transition: 'background 0.15s, color 0.15s',
                  background: active ? 'rgba(51,255,153,0.1)' : 'transparent',
                  color: active ? 'var(--mint)' : 'var(--text-secondary)',
                  fontWeight: active ? 500 : 400,
                }}>
                  <span style={{ fontSize: 16, width: 18, textAlign: 'center', flexShrink: 0, opacity: 0.8 }}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* User pill */}
      <div style={{
        padding: '12px 10px',
        borderTop: '0.5px solid var(--glass-border)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(201,168,76,0.2)',
            border: '1px solid var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, color: 'var(--gold)', flexShrink: 0,
          }}>
            MA
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Mark Albert</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Admin</div>
          </div>
        </div>
      </div>

    </nav>
  )
}