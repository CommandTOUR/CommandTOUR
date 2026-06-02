'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { getSupabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div className="glass-card" style={{
        width: 380,
        padding: '40px 36px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
      }}>

        <img
          src="/CommandTOUR-Logo-Dark.png"
          alt="CommandTOUR"
          style={{ height: 36, width: 'auto', marginBottom: 8 }}
        />

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                fontFamily: 'Rubik, sans-serif',
                fontSize: 14,
                padding: '10px 14px',
                borderRadius: 8,
                border: '0.5px solid var(--glass-border)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-primary)',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                fontFamily: 'Rubik, sans-serif',
                fontSize: 14,
                padding: '10px 14px',
                borderRadius: 8,
                border: '0.5px solid var(--glass-border)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-primary)',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '11px', fontSize: 14 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

      </div>
    </div>
  )
}