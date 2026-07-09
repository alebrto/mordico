import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCOP, num, RECETA_EMPANADA } from '../lib/financials'
import { AlertTriangle, Pencil, Trash2, X } from 'lucide-react'

export default function Inventario() {
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({
    nombre: '',
    unidad: 'g',
    cantidad_actual: '',
    cantidad_minima: '',
    costo_unitario: '',
  })

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('inventario').select('*').order('nombre')
    setInsumos(data || [])
    setLoading(false)
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ nombre: '', unidad: 'g', cantidad_actual: '', cantidad_minima: '', costo_unitario: '' })
    setModalOpen(true)
  }

  function abrirEditar(item) {
    setEditando(item)
    setForm({
      nombre: item.nombre,
      unidad: item.unidad,
      cantidad_actual: item.cantidad_actual,
      cantidad_minima: item.cantidad_minima,
      costo_unitario: item.costo_unitario,
    })
    setModalOpen(true)
  }

  async function guardar(e) {
    e.preventDefault()
    const payload = {
      nombre: form.nombre,
      unidad: form.unidad,
      cantidad_actual: Number(form.cantidad_actual),
      cantidad_minima: Number(form.cantidad_minima),
      costo_unitario: Number(form.costo_unitario),
    }
    if (editando) {
      await supabase.from('inventario').update(payload).eq('id', editando.id)
    } else {
      const { data: userData } = await supabase.auth.getUser()
      await supabase.from('inventario').insert({ ...payload, user_id: userData.user.id })
    }
    setModalOpen(false)
    cargar()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este insumo?')) return
    await supabase.from('inventario').delete().eq('id', id)
    cargar()
  }

  const alertas = insumos.filter((i) => num(i.cantidad_actual) <= num(i.cantidad_minima))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900">Inventario</h1>
        <button onClick={abrirNuevo} className="btn-primary">
          + Nuevo insumo
        </button>
      </div>

      {alertas.length > 0 && (
        <div className="card border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-red-500" />
            <h2 className="font-bold text-red-600">Insumos en nivel mínimo</h2>
          </div>
          <ul className="text-sm text-red-600 list-disc list-inside">
            {alertas.map((a) => (
              <li key={a.id}>
                {a.nombre}: quedan {a.cantidad_actual} {a.unidad} (mínimo {a.cantidad_minima} {a.unidad})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card overflow-x-auto">
        <h2 className="font-bold text-gray-900 mb-4">Insumos</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Cargando…</p>
        ) : insumos.length === 0 ? (
          <p className="text-sm text-gray-400">
            Aún no hay insumos registrados. Registra harina, pollo, carne, soya, jamón y aceite para activar el descuento automático por venta.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="py-2 pr-4">Insumo</th>
                <th className="py-2 pr-4">Cantidad actual</th>
                <th className="py-2 pr-4">Mínimo</th>
                <th className="py-2 pr-4">Costo unitario</th>
                <th className="py-2 pr-4">Consumo por empanada</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {insumos.map((i) => {
                const bajo = num(i.cantidad_actual) <= num(i.cantidad_minima)
                const consumo = RECETA_EMPANADA[i.nombre.toLowerCase()] ?? '—'
                return (
                  <tr key={i.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 pr-4 font-medium text-gray-800">{i.nombre}</td>
                    <td className={`py-3 pr-4 font-semibold ${bajo ? 'text-red-500' : 'text-gray-800'}`}>
                      {i.cantidad_actual} {i.unidad}
                    </td>
                    <td className="py-3 pr-4 text-gray-500">
                      {i.cantidad_minima} {i.unidad}
                    </td>
                    <td className="py-3 pr-4">{formatCOP(i.costo_unitario)}</td>
                    <td className="py-3 pr-4 text-gray-500">
                      {consumo !== '—' ? `${consumo} ${i.unidad} / empanada` : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => abrirEditar(i)} className="text-gray-400 hover:text-mordisco">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => eliminar(i.id)} className="text-gray-400 hover:text-red-500">
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
            <h2 className="font-bold text-lg text-gray-900 mb-4">{editando ? 'Editar insumo' : 'Nuevo insumo'}</h2>
            <form onSubmit={guardar} className="flex flex-col gap-4">
              <div>
                <label className="label-field">Nombre</label>
                <input
                  required
                  className="input-field"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Harina, Pollo, Carne, Soya, Jamón, Aceite"
                />
              </div>
              <div>
                <label className="label-field">Unidad</label>
                <select
                  className="input-field"
                  value={form.unidad}
                  onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                >
                  <option value="g">Gramos (g)</option>
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="ml">Mililitros (ml)</option>
                  <option value="l">Litros (l)</option>
                  <option value="unidad">Unidad</option>
                </select>
              </div>
              <div>
                <label className="label-field">Cantidad actual</label>
                <input
                  type="number"
                  min="0"
                  required
                  className="input-field"
                  value={form.cantidad_actual}
                  onChange={(e) => setForm({ ...form, cantidad_actual: e.target.value })}
                />
              </div>
              <div>
                <label className="label-field">Cantidad mínima (alerta)</label>
                <input
                  type="number"
                  min="0"
                  required
                  className="input-field"
                  value={form.cantidad_minima}
                  onChange={(e) => setForm({ ...form, cantidad_minima: e.target.value })}
                />
              </div>
              <div>
                <label className="label-field">Costo unitario</label>
                <input
                  type="number"
                  min="0"
                  required
                  className="input-field"
                  value={form.costo_unitario}
                  onChange={(e) => setForm({ ...form, costo_unitario: e.target.value })}
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
