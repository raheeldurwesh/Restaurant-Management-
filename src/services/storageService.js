// src/services/storageService.js
// Storage bucket monitoring — list files, calculate usage vs. free-tier limits

import { supabase } from '../supabase/client'

const BUCKET = 'menu-images'

// Supabase free tier storage limit = 1 GB
const FREE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024

// ── Recursively list all files in the bucket ──────────────────────────────────
async function listAllFiles(prefix = '') {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(prefix, { limit: 1000, offset: 0 })

  if (error) throw error
  if (!data) return []

  const files   = data.filter(f => f.id)                       // files have an id
  const folders = data.filter(f => !f.id && f.name !== '.emptyFolderPlaceholder')

  // Recurse into sub-folders
  const nested = await Promise.all(
    folders.map(folder => listAllFiles(prefix ? `${prefix}/${folder.name}` : folder.name))
  )

  return [...files, ...nested.flat()]
}

// ── Get storage stats ─────────────────────────────────────────────────────────
// Returns { usedBytes, limitBytes, usedMB, limitMB, usedPct, fileCount }
export async function getStorageStats() {
  const files = await listAllFiles()

  const usedBytes = files.reduce((sum, f) => {
    // file metadata contains size in bytes
    return sum + (f.metadata?.size || 0)
  }, 0)

  const usedMB  = usedBytes / (1024 * 1024)
  const limitMB = FREE_LIMIT_BYTES / (1024 * 1024)
  const usedPct = Math.min((usedBytes / FREE_LIMIT_BYTES) * 100, 100)

  return {
    usedBytes,
    limitBytes: FREE_LIMIT_BYTES,
    usedMB:     parseFloat(usedMB.toFixed(2)),
    limitMB:    parseFloat(limitMB.toFixed(2)),
    usedGB:     parseFloat((usedMB / 1024).toFixed(3)),
    usedPct:    parseFloat(usedPct.toFixed(1)),
    fileCount:  files.length,
  }
}
