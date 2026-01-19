import React, { useMemo, useState } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../state/AuthProvider';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const filteredMenu = useMemo(() => {
    if (!user?.role) return [];
    return menu.filter((item) => item.roles.includes(user.role));
  }, [menu, user?.role]);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 overflow-hidden">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed md:relative z-30 h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out
          ${collapsed ? 'md:w-20' : 'md:w-64'}
          ${mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-2 h-16">
          <h1 className={`text-lg font-bold text-blue-600 whitespace-nowrap overflow-hidden transition-all ${collapsed ? 'md:w-0 md:opacity-0' : 'w-auto opacity-100'}`}>
            Centro de Rehab
          </h1>
          {/* Desktop Collapse Button */}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="hidden md:flex border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition items-center justify-center text-gray-500"
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? '»' : '«'}
          </button>
          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition text-gray-500"
          >
            ✕
          </button>
        </div>

        <nav className={`flex-1 overflow-y-auto ${collapsed ? 'md:p-2' : 'p-4'}`}>
          {filteredMenu.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-lg mb-1 transition flex items-center ${
                  collapsed ? 'md:justify-center md:px-2 md:py-3' : 'px-4 py-2'
                } ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'hover:bg-gray-100 text-gray-700'
                }`
              }
            >
              <span className={`${collapsed ? 'md:hidden' : ''} text-lg w-6 text-center mr-2`}>
                {/* Placeholder icon since we don't have an icon lib yet, using first letter */}
                {item.label.charAt(0)}
              </span>
              <span className={`${collapsed ? 'md:hidden' : ''} truncate`}>
                {item.label}
              </span>
              {/* Tooltip-like effect for collapsed mode could go here */}
            </NavLink>
          ))}
        </nav>

        <div className={`border-t border-gray-200 ${collapsed ? 'md:p-2' : 'p-4'}`}>
          <div className={`text-sm text-gray-600 mb-2 truncate ${collapsed ? 'md:hidden' : ''}`}>
            {user?.nombre} <span className="text-xs opacity-75">({user?.role})</span>
          </div>
          <button
            onClick={logout}
            className={`w-full bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center ${
              collapsed ? 'md:px-0 md:py-2' : 'px-4 py-2'
            }`}
             title="Cerrar sesión"
          >
            <span className={`${collapsed ? 'md:hidden' : ''}`}>Cerrar sesión</span>
            <span className={`hidden ${collapsed ? 'md:block text-xs' : ''}`}>Salir</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <header className="bg-white border-b border-gray-200 px-4 h-16 flex items-center gap-3">
          {/* Mobile Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
          >
            ☰
          </button>
          
          <h2 className="text-xl font-semibold text-gray-700 capitalize truncate">
            {location.pathname === '/' ? 'Inicio' : location.pathname.slice(1).split('/').pop().replace(/-/g, ' ')}
          </h2>
        </header>

        <section className="flex-1 overflow-auto p-4 md:p-6 relative">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
