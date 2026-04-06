// src/services/configService.js
// Global restaurant configuration — single row in the `config` table (id = 1)
// All fields editable from the admin panel; consumed by UI, PDFs, invoices

import { supabase } from '../supabase/client'

const TABLE = 'config'
const ROW_ID = 1

export const DEFAULT_CONFIG = {
  restaurant_name: 'TableServe',
  tagline:         'Restaurant Management System',
  address:         '',
  phone:           '',
  gst_number:      '',
  tax_percentage:  8,
  currency:        '₹',
}

// ── Fetch config ──────────────────────────────────────────────────────────────
export async function fetchConfig() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', ROW_ID)
    .single()

  if (error) {
    // Row doesn't exist yet → return defaults
    if (error.code === 'PGRST116') return { id: ROW_ID, ...DEFAULT_CONFIG }
    throw error
  }

  return { ...DEFAULT_CONFIG, ...data }
}

// ── Save config ───────────────────────────────────────────────────────────────
// Uses upsert so it works whether the row exists or not
export async function saveConfig(updates) {
  const { error } = await supabase
    .from(TABLE)
    .upsert({ id: ROW_ID, ...updates })

  if (error) throw error
}

// ── Real-time subscription ────────────────────────────────────────────────────
export function subscribeToConfig(onChange) {
  const channel = supabase
    .channel('config-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, onChange)
    .subscribe()

  return () => supabase.removeChannel(channel)
}
