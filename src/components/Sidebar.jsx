import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Wallet,
  Receipt,
  FileBarChart2,
  PieChart,
  Package,
  LogOut,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

const links = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { to: '/cuentas-por-cobrar', label: 'Cuentas por cobrar', icon: Wallet },
  { to: '/gastos', label: 'Gastos', icon: Receipt },
  { to: '/reportes', label: 'Reportes', icon: FileBarChart2 },
  { to: '/dashboard-financiero', label: 'Dashboard financiero', icon: PieChart },
  { to: '/inventario', label: 'Inventario', icon: Package },
]

export default function Sidebar() {
  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-white border-r border-gray-100 h-screen sticky top-0 px-4 py-6">
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-mordisco flex items-center justify-center text-white font-bold text-lg">
          M
        </div>
        <div>
          <p className="font-extrabold text-gray-900 leading-tight">Mordisco</p>
          <p className="text-xs text-gray-400">Control de ventas</p>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-mordisco text-white shadow-sm'
                  : 'text-gray-600 hover:bg-beige'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-beige transition-colors"
      >
        <LogOut size={18} />
        Cerrar sesión
      </button>
    </aside>
  )
}
