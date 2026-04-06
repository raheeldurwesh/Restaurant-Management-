// src/pages/admin/AdminPage.jsx
// Auth wrapper + tabbed admin layout
// CHANGED: Firebase Auth → Supabase Auth, Storage Monitor widget, WakeUp overlay

import { useState, useEffect } from 'react'
import { supabase }      from '../../supabase/client'
import { useKeepAlive }  from '../../hooks/useKeepAlive'
import { getStorageStats } from '../../services/storageService'
import AdminLogin        from './AdminLogin'
import MenuManager       from './MenuManager'
import OrdersManager     from './OrdersManager'
import Analytics         from './Analytics'
import Settings          from './Settings'
import Spinner           from '../../components/Spinner'
import WakeUp            from '../../components/WakeUp'

const TABS = [
  { id: 'menu',      label: '🍽️ Menu',     component: MenuManager   },
  { id: 'orders',    label: '📋 Orders',    component: OrdersManager },
  { id: 'analytics', label: '📊 Analytics', component: Analytics     },
  { id: 'settings',  label: '⚙️ Settings',  component: Settings      },
]

// ── Storage monitor widget ────────────────────────────────────────────────────
function StorageMonitor() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStorageStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="card p-4 flex items-center gap-3 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-raised flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-raised rounded w-24" />
        <div className="h-2 bg-raised rounded w-40" />
      </div>
    </div>
  )

  if (!stats) return null

  const barColor = stats.usedPct > 80 ? 'bg-danger' : stats.usedPct > 50 ? 'bg-amber' : 'bg-done'

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🗄️</span>
          <div>
            <p className="text-bright text-sm font-body font-semibold leading-none">Storage</p>
            <p className="text-faint text-[10px] mt-0.5">menu-images bucket</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-bright text-sm font-body font-semibold">
            {stats.usedMB < 1 ? `${(stats.usedMB * 1024).toFixed(0)} KB` : `${stats.usedMB} MB`}
            <span className="text-faint font-normal"> / 1 GB</span>
          </p>
          <p className="text-faint text-[10px]">{stats.fileCount} files</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-raised rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-700`}
          style={{ width: `${Math.max(stats.usedPct, 0.5)}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-faint font-body">
        <span>{stats.usedPct}% used</span>
        <span>{(1024 - stats.usedMB).toFixed(0)} MB remaining</span>
      </div>
    </div>
  )
}

// ── Main AdminPage ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [user,    setUser]    = useState(undefined)  // undefined = loading
  const [tab,     setTab]     = useState('menu')
  const { isWakingUp, retryNow } = useKeepAlive()

  // Supabase Auth state listener (replaces Firebase onAuthStateChanged)
  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Auth loading
  if (user === undefined) return (
    <div className="min-h-screen bg-base flex items-center justify-center">
      <Spinner text="Checking authentication…" />
    </div>
  )

  if (!user) return <AdminLogin />

  const ActiveTab = TABS.find(t => t.id === tab)?.component ?? MenuManager

  return (
    <div className="min-h-screen bg-base">
      {/* Wake-up overlay — shown when Supabase is resuming from pause */}
      {isWakingUp && <WakeUp onRetry={retryNow} />}

      {/* ── Topbar ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-display italic text-amber text-xl">TableServe</span>
            <span className="hidden sm:block text-border text-lg">|</span>
            <span className="hidden sm:block text-faint text-xs font-body">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-faint text-xs font-body truncate max-w-[160px]">
              {user.email}
            </span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="btn-ghost text-xs py-1.5 px-3"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ── Tab nav ──────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-0 overflow-x-auto no-scrollbar">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-shrink-0 px-4 py-3.5 text-sm font-body font-semibold
                           border-b-2 transition-all duration-200 whitespace-nowrap
                           ${tab === t.id
                             ? 'border-amber text-amber'
                             : 'border-transparent text-mid hover:text-bright hover:border-border'
                           }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Storage monitor — always visible at top of admin */}
        <StorageMonitor />
        <ActiveTab />
      </main>
    </div>
  )
}
