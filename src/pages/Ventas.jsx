import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { PARAMETROS, formatCOP, estadoVenta } from '../lib/financials'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Ventas() {
  const [clientes, setClientes] = useState([])
  const [ventas, setVentas] = useState([])
  const [filtroCliente, setFiltroCliente] = useState('')
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState({
    cliente_id: '',
    fecha: todayISO(),
    cantidad: '',
    precio_unitario: PARAMETROS.precioEmpanada,
    registrarAbono: false,
    valorAbonado: '',
  })

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setLoading(true)
    const { data: cl } = await supabase.from('clientes').select('*').order('nombre')
    const { data: v } = await supabase
      .from('ventas')
      .select('*, clientes(nombre)')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    setClientes(cl || [])
    setVentas(v || [])
    setLoading(false)
  }

  const cantidad = Number(form.cantidad) || 0
  const precio = Number(form.precio_unitario) || 0
  const totalCalculado = cantidad * precio
  const abonoCalculado = form.registrarAbono ? Number(form.valorAbonado) || 0 : 0

  async function guardarVenta(e) {
    e.preventDefault()
    if (!form.cliente_id || cantidad <= 0) return
    setGuardando(true)

    const { data: userData } = await supabase.auth.getUser()
    const estado = estadoVenta(totalCalculado, abonoCalculado)

    const { error } = await supabase.from('ventas').insert({
      user_id: userData.user.id,
      cliente_id: form.cliente_id,
      fecha: form.fecha,
      cantidad,
      precio_unitario: precio,
      abonado: abonoCalculado,
      estado,
    })

    setGuardando(false)
    if (!error) {
      setForm({
        cliente_id: '',
        fecha: todayISO(),
        cantidad: '',
        precio_unitario: PARAMETROS.precioEmpanada,
        registrarAbono: false,
        valorAbonado: '',
      })
      cargar()
    } else {
      alert('Error al guardar la venta: ' + error.message)
    }
  }

  const ventasFiltradas = filtroCliente
    ? ventas.filter((v) => v.cliente_id === filtroCliente)
    : ventas

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-gray-900">Ventas</h1>

      <div className="card">
        <h2 className="font-bold text-gray-900 mb-4">Registrar venta</h2>
        <form onSubmit={guardarVenta} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label-field">Cliente</label>
            <select
              required
              className="input-field"
              value={form.cliente_id}
              onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
            >
              <option value="">Selecciona un cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
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
            <label className="label-field">Cantidad</label>
            <input
              type="number"
              min="1"
              required
              className="input-field"
              value={form.cantidad}
              onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
            />
          </div>
          <div>
            <label className="label-field">Precio unitario</label>
            <input
              type="number"
              min="0"
              required
              className="input-field"
              value={form.precio_unitario}
              onChange={(e) => setForm({ ...form, precio_unitario: e.target.value })}
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex flex-col gap-3 pt-2 border-t border-gray-100">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={form.registrarAbono}
                onChange={(e) => setForm({ ...form, registrarAbono: e.target.checked })}
                className="rounded border-gray-300 text-mordisco focus:ring-mordisco"
              />
              Registrar abono inicial
            </label>

            {form.registrarAbono && (
              <div className="max-w-xs">
                <label className="label-field">Valor abonado</label>
                <input
                  type="number"
                  min="0"
                  max={totalCalculado}
                  className="input-field"
                  value={form.valorAbonado}
                  onChange={(e) => setForm({ ...form, valorAbonado: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between bg-beige rounded-xl px-4 py-3">
            <div className="text-sm text-gray-600">
              Total: <span className="font-bold text-gray-900">{formatCOP(totalCalculado)}</span>
              {' · '}
              Saldo: <span className="font-bold text-gray-900">{formatCOP(totalCalculado - abonoCalculado)}</span>
              {' · '}
              Estado: <span className="font-semibold">{estadoVenta(totalCalculado, abonoCalculado)}</span>
            </div>
            <button type="submit" disabled={guardando} className="btn-primary">
              {guardando ? 'Guardando…' : 'Guardar venta'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Historial de ventas</h2>
          <select
            className="input-field max-w-xs"
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
          >
            <option value="">Todos los clientes</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Cargando…</p>
        ) : ventasFiltradas.length === 0 ? (
          <p className="text-sm text-gray-400">No hay ventas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">Cliente</th>
                  <th className="py-2 pr-4">Cantidad</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Abonado</th>
                  <th className="py-2 pr-4">Saldo</th>
                  <th className="py-2 pr-4">Estado</th>
                </tr>
              </thead>
              <tbody>
                {ventasFiltradas.map((v) => (
                  <tr key={v.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 pr-4 text-gray-500">{v.fecha}</td>
                    <td className="py-3 pr-4 font-medium text-gray-800">{v.clientes?.nombre || '—'}</td>
                    <td className="py-3 pr-4">{v.cantidad}</td>
                    <td className="py-3 pr-4">{formatCOP(v.total)}</td>
                    <td className="py-3 pr-4">{formatCOP(v.abonado)}</td>
                    <td className="py-3 pr-4 font-semibold">{formatCOP(v.saldo)}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`badge ${
                          v.estado === 'Pagado'
                            ? 'bg-green-100 text-green-700'
                            : v.estado === 'Abono parcial'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {v.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
