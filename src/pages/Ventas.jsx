import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { PARAMETROS, formatCOP, estadoVenta } from '../lib/financials'
import ClienteBuscador from '../components/ClienteBuscador'
import { Pencil, Trash2, X } from 'lucide-react'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const FORM_VACIO = {
  cliente_id: '',
  fecha: todayISO(),
  cantidad: '',
  precio_unitario: PARAMETROS.precioEmpanada,
  registrarAbono: false,
  valorAbonado: '',
}

export default function Ventas() {
  const [clientes, setClientes] = useState([])
  const [ventas, setVentas] = useState([])
  const [filtroCliente, setFiltroCliente] = useState('')
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState(FORM_VACIO)

  // Edición de una venta existente
  const [modalEditar, setModalEditar] = useState(null)
  const [formEdit, setFormEdit] = useState(null)

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

  const payload = {
    user_id: userData.user.id,
    cliente_id: form.cliente_id,
    fecha: form.fecha,
    cantidad,
    precio_unitario: precio,
    total: totalCalculado,
    abonado: abonoCalculado,
    saldo: totalCalculado - abonoCalculado,
    estado,
  }

  console.log("Payload enviado:", payload)

  const { error } = await supabase
    .from("ventas")
    .insert([payload])

  setGuardando(false)

  if (error) {
    console.error(error)
    alert("Error al guardar la venta: " + error.message)
    return
  }

  setForm({
    ...FORM_VACIO,
    fecha: todayISO(),
  })

  cargar()
}

async function guardarEdicion(e) {
  e.preventDefault()

  if (!formEdit.cliente_id || Number(formEdit.cantidad) <= 0) return

  const cantidadEd = Number(formEdit.cantidad)
  const precioEd = Number(formEdit.precio_unitario)
  const abonadoEd = Number(formEdit.abonado)

  const totalEd = cantidadEd * precioEd
  const saldoEd = totalEd - abonadoEd
  const estadoEd = estadoVenta(totalEd, abonadoEd)

  const { error } = await supabase
    .from("ventas")
    .update({
      cliente_id: formEdit.cliente_id,
      fecha: formEdit.fecha,
      cantidad: cantidadEd,
      precio_unitario: precioEd,
      total: totalEd,
      abonado: abonadoEd,
      saldo: saldoEd,
      estado: estadoEd,
    })
    .eq("id", modalEditar.id)

  if (error) {
    alert("Error al actualizar la venta: " + error.message)
    return
  }

  setModalEditar(null)
  setFormEdit(null)

  cargar()
}

  async function eliminarVenta(venta) {
    if (
      !confirm(
        `¿Eliminar la venta de ${venta.clientes?.nombre || 'este cliente'} del ${venta.fecha}? Esta acción no se puede deshacer y también borrará los abonos asociados.`
      )
    )
      return
    const { error } = await supabase.from('ventas').delete().eq('id', venta.id)
    if (!error) cargar()
    else alert('Error al eliminar: ' + error.message)
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
            <ClienteBuscador
              clientes={clientes}
              value={form.cliente_id}
              onChange={(id) => setForm({ ...form, cliente_id: id })}
              placeholder="Buscar cliente…"
            />
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
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <h2 className="font-bold text-gray-900">Historial de ventas</h2>
          <div className="w-full max-w-xs">
            <ClienteBuscador
              clientes={clientes}
              value={filtroCliente}
              onChange={setFiltroCliente}
              allowEmpty
              placeholder="Filtrar por cliente…"
            />
          </div>
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
                  <th className="py-2 pr-4"></th>
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
                        className={`badge ${v.estado === 'Pagado'
                            ? 'bg-green-100 text-green-700'
                            : v.estado === 'Abono parcial'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                      >
                        {v.estado}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => abrirEditar(v)} className="text-gray-400 hover:text-mordisco">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => eliminarVenta(v)} className="text-gray-400 hover:text-red-500">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalEditar && formEdit && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-md relative">
            <button
              onClick={() => {
                setModalEditar(null)
                setFormEdit(null)
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X size={18} />
            </button>
            <h2 className="font-bold text-lg text-gray-900 mb-4">Editar venta</h2>
            <form onSubmit={guardarEdicion} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label-field">Cliente</label>
                <ClienteBuscador
                  clientes={clientes}
                  value={formEdit.cliente_id}
                  onChange={(id) => setFormEdit({ ...formEdit, cliente_id: id })}
                />
              </div>
              <div>
                <label className="label-field">Fecha</label>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={formEdit.fecha}
                  onChange={(e) => setFormEdit({ ...formEdit, fecha: e.target.value })}
                />
              </div>
              <div>
                <label className="label-field">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="input-field"
                  value={formEdit.cantidad}
                  onChange={(e) => setFormEdit({ ...formEdit, cantidad: e.target.value })}
                />
              </div>
              <div>
                <label className="label-field">Precio unitario</label>
                <input
                  type="number"
                  min="0"
                  required
                  className="input-field"
                  value={formEdit.precio_unitario}
                  onChange={(e) => setFormEdit({ ...formEdit, precio_unitario: e.target.value })}
                />
              </div>
              <div>
                <label className="label-field">Abonado</label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  value={formEdit.abonado}
                  onChange={(e) => setFormEdit({ ...formEdit, abonado: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2 bg-beige rounded-xl px-4 py-3 text-sm text-gray-600">
                Nuevo total:{' '}
                <span className="font-bold text-gray-900">
                  {formatCOP(Number(formEdit.cantidad || 0) * Number(formEdit.precio_unitario || 0))}
                </span>
                {' · '}
                Nuevo saldo:{' '}
                <span className="font-bold text-gray-900">
                  {formatCOP(
                    Number(formEdit.cantidad || 0) * Number(formEdit.precio_unitario || 0) -
                    Number(formEdit.abonado || 0)
                  )}
                </span>
              </div>

              <button type="submit" className="btn-primary sm:col-span-2 w-full">
                Guardar cambios
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
