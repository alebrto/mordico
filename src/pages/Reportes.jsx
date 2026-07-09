import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  formatCOP,
  num,
  localDateISO as todayISO,
  primerDiaDelMesISO as firstOfMonthISO,
  lunesDeEstaSemanaISO,
} from '../lib/financials'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ImagePlus, X } from 'lucide-react'

const LOGO_STORAGE_KEY = 'mordisco_logo_pdf_base64'

export default function Reportes() {
  const [desde, setDesde] = useState(firstOfMonthISO())
  const [hasta, setHasta] = useState(todayISO())
  const [reporte, setReporte] = useState(null)
  const [loading, setLoading] = useState(false)
  const [logo, setLogo] = useState(null)

  useEffect(() => {
    const guardado = localStorage.getItem(LOGO_STORAGE_KEY)
    if (guardado) setLogo(guardado)
  }, [])

  function seleccionarLogo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result
      setLogo(base64)
      localStorage.setItem(LOGO_STORAGE_KEY, base64)
    }
    reader.readAsDataURL(file)
  }

  function quitarLogo() {
    setLogo(null)
    localStorage.removeItem(LOGO_STORAGE_KEY)
  }

  async function generarReporte(desdeParam = desde, hastaParam = hasta) {
    setLoading(true)
    const { data: ventas } = await supabase
      .from('ventas')
      .select('*, clientes(nombre)')
      .gte('fecha', desdeParam)
      .lte('fecha', hastaParam)

    const { data: gastos } = await supabase
      .from('gastos')
      .select('*')
      .gte('fecha', desdeParam)
      .lte('fecha', hastaParam)

    const v = ventas || []
    const g = gastos || []

    const totalEmpanadas = v.reduce((a, x) => a + num(x.cantidad), 0)
    const totalFacturado = v.reduce((a, x) => a + num(x.total), 0)
    const totalCobrado = v.reduce((a, x) => a + num(x.abonado), 0)
    const porCobrar = totalFacturado - totalCobrado
    const gastosFijos = g.filter((x) => x.tipo === 'Fijo').reduce((a, x) => a + num(x.valor), 0)
    const gastosVariables = g.filter((x) => x.tipo === 'Variable').reduce((a, x) => a + num(x.valor), 0)
    const gananciaReal = totalCobrado - gastosFijos - gastosVariables

    const ventasPorCliente = {}
    v.forEach((x) => {
      const nombre = x.clientes?.nombre || 'Sin cliente'
      if (!ventasPorCliente[nombre]) ventasPorCliente[nombre] = { empanadas: 0, total: 0 }
      ventasPorCliente[nombre].empanadas += num(x.cantidad)
      ventasPorCliente[nombre].total += num(x.total)
    })

    setReporte({
      totalEmpanadas,
      totalFacturado,
      totalCobrado,
      porCobrar,
      gastosFijos,
      gastosVariables,
      gananciaReal,
      ventasPorCliente,
      detalleGastos: g,
    })
    setLoading(false)
  }

  function usarEstaSemana() {
    const nuevoDesde = lunesDeEstaSemanaISO()
    const nuevoHasta = todayISO()
    setDesde(nuevoDesde)
    setHasta(nuevoHasta)
    generarReporte(nuevoDesde, nuevoHasta)
  }

  function exportarPDF() {
    if (!reporte) return
    const doc = new jsPDF()
    let cursorY = 18

    if (logo) {
      try {
        doc.addImage(logo, 'PNG', 14, 10, 22, 22)
        cursorY = 40
      } catch {
        cursorY = 18
      }
    }

    doc.setFontSize(18)
    doc.setTextColor(196, 111, 43)
    doc.text('Mordisco – Reporte de ventas', logo ? 42 : 14, logo ? 20 : 18)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Periodo: ${desde} a ${hasta}`, logo ? 42 : 14, logo ? 27 : 25)

    autoTable(doc, {
      startY: cursorY,
      head: [['Indicador', 'Valor']],
      body: [
        ['Total empanadas', String(reporte.totalEmpanadas)],
        ['Total facturado', formatCOP(reporte.totalFacturado)],
        ['Total cobrado', formatCOP(reporte.totalCobrado)],
        ['Por cobrar', formatCOP(reporte.porCobrar)],
        ['Gastos fijos', formatCOP(reporte.gastosFijos)],
        ['Gastos variables', formatCOP(reporte.gastosVariables)],
        ['Ganancia real', formatCOP(reporte.gananciaReal)],
      ],
      headStyles: { fillColor: [196, 111, 43] },
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Cliente', 'Empanadas', 'Total']],
      body: Object.entries(reporte.ventasPorCliente).map(([nombre, r]) => [
        nombre,
        String(r.empanadas),
        formatCOP(r.total),
      ]),
      headStyles: { fillColor: [196, 111, 43] },
    })

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Fecha', 'Concepto', 'Tipo', 'Valor']],
      body: reporte.detalleGastos.map((g) => [g.fecha, g.concepto, g.tipo, formatCOP(g.valor)]),
      headStyles: { fillColor: [196, 111, 43] },
    })

    doc.save(`mordisco-reporte-${desde}-a-${hasta}.pdf`)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-gray-900">Reportes</h1>

      <div className="card flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">
          <div>
            <label className="label-field">Desde</label>
            <input type="date" className="input-field" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Hasta</label>
            <input type="date" className="input-field" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <button onClick={() => generarReporte()} disabled={loading} className="btn-primary">
            {loading ? 'Generando…' : 'Generar reporte'}
          </button>
          <button onClick={usarEstaSemana} disabled={loading} className="btn-secondary">
            Esta semana
          </button>
          {reporte && (
            <button onClick={exportarPDF} className="btn-secondary">
              Exportar a PDF
            </button>
          )}
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center gap-4 flex-wrap">
          <p className="label-field !mb-0">Logo para el PDF</p>
          {logo ? (
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="w-12 h-12 object-contain rounded-lg border border-gray-200" />
              <label className="btn-secondary cursor-pointer text-xs">
                Cambiar
                <input type="file" accept="image/*" className="hidden" onChange={seleccionarLogo} />
              </label>
              <button onClick={quitarLogo} className="text-gray-400 hover:text-red-500">
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="btn-secondary cursor-pointer flex items-center gap-2 text-xs">
              <ImagePlus size={15} /> Subir logo
              <input type="file" accept="image/*" className="hidden" onChange={seleccionarLogo} />
            </label>
          )}
          <p className="text-xs text-gray-400">Se guarda en este navegador y se usa en todos los reportes que exportes.</p>
        </div>
      </div>

      {reporte && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Indicador titulo="Total empanadas" valor={reporte.totalEmpanadas} />
            <Indicador titulo="Total facturado" valor={formatCOP(reporte.totalFacturado)} />
            <Indicador titulo="Total cobrado" valor={formatCOP(reporte.totalCobrado)} />
            <Indicador titulo="Por cobrar" valor={formatCOP(reporte.porCobrar)} />
            <Indicador titulo="Gastos fijos" valor={formatCOP(reporte.gastosFijos)} />
            <Indicador titulo="Gastos variables" valor={formatCOP(reporte.gastosVariables)} />
            <Indicador titulo="Ganancia real" valor={formatCOP(reporte.gananciaReal)} destacado />
          </div>

          <div className="card overflow-x-auto">
            <h2 className="font-bold text-gray-900 mb-4">Ventas por cliente</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="py-2 pr-4">Cliente</th>
                  <th className="py-2 pr-4">Empanadas</th>
                  <th className="py-2 pr-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(reporte.ventasPorCliente).map(([nombre, r]) => (
                  <tr key={nombre} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-4 font-medium text-gray-800">{nombre}</td>
                    <td className="py-2 pr-4">{r.empanadas}</td>
                    <td className="py-2 pr-4">{formatCOP(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function Indicador({ titulo, valor, destacado }) {
  return (
    <div className="card">
      <p className="text-xs font-semibold text-gray-400 uppercase">{titulo}</p>
      <p className={`text-xl font-extrabold ${destacado ? 'text-mordisco' : 'text-gray-900'}`}>{valor}</p>
    </div>
  )
}
