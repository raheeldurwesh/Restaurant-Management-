// src/pages/admin/AdminLogin.jsx — Supabase email/password login

import { useState } from 'react'
import { supabase } from '../../supabase/client'
import { MiniSpinner } from '../../components/Spinner'

export default function AdminLogin() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (authErr) throw authErr
      // onAuthStateChange in AdminPage will handle the transition
    } catch (err) {
      setError(
        err.message?.includes('Invalid login')
          ? 'Invalid email or password.'
          : err.message || 'Login failed. Check your credentials.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="text-center mb-8">
          <h1 className="font-display italic text-amber text-5xl mb-2">TableServe</h1>
          <p className="text-mid text-sm font-body">Admin Panel · Owner Access Only</p>
        </div>

        <div className="card p-7 space-y-5">
          <h2 className="section-title text-lg">Sign In</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                     placeholder="admin@yourrestaurant.com" className="input" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                     placeholder="••••••••" className="input" required />
            </div>
            {error && (
              <div className="px-4 py-3 bg-danger/10 border border-danger/30 rounded-xl text-danger text-sm font-body">
                ⚠️ {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-amber w-full py-3 rounded-xl text-base mt-2">
              {loading ? <><MiniSpinner /> Signing in…</> : 'Sign In →'}
            </button>
          </form>
        </div>
        <p className="text-center text-faint text-xs mt-4 font-body">
          Create admin users in Supabase Dashboard → Authentication → Users
        </p>
      </div>
    </div>
  )
}
