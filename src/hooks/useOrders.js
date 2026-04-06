// src/hooks/useOrders.js
// Real-time orders hook — backed by Supabase

import { useState, useEffect, useCallback } from 'react'
import {
  fetchOrders, placeOrder as svcPlace,
  updateOrderStatus, deleteOrder as svcDelete,
  deleteAllOrders as svcDeleteAll,
  subscribeToOrders,
} from '../services/orderService'

export function useOrders() {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await fetchOrders()
      setOrders(data)
    } catch (err) {
      console.error('useOrders fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const unsub = subscribeToOrders(() => load())
    return unsub
  }, [load])

  // ── Actions ────────────────────────────────────────────────────────────────
  // FIX: pass ALL fields through — old version was dropping customerName/instructions/sessionId
  const placeOrder = (params) => svcPlace(params)

  const updateStatus           = (id, status) => updateOrderStatus(id, status)
  const deleteOrder            = (id)          => svcDelete(id)
  const deleteAllOrderHistory  = ()            => svcDeleteAll()

  // ── Derived filters ────────────────────────────────────────────────────────
  const todayOrders = orders.filter(o => {
    if (!o.createdAt) return false
    return o.createdAt.toDateString() === new Date().toDateString()
  })

  const monthOrders = orders.filter(o => {
    if (!o.createdAt) return false
    const now = new Date()
    return (
      o.createdAt.getMonth()    === now.getMonth() &&
      o.createdAt.getFullYear() === now.getFullYear()
    )
  })

  return {
    orders, todayOrders, monthOrders, loading,
    placeOrder, updateStatus, deleteOrder, deleteAllOrderHistory,
  }
}
