import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { apiFetch } from '../api/client.js';
import { useAuth } from '../state/AuthProvider.jsx';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AuditoriaPage() {
  const { token, user } = useAuth();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    entidad: '',
    accion: '',
    desde: '',
    hasta: '',
    page: 1,
    pageSize: 30
  });

  const [entidades, setEntidades] = useState([]);
  const [acciones, setAcciones] = useState([]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch('/api/auditoria/entidades', { token }),
      apiFetch('/api/auditoria/acciones', { token })
    ]).then(([e, a]) => {
      setEntidades(e.entidades || []);
      setAcciones(a.acciones || []);
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (filters.entidad) params.set('entidad', filters.entidad);
        if (filters.accion) params.set('accion', filters.accion);
        if (filters.desde) params.set('desde', filters.desde);
        if (filters.hasta) params.set('hasta', filters.hasta);
        params.set('page', String(filters.page));
        params.set('pageSize', String(filters.pageSize));

        const res = await apiFetch(`/api/auditoria?${params.toString()}`, { token });
        setItems(res.items || []);
        setTotal(res.total || 0);
      } catch (e) {
        setError(e.message || 'Error');
      } finally {
        setLoading(false);
      }
    })();
  }, [token, filters]);

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const totalPages = Math.ceil(total / filters.pageSize) || 1;

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold">Auditoría</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <select
            className="border px-3 py-2 rounded-lg text-sm"
            value={filters.entidad}
            onChange={(e) => setFilters((f) => ({ ...f, entidad: e.target.value, page: 1 }))}
          >
            <option value="">Todas las entidades</option>
            {entidades.map((ent) => (
              <option key={ent} value={ent}>{ent}</option>
            ))}
          </select>

          <select
            className="border px-3 py-2 rounded-lg text-sm"
            value={filters.accion}
            onChange={(e) => setFilters((f) => ({ ...f, accion: e.target.value, page: 1 }))}
          >
            <option value="">Todas las acciones</option>
            {acciones.map((acc) => (
              <option key={acc} value={acc}>{acc}</option>
            ))}
          </select>

          <input
            type="date"
            className="border px-3 py-2 rounded-lg text-sm"
            value={filters.desde}
            onChange={(e) => setFilters((f) => ({ ...f, desde: e.target.value, page: 1 }))}
            placeholder="Desde"
          />

          <input
            type="date"
            className="border px-3 py-2 rounded-lg text-sm"
            value={filters.hasta}
            onChange={(e) => setFilters((f) => ({ ...f, hasta: e.target.value, page: 1 }))}
            placeholder="Hasta"
          />

          <button
            className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-sm"
            onClick={() => setFilters({ entidad: '', accion: '', desde: '', hasta: '', page: 1, pageSize: 30 })}
          >
            Limpiar filtros
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4">{error}</div>}

        {loading ? (
          <div className="text-gray-500">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="text-gray-500">No hay registros de auditoría</div>
        ) : (
          <>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Fecha</th>
                    <th className="p-2 text-left">Usuario</th>
                    <th className="p-2 text-left">Acción</th>
                    <th className="p-2 text-left">Entidad</th>
                    <th className="p-2 text-left">ID</th>
                    <th className="p-2 text-left">Datos</th>
                    <th className="p-2 text-left">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="p-2 whitespace-nowrap">{formatDate(item.createdAt)}</td>
                      <td className="p-2">{item.usuario?.nombre || '-'}</td>
                      <td className="p-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {item.accion}
                        </span>
                      </td>
                      <td className="p-2">{item.entidad}</td>
                      <td className="p-2 font-mono text-xs">{item.entidadId || '-'}</td>
                      <td className="p-2 max-w-xs truncate text-xs text-gray-600">
                        {item.datos ? JSON.stringify(item.datos) : '-'}
                      </td>
                      <td className="p-2 text-xs text-gray-500">{item.ip || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4 text-sm">
              <div className="text-gray-500">
                Mostrando {items.length} de {total} registros
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 border rounded disabled:opacity-50"
                  disabled={filters.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                >
                  Anterior
                </button>
                <span className="px-3 py-1">
                  Página {filters.page} de {totalPages}
                </span>
                <button
                  className="px-3 py-1 border rounded disabled:opacity-50"
                  disabled={filters.page >= totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
