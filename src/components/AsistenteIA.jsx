import { useState } from 'react'
import { Sparkles, Send } from 'lucide-react'

// Este componente envía la pregunta del usuario junto con un resumen de los
// datos del negocio a un endpoint propio (recomendado: una Edge Function de
// Supabase) que a su vez llama a la API de Anthropic con la API key segura
// en el servidor. NUNCA pongas tu API key de Anthropic en el frontend.
//
// Ejemplo de Edge Function: supabase/functions/asistente-ia/index.ts
// (ver README.md para el código completo de la función).

const ENDPOINT = import.meta.env.VITE_ASISTENTE_IA_ENDPOINT // ej: https://<proyecto>.functions.supabase.co/asistente-ia

export default function AsistenteIA({ contexto }) {
  const [pregunta, setPregunta] = useState('')
  const [respuesta, setRespuesta] = useState('')
  const [cargando, setCargando] = useState(false)
  const preguntasSugeridas = [
    '¿Por qué este mes ganamos menos?',
    '¿Cuántas empanadas faltan para el punto de equilibrio?',
    '¿Qué cliente tiene mayor riesgo de mora?',
    '¿Cuánto ganaríamos si vendemos 350 empanadas diarias?',
  ]

  async function preguntar(texto) {
    const q = texto ?? pregunta
    if (!q.trim()) return
    setPregunta(q)
    setCargando(true)
    setRespuesta('')

    if (!ENDPOINT) {
      setRespuesta(
        'El asistente IA aún no está configurado. Define VITE_ASISTENTE_IA_ENDPOINT en tu archivo .env apuntando a tu Edge Function de Supabase (ver README.md).'
      )
      setCargando(false)
      return
    }

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta: q, contexto }),
      })
      const data = await res.json()
      setRespuesta(data.respuesta || 'No se pudo generar una respuesta.')
    } catch (err) {
      setRespuesta('Error al contactar el asistente: ' + err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-mordisco" />
        <h2 className="font-bold text-gray-900">Asistente IA</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {preguntasSugeridas.map((p) => (
          <button
            key={p}
            onClick={() => preguntar(p)}
            className="text-xs bg-beige hover:bg-mordisco/10 text-gray-600 px-3 py-1.5 rounded-full"
          >
            {p}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          preguntar()
        }}
        className="flex items-center gap-2"
      >
        <input
          className="input-field"
          placeholder="Pregúntale algo al asistente…"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
        />
        <button type="submit" disabled={cargando} className="btn-primary flex items-center gap-2">
          <Send size={16} />
        </button>
      </form>

      {cargando && <p className="text-sm text-gray-400">Pensando…</p>}
      {respuesta && <p className="text-sm text-gray-700 bg-beige rounded-xl p-3 whitespace-pre-wrap">{respuesta}</p>}
    </div>
  )
}
