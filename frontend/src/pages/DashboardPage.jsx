import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { apiFetch } from '../api/client.js';
import { useAuth } from '../state/AuthProvider.jsx';

function StatCard({ title, value, subtitle, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700'
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[color] || colors.blue}`}>
      <div className="text-sm opacity-80">{title}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
      {subtitle ? <div className="text-sm mt-1 opacity-70">{subtitle}</div> : null}
    </div>
  );
}

function formatMoney(value) {
  const n = Number(value || 0);
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

export default function DashboardPage() {
  const { token } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiFetch('/api/dashboard/resumen', { token });
        setData(res);
      } catch (e) {
        setError(e.message || 'Error');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) return <div className="text-gray-600">Cargando...</div>;
  if (error) return <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg">{error}</div>;
  if (!data) return null;

  const turnosHoy = data.turnosHoy?.items || [];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="text-sm text-gray-500">Resumen del día: {data.fecha}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Turnos hoy"
          value={data.turnosHoy?.total || 0}
          color="blue"
        />
        <StatCard
          title="Cobros pendientes"
          value={data.cobrosPendientes?.cantidad || 0}
          subtitle={formatMoney(data.cobrosPendientes?.monto)}
          color="yellow"
        />
        <StatCard
          title="Pacientes nuevos (mes)"
          value={data.pacientesNuevosMes || 0}
          color="green"
        />
        <StatCard
          title="Turnos semana"
          value={Object.values(data.turnosSemana || {}).reduce((a, b) => a + b, 0)}
          subtitle={`Confirmados: ${data.turnosSemana?.CONFIRMADO || 0}`}
          color="gray"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Turnos de hoy</h2>
          <Link to="/agenda" className="text-blue-600 hover:underline text-sm">
            Ver agenda completa
          </Link>
        </div>

        {turnosHoy.length === 0 ? (
          <div className="text-gray-500">No hay turnos programados para hoy</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Hora</th>
                  <th className="p-2 text-left">Paciente</th>
                  <th className="p-2 text-left">Especialidad</th>
                  <th className="p-2 text-left">Profesional</th>
                  <th className="p-2 text-left">Estado</th>
                  <th className="p-2 text-right">Coseguro</th>
                </tr>
              </thead>
              <tbody>
                {turnosHoy.map((t) => (
                  <tr key={t.id} className="border-t border-gray-100">
                    <td className="p-2">
                      {t.horaInicio} - {t.horaFin}
                    </td>
                    <td className="p-2">{t.paciente}</td>
                    <td className="p-2">{t.especialidad}</td>
                    <td className="p-2">{t.profesional}</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          t.estado === 'ASISTIO'
                            ? 'bg-green-100 text-green-700'
                            : t.estado === 'CANCELADO'
                            ? 'bg-red-100 text-red-700'
                            : t.estado === 'CONFIRMADO'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {t.estado}
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      {t.cobrado ? (
                        <span className="text-green-600">{formatMoney(t.importeCoseguro)}</span>
                      ) : (
                        <span className="text-yellow-600">{formatMoney(t.importeCoseguro)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
