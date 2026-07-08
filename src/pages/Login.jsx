import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setInfo('Cuenta creada. Revisa tu correo para confirmar el acceso.')
      }
    } catch (err) {
      setError(err.message || 'Ocurrió un error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-beige flex items-center justify-center px-4">
      <div className="card w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-mordisco flex items-center justify-center text-white font-bold text-2xl mb-3">
            M
          </div>
          <h1 className="text-xl font-extrabold text-gray-900">Mordisco</h1>
          <p className="text-sm text-gray-400">Control de ventas</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label-field">Correo electrónico</label>
            <input
              type="email"
              required
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
            />
          </div>
          <div>
            <label className="label-field">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {info && <p className="text-sm text-green-600">{info}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Procesando…' : mode === 'signin' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </form>

        <button
          className="text-sm text-mordisco hover:underline mt-4 w-full text-center"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}
        </button>
      </div>
    </div>
  )
}
