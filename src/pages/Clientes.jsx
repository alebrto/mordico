import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCOP } from '../lib/financials'
import { Pencil, Trash2, Plus, X } from 'lucide-react'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [ventasPorCliente, setVentasPorCliente] = useState({})
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ nombre: '', telefono: '' })

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    const { data: cl } = await supabase.from('clientes').select('*').order('nombre')
    const { data: ventas } = await supabase.from('ventas').select('*')

    const resumen = {}
    ;(ventas || []).forEach((v) => {
      if (!resumen[v.cliente_id]) {
        resumen[v.cliente_id] = { empanadas: 0, deuda: 0, totalHistorico: 0, ultimaCompra: null, totalPagos: 0, totalVentas: 0 }
      }
      const r = resumen[v.cliente_id]
      r.empanadas += v.cantidad
      r.deuda += v.saldo
      r.totalHistorico += v.total
      r.totalPagos += v.abonado
      r.totalVentas += v.total
      if (!r.ultimaCompra || v.fecha > r.ultimaCompra) r.ultimaCompra = v.fecha
    })

    setVentasPorCliente(resumen)
    setClientes(cl || [])
    setLoading(false)
    void userData
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ nombre: '', telefono: '' })
    setModalOpen(true)
  }

  function abrirEditar(cliente) {
    setEditando(cliente)
    setForm({ nombre: cliente.nombre, telefono: cliente.telefono || '' })
    setModalOpen(true)
  }

  async function guardar(e) {
    e.preventDefault()
    const { data: userData } = await supabase.auth.getUser()
    if (editando) {
      await supabase.from('clientes').update({ nombre: form.nombre, telefono: form.telefono }).eq('id', editando.id)
    } else {
      await supabase.from('clientes').insert({
        nombre: form.nombre,
        telefono: form.telefono,
        user_id: userData.user.id,
      })
    }
    setModalOpen(false)
    cargar()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return
    await supabase.from('clientes').delete().eq('id', id)
    cargar()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900">Clientes</h1>
        <button onClick={abrirNuevo} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nuevo cliente
        </button>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-gray-400">Cargando…</p>
        ) : clientes.length === 0 ? (
          <p className="text-sm text-gray-400">Aún no hay clientes registrados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Teléfono</th>
                <th className="py-2 pr-4">Empanadas compradas</th>
                <th className="py-2 pr-4">Deuda</th>
                <th className="py-2 pr-4">Última compra</th>
                <th className="py-2 pr-4">Total histórico</th>
                <th className="py-2 pr-4">% cumplimiento pago</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => {
                const r = ventasPorCliente[c.id] || { empanadas: 0, deuda: 0, totalHistorico: 0, ultimaCompra: null, totalPagos: 0, totalVentas: 0 }
                const cumplimiento = r.totalVentas > 0 ? Math.round((r.totalPagos / r.totalVentas) * 100) : 100
                return (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 pr-4 font-medium text-gray-800">{c.nombre}</td>
                    <td className="py-3 pr-4 text-gray-500">{c.telefono || '—'}</td>
                    <td className="py-3 pr-4">{r.empanadas}</td>
                    <td className={`py-3 pr-4 font-semibold ${r.deuda > 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {formatCOP(r.deuda)}
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{r.ultimaCompra || '—'}</td>
                    <td className="py-3 pr-4">{formatCOP(r.totalHistorico)}</td>
                    <td className="py-3 pr-4">{cumplimiento}%</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => abrirEditar(c)} className="text-gray-400 hover:text-mordisco">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => eliminar(c.id)} className="text-gray-400 hover:text-red-500">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
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
            <h2 className="font-bold text-lg text-gray-900 mb-4">
              {editando ? 'Editar cliente' : 'Nuevo cliente'}
            </h2>
            <form onSubmit={guardar} className="flex flex-col gap-4">
              <div>
                <label className="label-field">Nombre</label>
                <input
                  required
                  className="input-field"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className="label-field">Teléfono</label>
                <input
                  className="input-field"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="Ej: 3001234567"
                />
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
