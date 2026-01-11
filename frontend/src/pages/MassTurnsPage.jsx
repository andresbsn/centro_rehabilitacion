import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../state/AuthProvider';

export function MassTurnsPage() {
  const { token } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [profesionales, setProfesionales] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);

  const [form, setForm] = useState({
    pacienteId: '',
    especialidadId: '',
    profesionalId: '',
    desde: '',
    hasta: '',
    horaDesde: '09:00',
    horaHasta: '13:00',
    diasSemana: [1, 2, 3, 4, 5],
    estado: 'pendiente',
    notas: '',
    importeMensualGimnasio: '',
    numeroOrden: '',
    cantidadSesiones: ''
  });

  const initialForm = useMemo(
    () => ({
      pacienteId: '',
      especialidadId: '',
      profesionalId: '',
      desde: '',
      hasta: '',
      horaDesde: '09:00',
      horaHasta: '13:00',
      diasSemana: [1, 2, 3, 4, 5],
      estado: 'pendiente',
      notas: '',
      importeMensualGimnasio: '',
      numeroOrden: '',
      cantidadSesiones: ''
    }),
    []
  );

  const selectedEspecialidad = useMemo(
    () => especialidades.find((e) => e.id === form.especialidadId) || null,
    [especialidades, form.especialidadId]
  );

  const isGimnasio = useMemo(() => {
    const n = String(selectedEspecialidad?.nombre || '').trim().toLowerCase();
    return n === 'gimnasio';
  }, [selectedEspecialidad]);

  const isKinesiologia = useMemo(() => {
    const n = String(selectedEspecialidad?.nombre || '').trim().toLowerCase();
    return n === 'kinesiologia';
  }, [selectedEspecialidad]);

  const dias = useMemo(
    () => [
      { v: 0, label: 'Dom' },
      { v: 1, label: 'Lun' },
      { v: 2, label: 'Mar' },
      { v: 3, label: 'Mié' },
      { v: 4, label: 'Jue' },
      { v: 5, label: 'Vie' },
      { v: 6, label: 'Sáb' }
    ],
    []
  );

  useEffect(() => {
    (async () => {
      const [p, e, pr] = await Promise.all([
        apiFetch('/api/pacientes', { token }).catch(() => ({ items: [] })),
        apiFetch('/api/especialidades', { token }).catch(() => ({ items: [] })),
        apiFetch('/api/usuarios/profesionales', { token }).catch(() => ({ items: [] }))
      ]);
      setPacientes((p.items || []).filter((x) => x.activo));
      setEspecialidades((e.items || []).filter((x) => x.activa));
      setProfesionales(pr.items || []);
    })();
  }, [token]);

  function toggleDia(d) {
    setForm((p) => {
      const set = new Set(p.diasSemana);
      if (set.has(d)) set.delete(d);
      else set.add(d);
      return { ...p, diasSemana: Array.from(set).sort() };
    });
  }

  async function doPreview() {
    setLoading(true);
    setError('');
    setSuccess('');
    setResult(null);
    try {
      const body = {
        pacienteId: form.pacienteId,
        especialidadId: form.especialidadId,
        profesionalId: form.profesionalId || null,
        desde: form.desde,
        hasta: form.hasta,
        horaDesde: form.horaDesde,
        horaHasta: form.horaHasta,
        diasSemana: form.diasSemana,
        estado: form.estado,
        notas: form.notas || null,
        ...(isGimnasio ? { importeMensualGimnasio: Number(form.importeMensualGimnasio || 0) } : {}),
        ...(isKinesiologia ? { numeroOrden: Number(form.numeroOrden || 0), cantidadSesiones: Number(form.cantidadSesiones || 0) } : {})
      };

      const data = await apiFetch('/api/turnos/masivo/preview', { token, method: 'POST', body });
      setPreview(data);
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function doConfirm() {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const body = {
        pacienteId: form.pacienteId,
        especialidadId: form.especialidadId,
        profesionalId: form.profesionalId || null,
        desde: form.desde,
        hasta: form.hasta,
        horaDesde: form.horaDesde,
        horaHasta: form.horaHasta,
        diasSemana: form.diasSemana,
        estado: form.estado,
        notas: form.notas || null,
        ...(isGimnasio ? { importeMensualGimnasio: Number(form.importeMensualGimnasio || 0) } : {}),
        ...(isKinesiologia ? { numeroOrden: Number(form.numeroOrden || 0), cantidadSesiones: Number(form.cantidadSesiones || 0) } : {})
      };

      const data = await apiFetch('/api/turnos/masivo/confirm', { token, method: 'POST', body });
      setResult(data);
      setSuccess(`Se crearon ${data.createdCount} turnos. Saltados por conflicto: ${data.skippedConflicts}.`);
      setPreview(null);
      setResult(null);
      setForm(initialForm);
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  const canPreview =
    form.pacienteId &&
    form.especialidadId &&
    form.desde &&
    form.hasta &&
    form.horaDesde &&
    form.horaHasta &&
    Array.isArray(form.diasSemana) &&
    form.diasSemana.length > 0 &&
    (!isGimnasio || Number(form.importeMensualGimnasio || 0) > 0) &&
    (!isKinesiologia || (Number(form.numeroOrden || 0) > 0 && Number(form.cantidadSesiones || 0) > 0));

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Carga masiva de turnos</h1>
      </div>

      {success ? <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg mb-4">{success}</div> : null}
      {error ? <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4">{error}</div> : null}

      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            className="border px-3 py-2 rounded-lg"
            value={form.pacienteId}
            onChange={(e) => setForm((p) => ({ ...p, pacienteId: e.target.value }))}
          >
            <option value="">Paciente</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.apellido}, {p.nombre}
              </option>
            ))}
          </select>

          {isGimnasio ? (
            <input
              type="number"
              min={0}
              className="border px-3 py-2 rounded-lg"
              placeholder="Importe mensual gimnasio"
              value={form.importeMensualGimnasio}
              onChange={(e) => setForm((p) => ({ ...p, importeMensualGimnasio: e.target.value }))}
            />
          ) : null}

          {isKinesiologia ? (
            <>
              <input
                type="number"
                min={1}
                className="border px-3 py-2 rounded-lg"
                placeholder="N° de orden"
                value={form.numeroOrden || ''}
                onChange={(e) => setForm((p) => ({ ...p, numeroOrden: e.target.value }))}
              />
              <input
                type="number"
                min={1}
                className="border px-3 py-2 rounded-lg"
                placeholder="Cantidad de sesiones"
                value={form.cantidadSesiones || ''}
                onChange={(e) => setForm((p) => ({ ...p, cantidadSesiones: e.target.value }))}
              />
            </>
          ) : null}

          <select
            className="border px-3 py-2 rounded-lg"
            value={form.especialidadId}
            onChange={(e) => setForm((p) => ({ ...p, especialidadId: e.target.value }))}
          >
            <option value="">Especialidad</option>
            {especialidades.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>

          <select
            className="border px-3 py-2 rounded-lg"
            value={form.profesionalId}
            onChange={(e) => setForm((p) => ({ ...p, profesionalId: e.target.value }))}
          >
            <option value="">Profesional (opcional)</option>
            {profesionales.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="border px-3 py-2 rounded-lg"
            value={form.desde}
            onChange={(e) => setForm((p) => ({ ...p, desde: e.target.value }))}
          />
          <input
            type="date"
            className="border px-3 py-2 rounded-lg"
            value={form.hasta}
            onChange={(e) => setForm((p) => ({ ...p, hasta: e.target.value }))}
          />

          <select className="border px-3 py-2 rounded-lg" value={form.estado} onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))}>
            <option value="pendiente">Pendiente</option>
            <option value="confirmado">Confirmado</option>
          </select>

          <input
            type="time"
            className="border px-3 py-2 rounded-lg"
            value={form.horaDesde}
            onChange={(e) => setForm((p) => ({ ...p, horaDesde: e.target.value }))}
          />
          <input
            type="time"
            className="border px-3 py-2 rounded-lg"
            value={form.horaHasta}
            onChange={(e) => setForm((p) => ({ ...p, horaHasta: e.target.value }))}
          />

          <input
            className="border px-3 py-2 rounded-lg md:col-span-3"
            placeholder="Notas (opcional)"
            value={form.notas}
            onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))}
          />
        </div>

        <div className="mt-4">
          <div className="text-sm text-gray-600 mb-2">Días de semana</div>
          <div className="flex flex-wrap gap-2">
            {dias.map((d) => {
              const active = form.diasSemana.includes(d.v);
              return (
                <button
                  key={d.v}
                  type="button"
                  onClick={() => toggleDia(d.v)}
                  className={`${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'} px-3 py-2 rounded-lg hover:opacity-90 transition`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={!canPreview || loading}
            onClick={doPreview}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Previsualizar'}
          </button>
          {preview ? (
            <button
              type="button"
              disabled={loading}
              onClick={doConfirm}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              Confirmar creación
            </button>
          ) : null}
        </div>
      </div>

      {preview ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4">
          <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <div className="font-semibold">Previsualización</div>
              <div className="text-sm text-gray-600">
                Total: {preview.summary.total} | Conflictos: {preview.summary.conflicts} | A crear: {preview.summary.creatable}
              </div>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">Fecha</th>
                  <th className="p-3 text-left">Horario</th>
                  <th className="p-3 text-left">Estado</th>
                  <th className="p-3 text-left">Conflicto</th>
                </tr>
              </thead>
              <tbody>
                {preview.items.slice(0, 200).map((t, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="p-3">{t.fecha}</td>
                    <td className="p-3">
                      {t.horaInicio} - {t.horaFin}
                    </td>
                    <td className="p-3">{t.estado}</td>
                    <td className="p-3">
                      {t.conflict ? (
                        <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">Sí</span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {preview.items.length > 200 ? (
              <div className="p-4 text-sm text-gray-600">Mostrando 200 de {preview.items.length} turnos en la previsualización.</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="text-lg font-semibold mb-2">Resultado</div>
          <div className="text-gray-700">
            <div>Total solicitados: {result.totalRequested}</div>
            <div>Creado: {result.createdCount}</div>
            <div>Saltados por conflicto: {result.skippedConflicts}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
