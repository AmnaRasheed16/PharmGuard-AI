// API service layer for PharmaGuard AI
const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let errBody: any = {};
    try { errBody = await res.json(); } catch {}
    const detail = errBody?.detail?.reason 
      ? `${errBody.detail.message}: ${errBody.detail.reason}`
      : (errBody?.detail?.message || errBody?.detail || res.statusText);
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getHealth: () => request<any>('/health'),

  planRoute: (payload: any) =>
    request<any>('/routes/plan', { method: 'POST', body: JSON.stringify(payload) }),

  getShipments: () => request<any[]>('/shipments'),
  getShipment: (id: string) => request<any>(`/shipments/${id}`),
  saveShipment: (payload: any) =>
    request<any>('/shipments/save-planned', { method: 'POST', body: JSON.stringify(payload) }),
  deleteShipment: (id: string) =>
    request<any>(`/shipments/${id}`, { method: 'DELETE' }),

  getSettings: () => request<any>('/settings'),
  updateSettings: (payload: any) =>
    request<any>('/settings', { method: 'POST', body: JSON.stringify(payload) }),

  queryEnvironmental: (payload: any) =>
    request<any>('/environmental/query', { method: 'POST', body: JSON.stringify(payload) }),

  getCarbonFactors: () => request<any>('/carbon/factors'),
};
