// src/utils/helpers.js — shared utility functions

// ── Currency: Indian Rupees — UI display ─────────────────────────────────────
export const fmt = (n) => `₹${Number(n).toFixed(2)}`

// ── Currency: ASCII-safe for jsPDF ───────────────────────────────────────────
// jsPDF's built-in helvetica font does not include the ₹ glyph (U+20B9).
// Rendering it produces garbled/overlapping text in the PDF.
// Use "Rs." prefix for all PDF text to avoid this.
export const fmtPDF = (n) => `Rs.${Number(n).toFixed(2)}`

// ── Timestamp helpers ─────────────────────────────────────────────────────────
function toDate(ts) {
  if (!ts) return null
  if (ts instanceof Date) return ts
  if (typeof ts.toDate === 'function') return ts.toDate()
  return new Date(ts)
}

export function fmtTime(ts) {
  const d = toDate(ts)
  if (!d) return '—'
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export function fmtDate(ts) {
  const d = toDate(ts)
  if (!d) return '—'
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtDateTime(ts) {
  return `${fmtDate(ts)}, ${fmtTime(ts)}`
}

export function timeAgo(ts) {
  const d = toDate(ts)
  if (!d) return ''
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 60)   return `${sec}s ago`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  return `${Math.floor(sec / 3600)}h ago`
}

// ── Status badge metadata ─────────────────────────────────────────────────────
export const STATUS = {
  pending:   { label: 'Pending',   cls: 'badge-pending',   dot: 'bg-pending'   },
  preparing: { label: 'Preparing', cls: 'badge-preparing', dot: 'bg-preparing' },
  done:      { label: 'Done',      cls: 'badge-done',      dot: 'bg-done'      },
}

// ── Order totals ──────────────────────────────────────────────────────────────
// Single source of truth — called once in CustomerPage, values passed everywhere.
// tax = (subtotal * taxPct) / 100   [NOT subtotal * taxPct — taxPct is already %]
export function calcTotals(cart, taxPct) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const tax      = (subtotal * taxPct) / 100
  const total    = subtotal + tax
  return { subtotal, tax, total }
}

// ── Session / Anti-spam helpers ───────────────────────────────────────────────
const COOLDOWN_MS  = 40 * 1000  // 40 seconds
const LS_LAST_ORDER = 'ts_last_order_time'
const LS_SESSION_ID = 'ts_session_id'

export function getSessionId() {
  let id = localStorage.getItem(LS_SESSION_ID)
  if (!id) {
    // Simple UUID v4 without external deps
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
    localStorage.setItem(LS_SESSION_ID, id)
  }
  return id
}

// Returns null if OK to order, or a string error message if in cooldown
export function checkCooldown() {
  const last = localStorage.getItem(LS_LAST_ORDER)
  if (!last) return null
  const elapsed = Date.now() - Number(last)
  if (elapsed < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
    return `Please wait ${remaining}s before placing another order.`
  }
  return null
}

export function recordOrderTime() {
  localStorage.setItem(LS_LAST_ORDER, String(Date.now()))
}
