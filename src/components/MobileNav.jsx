import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const links = [
  { to: '/', label: 'Resumen', end: true },
  { to: '/clientes', label: 'Clientes' },
  { to: '/ventas', label: 'Ventas' },
  { to: '/cuentas-por-cobrar', label: 'Cuentas por cobrar' },
  { to: '/gastos', label: 'Gastos' },
  { to: '/reportes', label: 'Reportes' },
  { to: '/dashboard-financiero', label: 'Dashboard financiero' },
  { to: '/inventario', label: 'Inventario' },
]

export default function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden sticky top-0 z-20 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-mordisco flex items-center justify-center text-white font-bold text-sm">
            M
          </div>
          <p className="font-extrabold text-gray-900">Mordisco</p>
        </div>
        <button onClick={() => setOpen(!open)} className="text-gray-600">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <nav className="flex flex-col px-4 pb-3 gap-1">
          {links.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `px-3 py-2 rounded-xl text-sm font-medium ${
                  isActive ? 'bg-mordisco text-white' : 'text-gray-600 hover:bg-beige'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
