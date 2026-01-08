import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../state/AuthProvider';

export default function ConfigPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState('especialidades');

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nombre: '', duracionTurnoMin: 30, activa: true });

  const [obrasItems, setObrasItems] = useState([]);
  const [obrasSearch, setObrasSearch] = useState('');
  const [obrasLoading, setObrasLoading] = useState(false);
  const [obrasError, setObrasError] = useState(null);
  const [obrasShowCreate, setObrasShowCreate] = useState(false);
  const [obrasEditing, setObrasEditing] = useState(null);
  const [obrasForm, setObrasForm] = useState({ nombre: '', plan: '', observaciones: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const data = await apiFetch(`/api/especialidades?${params}`, { token });
      setItems(data.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, token]);

  const loadObras = useCallback(async () => {
    setObrasLoading(true);
    setObrasError(null);
    try {
      const params = new URLSearchParams();
      if (obrasSearch) params.set('search', obrasSearch);
      const data = await apiFetch(`/api/obras-sociales?${params}`, { token });
      setObrasItems(data.items || []);
    } catch (e) {
      setObrasError(e.message);
    } finally {
      setObrasLoading(false);
    }
  }, [obrasSearch, token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadObras();
  }, [loadObras]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const payload = {
      nombre: form.nombre.trim(),
      duracionTurnoMin: Number(form.duracionTurnoMin),
      activa: Boolean(form.activa)
    };

    try {
      await apiFetch(editing ? `/api/especialidades/${editing.id}` : '/api/especialidades', {
        token,
        method: editing ? 'PUT' : 'POST',
        body: payload
      });
      await load();
      setShowCreate(false);
      setEditing(null);
      setForm({ nombre: '', duracionTurnoMin: 30, activa: true });
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleSubmitObra(e) {
    e.preventDefault();
    setObrasError(null);

    const payload = {
      nombre: obrasForm.nombre.trim(),
      plan: obrasForm.plan.trim() ? obrasForm.plan.trim() : null,
      observaciones: obrasForm.observaciones.trim() ? obrasForm.observaciones.trim() : null
    };

    try {
      await apiFetch(obrasEditing ? `/api/obras-sociales/${obrasEditing.id}` : '/api/obras-sociales', {
        token,
        method: obrasEditing ? 'PUT' : 'POST',
        body: payload
      });
      await loadObras();
      setObrasShowCreate(false);
      setObrasEditing(null);
      setObrasForm({ nombre: '', plan: '', observaciones: '' });
    } catch (e) {
      setObrasError(e.message);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ nombre: '', duracionTurnoMin: 30, activa: true });
    setShowCreate(true);
  }

  function openCreateObra() {
    setObrasEditing(null);
    setObrasForm({ nombre: '', plan: '', observaciones: '' });
    setObrasShowCreate(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({ nombre: item.nombre, duracionTurnoMin: item.duracionTurnoMin, activa: item.activa });
    setShowCreate(true);
  }

  function openEditObra(item) {
    setObrasEditing(item);
    setObrasForm({
      nombre: item.nombre || '',
      plan: item.plan || '',
      observaciones: item.observaciones || ''
    });
    setObrasShowCreate(true);
  }

  async function toggleActiva(item) {
    setError(null);
    try {
      await apiFetch(`/api/especialidades/${item.id}`, {
        token,
        method: 'PUT',
        body: { activa: !item.activa }
      });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Configuración</h1>

      <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-2 rounded ${tab === 'especialidades' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setTab('especialidades')}
        >
          Especialidades
        </button>
        <button
          className={`px-3 py-2 rounded ${tab === 'obras' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setTab('obras')}
        >
          Obras sociales
        </button>
      </div>

      {tab === 'especialidades' && (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar especialidad..."
              className="border px-3 py-2 rounded w-full max-w-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}

          <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded mb-4">
            Nueva especialidad
          </button>

          {loading ? (
            <p>Cargando...</p>
          ) : (
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Nombre</th>
                  <th className="border p-2 text-left">Duración (min)</th>
                  <th className="border p-2 text-left">Activa</th>
                  <th className="border p-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="border p-2">{item.nombre}</td>
                    <td className="border p-2">{item.duracionTurnoMin}</td>
                    <td className="border p-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          item.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {item.activa ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="border p-2">
                      <button onClick={() => openEdit(item)} className="bg-yellow-500 text-white px-2 py-1 rounded mr-2">
                        Editar
                      </button>
                      <button
                        onClick={() => toggleActiva(item)}
                        className={`px-2 py-1 rounded text-white ${item.activa ? 'bg-gray-500' : 'bg-green-600'}`}
                      >
                        {item.activa ? 'Inactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {showCreate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <form onSubmit={handleSubmit} className="bg-white p-6 rounded w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">{editing ? 'Editar especialidad' : 'Nueva especialidad'}</h2>
                <div className="mb-3">
                  <label className="block mb-1">Nombre</label>
                  <input
                    className="border px-3 py-2 rounded w-full"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="block mb-1">Duración del turno (minutos)</label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    className="border px-3 py-2 rounded w-full"
                    value={form.duracionTurnoMin}
                    onChange={(e) => setForm({ ...form, duracionTurnoMin: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={form.activa}
                      onChange={(e) => setForm({ ...form, activa: e.target.checked })}
                    />
                    Activa
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded flex-1">
                    {editing ? 'Guardar cambios' : 'Crear'}
                  </button>
                  <button type="button" onClick={() => setShowCreate(false)} className="bg-gray-300 px-4 py-2 rounded flex-1">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {tab === 'obras' && (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar obra social o plan..."
              className="border px-3 py-2 rounded w-full max-w-sm"
              value={obrasSearch}
              onChange={(e) => setObrasSearch(e.target.value)}
            />
          </div>

          {obrasError && <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{obrasError}</div>}

          <button onClick={openCreateObra} className="bg-blue-600 text-white px-4 py-2 rounded mb-4">
            Nueva obra social
          </button>

          {obrasLoading ? (
            <p>Cargando...</p>
          ) : (
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Nombre</th>
                  <th className="border p-2 text-left">Plan</th>
                  <th className="border p-2 text-left">Observaciones</th>
                  <th className="border p-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {obrasItems.map((item) => (
                  <tr key={item.id}>
                    <td className="border p-2">{item.nombre}</td>
                    <td className="border p-2">{item.plan || '-'}</td>
                    <td className="border p-2">{item.observaciones || '-'}</td>
                    <td className="border p-2">
                      <button onClick={() => openEditObra(item)} className="bg-yellow-500 text-white px-2 py-1 rounded">
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {obrasShowCreate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <form onSubmit={handleSubmitObra} className="bg-white p-6 rounded w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">{obrasEditing ? 'Editar obra social' : 'Nueva obra social'}</h2>
                <div className="mb-3">
                  <label className="block mb-1">Nombre</label>
                  <input
                    className="border px-3 py-2 rounded w-full"
                    value={obrasForm.nombre}
                    onChange={(e) => setObrasForm({ ...obrasForm, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="block mb-1">Plan</label>
                  <input
                    className="border px-3 py-2 rounded w-full"
                    value={obrasForm.plan}
                    onChange={(e) => setObrasForm({ ...obrasForm, plan: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-1">Observaciones</label>
                  <textarea
                    className="border px-3 py-2 rounded w-full"
                    value={obrasForm.observaciones}
                    onChange={(e) => setObrasForm({ ...obrasForm, observaciones: e.target.value })}
                    placeholder="Opcional"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded flex-1">
                    {obrasEditing ? 'Guardar cambios' : 'Crear'}
                  </button>
                  <button type="button" onClick={() => setObrasShowCreate(false)} className="bg-gray-300 px-4 py-2 rounded flex-1">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
