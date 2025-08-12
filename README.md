import React, { useState, useRef } from 'react'

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

  function generateLocalTitles(seed) {
    const power = ['Increíble', 'Impresionante', 'Secreto', 'Asombroso', 'Impactante']
    const hooks = [
      `Los ${seed} que no conocías`,
      `Cómo ${seed} en 5 pasos`,
      `Top 5 ${seed} que sorprenden`,
      `${seed}: Guía completa y consejos`,
      `¿Por qué ${seed} está cambiando TODO?`
    ]
    return hooks.map((h, i) => `${power[i % power.length]} — ${h}`)
  }

  async function onGenerate(e) {
    e?.preventDefault()
    setError(null)
    if (!idea.trim()) return setError('Escribe primero una idea o tema.')
    setLoading(true)
    try {
      const local = generateLocalTitles(idea.trim())
      setTitles(local)
      const resp = await fetch(`/api/youtubeSuggest?q=${encodeURIComponent(idea.trim())}`)
      if (resp.ok) {
        const json = await resp.json()
        setSuggestions(json.suggestions || [])
      } else {
        setSuggestions([])
      }
      const prompt = `Miniatura futurista para video sobre "${idea.trim()}"; estilo: neón, luces brillantes, contraste alto, fondo desenfocado futurista, texto grande y legible.`
      setThumbPrompt(prompt)
      setThumbText(idea.trim())
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

    const gradientBg = ctx.createLinearGradient(0, 0, w, h)
    gradientBg.addColorStop(0, '#0f2027')
    gradientBg.addColorStop(0.5, '#203a43')
    gradientBg.addColorStop(1, '#2c5364')
    ctx.fillStyle = gradientBg
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
    ctx.beginPath()
    ctx.arc(w * 0.3, h * 0.4, 200, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(w * 0.7, h * 0.6, 300, 0, Math.PI * 2)
    ctx.fill()

    drawThumbText(ctx, mainText, w, h)
  }

  function drawThumbText(ctx, text, w, h) {
    const short = text.length > 25 ? text.slice(0, 25) + '...' : text
    ctx.font = 'bold 72px sans-serif'
    ctx.fillStyle = 'white'
    ctx.textAlign = 'left'
    ctx.shadowColor = 'rgba(0,0,0,0.9)'
    ctx.shadowBlur = 16
    ctx.fillText(short.toUpperCase(), 80, h - 160)

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
    <div className="p-6 max-w-6xl mx-auto bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-xl shadow-2xl">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold text-white">Generador SEO de Títulos, Keywords y Miniaturas</h1>
        <p className="text-sm text-gray-400">Escribe tu idea y obtén títulos optimizados, sugerencias de búsqueda en YouTube y una miniatura futurista.</p>
      </header>

      <form onSubmit={onGenerate} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-white">Idea / Tema</label>
          <input value={idea} onChange={e => setIdea(e.target.value)} className="mt-1 block w-full rounded p-3 border border-gray-700 bg-gray-900 text-white" placeholder="Ej: insectos venenosos del Amazonas" />
          <div className="flex gap-2 mt-3">
            <button disabled={loading} className="px-4 py-2 rounded bg-indigo-600 text-white">Generar</button>
            <button type="button" onClick={() => { setIdea(''); setTitles([]); setSuggestions([]); setThumbPrompt(''); }} className="px-4 py-2 rounded border border-gray-600 text-white">Limpiar</button>
            <input type="file" accept="image/*" onChange={onImageUpload} className="ml-auto text-white" />
          </div>
          {error && <p className="text-red-400 mt-2">{error}</p>}
        </div>

        <div className="p-4 border border-gray-700 rounded bg-gray-800">
          <h3 className="font-semibold text-white">Miniatura (preview)</h3>
          <canvas ref={canvasRef} width={1280} height={720} className="w-full mt-3 border border-gray-700" />
          <label className="block text-sm mt-3 text-white">Texto para miniatura</label>
          <input value={thumbText} onChange={e => { setThumbText(e.target.value); drawThumbnailPreview(e.target.value, bgImage) }} className="mt-1 block w-full rounded p-2 border border-gray-600 bg-gray-900 text-white" />
          <p className="text-xs text-gray-400 mt-2">Prompt para generación de imagen:</p>
          <textarea value={thumbPrompt} onChange={e => setThumbPrompt(e.target.value)} className="mt-1 w-full rounded p-2 border border-gray-600 bg-gray-900 text-sm text-white" rows={4} />
        </div>
      </form>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="p-4 border border-gray-700 rounded bg-gray-800">
          <h2 className="font-bold text-white">Títulos sugeridos (SEO)</h2>
          <ol className="list-decimal ml-5 mt-3 space-y-2 text-white">
            {titles.map((t, i) => (
              <li key={i} className="break-words">{t}</li>
            ))}
          </ol>
          <div className="mt-3 flex gap-2">
            <button onClick={copyTitlesToClipboard} className="px-3 py-1 rounded border border-gray-600 text-white">Copiar títulos</button>
            <button onClick={() => setTitles(generateLocalTitles(idea || 'Tema'))} className="px-3 py-1 rounded border border-gray-600 text-white">Regenerar local</button>
          </div>
        </div>

        <div className="p-4 border border-gray-700 rounded bg-gray-800">
          <h2 className="font-bold text-white">Sugerencias recientes de búsqueda en YouTube</h2>
          <ul className="mt-3 space-y-2 text-white">
            {suggestions.length ? suggestions.map((s, i) => (
              <li key={i} className="flex justify-between items-center">
                <span className="break-words">{s}</span>
                <button onClick={() => setTitles(prev => [ `¡${s}!: Guía completa`, ...prev.slice(0,4) ])} className="ml-3 px-2 py-1 rounded border border-gray-600 text-white text-xs">Usar</button>
              </li>
            )) : <li className="text-gray-400">No hay sugerencias — configura el backend.</li>}
          </ul>
        </div>
      </section>
    </div>
  )
}

