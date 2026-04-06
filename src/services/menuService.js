// src/services/menuService.js
// All menu-related DB operations and image uploads
// Supabase table: menu | Storage bucket: menu-images

import { supabase } from '../supabase/client'

const TABLE  = 'menu'
const BUCKET = 'menu-images'

// ── Image upload ─────────────────────────────────────────────────────────────
// Uploads to Supabase Storage, returns the public URL
export async function uploadMenuImage(file) {
  const ext  = file.name.split('.').pop()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type })

  if (upErr) throw new Error(`Image upload failed: ${upErr.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// ── Delete image from Storage ─────────────────────────────────────────────────
// Extracts the storage path from a full public URL and removes the file
export async function deleteMenuImage(publicUrl) {
  if (!publicUrl) return
  try {
    // URL format: .../storage/v1/object/public/menu-images/<path>
    const marker = `${BUCKET}/`
    const idx    = publicUrl.indexOf(marker)
    if (idx === -1) return
    const path = publicUrl.slice(idx + marker.length)
    await supabase.storage.from(BUCKET).remove([path])
  } catch {
    // Non-critical: log and continue
    console.warn('Could not delete image from storage:', publicUrl)
  }
}

// ── Fetch all menu items ──────────────────────────────────────────────────────
export async function fetchMenu() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// ── Add menu item ─────────────────────────────────────────────────────────────
export async function addMenuItem(formData, imageFile) {
  let imageUrl = formData.imageUrl || ''
  if (imageFile) imageUrl = await uploadMenuImage(imageFile)

  const { data, error } = await supabase.from(TABLE).insert({
    name:        formData.name.trim(),
    description: formData.description?.trim() || '',
    price:       Number(formData.price),
    category:    formData.category || 'Other',
    available:   formData.available !== false,
    image_url:   imageUrl,
  }).select().single()

  if (error) throw error
  return data
}

// ── Update menu item ──────────────────────────────────────────────────────────
export async function updateMenuItem(id, formData, imageFile) {
  let imageUrl = formData.imageUrl || formData.image_url || ''

  if (imageFile) {
    // Upload new image; old image cleanup is optional (keep for history)
    imageUrl = await uploadMenuImage(imageFile)
  }

  const { data, error } = await supabase.from(TABLE).update({
    name:        formData.name.trim(),
    description: formData.description?.trim() || '',
    price:       Number(formData.price),
    category:    formData.category || 'Other',
    available:   formData.available !== false,
    image_url:   imageUrl,
  }).eq('id', id).select().single()

  if (error) throw error
  return data
}

// ── Delete menu item ──────────────────────────────────────────────────────────
export async function deleteMenuItem(id, imageUrl) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
  // Clean up image from storage after DB row is gone
  await deleteMenuImage(imageUrl)
}

// ── Toggle availability ───────────────────────────────────────────────────────
export async function toggleItemAvailability(id, current) {
  const { error } = await supabase
    .from(TABLE)
    .update({ available: !current })
    .eq('id', id)
  if (error) throw error
}

// ── Subscribe to real-time changes ───────────────────────────────────────────
// Returns an unsubscribe function — call it in useEffect cleanup
export function subscribeToMenu(onChange) {
  const channel = supabase
    .channel('menu-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, onChange)
    .subscribe()

  return () => supabase.removeChannel(channel)
}
