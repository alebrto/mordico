import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCOP, num, localDateISO as todayISO } from '../lib/financials'
import { Pencil, Trash2, X } from 'lucide-react'

export default function Gastos() {
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ fecha: todayISO(), concepto: '', valor: '', tipo: 'Variable' })

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('gastos').select('*').order('fecha', { ascending: false })
    setGastos(data || [])
    setLoading(false)
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ fecha: todayISO(), concepto: '', valor: '', tipo: 'Variable' })
    setModalOpen(true)
  }

  function abrirEditar(g) {
    setEditando(g)
    setForm({ fecha: g.fecha, concepto: g.concepto, valor: g.valor, tipo: g.tipo })
    setModalOpen(true)
  }

  async function guardar(e) {
    e.preventDefault()
    const payload = { fecha: form.fecha, concepto: form.concepto, valor: Number(form.valor), tipo: form.tipo }
    if (editando) {
      await supabase.from('gastos').update(payload).eq('id', editando.id)
    } else {
      const { data: userData } = await supabase.auth.getUser()
      await supabase.from('gastos').insert({ ...payload, user_id: userData.user.id })
    }
    setModalOpen(false)
    cargar()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este gasto?')) return
    await supabase.from('gastos').delete().eq('id', id)
    cargar()
  }

  const mesActual = todayISO().slice(0, 7)
  const gastosDelMes = gastos.filter((g) => g.fecha.startsWith(mesActual))
  const totalFijos = gastosDelMes.filter((g) => g.tipo === 'Fijo').reduce((a, g) => a + num(g.valor), 0)
  const totalVariables = gastosDelMes.filter((g) => g.tipo === 'Variable').reduce((a, g) => a + num(g.valor), 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900">Gastos</h1>
        <button onClick={abrirNuevo} className="btn-primary">
          + Registrar gasto
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-xs font-semibold text-gray-400 uppercase">Gastos fijos del mes</p>
          <p className="text-xl font-extrabold text-gray-900">{formatCOP(totalFijos)}</p>
        </div>
        <div className="card">
          <p className="text-xs font-semibold text-gray-400 uppercase">Gastos variables del mes</p>
          <p className="text-xl font-extrabold text-gray-900">{formatCOP(totalVariables)}</p>
        </div>
        <div className="card">
          <p className="text-xs font-semibold text-gray-400 uppercase">Total general</p>
          <p className="text-xl font-extrabold text-mordisco">{formatCOP(totalFijos + totalVariables)}</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="font-bold text-gray-900 mb-4">Historial</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Cargando…</p>
        ) : gastos.length === 0 ? (
          <p className="text-sm text-gray-400">No hay gastos registrados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Concepto</th>
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Valor</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 pr-4 text-gray-500">{g.fecha}</td>
                  <td className="py-3 pr-4 font-medium text-gray-800">{g.concepto}</td>
                  <td className="py-3 pr-4">
                    <span className={`badge ${g.tipo === 'Fijo' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {g.tipo}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-semibold">{formatCOP(g.valor)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => abrirEditar(g)} className="text-gray-400 hover:text-mordisco">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => eliminar(g.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-sm relative">
            <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <X size={18} />
            </button>
            <h2 className="font-bold text-lg text-gray-900 mb-4">{editando ? 'Editar gasto' : 'Registrar gasto'}</h2>
            <form onSubmit={guardar} className="flex flex-col gap-4">
              <div>
                <label className="label-field">Fecha</label>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                />
              </div>
              <div>
                <label className="label-field">Concepto</label>
                <input
                  required
                  className="input-field"
                  value={form.concepto}
                  onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                  placeholder="Ej: Compra de harina"
                />
              </div>
              <div>
                <label className="label-field">Valor</label>
                <input
                  type="number"
                  min="0"
                  required
                  className="input-field"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                />
              </div>
              <div>
                <label className="label-field">Tipo</label>
                <select
                  className="input-field"
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                >
                  <option value="Fijo">Fijo</option>
                  <option value="Variable">Variable</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full">
                Guardar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
