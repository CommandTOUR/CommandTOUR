'use client'
import { createContext, useContext, useState, useCallback } from 'react'

const NavContext = createContext(null)

export function NavProvider({ children }) {
  const [navState, setNavState] = useState(null)
  // navState shape:
  // {
  //   backLabel: 'Tours',         // text for the back button
  //   backHref: '/tours',         // where back navigates
  //   title: 'HWSS International', // context title shown at top of nav
  //   items: [
  //     { label: 'Overview', href: '/tours/x/events/y', icon: IconLayoutDashboard, tab: 'overview' },
  //     { label: 'Travel', href: null, icon: IconPlane, tab: 'travel', children: [
  //       { label: 'Arrivals', tab: 'arrivals' },
  //       { label: 'Departures', tab: 'departures' },
  //       { label: 'Hotel', tab: 'hotel' },
  //       { label: 'Rental Cars', tab: 'rental' },
  //       { label: 'Per Diem', tab: 'perdiem' },
  //     ]},
  //   ],
  //   activeTab: 'overview',       // currently active tab key
  //   onTabChange: (tab) => {},    // called when a nav item is clicked
  // }

  const setNav = useCallback((state) => setNavState(state), [])
  const clearNav = useCallback(() => setNavState(null), [])
  const setActiveTab = useCallback((tab) => setNavState(prev => prev ? { ...prev, activeTab: tab } : prev), [])

  return (
    <NavContext.Provider value={{ navState, setNav, clearNav, setActiveTab }}>
      {children}
    </NavContext.Provider>
  )
}

export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavProvider')
  return ctx
}
