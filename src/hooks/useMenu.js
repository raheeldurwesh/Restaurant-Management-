// src/hooks/useMenu.js
// Real-time menu hook — backed by Supabase instead of Firebase

import { useState, useEffect, useCallback } from 'react'
import {
  fetchMenu, addMenuItem, updateMenuItem,
  deleteMenuItem, toggleItemAvailability, subscribeToMenu,
} from '../services/menuService'

export function useMenu() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchMenu()
      // Normalise image_url → imageUrl for backward UI compatibility
      setItems(data.map(normaliseItem))
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Subscribe to Realtime changes — refetch on any change
    const unsub = subscribeToMenu(() => load())
    return unsub
  }, [load])

  const addItem    = (data, img) => addMenuItem(data, img)
  const updateItem = (id, data, img) => updateMenuItem(id, data, img)
  const deleteItem = (id, imageUrl) => deleteMenuItem(id, imageUrl)
  const toggleAvailability = (id, current) => toggleItemAvailability(id, current)

  return { items, loading, error, addItem, updateItem, deleteItem, toggleAvailability }
}

// Map DB snake_case → UI camelCase
function normaliseItem(row) {
  return {
    id:          row.id,
    name:        row.name,
    description: row.description || '',
    price:       row.price,
    category:    row.category || 'Other',
    available:   row.available !== false,
    imageUrl:    row.image_url || '',
    createdAt:   row.created_at ? new Date(row.created_at) : null,
  }
}
