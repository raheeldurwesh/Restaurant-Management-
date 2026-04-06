// src/utils/generatePDF.js
// FIXES:
//   1. Use fmtPDF (Rs. prefix) — ₹ glyph is not in jsPDF helvetica, causes overlap
//   2. All numeric columns explicitly right-aligned with consistent anchor points
//   3. Subtotal = order.total (before tax); grand = total + tax
//   4. QR PDF export for all tables (new: generateQRPDF)

import jsPDF from 'jspdf'
import { fmtPDF } from './helpers'

// A5 page constants (shared)
const PAGE_W = 148   // mm
const PAGE_M = 12    // margin
const PAGE_R = PAGE_W - PAGE_M  // right edge = 136mm

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE ORDER INVOICE
// ─────────────────────────────────────────────────────────────────────────────
export function generateInvoice(order, config = {}) {
  const restaurantName = config.restaurant_name || 'TableServe'
  const tagline        = config.tagline         || 'Restaurant Management System'
  const address        = config.address         || ''
  const phone          = config.phone           || ''
  const gstNumber      = config.gst_number      || ''
  // CRITICAL: use ?? 0 not || 8 — respect admin's 0% setting
  const taxPct         = Number(config.tax_percentage ?? 0)

  const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' })
  const W   = doc.internal.pageSize.getWidth()   // 148mm
  const M   = PAGE_M
  const R   = PAGE_R
  let   y   = 0

  // Helper: place text — all coords explicit, never from closure
  const t = (str, x, cy, opts = {}) => doc.text(String(str), x, cy, opts)

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFillColor(14, 14, 16)
  doc.rect(0, 0, W, 34, 'F')

  y = 11
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(245, 158, 11)
  t(restaurantName, W / 2, y, { align: 'center' })

  y = 17
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(180, 170, 160)
  t(tagline, W / 2, y, { align: 'center' })

  if (address) {
    y = 22
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(140, 130, 120)
    t(address, W / 2, y, { align: 'center' })
  }

  const contactParts = [phone, gstNumber ? `GST: ${gstNumber}` : ''].filter(Boolean)
  if (contactParts.length) {
    y = 28; doc.setFontSize(7); doc.setTextColor(140, 130, 120)
    t(contactParts.join('  .  '), W / 2, y, { align: 'center' })
  }

  // ── Invoice title ────────────────────────────────────────────────────────
  y = 42
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(30, 30, 30)
  t('INVOICE', W / 2, y, { align: 'center' })

  // ── Order meta box ───────────────────────────────────────────────────────
  y = 47
  const hasCustomer = !!(order.customerName)
  const metaH       = hasCustomer ? 30 : 22
  doc.setFillColor(245, 242, 235)
  doc.roundedRect(M, y, W - M * 2, metaH, 2, 2, 'F')

  const col1 = M + 4
  const col2 = W / 2 - 2
  const col3 = R - 28

  y += 6
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(130, 120, 100)
  t('ORDER ID', col1, y); t('TABLE', col2, y); t('DATE', col3, y)

  y += 7
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(200, 120, 20)
  t(`#${order.orderId}`, col1, y)

  doc.setFontSize(12); doc.setTextColor(30, 30, 30)
  t(String(order.table), col2, y)

  const createdAt  = order.createdAt ? new Date(order.createdAt) : new Date()
  const orderDate  = createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const orderTime  = createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(60, 55, 45)
  t(orderDate, col3, y - 2)
  t(orderTime, col3, y + 4)

  if (hasCustomer) {
    y += 9
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(130, 120, 100)
    t('CUSTOMER', col1, y)
    y += 5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(30, 30, 30)
    t(order.customerName.slice(0, 30), col1, y)
  }

  // ── Items table header ───────────────────────────────────────────────────
  y = 47 + metaH + 6
  doc.setFillColor(30, 30, 36)
  doc.rect(M, y, W - M * 2, 8, 'F')

  // Column anchors — all numeric cols right-aligned to prevent overlap:
  //   ITEM  name  left-aligned  at M+3  (12+3 = 15mm)
  //   QTY   num   right-aligned at 75mm
  //   PRICE num   right-aligned at 105mm
  //   TOTAL num   right-aligned at R-2 (134mm)
  const C_ITEM  = M + 3   // 15mm  — left aligned
  const C_QTY   = 75      // 75mm  — right aligned
  const C_PRICE = 105     // 105mm — right aligned
  const C_TOTAL = R - 2   // 134mm — right aligned

  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(245, 158, 11)
  t('ITEM',  C_ITEM,  y + 5.5, { align: 'left'  })
  t('QTY',   C_QTY,  y + 5.5, { align: 'right' })
  t('PRICE', C_PRICE, y + 5.5, { align: 'right' })
  t('TOTAL', C_TOTAL, y + 5.5, { align: 'right' })

  // ── Items rows ───────────────────────────────────────────────────────────
  y += 10
  const items = order.items || []
  items.forEach((item, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(251, 248, 243)
      doc.rect(M, y - 2, W - M * 2, 8.5, 'F')
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(35, 30, 20)
    const name  = item.name.length > 26 ? item.name.slice(0, 26) + '...' : item.name
    const price = Number(item.price) || 0
    const qty   = Number(item.qty)   || 0
    t(name,               C_ITEM,  y + 4, { align: 'left'  })
    t(String(qty),        C_QTY,  y + 4, { align: 'right' })
    t(fmtPDF(price),      C_PRICE, y + 4, { align: 'right' })
    t(fmtPDF(price * qty),C_TOTAL, y + 4, { align: 'right' })
    y += 8.5
  })

  // ── Divider ──────────────────────────────────────────────────────────────
  y += 3
  doc.setDrawColor(210, 200, 185); doc.setLineWidth(0.3)
  doc.line(M, y, R, y)
  y += 7

  // ── Totals ───────────────────────────────────────────────────────────────
  // order.total  = subtotal (line items only, before tax)
  // order.tax    = tax amount calculated at order time
  // grand        = order.total + order.tax
  const subtotal   = Number(order.total) || 0
  const taxAmt     = Number(order.tax)   || 0
  const grandTotal = subtotal + taxAmt

  // Label anchors right-aligned
  const LX = R - 42   // label right edge
  const VX = R - 2    // value right edge

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(100, 90, 75)
  t('Subtotal',          LX, y, { align: 'right' })
  t(fmtPDF(subtotal),    VX, y, { align: 'right' })

  y += 7
  t(`Tax (${taxPct}%)`,  LX, y, { align: 'right' })
  t(fmtPDF(taxAmt),      VX, y, { align: 'right' })

  // ── Grand total box ──────────────────────────────────────────────────────
  y += 5
  doc.setFillColor(14, 14, 16)
  doc.roundedRect(M, y, W - M * 2, 13, 2, 2, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255)
  t('TOTAL AMOUNT', M + 5, y + 8.5)
  doc.setFontSize(11); doc.setTextColor(245, 158, 11)
  t(fmtPDF(grandTotal), R - 3, y + 8.5, { align: 'right' })

  y += 19

  // ── Note / instructions ───────────────────────────────────────────────────
  const noteText = (order.note || order.instructions || '').trim()
  if (noteText) {
    doc.setFillColor(255, 250, 230)
    const noteLines = doc.splitTextToSize(`Note: ${noteText}`, W - M * 2 - 8)
    const noteH     = noteLines.length * 5 + 8
    doc.roundedRect(M, y, W - M * 2, noteH, 2, 2, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(90, 75, 50)
    doc.text(noteLines, M + 4, y + 6)
    y += noteH + 6
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  y += 4
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(160, 150, 130)
  t('Thank you for dining with us!', W / 2, y, { align: 'center' });  y += 5
  t('Please pay at the counter.',    W / 2, y, { align: 'center' });  y += 5
  doc.setTextColor(200, 120, 20)
  t('We look forward to welcoming you again  *', W / 2, y, { align: 'center' })

  doc.save(`Invoice-${order.orderId || 'order'}-Table${order.table}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// QR CODE PDF — all tables on one A4 sheet (print quality)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateQRPDF({ tableCount, baseUrl, restaurantName = 'TableServe' }) {
  // Dynamically import QRCode lib (works in browser)
  // We use the qrcode package (not qrcode.react) to get raw data URLs
  // Falls back to canvas-based approach using existing QRCodeCanvas elements
  const doc  = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const W    = doc.internal.pageSize.getWidth()   // 210mm
  const H    = doc.internal.pageSize.getHeight()  // 297mm
  const M    = 10  // page margin

  const COLS     = 3
  const ROWS     = 4
  const PER_PAGE = COLS * ROWS
  const cellW    = (W - M * 2) / COLS
  const cellH    = (H - M * 2 - 20) / ROWS  // 20 reserved for header
  const qrSize   = Math.min(cellW, cellH) * 0.62  // mm, leave room for label

  // ── Header ─────────────────────────────────────────────────────────────
  doc.setFillColor(14, 14, 16)
  doc.rect(0, 0, W, 18, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(245, 158, 11)
  doc.text(restaurantName, W / 2, 8, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(180, 170, 160)
  doc.text('Table QR Codes — Scan to Order', W / 2, 14, { align: 'center' })

  // ── QR cells ───────────────────────────────────────────────────────────
  for (let t = 1; t <= tableCount; t++) {
    const pageIdx = Math.floor((t - 1) / PER_PAGE)
    const cellIdx = (t - 1) % PER_PAGE
    const col     = cellIdx % COLS
    const row     = Math.floor(cellIdx / COLS)

    if (cellIdx === 0 && t > 1) {
      doc.addPage()
      // Re-draw header on new page
      doc.setFillColor(14, 14, 16); doc.rect(0, 0, W, 18, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(245, 158, 11)
      doc.text(restaurantName, W / 2, 8, { align: 'center' })
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(180, 170, 160)
      doc.text('Table QR Codes — Scan to Order', W / 2, 14, { align: 'center' })
    }

    const cellX = M + col * cellW
    const cellY = 20 + M + row * cellH  // 20 = header offset

    // Cell background
    doc.setFillColor(248, 246, 242)
    doc.roundedRect(cellX + 2, cellY + 2, cellW - 4, cellH - 4, 3, 3, 'F')
    doc.setDrawColor(220, 210, 190); doc.setLineWidth(0.3)
    doc.roundedRect(cellX + 2, cellY + 2, cellW - 4, cellH - 4, 3, 3, 'S')

    // Table label
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(60, 50, 30)
    doc.text(`Table ${t}`, cellX + cellW / 2, cellY + 10, { align: 'center' })

    // Try to get QR image from the canvas rendered in the DOM
    // (QRCodeCanvas elements have ids like qr-canvas-${t})
    const canvas = typeof document !== 'undefined'
      ? document.getElementById(`qr-canvas-${t}`)
      : null

    if (canvas) {
      try {
        // Convert canvas to data URL at high res
        const imgData = canvas.toDataURL('image/png')
        const qrX     = cellX + (cellW - qrSize) / 2
        const qrY     = cellY + 12
        // White backing for QR
        doc.setFillColor(255, 255, 255)
        doc.roundedRect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 1, 1, 'F')
        doc.addImage(imgData, 'PNG', qrX, qrY, qrSize, qrSize)
      } catch (e) {
        // Canvas not available — draw placeholder
        doc.setFontSize(7); doc.setTextColor(150, 130, 110)
        doc.text('[QR unavailable]', cellX + cellW / 2, cellY + cellH / 2, { align: 'center' })
      }
    } else {
      doc.setFontSize(7); doc.setTextColor(150, 130, 110)
      doc.text('[Open Settings to view QRs]', cellX + cellW / 2, cellY + cellH / 2, { align: 'center' })
    }

    // URL label below QR
    const url = `${baseUrl}/?table=${t}`
    doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(140, 130, 110)
    doc.text(url, cellX + cellW / 2, cellY + cellH - 5, { align: 'center' })
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  const lastPage = doc.internal.pages.length - 1
  doc.setPage(lastPage)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(160, 150, 140)
  doc.text(
    `Generated: ${new Date().toLocaleString('en-IN')}  |  ${restaurantName}`,
    W / 2, H - 5, { align: 'center' }
  )

  doc.save(`${restaurantName.replace(/\s+/g, '-')}-Table-QRCodes.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY / MONTHLY REPORT
// ─────────────────────────────────────────────────────────────────────────────
export function generateReport({ type, orders, label, config = {} }) {
  const restaurantName = config.restaurant_name || 'TableServe'
  const tagline        = config.tagline         || 'Restaurant Management System'
  const address        = config.address         || ''
  const phone          = config.phone           || ''
  const gstNumber      = config.gst_number      || ''

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const W   = doc.internal.pageSize.getWidth()
  const M   = 16
  const R   = W - M
  let   y   = 0

  const t = (str, x, cy, opts = {}) => doc.text(String(str), x, cy, opts)

  doc.setFillColor(14, 14, 16); doc.rect(0, 0, W, 36, 'F')

  y = 12
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(245, 158, 11)
  t(restaurantName, W / 2, y, { align: 'center' })
  y = 19
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(180, 170, 160)
  t(tagline, W / 2, y, { align: 'center' })
  y = 25
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(140, 130, 120)
  if (address) t(address, W / 2, y, { align: 'center' })
  y = 30
  const cp = [phone, gstNumber ? `GST: ${gstNumber}` : ''].filter(Boolean)
  if (cp.length) t(cp.join('  .  '), W / 2, y, { align: 'center' })

  y = 46
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(30, 30, 30)
  t(type === 'daily' ? 'Daily Sales Report' : 'Monthly Sales Report', W / 2, y, { align: 'center' })
  y = 53
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(100, 100, 100)
  t(label, W / 2, y, { align: 'center' })

  y += 10
  // grand total per order = subtotal + tax
  const totalRevenue = orders.reduce((s, o) => s + (Number(o.total) || 0) + (Number(o.tax) || 0), 0)
  const totalOrders  = orders.length
  const avgOrder     = totalOrders ? totalRevenue / totalOrders : 0

  doc.setFillColor(248, 245, 240)
  doc.roundedRect(M, y, W - M * 2, 32, 3, 3, 'F')
  doc.setDrawColor(225, 215, 195); doc.setLineWidth(0.3)
  doc.roundedRect(M, y, W - M * 2, 32, 3, 3, 'S')

  const cw = (W - M * 2) / 3
  ;[
    { label: 'Total Revenue', value: fmtPDF(totalRevenue) },
    { label: 'Total Orders',  value: String(totalOrders)  },
    { label: 'Average Order', value: fmtPDF(avgOrder)     },
  ].forEach((col, i) => {
    const cx = M + cw * i + cw / 2
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(200, 120, 20)
    t(col.value, cx, y + 14, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 100, 80)
    t(col.label, cx, y + 22, { align: 'center' })
  })

  y += 40
  doc.setFillColor(30, 30, 36); doc.rect(M, y, W - M * 2, 8, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(245, 158, 11)

  // Report table columns — all right-aligned numbers
  const CX     = [M + 4, M + 30, M + 55, M + 95, R - 36, R - 4]
  const HDRS   = ['Order ID', 'Table', 'Customer', 'Items', 'Status', 'Total']
  const ALIGNS = ['left', 'left', 'left', 'left', 'left', 'right']
  HDRS.forEach((h, i) => t(h, CX[i], y + 5.5, { align: ALIGNS[i] }))
  y += 10

  orders.forEach((order, idx) => {
    if (y > 265) { doc.addPage(); y = 20 }
    if (idx % 2 === 0) {
      doc.setFillColor(250, 248, 244); doc.rect(M, y - 2, W - M * 2, 8.5, 'F')
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(40, 35, 30)
    const itemStr = (order.items || []).map(i => `${i.qty}x ${i.name}`).join(', ')
    const clipped = itemStr.length > 22 ? itemStr.slice(0, 22) + '...' : itemStr
    const grand   = (Number(order.total) || 0) + (Number(order.tax) || 0)
    t(order.orderId || '—',                          CX[0], y + 3.5)
    t(order.table   || '—',                          CX[1], y + 3.5)
    t((order.customerName || '—').slice(0, 12),      CX[2], y + 3.5)
    t(clipped,                                       CX[3], y + 3.5)
    const sc = { done:[34,197,94], preparing:[96,165,250], pending:[250,204,21] }[order.status] || [100,100,100]
    doc.setTextColor(...sc)
    t(order.status || '—', CX[4], y + 3.5)
    doc.setTextColor(40, 35, 30)
    t(fmtPDF(grand), CX[5], y + 3.5, { align: 'right' })
    y += 8.5
  })

  const pH = doc.internal.pageSize.getHeight()
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(160, 150, 140)
  t(`Generated: ${new Date().toLocaleString('en-IN')}`, W / 2, pH - 8, { align: 'center' })

  const fn = type === 'daily'
    ? `${restaurantName.replace(/\s+/g, '-')}-Daily-${new Date().toISOString().slice(0, 10)}.pdf`
    : `${restaurantName.replace(/\s+/g, '-')}-Monthly-${new Date().toISOString().slice(0, 7)}.pdf`
  doc.save(fn)
}
