import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { PARAMETROS, formatCOP } from '../lib/financials'
import { AlertTriangle, TrendingUp, Wallet, Package2 } from 'lucide-react'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function Resumen() {
  const [ventasHoy, setVentasHoy] = useState([])
  const [gastosHoy, setGastosHoy] = useState([])
  const [clientesDeuda, setClientesDeuda] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setLoading(true)
    const hoy = todayISO()

    const { data: ventas } = await supabase
      .from('ventas')
      .select('*')
      .eq('fecha', hoy)

    const { data: gastos } = await supabase
      .from('gastos')
      .select('*')
      .eq('fecha', hoy)

    const { data: deudores } = await supabase
      .from('ventas')
      .select('*, clientes(nombre)')
      .gt('saldo', 0)
      .order('saldo', { ascending: false })
      .limit(5)

    setVentasHoy(ventas || [])
    setGastosHoy(gastos || [])
    setClientesDeuda(deudores || [])
    setLoading(false)
  }

  const empanadasVendidasHoy = ventasHoy.reduce((acc, v) => acc + v.cantidad, 0)
  const ingresosHoy = ventasHoy.reduce((acc, v) => acc + v.total, 0)
  const pagadoHoy = ventasHoy.reduce((acc, v) => acc + v.abonado, 0)
  const porCobrarHoy = ingresosHoy - pagadoHoy
  const gastosDelDia = gastosHoy.reduce((acc, g) => acc + g.valor, 0)
  const gananciaEstimadaHoy = empanadasVendidasHoy * PARAMETROS.margenUnitario - gastosDelDia
  const porcentajeCobrado = ingresosHoy > 0 ? Math.round((pagadoHoy / ingresosHoy) * 100) : 0
  const metaProgreso = Math.min(100, Math.round((empanadasVendidasHoy / PARAMETROS.metaDiariaEmpanadas) * 100))
  const dineroEnCaja = pagadoHoy - gastosDelDia

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Resumen del día</h1>
        <p className="text-gray-400 text-sm">{new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tarjeta
          titulo="Empanadas vendidas hoy"
          valor={empanadasVendidasHoy}
          subtitulo={`Meta: ${PARAMETROS.metaDiariaEmpanadas}`}
        />
        <Tarjeta titulo="Ingresos hoy" valor={formatCOP(ingresosHoy)} />
        <Tarjeta titulo="Pagado hoy" valor={formatCOP(pagadoHoy)} />
        <Tarjeta titulo="Por cobrar hoy" valor={formatCOP(porCobrarHoy)} negativo />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2 flex flex-col gap-4">
          <h2 className="font-bold text-gray-900">Meta diaria de empanadas</h2>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-mordisco rounded-full transition-all"
              style={{ width: `${metaProgreso}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">
            {empanadasVendidasHoy} de {PARAMETROS.metaDiariaEmpanadas} empanadas ({metaProgreso}%)
          </p>

          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Gastos del día</p>
              <p className="font-bold text-gray-900">{formatCOP(gastosDelDia)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Ganancia estimada</p>
              <p className={`font-bold ${gananciaEstimadaHoy >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {formatCOP(gananciaEstimadaHoy)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">% Cobrado hoy</p>
              <p className="font-bold text-gray-900">{porcentajeCobrado}%</p>
            </div>
          </div>
        </div>

        <div className="card flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-mordisco" />
            <h2 className="font-bold text-gray-900">Dinero disponible en caja</h2>
          </div>
          <p className={`text-3xl font-extrabold ${dineroEnCaja >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
            {formatCOP(dineroEnCaja)}
          </p>
          <p className="text-xs text-gray-400">Pagado hoy − gastos del día</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={18} className="text-mordisco" />
          <h2 className="font-bold text-gray-900">Clientes con deuda</h2>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400">Cargando…</p>
        ) : clientesDeuda.length === 0 ? (
          <p className="text-sm text-gray-400">No hay clientes con saldo pendiente.</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {clientesDeuda.map((v) => (
              <div key={v.id} className="flex items-center justify-between py-3">
                <p className="font-medium text-gray-800">{v.clientes?.nombre || 'Cliente'}</p>
                <p className="font-bold text-red-500">{formatCOP(v.saldo)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Tarjeta({ titulo, valor, subtitulo, negativo }) {
  return (
    <div className="card">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{titulo}</p>
      <p className={`text-2xl font-extrabold mt-1 ${negativo ? 'text-red-500' : 'text-gray-900'}`}>{valor}</p>
      {subtitulo && <p className="text-xs text-gray-400 mt-1">{subtitulo}</p>}
    </div>
  )
}
