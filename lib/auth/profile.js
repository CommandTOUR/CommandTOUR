'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { getSupabase } from '../supabase'

export const ROLES = ['admin', 'manager', 'coordinator', 'finance', 'crew']
export const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', coordinator: 'Coordinator', finance: 'Finance', crew: 'Crew' }

export const isAdmin = (role) => role === 'admin'
export const isManager = (role) => role === 'admin' || role === 'manager'
export const isOps = (role) => ['admin', 'manager', 'coordinator', 'finance'].includes(role)

const VIEW_AS_KEY = 'viewAsRole'
const readViewAs = () => { try { const v = sessionStorage.getItem(VIEW_AS_KEY); return ROLES.includes(v) ? v : null } catch { return null } }

const ProfileContext = createContext(null)

// status: 'loading' | 'signed_out' | 'ready' | 'error'
// 'error' means the profile could not be read (for example the roles SQL has not been run yet); the app stays usable and
// database row-level security remains the real gate.
export function ProfileProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', userId: null, email: null, profile: null })
  const [viewAs, setViewAsState] = useState(null)

  const load = useCallback(async () => {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setState({ status: 'signed_out', userId: null, email: null, profile: null }); return }
    const { data, error } = await supabase.from('user_profiles').select('user_id, staff_id, role').eq('user_id', user.id).maybeSingle()
    if (error) { console.error('Could not load profile:', error.message); setState({ status: 'error', userId: user.id, email: user.email, profile: null }); return }
    setState({ status: 'ready', userId: user.id, email: user.email, profile: data || null })
  }, [])

  useEffect(() => {
    setViewAsState(readViewAs())
    load()
    const { data: sub } = getSupabase().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') load()
    })
    return () => sub.subscription.unsubscribe()
  }, [load])

  const realRole = state.profile?.role || null
  // View As is a screen preview for Admins only. It never changes what the database lets this login read or write.
  const viewingAs = realRole === 'admin' ? viewAs : null
  const role = viewingAs || realRole

  const setViewAs = useCallback((r) => {
    try { if (r) sessionStorage.setItem(VIEW_AS_KEY, r); else sessionStorage.removeItem(VIEW_AS_KEY) } catch {}
    setViewAsState(r || null)
  }, [])

  const value = useMemo(() => ({
    ...state, realRole, role, viewingAs, setViewAs, reload: load,
    staffId: state.profile?.staff_id || null,
    isAdmin: isAdmin(role), isManager: isManager(role), isOps: isOps(role),
  }), [state, realRole, role, viewingAs, setViewAs, load])

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider')
  return ctx
}
