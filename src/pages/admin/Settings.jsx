// src/pages/admin/Settings.jsx

import { useState, useEffect, useCallback } from 'react'
import { useConfig }        from '../../hooks/useConfig'
import { MiniSpinner }      from '../../components/Spinner'
import { QRCodeCanvas }     from 'qrcode.react'
import { generateQRPDF }    from '../../utils/generatePDF'

const FIELDS = [
  { key: 'restaurant_name', label: 'Restaurant Name',  placeholder: 'Bella Cucina',       type: 'text' },
  { key: 'tagline',         label: 'Tagline',          placeholder: 'Authentic Italian…',  type: 'text' },
  { key: 'address',         label: 'Address',          placeholder: '12 MG Road, Mumbai',  type: 'text' },
  { key: 'phone',           label: 'Phone',            placeholder: '+91 98765 43210',      type: 'text' },
  { key: 'gst_number',      label: 'GST Number',       placeholder: '27AABCU9603R1ZX',     type: 'text' },
]

function Toast({ msg }) {
  if (!msg) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-card border border-border
                    rounded-xl text-bright text-sm font-body shadow-lifted animate-slide-up">
      {msg}
    </div>
  )
}

export default function Settings() {
  const { config, loading, saveConfig } = useConfig()
  const [form,   setForm]   = useState({})
  const [taxPct, setTaxPct] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast,  setToast]  = useState('')

  useEffect(() => {
    if (!loading) {
      setForm({
        restaurant_name: config.restaurant_name || '',
        tagline:         config.tagline         || '',
        address:         config.address         || '',
        phone:           config.phone           || '',
        gst_number:      config.gst_number      || '',
      })
      // CRITICAL FIX: use ?? not || — so 0 is preserved as '0', not overridden to '8'
      setTaxPct(String(config.tax_percentage ?? 0))
    }
  }, [loading, config])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleSave = async (e) => {
    e.preventDefault()
    const taxVal = parseFloat(taxPct)
    if (isNaN(taxVal) || taxVal < 0 || taxVal > 100) {
      showToast('❌ Tax must be between 0 and 100')
      return
    }
    setSaving(true)
    try {
      await saveConfig({ ...form, tax_percentage: taxVal })
      showToast('✓ Settings saved — reflected everywhere instantly')
    } catch (err) {
      showToast('❌ ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <Toast msg={toast} />

      <div>
        <h2 className="section-title text-xl">Settings</h2>
        <p className="text-mid text-xs mt-0.5">
          Stored in Supabase · Reflected in UI, invoices, and PDFs automatically
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Restaurant Info */}
        <div className="card p-6 space-y-4">
          <h3 className="section-title text-base">Restaurant Info</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FIELDS.map(f => (
              <div key={f.key} className={f.key === 'address' ? 'sm:col-span-2' : ''}>
                <label className="label">{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="input"
                  disabled={loading}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Tax Rate */}
        <div className="card p-6 space-y-4">
          <h3 className="section-title text-base">Tax / GST Rate</h3>
          <p className="text-mid text-xs">Applied to every order at checkout. Set 0 for no tax.</p>

          <div className="flex gap-3 items-center">
            <input
              type="number"
              value={taxPct}
              onChange={e => setTaxPct(e.target.value)}
              min="0" max="100" step="0.1"
              placeholder="0"
              className="input max-w-[120px]"
              disabled={loading}
            />
            <span className="text-mid text-sm font-body">%</span>
          </div>

          {taxPct !== '' && !isNaN(taxPct) && (
            <div className="bg-raised rounded-xl p-4 space-y-2 border border-border text-sm font-body">
              <p className="text-mid text-xs uppercase tracking-wide font-semibold mb-2">
                Live Preview — ₹1,000 order
              </p>
              <div className="flex justify-between text-mid">
                <span>Subtotal</span>
                <span className="text-bright">₹1,000.00</span>
              </div>
              <div className="flex justify-between text-mid">
                <span>Tax ({taxPct}%)</span>
                <span className="text-bright">
                  ₹{(1000 * parseFloat(taxPct || 0) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-semibold border-t border-border pt-2">
                <span className="text-bright">Total</span>
                <span className="text-amber">
                  ₹{(1000 + 1000 * parseFloat(taxPct || 0) / 100).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <button type="submit" disabled={saving || loading} className="btn-amber py-3 px-8">
          {saving ? <><MiniSpinner /> Saving…</> : '✓ Save All Settings'}
        </button>
      </form>

      {/* QR Codes */}
      <div className="card p-6">
        <h3 className="section-title text-base mb-1">Table QR Codes</h3>
        <p className="text-mid text-xs mb-5">
          Scan to open menu. Download as PNG (individual) or PDF (all tables, print-ready).
        </p>
        <TableQRGrid restaurantName={config.restaurant_name || 'TableServe'} />
      </div>
    </div>
  )
}

function TableQRGrid({ restaurantName }) {
  const [count,       setCount]       = useState(8)
  const [downloading, setDownloading] = useState(null)
  const [pdfLoading,  setPdfLoading]  = useState(false)

  const base = typeof window !== 'undefined' ? window.location.origin : 'https://yoursite.com'

  const downloadQR = useCallback((tableNum) => {
    setDownloading(tableNum)
    try {
      const canvas = document.getElementById(`qr-canvas-${tableNum}`)
      if (!canvas) return

      const padded   = document.createElement('canvas')
      const size     = 240   // higher res
      const pad      = 24
      const labelH   = 36
      padded.width   = size + pad * 2
      padded.height  = size + pad * 2 + labelH

      const ctx = padded.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, padded.width, padded.height)
      ctx.drawImage(canvas, pad, pad, size, size)
      ctx.fillStyle = '#1a1a1a'
      ctx.font      = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`Table ${tableNum}`, padded.width / 2, size + pad + labelH - 10)
      ctx.font      = '11px sans-serif'
      ctx.fillStyle = '#888'
      ctx.fillText(`${base}/?table=${tableNum}`, padded.width / 2, size + pad + labelH - 0)

      const link    = document.createElement('a')
      link.download = `Table-${tableNum}-QR.png`
      link.href     = padded.toDataURL('image/png')
      link.click()
    } finally {
      setTimeout(() => setDownloading(null), 600)
    }
  }, [base])

  const downloadAllPNG = useCallback(() => {
    const cols   = 4
    const rows   = Math.ceil(count / cols)
    const qrSize = 180
    const pad    = 18
    const labelH = 32
    const cellW  = qrSize + pad * 2
    const cellH  = qrSize + pad * 2 + labelH

    const combined = document.createElement('canvas')
    combined.width  = cellW * cols
    combined.height = cellH * rows

    const ctx = combined.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, combined.width, combined.height)

    for (let t = 1; t <= count; t++) {
      const canvas = document.getElementById(`qr-canvas-${t}`)
      if (!canvas) continue
      const col = (t - 1) % cols
      const row = Math.floor((t - 1) / cols)
      ctx.drawImage(canvas, col * cellW + pad, row * cellH + pad, qrSize, qrSize)
      ctx.fillStyle = '#1a1a1a'
      ctx.font      = 'bold 14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`Table ${t}`, col * cellW + pad + qrSize / 2, row * cellH + pad + qrSize + 22)
    }

    const link    = document.createElement('a')
    link.download = 'All-Table-QRCodes.png'
    link.href     = combined.toDataURL('image/png')
    link.click()
  }, [count])

  // NEW: Download all QRs as a proper PDF
  const downloadAllPDF = useCallback(async () => {
    setPdfLoading(true)
    try {
      await generateQRPDF({ tableCount: count, baseUrl: base, restaurantName })
    } catch (err) {
      console.error('QR PDF error:', err)
    } finally {
      setPdfLoading(false)
    }
  }, [count, base, restaurantName])

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <label className="label mb-0 whitespace-nowrap">Tables:</label>
          <input type="number" value={count} min="1" max="50"
                 onChange={e => setCount(Math.max(1, Math.min(50, Number(e.target.value))))}
                 className="input w-20" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={downloadAllPNG}
                  className="btn-ghost text-sm py-2 px-4 flex items-center gap-1.5">
            ⬇️ All PNG
          </button>
          <button onClick={downloadAllPDF} disabled={pdfLoading}
                  className="btn-amber text-sm py-2 px-4 flex items-center gap-1.5">
            {pdfLoading ? <><MiniSpinner /> PDF…</> : '📄 All as PDF'}
          </button>
        </div>
      </div>

      {/* QR Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: count }, (_, i) => i + 1).map(t => (
          <div key={t} className="bg-raised border border-border rounded-xl p-3 text-center space-y-2">
            <p className="text-mid text-[10px] font-body uppercase tracking-widest">Table {t}</p>

            <div className="bg-white p-2 rounded-lg inline-block">
              <QRCodeCanvas
                id={`qr-canvas-${t}`}
                value={`${base}/?table=${t}`}
                size={120}
                bgColor="#ffffff"
                fgColor="#0e0e10"
                level="H"    // High error correction for print quality
              />
            </div>

            <p className="text-faint text-[9px] break-all">?table={t}</p>

            <button onClick={() => downloadQR(t)} disabled={downloading === t}
                    className="w-full py-1.5 rounded-lg text-xs font-body font-semibold
                               bg-amber/10 border border-amber/25 text-amber
                               hover:bg-amber/20 transition-all active:scale-95
                               disabled:opacity-50 flex items-center justify-center gap-1">
              {downloading === t ? '…' : '⬇️ PNG'}
            </button>
          </div>
        ))}
      </div>

      <p className="text-faint text-xs">
        Use <strong className="text-mid">📄 All as PDF</strong> for a print-ready sheet.
        Use <strong className="text-mid">⬇️ PNG</strong> for individual tables.
      </p>
    </div>
  )
}
