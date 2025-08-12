import React, { useState, useRef } from 'react'

/**
 * Generador SEO de Títulos y Miniaturas
 * Componente React (single-file) listo para integrarse en una app con Tailwind.
 * - Input: idea / tema
 * - Genera: 5 títulos optimizados (local algorithm)
 * - Obtiene: sugerencias recientes de búsqueda en YouTube (backend needed)
 * - Miniatura: genera un preview usando canvas y un prompt listo para IA
 *
 * INSTRUCCIONES DE INTEGRACIÓN RÁPIDA:
 * 1) Añade este componente a tu proyecto React (create-react-app o Next.js).
 * 2) Estilos: Tailwind CSS debe estar instalado y configurado.
 * 3) Endpoints backend esperados (puedes usar el ejemplo de Node/Express que incluyo abajo):
 *    - POST /api/generateTitles    { idea: string } -> returns { titles: string[] }
 *    - GET  /api/youtubeSuggest?q=... -> returns { suggestions: string[] }
 *    - (Opcional) POST /api/generateThumbnailImage -> para generar miniatura con un servicio de imágenes
 *
 * 4) Añade una API key en el backend si necesitas acceder a YouTube Data API o usar el endpoint de sugerencias.
 *
 * NOTAS SOBRE PRIVACIDAD Y LIMITACIONES:
 * - El endpoint oficial de "trending" de YouTube no entrega "keywords buscadas por usuarios" directamente.
 * - El backend puede usar la API no-oficial de autocompletado (suggestqueries.google.com) para obtener sugerencias.
 * - Para obtener datos más confiables considera integrar Google Trends o la YouTube Data API (requiere cuota).
 */

export default function SeoTitleThumbnailGenerator() {
  const [idea, setIdea] = useState('')
  const [titles, setTitles] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [thumbText, setThumbText] = useState('')
  const [thumbPrompt, setThumbPrompt] = useState('')
  const canvasRef = useRef(null)
  const [bgImage, setBgImage] = useState(null)

  // Local SEO title generator (algorithmic, no external API)
  function generateLocalTitles(seed) {
    // Simple heuristics: include power words, numbers, brackets, longtail variants
    const power = ['Increíble', 'Impresionante', 'Secreto', 'Asombroso', 'Impactante']
    const hooks = [
      `Los ${seed} que no conocías`,
      `Cómo ${seed} en 5 pasos`,
      `Top 5 ${seed} que sorprenden`,
      `${seed}: Guía completa y consejos`,
      `¿Por qué ${seed} está cambiando TODO?`
    ]

    // ensure seed appears and create variants
    const res = hooks.map((h, i) => {
      const p = power[i % power.length]
      return `${p} — ${h}`
    })
    return res
  }

  async function onGenerate(e) {
    e?.preventDefault()
    setError(null)
    if (!idea.trim()) return setError('Escribe primero una idea o tema.')

    setLoading(true)
    try {
      // 1. Local generation (fast immediate titles)
      const local = generateLocalTitles(idea.trim())
      setTitles(local)

      // 2. Fetch youtube suggestions from backend (recommended)
      // Backend endpoint: /api/youtubeSuggest?q=IDEA
      const resp = await fetch(`/api/youtubeSuggest?q=${encodeURIComponent(idea.trim())}`)
      if (resp.ok) {
        const json = await resp.json()
        setSuggestions(json.suggestions || [])
      } else {
        // If backend not configured, we handle gracefully
        setSuggestions([])
      }

      // 3. Build a thumbnail prompt automatically
      const prompt = `Miniatura para video sobre "${idea.trim()}"; estilo: vibrante, contraste alto, texto grande y legible, incluye un primer plano del tema o un insecto/animal (si aplica), usar colores saturados y un gancho emocional (ej: \"No creerás esto\"). Añadir caja de texto para el título corto.`
      setThumbPrompt(prompt)
      setThumbText(idea.trim())

      // draw a placeholder thumbnail
      drawThumbnailPreview(idea.trim(), null)

    } catch (err) {
      console.error(err)
      setError('Error generando. Revisa la consola y el backend.')
    }
    setLoading(false)
  }

  function drawThumbnailPreview(mainText, imageDataUrl) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width = 1280
    const h = canvas.height = 720

    // Background
    if (imageDataUrl) {
      const img = new Image()
      img.onload = () => {
        // draw blurred background
        ctx.drawImage(img, 0, 0, w, h)
        // overlay dark gradient
        const g = ctx.createLinearGradient(0, 0, 0, h)
        g.addColorStop(0, 'rgba(0,0,0,0.15)')
        g.addColorStop(1, 'rgba(0,0,0,0.5)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)
        // text
        drawThumbText(ctx, mainText, w, h)
      }
      img.src = imageDataUrl
    } else {
      // placeholder gradient
      const g = ctx.createLinearGradient(0, 0, w, h)
      g.addColorStop(0, '#1f2937')
      g.addColorStop(1, '#111827')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      // big accent shape
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      ctx.fillRect(w - 540, 60, 480, 600)
      drawThumbText(ctx, mainText, w, h)
    }
  }

  function drawThumbText(ctx, text, w, h) {
    // Title short
    const short = text.length > 25 ? text.slice(0, 25) + '...' : text
    ctx.font = 'bold 72px sans-serif'
    ctx.fillStyle = 'white'
    ctx.textAlign = 'left'
    // shadow
    ctx.shadowColor = 'rgba(0,0,0,0.8)'
    ctx.shadowBlur = 12
    ctx.fillText(short.toUpperCase(), 80, h - 160)

    // small subtitle
    ctx.font = '600 36px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillText('¡No te lo pierdas!', 80, h - 100)
  }

  function onImageUpload(ev) {
    const file = ev.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setBgImage(reader.result)
      drawThumbnailPreview(idea.trim() || 'TEMA', reader.result)
    }
    reader.readAsDataURL(file)
  }

  async function copyTitlesToClipboard() {
    const text = titles.join('\n')
    await navigator.clipboard.writeText(text)
    alert('Títulos copiados al portapapeles')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold">Generador SEO de Títulos, Keywords y Miniaturas</h1>
        <p className="text-sm text-slate-400">Escribe tu idea y obtén títulos optimizados, sugerencias de búsqueda en YouTube y una miniatura de preview.</p>
      </header>

      <form onSubmit={onGenerate} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">Idea / Tema</label>
          <input value={idea} onChange={e => setIdea(e.target.value)} className="mt-1 block w-full rounded p-3 border" placeholder="Ej: insectos venenosos del Amazonas" />
          <div className="flex gap-2 mt-3">
            <button disabled={loading} className="px-4 py-2 rounded bg-indigo-600 text-white">Generar</button>
            <button type="button" onClick={() => { setIdea(''); setTitles([]); setSuggestions([]); setThumbPrompt(''); }} className="px-4 py-2 rounded border">Limpiar</button>
            <input type="file" accept="image/*" onChange={onImageUpload} className="ml-auto" />
          </div>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>

        <div className="p-4 border rounded">
          <h3 className="font-semibold">Miniatura (preview)</h3>
          <canvas ref={canvasRef} width={1280} height={720} className="w-full mt-3 border" />
          <label className="block text-sm mt-3">Texto para miniatura</label>
          <input value={thumbText} onChange={e => { setThumbText(e.target.value); drawThumbnailPreview(e.target.value, bgImage) }} className="mt-1 block w-full rounded p-2 border" />
          <p className="text-xs text-slate-400 mt-2">Prompt para generación de imagen:</p>
          <textarea value={thumbPrompt} onChange={e => setThumbPrompt(e.target.value)} className="mt-1 w-full rounded p-2 border text-sm" rows={4} />
        </div>
      </form>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="p-4 border rounded">
          <h2 className="font-bold">Títulos sugeridos (SEO)</h2>
          <ol className="list-decimal ml-5 mt-3 space-y-2">
            {titles.map((t, i) => (
              <li key={i} className="break-words">{t}</li>
            ))}
          </ol>
          <div className="mt-3 flex gap-2">
            <button onClick={copyTitlesToClipboard} className="px-3 py-1 rounded border">Copiar títulos</button>
            <button onClick={() => setTitles(generateLocalTitles(idea || 'Tema'))} className="px-3 py-1 rounded border">Regenerar local</button>
          </div>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-bold">Sugerencias recientes de búsqueda en YouTube</h2>
          <p className="text-sm text-slate-500">(Se muestran resultados obtenidos desde el backend. Si no ves nada, configura el endpoint /api/youtubeSuggest)</p>
          <ul className="mt-3 space-y-2">
            {suggestions.length ? suggestions.map((s, i) => (
              <li key={i} className="flex justify-between items-center">
                <span className="break-words">{s}</span>
                <button onClick={() => setTitles(prev => [ `¡${s}!: Guía completa`, ...prev.slice(0,4) ])} className="ml-3 px-2 py-1 rounded border text-xs">Usar</button>
              </li>
            )) : <li className="text-slate-400">No hay sugerencias — configura el backend o revisa la consola.</li>}
          </ul>
        </div>
      </section>

      <footer className="mt-6 text-sm text-slate-500">Savage Planet — Generador de contenido v1.0</footer>
    </div>
  )
}


/* ------------------------------------------------------------------
   EJEMPLO DE BACKEND (Node.js / Express)
   Guarda en: server.js
   - Este ejemplo usa el endpoint de autocompletado de Google para YouTube:
     https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=...&hl=es
   - NO es oficial; úsalo con precaución. Alternativa: YouTube Data API + queries + Trends.

   npm install express node-fetch

------------------------------------------------------------------- */

/*
const express = require('express')
const fetch = require('node-fetch')
const app = express()
app.use(express.json())

// CORS si lo necesitas
const cors = require('cors')
app.use(cors())

app.get('/api/youtubeSuggest', async (req, res) => {
  try {
    const q = req.query.q || ''
    if (!q) return res.json({ suggestions: [] })
    const url = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&hl=es&q=${encodeURIComponent(q)}`
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const text = await r.text()
    // Response is like: window.google.ac.h([...]) or a JSONP-like array
    // Many times it's plain JSON; try parse
    let parsed = null
    try { parsed = JSON.parse(text) } catch (e) {
      // fallback: extract JSON array
      const m = text.match(/^(?:window\.google\.ac\.h\()?(.+?)(?:\);)?$/)
      if (m) parsed = JSON.parse(m[1])
    }
    const suggestions = (parsed && parsed[1]) ? parsed[1].map(x => Array.isArray(x) ? x[0] : x) : []
    res.json({ suggestions })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'failed' })
  }
})

app.post('/api/generateTitles', (req, res) => {
  const { idea } = req.body
  if (!idea) return res.status(400).json({ error: 'no idea' })
  // replicate the local algorithm server-side if desired
  const titles = [
    `Increíble — Los ${idea} que no conocías`,
    `Cómo ${idea} en 5 pasos`,
    `Top 5 ${idea} que sorprenden`,
    `${idea}: Guía completa y consejos`,
    `¿Por qué ${idea} está cambiando TODO?`
  ]
  res.json({ titles })
})

app.listen(3001, () => console.log('API listening on 3001'))
*/
