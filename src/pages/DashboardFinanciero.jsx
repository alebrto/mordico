import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  PARAMETROS,
  formatCOP,
  puntoDeEquilibrio,
  margenBrutoPorcentaje,
  proyeccionMensual,
} from '../lib/financials'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import AsistenteIA from '../components/AsistenteIA'

const COLORES = ['#C46F2B', '#E0A876', '#8B5A2B', '#D4A276', '#A85A20']

function firstOfMonthISO() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

export default function DashboardFinanciero() {
  const [ventas, setVentas] = useState([])
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setLoading(true)
    const desde = firstOfMonthISO()
    const { data: v } = await supabase.from('ventas').select('*').gte('fecha', desde)
    const { data: g } = await supabase.from('gastos').select('*').gte('fecha', desde)
    setVentas(v || [])
    setGastos(g || [])
    setLoading(false)
  }

  const totalEmpanadasMes = ventas.reduce((a, v) => a + v.cantidad, 0)
  const totalCobradoMes = ventas.reduce((a, v) => a + v.abonado, 0)
  const carteraAcumulada = ventas.reduce((a, v) => a + v.saldo, 0)
  const diasTranscurridos = new Date().getDate()
  const promedioDiario = diasTranscurridos > 0 ? totalEmpanadasMes / diasTranscurridos : 0
  const liquidez = totalCobradoMes - gastos.reduce((a, g) => a + g.valor, 0)

  const empanadasPorDia = {}
  ventas.forEach((v) => {
    empanadasPorDia[v.fecha] = (empanadasPorDia[v.fecha] || 0) + v.cantidad
  })
  const dataEmpanadasPorDia = Object.entries(empanadasPorDia)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, cantidad]) => ({ fecha: fecha.slice(5), cantidad }))

  const ingresosPorSemana = {}
  ventas.forEach((v) => {
    const fecha = new Date(v.fecha)
    const semana = `S${Math.ceil(fecha.getDate() / 7)}`
    ingresosPorSemana[semana] = (ingresosPorSemana[semana] || 0) + v.total
  })
  const dataIngresosPorSemana = Object.entries(ingresosPorSemana).map(([semana, total]) => ({
    semana,
    total,
  }))

  const gastosPorCategoria = {}
  gastos.forEach((g) => {
    gastosPorCategoria[g.concepto] = (gastosPorCategoria[g.concepto] || 0) + g.valor
  })
  const dataGastosPorCategoria = Object.entries(gastosPorCategoria).map(([name, value]) => ({ name, value }))

  const puntoEquilibrio = puntoDeEquilibrio()
  const margenBruto = margenBrutoPorcentaje()
  const proyeccion = proyeccionMensual(promedioDiario)

  const contextoIA = {
    totalEmpanadasMes,
    totalCobradoMes,
    carteraAcumulada,
    puntoEquilibrio,
    margenBruto,
    proyeccion,
    liquidez,
    parametros: PARAMETROS,
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-gray-900">Dashboard financiero</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Indicador titulo="Punto de equilibrio" valor={`${puntoEquilibrio.toLocaleString('es-CO')}`} subtitulo="empanadas/mes" />
        <Indicador titulo="Margen bruto" valor={`${margenBruto.toFixed(0)}%`} />
        <Indicador titulo="Liquidez" valor={formatCOP(liquidez)} />
        <Indicador titulo="Proyección mensual" valor={`${proyeccion.toLocaleString('es-CO')}`} subtitulo="empanadas" />
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Cargando datos…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-4">Empanadas por día</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dataEmpanadasPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="cantidad" stroke="#C46F2B" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2 className="font-bold text-gray-900 mb-4">Ingresos por semana</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dataIngresosPorSemana}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatCOP(v)} />
                <Bar dataKey="total" fill="#C46F2B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2 className="font-bold text-gray-900 mb-4">Gastos por categoría</h2>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={dataGastosPorCategoria} dataKey="value" nameKey="name" outerRadius={90} label>
                  {dataGastosPorCategoria.map((_, i) => (
                    <Cell key={i} fill={COLORES[i % COLORES.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCOP(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card flex flex-col justify-center items-center">
            <h2 className="font-bold text-gray-900 mb-2 self-start">Cartera acumulada</h2>
            <p className="text-4xl font-extrabold text-red-500">{formatCOP(carteraAcumulada)}</p>
            <p className="text-sm text-gray-400 mt-1">Saldo pendiente total del mes</p>
          </div>
        </div>
      )}

      <AsistenteIA contexto={contextoIA} />
    </div>
  )
}

function Indicador({ titulo, valor, subtitulo }) {
  return (
    <div className="card">
      <p className="text-xs font-semibold text-gray-400 uppercase">{titulo}</p>
      <p className="text-2xl font-extrabold text-gray-900 mt-1">{valor}</p>
      {subtitulo && <p className="text-xs text-gray-400">{subtitulo}</p>}
    </div>
  )
}
