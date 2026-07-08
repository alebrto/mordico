import { useEffect, useRef, useState } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'

/**
 * Buscador de clientes con autocompletado.
 * Props:
 * - clientes: array de { id, nombre, telefono }
 * - value: id del cliente seleccionado (o '')
 * - onChange: (id) => void
 * - placeholder
 * - allowEmpty: si true, muestra opción "Todos los clientes" (para filtros)
 */
export default function ClienteBuscador({ clientes, value, onChange, placeholder = 'Buscar cliente…', allowEmpty = false }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const contenedorRef = useRef(null)

  const clienteSeleccionado = clientes.find((c) => c.id === value)

  useEffect(() => {
    function handleClickFuera(e) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setAbierto(false)
        setTexto('')
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [])

  const filtrados = clientes.filter((c) => c.nombre.toLowerCase().includes(texto.toLowerCase()))

  function seleccionar(id) {
    onChange(id)
    setAbierto(false)
    setTexto('')
  }

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="input-field flex items-center justify-between text-left"
      >
        <span className={clienteSeleccionado ? 'text-gray-800' : 'text-gray-400'}>
          {clienteSeleccionado ? clienteSeleccionado.nombre : allowEmpty ? 'Todos los clientes' : placeholder}
        </span>
        <ChevronDown size={16} className="text-gray-400 shrink-0" />
      </button>

      {abierto && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              autoFocus
              className="w-full text-sm outline-none"
              placeholder="Escribe para buscar…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            {texto && (
              <button type="button" onClick={() => setTexto('')} className="text-gray-300 hover:text-gray-500">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto">
            {allowEmpty && (
              <button
                type="button"
                onClick={() => seleccionar('')}
                className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-beige"
              >
                Todos los clientes
              </button>
            )}
            {filtrados.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-400">Sin resultados.</p>
            ) : (
              filtrados.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => seleccionar(c.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-beige ${
                    c.id === value ? 'bg-mordisco/10 text-mordisco font-semibold' : 'text-gray-700'
                  }`}
                >
                  {c.nombre}
                  {c.telefono && <span className="text-gray-400 text-xs"> · {c.telefono}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
