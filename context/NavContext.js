'use client'
import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const NavContext = createContext(null)

// Session storage key for nav stack persistence
const STACK_KEY = 'commandtour_nav_stack'

// Load stack from sessionStorage on init
function loadStack() {
  try {
    const raw = sessionStorage.getItem(STACK_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// Save stack to sessionStorage
function saveStack(stack) {
  try {
    sessionStorage.setItem(STACK_KEY, JSON.stringify(stack))
  } catch {}
}

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
  const [navStack, setNavStack] = useState([])

  // Load stack from sessionStorage on mount (client only)
  useEffect(() => {
    setNavStack(loadStack())
  }, [])

  // Push a new entry onto the navigation stack
  // Call this BEFORE navigating to a new page
  // entry shape: { href: '/tours/x', label: 'HWSS International', type: 'tour' }
  const pushNav = useCallback((entry) => {
    setNavStack(prev => {
      // Avoid duplicate consecutive entries
      if (prev.length > 0 && prev[prev.length - 1].href === entry.href) return prev
      const next = [...prev, entry]
      // Cap stack at 10 levels deep
      const capped = next.slice(-10)
      saveStack(capped)
      return capped
    })
  }, [])

  // Pop the top entry off the stack and return it
  // Call this when the back button is pressed
  const popNav = useCallback(() => {
    setNavStack(prev => {
      if (prev.length === 0) return prev
      const next = prev.slice(0, -1)
      saveStack(next)
      return next
    })
  }, [])

  // Clear the entire stack (call on logout or navigating to root pages)
  const clearStack = useCallback(() => {
    setNavStack([])
    saveStack([])
  }, [])

  // Get the previous entry (where back button should go)
  // Returns null if stack is empty (use page's default backHref as fallback)
  const getPreviousEntry = useCallback(() => {
    if (navStack.length < 2) return null
    return navStack[navStack.length - 2]
  }, [navStack])

  // Get the current entry (top of stack)
  const getCurrentEntry = useCallback(() => {
    if (navStack.length === 0) return null
    return navStack[navStack.length - 1]
  }, [navStack])

  // Legacy setNav — kept for backward compatibility with existing pages
  // Automatically uses stack for back navigation if available
  const setNav = useCallback((state) => {
    setNavStack(currentStack => {
      const previous = currentStack.length >= 2 ? currentStack[currentStack.length - 2] : null
      setNavState({
        ...state,
        // Override backHref and backLabel with stack entry if available
        backHref: previous?.href || state.backHref,
        backLabel: previous?.label || state.backLabel,
      })
      return currentStack
    })
  }, [])

  const clearNav = useCallback(() => setNavState(null), [])

  const setActiveTab = useCallback((tab) => {
    setNavState(prev => prev ? { ...prev, activeTab: tab } : prev)
  }, [])

  return (
    <NavContext.Provider value={{
      // Legacy API — existing pages keep working
      navState,
      setNav,
      clearNav,
      setActiveTab,
      // New stack API
      navStack,
      pushNav,
      popNav,
      clearStack,
      getPreviousEntry,
      getCurrentEntry,
    }}>
      {children}
    </NavContext.Provider>
  )
}

export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavProvider')
  return ctx
}

// Helper hook for pages that want to navigate with stack tracking
// Usage: const { navigate } = useNavigate()
//        navigate('/tours/x', { label: 'HWSS International', type: 'tour' })
export function useNavigate() {
  const { pushNav } = useNav()

  const navigate = useCallback((href, entry) => {
    if (entry) {
      pushNav({ href, label: entry.label, type: entry.type || 'page' })
    }
    return href
  }, [pushNav])

  return { navigate }
}
