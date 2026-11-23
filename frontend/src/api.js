import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 15000,
});

// Chatbot needs more time for AI API calls + DB context building
export const chatbotApi = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 45000,
});

// Share same request interceptor (auth headers)
const addAuthHeaders = (config) => {
  const role = localStorage.getItem('ocean_role');
  const wilayah = localStorage.getItem('ocean_wilayah');
  const provinsi = localStorage.getItem('ocean_provinsi');
  if (role) config.headers['X-User-Role'] = role;
  if (wilayah) config.headers['X-User-Wilayah'] = wilayah;
  if (provinsi) config.headers['X-User-Provinsi'] = provinsi;
  return config;
};

chatbotApi.interceptors.request.use(addAuthHeaders);
api.interceptors.request.use(addAuthHeaders);

// --- Sandbox Simulator Helper (Local-only, never corrupts live Admin/Operator DB) ---
export function getSandboxState() {
  try {
    const raw = localStorage.getItem('ocean_sandbox');
    if (!raw) return { active_anomaly: 'normal', drain_battery: false, sensor_overrides: {}, last_run: new Date().toISOString() };
    const parsed = JSON.parse(raw);
    return {
      active_anomaly: parsed.active_anomaly || 'normal',
      drain_battery: Boolean(parsed.drain_battery),
      sensor_overrides: parsed.sensor_overrides || {},
      last_run: parsed.last_run || new Date().toISOString(),
    };
  } catch {
    return { active_anomaly: 'normal', drain_battery: false, sensor_overrides: {}, last_run: new Date().toISOString() };
  }
}

function applySandboxToReading(reading, anomaly) {
  if (!reading || anomaly === 'normal') return reading;
  const r = { ...reading };
  if (anomaly === 'heatwave') {
    r.suhu_celsius = Number(((r.suhu_celsius ?? 28) + 4.2).toFixed(2));
    r.do_mg_l = Number(Math.max(2.1, (r.do_mg_l ?? 6.5) - 2.1).toFixed(2));
    r.health_index = Math.max(22, Math.round((r.health_index ?? 85) - 38));
  } else if (anomaly === 'acidification') {
    r.ph = Number(Math.max(5.8, (r.ph ?? 8.1) - 1.1).toFixed(2));
    r.health_index = Math.max(25, Math.round((r.health_index ?? 85) - 35));
  } else if (anomaly === 'storm') {
    r.salinitas_ppt = Number(Math.max(18, (r.salinitas_ppt ?? 33) - 6.5).toFixed(2));
    r.kekeruhan_ntu = Number(((r.kekeruhan_ntu ?? 3) + 15.0).toFixed(2));
    r.health_index = Math.max(28, Math.round((r.health_index ?? 85) - 32));
  }
  return r;
}

api.interceptors.response.use((response) => {
  const role = localStorage.getItem('ocean_role') || 'pengguna';
  if (role !== 'pengguna') return response;

  const sandbox = getSandboxState();
  const hasOverrides = Object.keys(sandbox.sensor_overrides || {}).length > 0;
  const isModified = sandbox.active_anomaly !== 'normal' || sandbox.drain_battery || hasOverrides;
  if (!isModified) return response;

  const url = response.config?.url || '';

  // 1. Apply to /sensors list
  if (url.endsWith('/sensors') && Array.isArray(response.data)) {
    response.data = response.data.map((s) => {
      const ov = sandbox.sensor_overrides[s.sensor_id] || {};
      const battery = ov.status_baterai !== undefined
        ? ov.status_baterai
        : (sandbox.drain_battery ? Math.max(10, (s.status_baterai ?? 100) - 25) : s.status_baterai);
      return {
        ...s,
        status_koneksi: ov.status_koneksi || s.status_koneksi,
        status_baterai: battery,
        latest_reading: applySandboxToReading(s.latest_reading, sandbox.active_anomaly),
      };
    });
  }

  // 2. Apply to /dashboard/summary
  if (url.includes('/dashboard/summary') && response.data && typeof response.data === 'object') {
    if (sandbox.active_anomaly !== 'normal') {
      response.data = {
        ...response.data,
        avg_health_index: Math.max(30, Math.round((response.data.avg_health_index ?? 85) - 34)),
        active_alerts: (response.data.active_alerts ?? 0) + 5,
      };
    }
  }

  // 3. Apply to /alerts
  if (url.includes('/alerts') && !url.includes('/stream') && Array.isArray(response.data) && sandbox.active_anomaly !== 'normal') {
    const simMessages = {
      heatwave: { parameter: 'Suhu', value: 32.4, min: 26, max: 30, msg: '[SIMULASI] Suhu mencapai 32.4°C — Risiko Coral Bleaching!' },
      acidification: { parameter: 'pH', value: 6.9, min: 7.5, max: 8.5, msg: '[SIMULASI] pH turun ke 6.9 — Asidifikasi Laut!' },
      storm: { parameter: 'Kekeruhan', value: 18.5, min: 0, max: 10, msg: '[SIMULASI] Kekeruhan melonjak 18.5 NTU akibat badai & limpasan!' },
    };
    const meta = simMessages[sandbox.active_anomaly];
    if (meta) {
      const simAlert = {
        id: 999001,
        sensor_id: 'OS-PGD-001',
        parameter: meta.parameter,
        value: meta.value,
        threshold_min: meta.min,
        threshold_max: meta.max,
        level: 'bahaya',
        message: meta.msg,
        is_resolved: false,
        created_at: new Date().toISOString(),
        is_simulated: true,
      };
      response.data = [simAlert, ...response.data];
    }
  }

  return response;
});

export default api;
