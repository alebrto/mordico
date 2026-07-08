import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import Sidebar from './components/Sidebar'
import MobileNav from './components/MobileNav'
import Login from './pages/Login'
import Resumen from './pages/Resumen'
import Clientes from './pages/Clientes'
import Ventas from './pages/Ventas'
import CuentasPorCobrar from './pages/CuentasPorCobrar'
import Gastos from './pages/Gastos'
import Reportes from './pages/Reportes'
import DashboardFinanciero from './pages/DashboardFinanciero'
import Inventario from './pages/Inventario'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = cargando

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-beige flex items-center justify-center">
        <p className="text-gray-400 text-sm">Cargando…</p>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <div className="min-h-screen bg-beige flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileNav />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<Resumen />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/cuentas-por-cobrar" element={<CuentasPorCobrar />} />
            <Route path="/gastos" element={<Gastos />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/dashboard-financiero" element={<DashboardFinanciero />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
