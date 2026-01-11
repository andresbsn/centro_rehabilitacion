import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../state/AuthProvider.jsx';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function startOfMonthStr() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function formatMoneyArs(value) {
  const n = Number(value || 0);
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {subtitle ? <div className="text-sm text-gray-500 mt-1">{subtitle}</div> : null}
    </div>
  );
}

function BarsChart({ data, valueKey, labelKey }) {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey] || 0)));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="font-semibold mb-3">Turnos por día</div>
      <div className="space-y-2">
        {data.map((d) => {
          const v = Number(d[valueKey] || 0);
          const w = Math.round((v / max) * 100);
          return (
            <div key={d[labelKey]} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3 text-xs text-gray-600 truncate" title={d[labelKey]}>
                {d[labelKey]}
              </div>
              <div className="col-span-8">
                <div className="h-3 bg-gray-100 rounded">
                  <div className="h-3 bg-blue-500 rounded" style={{ width: `${w}%` }} />
                </div>
              </div>
              <div className="col-span-1 text-xs text-gray-700 text-right">{v}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportesPage() {
  const { token, user } = useAuth();

  const canView = user?.role === 'admin' || user?.role === 'recepcion';

  const [filters, setFilters] = useState({
    desde: startOfMonthStr(),
    hasta: todayStr()
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canView) return;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const qs = new URLSearchParams();
        if (filters.desde) qs.set('desde', filters.desde);
        if (filters.hasta) qs.set('hasta', filters.hasta);
        const res = await apiFetch(`/api/reportes/resumen?${qs.toString()}`, { token });
        setData(res);
      } catch (e) {
        setError(e.message || 'Error');
      } finally {
        setLoading(false);
      }
    })();
  }, [canView, filters.desde, filters.hasta, token]);

  const topPacientes = useMemo(() => data?.top?.pacientes || [], [data]);
  const topEspecialidades = useMemo(() => data?.top?.especialidades || [], [data]);
  const porDia = useMemo(() => data?.series?.porDia || [], [data]);

  if (!canView) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
        No tenés permisos para ver reportes.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <div className="text-sm text-gray-500">Resumen de turnos, cobros y deudas</div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div>
            <div className="text-xs text-gray-500 mb-1">Desde</div>
            <input
              type="date"
              className="border border-gray-300 px-3 py-2 rounded-lg"
              value={filters.desde}
              onChange={(e) => setFilters((p) => ({ ...p, desde: e.target.value }))}
            />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Hasta</div>
            <input
              type="date"
              className="border border-gray-300 px-3 py-2 rounded-lg"
              value={filters.hasta}
              onChange={(e) => setFilters((p) => ({ ...p, hasta: e.target.value }))}
            />
          </div>
          <button
            type="button"
            className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 transition h-[42px] self-end"
            onClick={() => setFilters({ desde: startOfMonthStr(), hasta: todayStr() })}
            title="Volver al rango por defecto"
          >
            Este mes
          </button>
        </div>
      </div>

      {error ? <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg">{error}</div> : null}

      {loading ? (
        <div className="text-gray-600">Cargando...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard title="Turnos" value={data.totals.turnos} subtitle={`Rango: ${data.range.desde || '-'} a ${data.range.hasta || '-'}`} />
            <StatCard title="Pagados" value={data.totals.pagados} subtitle={`${data.totals.porcentajeCobro}% de cobro`} />
            <StatCard title="Deuda" value={formatMoneyArs(data.totals.deuda)} subtitle="Turnos no cobrados" />
            <StatCard title="Coseguro promedio" value={formatMoneyArs(data.totals.coseguroPromedio)} subtitle={`Total: ${formatMoneyArs(data.totals.coseguroTotal)}`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BarsChart data={porDia.slice(-14)} valueKey="total" labelKey="fecha" />

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="font-semibold mb-3">Top pacientes (por deuda)</div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Paciente</th>
                      <th className="p-2 text-right">Turnos</th>
                      <th className="p-2 text-right">Pagados</th>
                      <th className="p-2 text-right">Deuda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPacientes.map((p) => (
                      <tr key={p.pacienteId} className="border-t border-gray-100">
                        <td className="p-2">{p.paciente}</td>
                        <td className="p-2 text-right">{p.total}</td>
                        <td className="p-2 text-right">{p.pagados}</td>
                        <td className="p-2 text-right">{formatMoneyArs(p.deuda)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!topPacientes.length ? <div className="text-gray-600 mt-2">Sin datos</div> : null}
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="font-semibold mb-3">Turnos por disciplina</div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Disciplina</th>
                    <th className="p-2 text-right">Turnos</th>
                    <th className="p-2 text-right">Pagados</th>
                    <th className="p-2 text-right">Deuda</th>
                  </tr>
                </thead>
                <tbody>
                  {topEspecialidades.map((e) => (
                    <tr key={e.especialidadId} className="border-t border-gray-100">
                      <td className="p-2">{e.especialidad}</td>
                      <td className="p-2 text-right">{e.total}</td>
                      <td className="p-2 text-right">{e.pagados}</td>
                      <td className="p-2 text-right">{formatMoneyArs(e.deuda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!topEspecialidades.length ? <div className="text-gray-600 mt-2">Sin datos</div> : null}
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-lg p-4">
            <div className="font-semibold">Insight</div>
            <div className="text-sm text-gray-700 mt-1">
              Priorizá el cobro de los pacientes con mayor deuda y revisá si hay disciplinas con alto volumen pero baja tasa de cobro.
            </div>
          </div>
        </>
      ) : (
        <div className="text-gray-600">Sin datos</div>
      )}
    </div>
  );
}
