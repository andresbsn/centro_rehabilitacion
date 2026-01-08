import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../state/AuthProvider';

export default function AgendaPage() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [profesionales, setProfesionales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [view, setView] = useState('tabla');
  const [showCreate, setShowCreate] = useState(false);

  const [filters, setFilters] = useState({
    desde: '',
    hasta: '',
    pacienteId: '',
    especialidadId: '',
    profesionalId: '',
    estado: ''
  });

  const [form, setForm] = useState({
    pacienteId: '',
    especialidadId: '',
    profesionalId: '',
    fecha: '',
    horaInicio: '',
    notas: ''
  });

  const estados = useMemo(
    () => ({
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      cancelado: 'Cancelado',
      realizado: 'Realizado'
    }),
    []
  );

  const estadoColors = useMemo(
    () => ({
      pendiente: 'bg-yellow-100 text-yellow-700',
      confirmado: 'bg-blue-100 text-blue-700',
      cancelado: 'bg-red-100 text-red-700',
      realizado: 'bg-green-100 text-green-700'
    }),
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });

      const data = await apiFetch(`/api/turnos?${params.toString()}`, { token });
      setItems(data.items || []);
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, [filters, token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const [p, e, pr] = await Promise.all([
          apiFetch('/api/pacientes', { token }).catch(() => ({ items: [] })),
          apiFetch('/api/especialidades', { token }).catch(() => ({ items: [] })),
          apiFetch('/api/usuarios/profesionales', { token }).catch(() => ({ items: [] }))
        ]);
        setPacientes(p.items || []);
        setEspecialidades(e.items || []);
        setProfesionales(pr.items || []);
      } catch {
        // ignore
      }
    })();
  }, [token]);

  function openCreate() {
    const today = new Date().toISOString().slice(0, 10);
    setForm({ pacienteId: '', especialidadId: '', profesionalId: '', fecha: today, horaInicio: '09:00', notas: '' });
    setShowCreate(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        pacienteId: form.pacienteId,
        especialidadId: form.especialidadId,
        profesionalId: form.profesionalId || undefined,
        fecha: form.fecha,
        horaInicio: form.horaInicio,
        notas: form.notas.trim() || undefined
      };
      await apiFetch('/api/turnos', { token, method: 'POST', body: payload });
      setShowCreate(false);
      await load();
    } catch (e) {
      setError(e.message || 'Error');
    }
  }

  async function cambiarEstado(id, estado) {
    setError('');
    try {
      await apiFetch(`/api/turnos/${id}`, { token, method: 'PUT', body: { estado } });
      await load();
    } catch (e) {
      setError(e.message || 'Error');
    }
  }

  async function cancelarTurno(id) {
    if (!confirm('¿Cancelar este turno?')) return;
    await cambiarEstado(id, 'cancelado');
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView((v) => (v === 'tabla' ? 'calendario' : 'tabla'))}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Vista: {view === 'tabla' ? 'Tabla' : 'Calendario'}
          </button>
          <button
            onClick={openCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Nuevo turno
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        <input
          type="date"
          className="border border-gray-300 px-3 py-2 rounded-lg"
          value={filters.desde}
          onChange={(e) => setFilters((p) => ({ ...p, desde: e.target.value }))}
        />
        <input
          type="date"
          className="border border-gray-300 px-3 py-2 rounded-lg"
          value={filters.hasta}
          onChange={(e) => setFilters((p) => ({ ...p, hasta: e.target.value }))}
        />

        <select
          className="border border-gray-300 px-3 py-2 rounded-lg"
          value={filters.pacienteId}
          onChange={(e) => setFilters((p) => ({ ...p, pacienteId: e.target.value }))}
        >
          <option value="">Paciente</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.apellido}, {p.nombre}
            </option>
          ))}
        </select>

        <select
          className="border border-gray-300 px-3 py-2 rounded-lg"
          value={filters.especialidadId}
          onChange={(e) => setFilters((p) => ({ ...p, especialidadId: e.target.value }))}
        >
          <option value="">Especialidad</option>
          {especialidades.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>

        <select
          className="border border-gray-300 px-3 py-2 rounded-lg"
          value={filters.profesionalId}
          onChange={(e) => setFilters((p) => ({ ...p, profesionalId: e.target.value }))}
        >
          <option value="">Profesional</option>
          {profesionales.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>

        <select
          className="border border-gray-300 px-3 py-2 rounded-lg"
          value={filters.estado}
          onChange={(e) => setFilters((p) => ({ ...p, estado: e.target.value }))}
        >
          <option value="">Estado</option>
          {Object.entries(estados).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {error ? <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4">{error}</div> : null}

      {loading ? (
        <div className="text-gray-600">Cargando...</div>
      ) : view === 'tabla' ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-left">Hora</th>
                <th className="p-3 text-left">Paciente</th>
                <th className="p-3 text-left">Especialidad</th>
                <th className="p-3 text-left">Profesional</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-t border-gray-100">
                  <td className="p-3">{String(t.fecha).slice(0, 10)}</td>
                  <td className="p-3">
                    {t.horaInicio} - {t.horaFin}
                  </td>
                  <td className="p-3">
                    {t.paciente?.apellido}, {t.paciente?.nombre}
                  </td>
                  <td className="p-3">{t.especialidad?.nombre}</td>
                  <td className="p-3">{t.profesional?.nombre || '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${estadoColors[t.estado] || 'bg-gray-100 text-gray-700'}`}>
                      {estados[t.estado] || t.estado}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <select
                        className="border border-gray-300 px-2 py-1 rounded"
                        value={t.estado}
                        onChange={(e) => cambiarEstado(t.id, e.target.value)}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="realizado">Realizado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                      <button
                        onClick={() => cancelarTurno(t.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!items.length ? <div className="p-4 text-gray-600">Sin turnos</div> : null}
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          Vista calendario pendiente. Por ahora usá la vista tabla.
        </div>
      )}

      {showCreate ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit} className="bg-white w-full max-w-md rounded-xl p-6 border border-gray-200">
            <h2 className="text-xl font-bold mb-4">Nuevo turno</h2>

            <div className="mb-3">
              <label className="block text-sm text-gray-700 mb-1">Paciente</label>
              <select
                className="w-full border border-gray-300 px-3 py-2 rounded-lg"
                value={form.pacienteId}
                onChange={(e) => setForm((p) => ({ ...p, pacienteId: e.target.value }))}
                required
              >
                <option value="">Seleccionar</option>
                {pacientes
                  .filter((p) => p.activo)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.apellido}, {p.nombre}
                    </option>
                  ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-sm text-gray-700 mb-1">Especialidad</label>
              <select
                className="w-full border border-gray-300 px-3 py-2 rounded-lg"
                value={form.especialidadId}
                onChange={(e) => setForm((p) => ({ ...p, especialidadId: e.target.value }))}
                required
              >
                <option value="">Seleccionar</option>
                {especialidades
                  .filter((e) => e.activa)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-sm text-gray-700 mb-1">Profesional (opcional)</label>
              <select
                className="w-full border border-gray-300 px-3 py-2 rounded-lg"
                value={form.profesionalId}
                onChange={(e) => setForm((p) => ({ ...p, profesionalId: e.target.value }))}
              >
                <option value="">Sin asignar</option>
                {profesionales
                  .filter((p) => p.activo)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg"
                  value={form.fecha}
                  onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Hora inicio</label>
                <input
                  type="time"
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg"
                  value={form.horaInicio}
                  onChange={(e) => setForm((p) => ({ ...p, horaInicio: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-700 mb-1">Notas (opcional)</label>
              <textarea
                className="w-full border border-gray-300 px-3 py-2 rounded-lg"
                rows={2}
                value={form.notas}
                onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex-1 hover:bg-blue-700 transition">
                Crear
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="bg-gray-200 px-4 py-2 rounded-lg flex-1 hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
