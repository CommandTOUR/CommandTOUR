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
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [btnHover, setBtnHover] = useState(false)

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

  const labelStyle = {
    fontSize: 10.5,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 6,
    display: 'block',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
  }

  const inputStyle = (focused) => ({
    width: '100%',
    background: 'rgba(255,255,255,0.08)',
    border: focused ? '0.5px solid #33FF99' : '0.5px solid rgba(255,255,255,0.15)',
    boxShadow: focused ? '0 0 0 3px rgba(51,255,153,0.10)' : 'none',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 14,
    padding: '12px 16px',
    outline: 'none',
    caretColor: '#33FF99',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  })

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      position: 'relative',
      background: 'var(--bg)',
    }}>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1,
        width: 420,
        background: 'rgba(10, 22, 40, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16,
        padding: '48px 40px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        boxSizing: 'border-box',
      }}>
        <img
          src="/images/V1_CommandTOUR_Light.png"
          alt="CommandTOUR"
          style={{ width: 220, height: 'auto', display: 'block', margin: '0 auto' }}
        />

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif', marginBottom: 6 }}>
            Welcome Back
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 400, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Sign in to CommandTOUR
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={inputStyle(emailFocused)}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={inputStyle(passwordFocused)}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          style={{
            width: '100%',
            height: 48,
            background: btnHover && !loading ? '#2be88a' : '#33FF99',
            color: '#0a1628',
            fontSize: 15,
            fontWeight: 700,
            border: 'none',
            borderRadius: 8,
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '0.02em',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: loading ? 0.8 : 1,
            transition: 'background 0.15s',
          }}
        >
          {loading ? (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation: 'spin 0.75s linear infinite' }}>
                <circle cx="8" cy="8" r="6" fill="none" stroke="#0a1628" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" />
              </svg>
              Signing in...
            </>
          ) : 'Sign In'}
        </button>

        {error && (
          <div style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginTop: 12, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {error}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
