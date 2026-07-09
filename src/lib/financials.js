// Supabase/Postgres devuelve las columnas `numeric` como TEXTO (string) para
// no perder precisión, no como número de JS. Si se suman directamente con
// `+`, JavaScript las concatena como texto en vez de sumarlas. Usa esta
// función siempre que hagas operaciones aritméticas sobre valores que vienen
// de la base de datos (valor, total, abonado, saldo, costo_unitario, etc).
export function num(v) {
  if (typeof v === 'number') return v
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

// Parámetros fijos del negocio (editables aquí o, idealmente, movidos a una
// tabla `parametros` en Supabase para que se puedan editar desde la UI).
export const PARAMETROS = {
  precioEmpanada: 2600,
  costoProduccion: 1300,
  margenUnitario: 1300, // precioEmpanada - costoProduccion
  arriendo: 2300000,
  luzYAseo: 650000,
  gas: 290000,
  gasolina: 200000,
  inversionista: 1500000,
  reserva: 500000,
  metaDiariaEmpanadas: 280,
}

// Valor de referencia (solo informativo/plantilla inicial). El cálculo real
// del negocio SIEMPRE debe usar los gastos que el usuario registra en la
// vista "Gastos" (tabla `gastos`, tipo = 'Fijo'), no este valor fijo.
export function gastosFijosMensualesReferencia(p = PARAMETROS) {
  return p.arriendo + p.luzYAseo + p.gas + p.gasolina + p.inversionista + p.reserva
}

// Punto de equilibrio en unidades = Gastos fijos REALES del mes / Margen unitario.
// `gastosFijosMesReal` debe venir de sumar los gastos con tipo='Fijo'
// registrados en la tabla `gastos` para el mes en curso. Si no se pasa nada,
// cae de vuelta al valor de referencia de PARAMETROS (solo para no romper
// pantallas que aún no cargan los gastos reales).
export function puntoDeEquilibrio(gastosFijosMesReal, p = PARAMETROS) {
  const fijos =
    typeof gastosFijosMesReal === 'number' ? gastosFijosMesReal : gastosFijosMensualesReferencia(p)
  if (!p.margenUnitario) return 0
  return Math.ceil(fijos / p.margenUnitario)
}

export function margenBrutoPorcentaje(p = PARAMETROS) {
  return (p.margenUnitario / p.precioEmpanada) * 100
}

// Utilidad bruta = ingresos - costo de producción (variable)
export function utilidadBruta(totalEmpanadasVendidas, p = PARAMETROS) {
  return totalEmpanadasVendidas * p.margenUnitario
}

// Utilidad neta = utilidad bruta - gastos fijos reales del mes - gastos variables reales del mes
export function utilidadNeta(totalEmpanadasVendidas, gastosFijosMesReal = 0, gastosVariablesMesReal = 0, p = PARAMETROS) {
  return utilidadBruta(totalEmpanadasVendidas, p) - gastosFijosMesReal - gastosVariablesMesReal
}

// Proyección de cierre de mes según ritmo de ventas diario promedio
export function proyeccionMensual(promedioDiario, diasDelMes = 30) {
  return Math.round(promedioDiario * diasDelMes)
}

export function flujoDeCaja({ cobrado = 0, gastosPagados = 0 } = {}) {
  return cobrado - gastosPagados
}

export function formatCOP(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor || 0)
}

export function diasDeMora(fechaVenta) {
  const hoy = new Date()
  const fecha = new Date(fechaVenta)
  const diffMs = hoy - fecha
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

export function nivelMorosidad(dias) {
  if (dias <= 7) return { nivel: 'bajo', label: '0-7 días', color: 'bg-green-100 text-green-700' }
  if (dias <= 30) return { nivel: 'medio', label: '8-30 días', color: 'bg-yellow-100 text-yellow-700' }
  return { nivel: 'alto', label: '+30 días', color: 'bg-red-100 text-red-700' }
}

export function estadoVenta(total, abonado) {
  if (abonado >= total) return 'Pagado'
  if (abonado > 0) return 'Abono parcial'
  return 'Debe todo'
}

// Receta estándar: insumos que consume 1 empanada (unidad: gramos, salvo aceite en ml)
export const RECETA_EMPANADA = {
  harina: 25,
  pollo: 15,
  carne: 15,
  soya: 5,
  jamon: 5,
  aceite: 10,
}
