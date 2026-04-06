// src/services/orderService.js

import { supabase } from '../supabase/client'

const TABLE = 'orders'

function generateOrderId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ── Fetch all orders ──────────────────────────────────────────────────────────
export async function fetchOrders() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(normalise)
}

// ── Place a new order ─────────────────────────────────────────────────────────
// Accepts: table, items, total, tax, note, customerName, instructions, sessionId
// total = subtotal (before tax). Tax is stored separately.
export async function placeOrder({ table, items, total, tax, note, customerName, instructions, sessionId }) {
  const orderId = generateOrderId()
  const { error } = await supabase.from(TABLE).insert({
    order_id:      orderId,
    table_no:      String(table),
    customer_name: (customerName  || '').trim(),
    session_id:    sessionId      || null,
    items:         items.map(i => ({
      name:  i.name,
      qty:   Number(i.qty),
      price: Number(i.price),
    })),
    total:         parseFloat(Number(total).toFixed(2)),
    tax:           parseFloat(Number(tax).toFixed(2)),
    note:          (note         || '').trim(),
    instructions:  (instructions || '').trim(),
    status:        'pending',
  })
  if (error) throw error
  return orderId
}

// ── Update order status ───────────────────────────────────────────────────────
export async function updateOrderStatus(id, status) {
  const { error } = await supabase.from(TABLE).update({ status }).eq('id', id)
  if (error) throw error
}

// ── Delete single order ───────────────────────────────────────────────────────
export async function deleteOrder(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}

// ── Delete all orders ─────────────────────────────────────────────────────────
export async function deleteAllOrders() {
  const { error } = await supabase
    .from(TABLE).delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw error
}

// ── Real-time subscription ────────────────────────────────────────────────────
export function subscribeToOrders(onChange) {
  const channel = supabase
    .channel('orders-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, onChange)
    .subscribe()
  return () => supabase.removeChannel(channel)
}

// ── Normalise DB row → UI shape ───────────────────────────────────────────────
function normalise(row) {
  return {
    id:           row.id,
    orderId:      row.order_id,
    table:        row.table_no,
    customerName: row.customer_name || '',
    sessionId:    row.session_id    || '',
    items:        row.items         || [],
    total:        Number(row.total) || 0,
    tax:          Number(row.tax)   || 0,
    note:         row.note          || '',
    instructions: row.instructions  || '',
    status:       row.status        || 'pending',
    createdAt:    row.created_at ? new Date(row.created_at) : null,
  }
}
