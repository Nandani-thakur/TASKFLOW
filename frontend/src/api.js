// Thin fetch wrapper. Throws an Error with a readable message on any
// non-2xx response, so callers can catch one thing and show it to the user.
//
// In local dev, VITE_API_BASE is unset, so requests go to a relative
// '/api/...' path and Vite's dev-server proxy forwards them to the backend.
// In production (e.g. Vercel), set VITE_API_BASE to the deployed backend's
// URL (e.g. https://taskflow-backend.onrender.com) so requests go straight
// there instead.
const API_BASE = import.meta.env.VITE_API_BASE || '';

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (networkErr) {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  if (res.status === 204) return null;

  let body = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body (fine for some error cases)
  }

  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }

  return body;
}

export const api = {
  getBoard: (id) => request(`/boards/${id}`),
  getBoardStats: (id) => request(`/boards/${id}/stats`),
  createTask: (data) =>
    request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id, data) =>
    request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  moveTask: (id, columnId) =>
    request(`/tasks/${id}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ columnId }),
    }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
};