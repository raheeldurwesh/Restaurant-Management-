// src/hooks/useConfig.js

import { useState, useEffect, useCallback } from 'react'
import {
  fetchConfig, saveConfig as svcSave,
  subscribeToConfig, DEFAULT_CONFIG,
} from '../services/configService'

export function useConfig() {
  const [config,  setConfig]  = useState(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await fetchConfig()
      setConfig(data)
    } catch (err) {
      console.error('useConfig error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const unsub = subscribeToConfig(() => load())
    return unsub
  }, [load])

  const saveConfig = async (updates) => {
    await svcSave(updates)
    setConfig(prev => ({ ...prev, ...updates }))
  }

  // FIX: tax_percentage Supabase se string aa sakta hai — Number() se ensure karo
  // || 8 use karo (not ??) taaki 0 bhi default se override na ho
  const taxNum = Number(config.tax_percentage)
  const settings = {
    taxPercentage: isNaN(taxNum) || taxNum <= 0 ? 8 : taxNum,
  }

  const saveSettings = ({ taxPercentage }) =>
    saveConfig({ tax_percentage: Number(taxPercentage) })

  return { config, settings, loading, saveConfig, saveSettings }
}
