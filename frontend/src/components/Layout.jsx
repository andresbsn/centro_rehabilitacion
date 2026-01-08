import React, { useMemo, useState } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../state/AuthProvider';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menu = [
    { to: '/pacientes', label: 'Pacientes', roles: ['admin', 'recepcion', 'profesional'] },
    { to: '/agenda', label: 'Agenda', roles: ['admin', 'recepcion', 'profesional'] },
    { to: '/configuracion', label: 'Configuración', roles: ['admin'] },
    { to: '/turnos/masivo', label: 'Carga Masiva', roles: ['admin', 'recepcion'] },
  ];

  const filteredMenu = useMemo(() => {
    if (!user?.role) return [];
    return menu.filter((item) => item.roles.includes(user.role));
  }, [menu, user?.role]);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200`}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-2">
          <h1 className={`text-lg font-bold text-blue-600 whitespace-nowrap overflow-hidden transition-all ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            Centro de Rehab
          </h1>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition"
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>
        <nav className={`flex-1 ${collapsed ? 'p-2' : 'p-4'}`}>
          {filteredMenu.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block ${collapsed ? 'px-2 py-3 text-center' : 'px-4 py-2'} rounded-lg mb-1 transition ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'hover:bg-gray-100 text-gray-700'
                }`
              }
            >
              <span className={`${collapsed ? 'text-[11px]' : ''}`}>{collapsed ? item.label.slice(0, 2).toUpperCase() : item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={`border-t border-gray-200 ${collapsed ? 'p-2' : 'p-4'}`}>
          <div className={`text-sm text-gray-600 mb-2 ${collapsed ? 'hidden' : ''}`}>
            {user?.nombre} ({user?.role})
          </div>
          <button
            onClick={logout}
            className={`${collapsed ? 'w-full text-xs px-2 py-2' : 'w-full px-4 py-2'} bg-red-500 text-white rounded-lg hover:bg-red-600 transition`}
            title="Cerrar sesión"
          >
            {collapsed ? 'Salir' : 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-700 capitalize">
            {location.pathname.slice(1).replace('/', ' > ')}
          </h2>
        </header>
        <section className="flex-1 overflow-auto p-6">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
