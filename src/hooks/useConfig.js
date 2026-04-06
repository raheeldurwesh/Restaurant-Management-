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

  // CRITICAL FIX: Use ?? 0 not || 8
  // This allows admin to set 0% tax. The old code forced 8% for any falsy value.
  const taxNum = Number(config?.tax_percentage ?? 0)
  const settings = {
    taxPercentage: isNaN(taxNum) ? 0 : taxNum,
  }

  const saveSettings = ({ taxPercentage }) =>
    saveConfig({ tax_percentage: Number(taxPercentage) })

  return { config, settings, loading, saveConfig, saveSettings }
}
