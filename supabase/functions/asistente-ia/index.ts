// Edge Function: asistente-ia
// Despliega con: supabase functions deploy asistente-ia
// Configura el secreto con: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Esta función recibe { pregunta, contexto } desde el frontend y llama a la
// API de Anthropic de forma segura (la API key nunca se expone en el navegador).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { pregunta, contexto } = await req.json()

    const systemPrompt = `Eres el asistente financiero de "Mordisco", una fábrica de empanadas.
Respondes preguntas sobre ventas, cartera, gastos y proyecciones usando ÚNICAMENTE
los datos de contexto que se te entregan. Sé breve, concreto y usa pesos colombianos (COP).
Contexto actual del negocio (JSON): ${JSON.stringify(contexto)}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: pregunta }],
      }),
    })

    const data = await response.json()
    const respuesta = data.content?.map((c: { text?: string }) => c.text || '').join('\n') || 'No se pudo generar una respuesta.'

    return new Response(JSON.stringify({ respuesta }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ respuesta: 'Error: ' + (err as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
