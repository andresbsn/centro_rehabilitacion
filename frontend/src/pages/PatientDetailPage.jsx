import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { apiFetch } from '../api/client.js';
import { useAuth } from '../state/AuthProvider.jsx';

export function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [paciente, setPaciente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [activeTab, setActiveTab] = useState('datos');

  const [seguimientos, setSeguimientos] = useState([]);
  const [segLoading, setSegLoading] = useState(false);
  const [segError, setSegError] = useState('');
  const [segFilters, setSegFilters] = useState({ tipo: '', search: '' });
  const [showSegModal, setShowSegModal] = useState(false);
  const [editingSeg, setEditingSeg] = useState(null);
  const [segForm, setSegForm] = useState({ tipo: 'GENERAL', texto: '' });
  const [turnos, setTurnos] = useState([]);
  const [turnosLoading, setTurnosLoading] = useState(false);
  const [turnosError, setTurnosError] = useState('');
  const [pagosGimnasio, setPagosGimnasio] = useState([]);
  const [pagosGimnasioLoading, setPagosGimnasioLoading] = useState(false);
  const [pagosGimnasioError, setPagosGimnasioError] = useState('');
  const [obrasSociales, setObrasSociales] = useState([]);
  const [editForm, setEditForm] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    fechaNacimiento: '',
    telefono: '',
    email: '',
    direccion: '',
    contactoEmergencia: '',
    tieneObraSocial: false,
    obraSocialId: '',
    nuevaObraSocial: '',
    numeroAfiliado: '',
    observacionesObraSocial: ''
  });

  const canCobrarTurnos = user?.role === 'admin' || user?.role === 'recepcion';

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError('');
        setLoading(true);
        const data = await apiFetch(`/api/pacientes/${id}`, { token });
        if (!cancelled) setPaciente(data.paciente);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  async function loadPagosGimnasio() {
    if (!token) return;
    setPagosGimnasioLoading(true);
    setPagosGimnasioError('');
    try {
      const data = await apiFetch(`/api/pagos-gimnasio?pacienteId=${encodeURIComponent(id)}`, { token });
      setPagosGimnasio(data.items || []);
    } catch (e) {
      setPagosGimnasioError(e.message || 'Error');
    } finally {
      setPagosGimnasioLoading(false);
    }
  }

  useEffect(() => {
    apiFetch('/api/obras-sociales', { token })
      .then((data) => setObrasSociales(data?.items || []))
      .catch(() => setObrasSociales([]));
  }, [token]);

  async function loadSeguimientos() {
    if (!token) return;
    setSegLoading(true);
    setSegError('');
    try {
      const qs = new URLSearchParams();
      if (segFilters.tipo) qs.set('tipo', segFilters.tipo);
      if (segFilters.search.trim()) qs.set('search', segFilters.search.trim());
      const data = await apiFetch(`/api/pacientes/${id}/seguimientos?${qs.toString()}`, { token });
      setSeguimientos(data.items || []);
    } catch (e) {
      setSegError(e.message || 'Error');
    } finally {
      setSegLoading(false);
    }
  }

  async function loadTurnos() {
    if (!token) return;
    setTurnosLoading(true);
    setTurnosError('');
    try {
      const data = await apiFetch(`/api/turnos?pacienteId=${encodeURIComponent(id)}`, { token });
      setTurnos(data.items || []);
    } catch (e) {
      setTurnosError(e.message || 'Error');
    } finally {
      setTurnosLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab !== 'seguimiento') return;
    loadSeguimientos();
    loadTurnos();
    loadPagosGimnasio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  function openEdit() {
    if (!paciente) return;

    const os = paciente.obraSocial;
    const fecha = paciente.fechaNacimiento ? String(paciente.fechaNacimiento).slice(0, 10) : '';

    setEditForm({
      nombre: paciente.nombre || '',
      apellido: paciente.apellido || '',
      dni: paciente.dni || '',
      fechaNacimiento: fecha,
      telefono: paciente.telefono || '',
      email: paciente.email || '',
      direccion: paciente.direccion || '',
      contactoEmergencia: paciente.contactoEmergencia || '',
      tieneObraSocial: Boolean(os),
      obraSocialId: os?.obraSocialId || '',
      nuevaObraSocial: '',
      numeroAfiliado: os?.numeroAfiliado || '',
      observacionesObraSocial: os?.observaciones || ''
    });
    setShowEdit(true);
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!paciente) return;
    setError('');

    try {
      setSaving(true);

      const obraSocialNombre = editForm.nuevaObraSocial.trim();
      const numeroAfiliado = editForm.numeroAfiliado.trim();
      const obsOS = editForm.observacionesObraSocial.trim();

      const body = {
        nombre: editForm.nombre.trim(),
        apellido: editForm.apellido.trim(),
        dni: editForm.dni.trim(),
        fechaNacimiento: editForm.fechaNacimiento,
        telefono: editForm.telefono.trim(),
        email: editForm.email.trim() || null,
        direccion: editForm.direccion.trim(),
        contactoEmergencia: editForm.contactoEmergencia.trim()
      };

      if (editForm.tieneObraSocial) {
        body.obraSocial = {
          ...(editForm.obraSocialId
            ? { obraSocialId: editForm.obraSocialId }
            : obraSocialNombre
              ? { nuevaObraSocial: { nombre: obraSocialNombre } }
              : {}),
          numeroAfiliado,
          ...(obsOS ? { observaciones: obsOS } : {})
        };
      } else if (paciente.obraSocial) {
        body.obraSocial = null;
      }

      const data = await apiFetch(`/api/pacientes/${id}`, { token, method: 'PUT', body });
      setPaciente(data.paciente);
      setShowEdit(false);
    } catch (e) {
      const details = e?.meta?.details;
      if (Array.isArray(details) && details.length) {
        setError(`${e.message}: ${details.map((d) => `${d.path}: ${d.message}`).join(', ')}`);
      } else {
        setError(e.message || 'Error');
      }
    } finally {
      setSaving(false);
    }
  }

  function canMutateSeguimiento(seg) {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'recepcion') return true;
    if (user.role === 'profesional') return seg ? seg.profesionalId === user.id : true;
    return false;
  }

  async function saveSeguimiento(e) {
    e.preventDefault();
    setSegError('');
    try {
      setSaving(true);
      const body = { tipo: segForm.tipo, texto: segForm.texto.trim() };
      if (!body.texto) throw new Error('Texto requerido');

      if (editingSeg) {
        const data = await apiFetch(`/api/pacientes/${id}/seguimientos/${editingSeg.id}`, { token, method: 'PUT', body });
        setSeguimientos((prev) => prev.map((s) => (s.id === editingSeg.id ? data.seguimiento : s)));
      } else {
        const data = await apiFetch(`/api/pacientes/${id}/seguimientos`, { token, method: 'POST', body });
        setSeguimientos((prev) => [data.seguimiento, ...prev]);
      }
      setShowSegModal(false);
      setEditingSeg(null);
      setSegForm({ tipo: 'GENERAL', texto: '' });
    } catch (e) {
      setSegError(e.message || 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function deleteSeguimiento(seg) {
    const ok = window.confirm('¿Eliminar seguimiento?');
    if (!ok) return;
    setSegError('');
    try {
      setSaving(true);
      await apiFetch(`/api/pacientes/${id}/seguimientos/${seg.id}`, { token, method: 'DELETE' });
      setSeguimientos((prev) => prev.filter((s) => s.id !== seg.id));
    } catch (e) {
      setSegError(e.message || 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Paciente</h1>
          <div className="text-sm text-gray-500">ID: {id}</div>
        </div>
        <div className="flex gap-2">
          <Link className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 transition" to="/pacientes">
            Volver
          </Link>
          <button
            type="button"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            disabled={!paciente || saving}
            onClick={openEdit}
          >
            Editar
          </button>
          <button
            type="button"
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
            disabled={saving || !paciente || !paciente.activo}
            onClick={async () => {
              if (!paciente) return;
              const ok = window.confirm('¿Inactivar paciente?');
              if (!ok) return;

              try {
                setSaving(true);
                const data = await apiFetch(`/api/pacientes/${id}`, { token, method: 'DELETE' });
                setPaciente(data.paciente);
              } catch (e) {
                setError(e.message || 'Error');
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Procesando...' : 'Inactivar'}
          </button>
        </div>
      </div>

      {loading ? <div className="text-gray-600">Cargando...</div> : null}
      {error ? <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4">{error}</div> : null}

      {paciente ? (
        <div className="grid gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-2">
            <div className="flex gap-2 border-b border-gray-200 px-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('datos')}
                className={`px-3 py-2 rounded-t-lg text-sm ${activeTab === 'datos' ? 'bg-gray-100 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Datos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('seguimiento')}
                className={`px-3 py-2 rounded-t-lg text-sm ${activeTab === 'seguimiento' ? 'bg-gray-100 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Seguimiento
              </button>
            </div>

            {activeTab === 'datos' ? (
              <div className="p-3 grid gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <div className="text-gray-500 text-sm">Apellido</div>
                      <div className="font-semibold">{paciente.apellido}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-sm">Nombre</div>
                      <div className="font-semibold">{paciente.nombre}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-sm">DNI</div>
                      <div className="font-semibold">{paciente.dni}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-sm">Teléfono</div>
                      <div className="font-semibold">{paciente.telefono}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-sm">Estado</div>
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${paciente.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {paciente.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <div className="text-gray-500 text-sm">Email</div>
                      <div className="font-semibold">{paciente.email || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-sm">Dirección</div>
                      <div className="font-semibold">{paciente.direccion}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-sm">Contacto emergencia</div>
                      <div className="font-semibold">{paciente.contactoEmergencia}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <h2 className="text-lg font-semibold mb-2">Obra social</h2>
                  {paciente.obraSocial ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-gray-500 text-sm">Nombre</div>
                        <div className="font-semibold">{paciente.obraSocial.obraSocial?.nombre}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-sm">Plan</div>
                        <div className="font-semibold">{paciente.obraSocial.obraSocial?.plan || '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-sm">N° afiliado</div>
                        <div className="font-semibold">{paciente.obraSocial.numeroAfiliado}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-sm">Obs</div>
                        <div className="font-semibold">{paciente.obraSocial.observaciones || '-'}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-600">Sin obra social cargada</div>
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === 'seguimiento' ? (
              <div className="p-3">
                {segError ? <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-3">{segError}</div> : null}

                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                  <h2 className="text-lg font-semibold mb-2">Turnos</h2>
                  {turnosError ? <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-3">{turnosError}</div> : null}
                  {turnosLoading ? <div className="text-gray-600">Cargando...</div> : null}

                  {!turnosLoading ? (
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="p-2 text-left">Fecha</th>
                            <th className="p-2 text-left">Hora</th>
                            <th className="p-2 text-left">Especialidad</th>
                            <th className="p-2 text-left">Profesional</th>
                            <th className="p-2 text-left">Estado</th>
                            <th className="p-2 text-left">Coseguro</th>
                            <th className="p-2 text-left">Cobrado</th>
                            <th className="p-2 text-left">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {turnos.map((t) => (
                            <tr key={t.id} className="border-t border-gray-100">
                              <td className="p-2">{String(t.fecha).slice(0, 10)}</td>
                              <td className="p-2">
                                {t.horaInicio} - {t.horaFin}
                              </td>
                              <td className="p-2">{t.especialidad?.nombre || '-'}</td>
                              <td className="p-2">{t.profesional?.nombre || '-'}</td>
                              <td className="p-2">{t.estado || '-'}</td>
                              <td className="p-2">{Number(t.importeCoseguro || 0)}</td>
                              <td className="p-2">{t.cobrado ? 'Sí' : 'No'}</td>
                              <td className="p-2">
                                {canCobrarTurnos && !t.cobrado ? (
                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={async () => {
                                      const ok = window.confirm('¿Cobrar este turno?');
                                      if (!ok) return;
                                      try {
                                        setSaving(true);
                                        await apiFetch(`/api/turnos/${t.id}/cobrar`, { token, method: 'POST' });
                                        await loadTurnos();
                                      } catch (e) {
                                        setTurnosError(e.message || 'Error');
                                      } finally {
                                        setSaving(false);
                                      }
                                    }}
                                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
                                  >
                                    Cobrar
                                  </button>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!turnos.length ? <div className="text-gray-600 mt-2">Sin turnos</div> : null}
                    </div>
                  ) : null}
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                  <h2 className="text-lg font-semibold mb-2">Gimnasio (mensual)</h2>
                  {pagosGimnasioError ? <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-3">{pagosGimnasioError}</div> : null}
                  {pagosGimnasioLoading ? <div className="text-gray-600">Cargando...</div> : null}

                  {!pagosGimnasioLoading ? (
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="p-2 text-left">Mes</th>
                            <th className="p-2 text-right">Importe</th>
                            <th className="p-2 text-left">Cobrado</th>
                            <th className="p-2 text-left">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagosGimnasio.map((p) => (
                            <tr key={p.id} className="border-t border-gray-100">
                              <td className="p-2">{p.yearMonth}</td>
                              <td className="p-2 text-right">{Number(p.importe || 0)}</td>
                              <td className="p-2">{p.cobrado ? 'Sí' : 'No'}</td>
                              <td className="p-2">
                                {canCobrarTurnos && !p.cobrado ? (
                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={async () => {
                                      const ok = window.confirm(`¿Cobrar gimnasio del mes ${p.yearMonth}?`);
                                      if (!ok) return;
                                      try {
                                        setSaving(true);
                                        await apiFetch(`/api/pagos-gimnasio/${p.id}/cobrar`, { token, method: 'POST' });
                                        await loadPagosGimnasio();
                                      } catch (e) {
                                        setPagosGimnasioError(e.message || 'Error');
                                      } finally {
                                        setSaving(false);
                                      }
                                    }}
                                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
                                  >
                                    Cobrar
                                  </button>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!pagosGimnasio.length ? <div className="text-gray-600 mt-2">Sin pagos mensuales generados</div> : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                  <div className="flex flex-col md:flex-row gap-2">
                    <select
                      className="border px-3 py-2 rounded-lg"
                      value={segFilters.tipo}
                      onChange={(e) => setSegFilters((p) => ({ ...p, tipo: e.target.value }))}
                    >
                      <option value="">Tipo (todos)</option>
                      <option value="KINESIOLOGIA">Kinesiología</option>
                      <option value="GIMNASIO">Gimnasio</option>
                      <option value="GENERAL">General</option>
                      <option value="OTRO">Otro</option>
                    </select>
                    <input
                      className="border px-3 py-2 rounded-lg"
                      placeholder="Buscar texto"
                      value={segFilters.search}
                      onChange={(e) => setSegFilters((p) => ({ ...p, search: e.target.value }))}
                    />
                    <button
                      type="button"
                      disabled={segLoading}
                      onClick={loadSeguimientos}
                      className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
                    >
                      Filtrar
                    </button>
                  </div>

                  {canMutateSeguimiento(null) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSeg(null);
                        setSegForm({ tipo: 'GENERAL', texto: '' });
                        setShowSegModal(true);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      Nuevo
                    </button>
                  ) : null}
                </div>

                {segLoading ? <div className="text-gray-600">Cargando...</div> : null}
                {!segLoading && seguimientos.length === 0 ? <div className="text-gray-600">Sin seguimientos</div> : null}

                <div className="grid gap-3">
                  {seguimientos.map((s) => (
                    <div key={s.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                        <div>
                          <div className="text-sm text-gray-500">
                            {String(s.fecha).slice(0, 10)} · {s.tipo} · {s.profesional?.nombre || 'Profesional'}
                          </div>
                          <div className="whitespace-pre-wrap mt-1">{s.texto}</div>
                        </div>

                        {canMutateSeguimiento(s) ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => {
                                setEditingSeg(s);
                                setSegForm({ tipo: s.tipo, texto: s.texto });
                                setShowSegModal(true);
                              }}
                              className="bg-gray-200 px-3 py-2 rounded-lg hover:bg-gray-300 transition"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => deleteSeguimiento(s)}
                              className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition"
                            >
                              Eliminar
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showSegModal ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={saveSeguimiento} className="bg-white w-full max-w-xl rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{editingSeg ? 'Editar seguimiento' : 'Nuevo seguimiento'}</h2>
              <button
                type="button"
                className="bg-gray-200 px-3 py-2 rounded-lg hover:bg-gray-300 transition"
                onClick={() => setShowSegModal(false)}
              >
                Cerrar
              </button>
            </div>

            <select
              className="border px-3 py-2 rounded-lg w-full mb-3"
              value={segForm.tipo}
              onChange={(e) => setSegForm((p) => ({ ...p, tipo: e.target.value }))}
            >
              <option value="KINESIOLOGIA">Kinesiología</option>
              <option value="GIMNASIO">Gimnasio</option>
              <option value="GENERAL">General</option>
              <option value="OTRO">Otro</option>
            </select>

            <textarea
              className="border px-3 py-2 rounded-lg w-full mb-4"
              rows={6}
              placeholder="Texto"
              value={segForm.texto}
              onChange={(e) => setSegForm((p) => ({ ...p, texto: e.target.value }))}
              required
            />

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex-1 hover:bg-blue-700 transition"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setShowSegModal(false)}
                className="bg-gray-200 px-4 py-2 rounded-lg flex-1 hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showEdit ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleUpdate} className="bg-white w-full max-w-xl rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Editar paciente</h2>
              <button
                type="button"
                className="bg-gray-200 px-3 py-2 rounded-lg hover:bg-gray-300 transition"
                onClick={() => setShowEdit(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                className="border px-3 py-2 rounded-lg"
                placeholder="Nombre"
                value={editForm.nombre}
                onChange={(e) => setEditForm((p) => ({ ...p, nombre: e.target.value }))}
                required
              />
              <input
                className="border px-3 py-2 rounded-lg"
                placeholder="Apellido"
                value={editForm.apellido}
                onChange={(e) => setEditForm((p) => ({ ...p, apellido: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                className="border px-3 py-2 rounded-lg"
                placeholder="DNI"
                value={editForm.dni}
                onChange={(e) => setEditForm((p) => ({ ...p, dni: e.target.value }))}
                required
              />
              <input
                className="border px-3 py-2 rounded-lg"
                placeholder="Teléfono"
                value={editForm.telefono}
                onChange={(e) => setEditForm((p) => ({ ...p, telefono: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                className="border px-3 py-2 rounded-lg"
                type="date"
                value={editForm.fechaNacimiento}
                onChange={(e) => setEditForm((p) => ({ ...p, fechaNacimiento: e.target.value }))}
                required
              />
              <input
                className="border px-3 py-2 rounded-lg"
                placeholder="Contacto emergencia"
                value={editForm.contactoEmergencia}
                onChange={(e) => setEditForm((p) => ({ ...p, contactoEmergencia: e.target.value }))}
                required
              />
            </div>

            <input
              className="border px-3 py-2 rounded-lg w-full mb-3"
              placeholder="Dirección"
              value={editForm.direccion}
              onChange={(e) => setEditForm((p) => ({ ...p, direccion: e.target.value }))}
              required
            />

            <input
              className="border px-3 py-2 rounded-lg w-full mb-3"
              placeholder="Email (opcional)"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
            />

            <label className="flex items-center gap-2 text-sm text-gray-700 mb-3">
              <input
                type="checkbox"
                checked={editForm.tieneObraSocial}
                onChange={(e) =>
                  setEditForm((p) => ({
                    ...p,
                    tieneObraSocial: e.target.checked,
                    obraSocialId: '',
                    nuevaObraSocial: '',
                    numeroAfiliado: '',
                    observacionesObraSocial: ''
                  }))
                }
              />
              Cargar / actualizar obra social
            </label>

            {editForm.tieneObraSocial ? (
              <>
                <select
                  className="border px-3 py-2 rounded-lg w-full mb-3"
                  value={editForm.obraSocialId}
                  onChange={(e) => setEditForm((p) => ({ ...p, obraSocialId: e.target.value, nuevaObraSocial: '' }))}
                >
                  <option value="">Seleccionar obra social</option>
                  {obrasSociales.map((os) => (
                    <option key={os.id} value={os.id}>
                      {os.nombre}
                      {os.plan ? ` — ${os.plan}` : ''}
                    </option>
                  ))}
                </select>

                {!editForm.obraSocialId ? (
                  <input
                    className="border px-3 py-2 rounded-lg w-full mb-3"
                    placeholder="Nueva obra social (nombre)"
                    value={editForm.nuevaObraSocial}
                    onChange={(e) => setEditForm((p) => ({ ...p, nuevaObraSocial: e.target.value }))}
                  />
                ) : null}

                <input
                  className="border px-3 py-2 rounded-lg w-full mb-3"
                  placeholder="N° afiliado"
                  value={editForm.numeroAfiliado}
                  onChange={(e) => setEditForm((p) => ({ ...p, numeroAfiliado: e.target.value }))}
                  required
                />

                <input
                  className="border px-3 py-2 rounded-lg w-full mb-4"
                  placeholder="Observaciones obra social (opcional)"
                  value={editForm.observacionesObraSocial}
                  onChange={(e) => setEditForm((p) => ({ ...p, observacionesObraSocial: e.target.value }))}
                />
              </>
            ) : null}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex-1 hover:bg-blue-700 transition"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
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
