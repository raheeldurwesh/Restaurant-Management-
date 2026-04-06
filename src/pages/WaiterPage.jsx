// src/pages/WaiterPage.jsx
// Real-time waiter dashboard — see all orders, update status

import { useMemo, useState } from 'react'
import { useOrders }   from '../hooks/useOrders'
import OrderCard       from '../components/OrderCard'
import Spinner         from '../components/Spinner'

const FILTERS = ['All', 'Pending', 'Preparing', 'Done']

export default function WaiterPage() {
  const { orders, loading, updateStatus } = useOrders()
  const [filter, setFilter] = useState('All')

  // Sort: pending first → preparing → done; within each, newest first
  const sorted = useMemo(() => {
    const order = { pending: 0, preparing: 1, done: 2 }
    return [...orders].sort((a, b) => {
      const statusDiff = (order[a.status] ?? 3) - (order[b.status] ?? 3)
      if (statusDiff !== 0) return statusDiff
      // Within same status: newest first
      const aT = a.createdAt?.toMillis?.() ?? 0
      const bT = b.createdAt?.toMillis?.() ?? 0
      return bT - aT
    })
  }, [orders])

  const filtered = filter === 'All'
    ? sorted
    : sorted.filter(o => o.status === filter.toLowerCase())

  const counts = {
    pending:   orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    done:      orders.filter(o => o.status === 'done').length,
  }

  return (
    <div className="min-h-screen bg-base">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass border-b border-border px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display italic text-amber text-xl">Waiter Dashboard</h1>
            <p className="text-faint text-xs font-body">Live orders • Updates in real-time</p>
          </div>
          {/* Live indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full
                          bg-done/10 border border-done/30">
            <span className="w-2 h-2 rounded-full bg-done animate-pulse-dot" />
            <span className="text-done text-xs font-semibold">Live</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Stats strip ──────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pending',   count: counts.pending,   color: 'text-pending',   bg: 'bg-pending/10   border-pending/25'   },
            { label: 'Preparing', count: counts.preparing, color: 'text-preparing', bg: 'bg-preparing/10 border-preparing/25' },
            { label: 'Done',      count: counts.done,      color: 'text-done',      bg: 'bg-done/10      border-done/25'      },
          ].map(s => (
            <div key={s.label} className={`card p-4 text-center border ${s.bg}`}>
              <p className={`font-display font-bold text-3xl ${s.color}`}>{s.count}</p>
              <p className="text-mid text-xs font-body mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Filter tabs ──────────────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-body font-semibold
                         border transition-all duration-200
                         ${filter === f
                           ? 'bg-amber text-base border-amber'
                           : 'border-border text-mid hover:border-amber/40 hover:text-bright'
                         }`}
            >
              {f}
              {f !== 'All' && (
                <span className="ml-2 text-xs opacity-70">
                  {counts[f.toLowerCase()] ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Orders ───────────────────────────────────────────────── */}
        {loading ? (
          <Spinner text="Loading orders…" />
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <p className="text-5xl">🎉</p>
            <p className="text-mid font-body">
              {filter === 'All' ? 'No orders yet.' : `No ${filter.toLowerCase()} orders.`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(order => (
              <div key={order.id} className="animate-fade-in">
                <OrderCard
                  order={order}
                  onUpdateStatus={updateStatus}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
