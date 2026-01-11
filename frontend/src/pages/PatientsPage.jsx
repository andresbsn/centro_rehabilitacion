import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../state/AuthProvider';

export default function PatientsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [obrasSociales, setObrasSociales] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const data = await apiFetch(`/api/pacientes?${params.toString()}`, { token });
      setItems(data.items || []);
    } catch (e) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, [search, token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    apiFetch('/api/obras-sociales', { token })
      .then((data) => setObrasSociales(data?.items || []))
      .catch(() => setObrasSociales([]));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      const obraSocialNombre = form.nuevaObraSocial.trim();
      const numeroAfiliado = form.numeroAfiliado.trim();
      const obsOS = form.observacionesObraSocial.trim();

      const payload = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        dni: form.dni.trim(),
        fechaNacimiento: form.fechaNacimiento,
        telefono: form.telefono.trim(),
        email: form.email.trim() || null,
        direccion: form.direccion.trim(),
        contactoEmergencia: form.contactoEmergencia.trim(),
        obraSocial: form.tieneObraSocial
          ? {
              ...(form.obraSocialId
                ? { obraSocialId: form.obraSocialId }
                : obraSocialNombre
                  ? { nuevaObraSocial: { nombre: obraSocialNombre } }
                  : {}),
              numeroAfiliado,
              ...(obsOS ? { observaciones: obsOS } : {})
            }
          : undefined
      };

      await apiFetch('/api/pacientes', { token, method: 'POST', body: payload });
      setShowCreate(false);
      setForm({
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
      await load();
    } catch (e) {
      setError(e.message || 'Error');
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <input
          type="text"
          placeholder="Buscar paciente (apellido, DNI, teléfono)..."
          className="border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full md:w-96"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          Nuevo paciente
        </button>
      </div>

      {error ? <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4">{error}</div> : null}

      {loading ? (
        <p className="text-gray-600">Cargando...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">
                    {p.apellido}, {p.nombre}
                  </h3>
                  <p className="text-sm text-gray-600">DNI: {p.dni}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {p.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="text-sm text-gray-700 space-y-1">
                <p>Tel: {p.telefono}</p>
                {p.email ? <p>Email: {p.email}</p> : null}
                {p.obraSocial?.obraSocial ? <p>Obra Social: {p.obraSocial.obraSocial.nombre}</p> : null}
              </div>

              <div className="mt-4 flex gap-2">
                <Link to={`/pacientes/${p.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Ver detalle
                </Link>
              </div>
            </div>
          ))}

          {!items.length ? <div className="text-gray-600">Sin resultados</div> : null}
        </div>
      )}

      {showCreate ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit} className="bg-white w-full max-w-md rounded-xl p-6 border border-gray-200">
            <h2 className="text-xl font-bold mb-4">Nuevo paciente</h2>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                className="border px-3 py-2 rounded-lg"
                placeholder="Nombre"
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                required
              />
              <input
                className="border px-3 py-2 rounded-lg"
                placeholder="Apellido"
                value={form.apellido}
                onChange={(e) => setForm((p) => ({ ...p, apellido: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                className="border px-3 py-2 rounded-lg"
                placeholder="DNI"
                value={form.dni}
                onChange={(e) => setForm((p) => ({ ...p, dni: e.target.value }))}
                required
              />
              <input
                className="border px-3 py-2 rounded-lg"
                placeholder="Teléfono"
                value={form.telefono}
                onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                className="border px-3 py-2 rounded-lg"
                type="date"
                value={form.fechaNacimiento}
                onChange={(e) => setForm((p) => ({ ...p, fechaNacimiento: e.target.value }))}
                required
              />
              <input
                className="border px-3 py-2 rounded-lg"
                placeholder="Contacto emergencia"
                value={form.contactoEmergencia}
                onChange={(e) => setForm((p) => ({ ...p, contactoEmergencia: e.target.value }))}
                required
              />
            </div>

            <input
              className="border px-3 py-2 rounded-lg w-full mb-3"
              placeholder="Dirección"
              value={form.direccion}
              onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))}
              required
            />

            <input
              className="border px-3 py-2 rounded-lg w-full mb-3"
              placeholder="Email (opcional)"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />

            <label className="flex items-center gap-2 text-sm text-gray-700 mb-3">
              <input
                type="checkbox"
                checked={form.tieneObraSocial}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    tieneObraSocial: e.target.checked,
                    obraSocialId: '',
                    nuevaObraSocial: '',
                    numeroAfiliado: '',
                    observacionesObraSocial: ''
                  }))
                }
              />
              Cargar obra social
            </label>

            {form.tieneObraSocial ? (
              <>
                <select
                  className="border px-3 py-2 rounded-lg w-full mb-3"
                  value={form.obraSocialId}
                  onChange={(e) => setForm((p) => ({ ...p, obraSocialId: e.target.value, nuevaObraSocial: '' }))}
                >
                  <option value="">Seleccionar obra social</option>
                  {obrasSociales.map((os) => (
                    <option key={os.id} value={os.id}>
                      {os.nombre}
                      {os.plan ? ` — ${os.plan}` : ''}
                    </option>
                  ))}
                </select>

                {!form.obraSocialId ? (
                  <input
                    className="border px-3 py-2 rounded-lg w-full mb-3"
                    placeholder="Nueva obra social (nombre)"
                    value={form.nuevaObraSocial}
                    onChange={(e) => setForm((p) => ({ ...p, nuevaObraSocial: e.target.value }))}
                  />
                ) : null}

                <input
                  className="border px-3 py-2 rounded-lg w-full mb-3"
                  placeholder="N° afiliado"
                  value={form.numeroAfiliado}
                  onChange={(e) => setForm((p) => ({ ...p, numeroAfiliado: e.target.value }))}
                  required
                />

                <input
                  className="border px-3 py-2 rounded-lg w-full mb-4"
                  placeholder="Observaciones obra social (opcional)"
                  value={form.observacionesObraSocial}
                  onChange={(e) => setForm((p) => ({ ...p, observacionesObraSocial: e.target.value }))}
                />
              </>
            ) : null}

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
