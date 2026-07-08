import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatCOP, diasDeMora, nivelMorosidad } from '../lib/financials'
import { MessageCircle, PlusCircle, X } from 'lucide-react'

export default function CuentasPorCobrar() {
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAbono, setModalAbono] = useState(null)
  const [valorAbono, setValorAbono] = useState('')

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('ventas')
      .select('*, clientes(nombre, telefono)')
      .gt('saldo', 0)
      .order('saldo', { ascending: false })
    setVentas(data || [])
    setLoading(false)
  }

  function abrirModalAbono(venta) {
    setModalAbono(venta)
    setValorAbono('')
  }

  async function registrarAbono(e) {
    e.preventDefault()
    const valor = Number(valorAbono)
    if (!valor || valor <= 0) return
    const { data: userData } = await supabase.auth.getUser()

    await supabase.from('abonos').insert({
      user_id: userData.user.id,
      venta_id: modalAbono.id,
      valor,
    })

    setModalAbono(null)
    cargar()
  }

  function enviarRecordatorio(venta) {
    const telefono = (venta.clientes?.telefono || '').replace(/\D/g, '')
    const mensaje = encodeURIComponent(
      `Hola ${venta.clientes?.nombre || ''}, te recordamos que tienes un saldo pendiente de ${formatCOP(
        venta.saldo
      )} con Mordisco. ¡Gracias por tu compra!`
    )
    const url = telefono ? `https://wa.me/57${telefono}?text=${mensaje}` : `https://wa.me/?text=${mensaje}`
    window.open(url, '_blank')
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-gray-900">Cuentas por cobrar</h1>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-gray-400">Cargando…</p>
        ) : ventas.length === 0 ? (
          <p className="text-sm text-gray-400">No hay cuentas pendientes por cobrar. 🎉</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="py-2 pr-4">Cliente</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Abonado</th>
                <th className="py-2 pr-4">Saldo</th>
                <th className="py-2 pr-4">Días</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => {
                const dias = diasDeMora(v.fecha)
                const mora = nivelMorosidad(dias)
                return (
                  <tr key={v.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 pr-4 font-medium text-gray-800">{v.clientes?.nombre || '—'}</td>
                    <td className="py-3 pr-4">{formatCOP(v.total)}</td>
                    <td className="py-3 pr-4">{formatCOP(v.abonado)}</td>
                    <td className="py-3 pr-4 font-semibold text-red-500">{formatCOP(v.saldo)}</td>
                    <td className="py-3 pr-4">
                      <span className={`badge ${mora.color}`}>{dias}d · {mora.label}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => abrirModalAbono(v)}
                          className="flex items-center gap-1 text-mordisco hover:text-mordisco-dark text-xs font-semibold"
                        >
                          <PlusCircle size={15} /> Abonar
                        </button>
                        <button
                          onClick={() => enviarRecordatorio(v)}
                          className="flex items-center gap-1 text-green-600 hover:text-green-700 text-xs font-semibold"
                        >
                          <MessageCircle size={15} /> WhatsApp
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

      {modalAbono && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-sm relative">
            <button onClick={() => setModalAbono(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <X size={18} />
            </button>
            <h2 className="font-bold text-lg text-gray-900 mb-1">Registrar abono</h2>
            <p className="text-sm text-gray-400 mb-4">
              {modalAbono.clientes?.nombre} · Saldo actual: {formatCOP(modalAbono.saldo)}
            </p>
            <form onSubmit={registrarAbono} className="flex flex-col gap-4">
              <div>
                <label className="label-field">Valor del abono</label>
                <input
                  type="number"
                  min="1"
                  max={modalAbono.saldo}
                  required
                  className="input-field"
                  value={valorAbono}
                  onChange={(e) => setValorAbono(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                Confirmar abono
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
