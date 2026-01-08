const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function getApiUrl() {
  return API_URL;
}

export async function apiFetch(path, { token, method, body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message = data?.error?.message || `HTTP ${res.status}`;
    const code = data?.error?.code;
    const meta = data?.error?.meta;
    const err = new Error(message);
    err.code = code;
    err.meta = meta;
    err.status = res.status;
    throw err;
  }

  return data;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
