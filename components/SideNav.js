'use client'

import { usePathname, useRouter } from 'next/navigation'
import React, { useState, useEffect } from 'react'
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
  IconCornerUpLeft,
} from '@tabler/icons-react'
import { useNav } from '../context/NavContext'

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

const NAV_ITEM = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
  fontSize: 13, fontWeight: 400, marginBottom: 1,
  transition: 'all 0.12s',
}
const NAV_ITEM_ACTIVE = {
  ...NAV_ITEM,
  background: 'rgba(26,86,219,0.10)',
  color: 'var(--color-info)',
  fontWeight: 600,
}
const NAV_ITEM_INACTIVE = {
  ...NAV_ITEM,
  background: 'transparent',
  color: 'var(--text-primary)',
}
const SECTION_LABEL_STYLE = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.1em', color: 'var(--text-secondary)',
  padding: '10px 10px 4px',
}
const SUB_ITEM = {
  display: 'flex', alignItems: 'center',
  padding: '6px 10px 6px 32px', borderRadius: 8, cursor: 'pointer',
  fontSize: 12, fontWeight: 400, marginBottom: 1,
  transition: 'all 0.12s',
}

export default function SideNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [theme, setTheme] = useState('light')
  const { navState } = useNav()
  const [expandedItems, setExpandedItems] = useState([])

  const toggleExpand = (label) => {
    setExpandedItems(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label])
  }

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

  const renderNavItem = (item) => {
    const active = item.href === '/'
      ? pathname === '/'
      : pathname === item.href || pathname.startsWith(item.href)
    const Icon = item.Icon
    return (
      <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
        <div
          style={active ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE}
          onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--glass-tile-hover)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
          onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)' } }}
        >
          <Icon size={16} stroke={active ? 2 : 1.5} aria-hidden="true" />
          {item.label}
        </div>
      </Link>
    )
  }

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
      <div style={{ padding: '16px 14px 12px' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <img
            src={theme === 'dark' ? '/images/V1_CommandTOUR_Dark1.png' : '/images/V1_CommandTOUR_Light1.png'}
            alt="CommandTOUR"
            style={{ width: '100%', maxWidth: 200, height: 'auto', display: 'block' }}
          />
        </Link>
      </div>

      {navState ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {/* Back button */}
          <div
            onClick={() => router.push(navState.backHref)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              margin: '8px 8px 4px', padding: '7px 14px', borderRadius: 8,
              border: '0.5px solid var(--color-info)', background: 'transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,86,219,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <IconCornerUpLeft size={13} stroke={2} color="var(--color-info)" />
            <span style={{ fontSize: SECTION_LABEL_STYLE.fontSize, fontWeight: SECTION_LABEL_STYLE.fontWeight, textTransform: SECTION_LABEL_STYLE.textTransform, letterSpacing: SECTION_LABEL_STYLE.letterSpacing, color: 'var(--color-info)' }}>{navState.backLabel}</span>
          </div>

          <div style={{ height: '0.5px', background: 'var(--border-default, #94a3b8)', margin: '0 8px 6px' }} />

          {/* Context title */}
          {navState.title && (
            <>
              <div style={{ ...SECTION_LABEL_STYLE, padding: '4px 10px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {navState.title}
              </div>
              <div style={{ height: '0.5px', background: 'var(--border-default, #94a3b8)', margin: '0 8px 6px' }} />
            </>
          )}

          {/* Nav items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
            {navState.items.map(item => {
              const isActive = navState.activeTab === item.tab
              const isExpanded = expandedItems.includes(item.label)
              const hasChildren = item.children && item.children.length > 0
              const Icon = item.icon

              return (
                <div key={item.label}>
                  <div
                    onClick={() => {
                      if (hasChildren) {
                        toggleExpand(item.label)
                      } else {
                        navState.onTabChange(item.tab)
                      }
                    }}
                    style={isActive ? NAV_ITEM_ACTIVE : NAV_ITEM_INACTIVE}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--glass-tile-hover)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)' } }}
                  >
                    {Icon && <Icon size={16} stroke={isActive ? 2 : 1.5} />}
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.count !== undefined && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{item.count}</span>
                    )}
                  </div>

                  {/* Children (sub-items) */}
                  {hasChildren && isExpanded && (
                    <div>
                      {item.children.map(child => {
                        const childActive = navState.activeTab === child.tab
                        return (
                          <div
                            key={child.tab}
                            onClick={() => navState.onTabChange(child.tab)}
                            style={{
                              ...SUB_ITEM,
                              background: childActive ? 'rgba(26,86,219,0.10)' : 'transparent',
                              color: childActive ? 'var(--color-info)' : 'var(--text-primary)',
                              fontWeight: childActive ? 600 : 400,
                            }}
                            onMouseEnter={e => { if (!childActive) { e.currentTarget.style.background = 'var(--glass-tile-hover)' } }}
                            onMouseLeave={e => { if (!childActive) { e.currentTarget.style.background = 'transparent' } }}
                          >
                            {child.label}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Nav sections */
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 8px' }}>
          {NAV.map((group, i) => (
            <React.Fragment key={group.section}>
              {i > 0 && (
                <div style={{ height: '1px', background: 'var(--border-default, #94a3b8)', margin: '6px 4px' }} />
              )}
              <div style={SECTION_LABEL_STYLE}>{group.section}</div>
              {group.items.map(item => renderNavItem(item))}
            </React.Fragment>
          ))}
        </div>
      )}

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
