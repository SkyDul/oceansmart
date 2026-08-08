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

api.interceptors.request.use((config) => {
  const role = localStorage.getItem('ocean_role');
  const wilayah = localStorage.getItem('ocean_wilayah');
  const provinsi = localStorage.getItem('ocean_provinsi');
  
  if (role) config.headers['X-User-Role'] = role;
  if (wilayah) config.headers['X-User-Wilayah'] = wilayah;
  if (provinsi) config.headers['X-User-Provinsi'] = provinsi;
  
  // If it's a simulator request, we still send it but we'll intercept the 404 in the response
  
  return config;
});

// Mock state helpers
const getSandbox = () => {
  try {
    return JSON.parse(localStorage.getItem('ocean_sandbox')) || { active_anomaly: 'normal', drain_battery: false, offline_sensors: [], battery_levels: {} };
  } catch {
    return { active_anomaly: 'normal', drain_battery: false, offline_sensors: [], battery_levels: {} };
  }
};
const setSandbox = (state) => localStorage.setItem('ocean_sandbox', JSON.stringify(state));

api.interceptors.response.use(
  (response) => {
    const url = response.config.url;
    const sandbox = getSandbox();
    
    // Manipulate /sensors LIST data only (not single-sensor detail)
    if (url.includes('/sensors') && Array.isArray(response.data)) {
      let data = response.data;
      data = data.map(sensor => {
        let modified = { ...sensor };
        // Apply sandbox offline status
        if (sandbox.offline_sensors.includes(modified.sensor_id)) {
          modified.status_koneksi = 'offline';
        }
        // Apply sandbox battery levels
        if (sandbox.battery_levels[modified.sensor_id] !== undefined) {
          modified.status_baterai = sandbox.battery_levels[modified.sensor_id];
          if (modified.status_baterai <= 0) modified.status_koneksi = 'offline';
        } else if (sandbox.drain_battery) {
          modified.status_baterai = Math.max(0, modified.status_baterai - 20); // Simulate drain visually
          if (modified.status_baterai <= 0) modified.status_koneksi = 'offline';
        }
        
        // Apply anomaly
        if (sandbox.active_anomaly === 'heatwave') {
          modified.suhu_celsius = 31.5 + Math.random() * 2;
        } else if (sandbox.active_anomaly === 'storm') {
          modified.kekeruhan_ntu = 25.0 + Math.random() * 10;
        } else if (sandbox.active_anomaly === 'acidification') {
          modified.ph = 7.0 + Math.random() * 0.5;
        }
        
        return modified;
      });
      response.data = data;
    }
    
    // Manipulate /dashboard/summary data
    if (url.includes('/dashboard/summary') && sandbox.active_anomaly !== 'normal') {
      let data = { ...response.data };
      if (sandbox.active_anomaly === 'heatwave') {
        data.avg_suhu = (31.5 + Math.random() * 2).toFixed(1);
        data.ocean_health_index = Math.max(0, data.ocean_health_index - 30);
      } else if (sandbox.active_anomaly === 'acidification') {
        data.avg_ph = (7.0 + Math.random() * 0.5).toFixed(1);
        data.ocean_health_index = Math.max(0, data.ocean_health_index - 40);
      } else if (sandbox.active_anomaly === 'storm') {
        data.ocean_health_index = Math.max(0, data.ocean_health_index - 20);
      }
      response.data = data;
    }
    
    return response;
  },
  (error) => {
    // Intercept Mock Simulator Endpoints that return 404 from backend
    if (error.config && error.config.url.includes('/simulator')) {
      const url = error.config.url;
      const method = error.config.method.toLowerCase();
      let sandbox = getSandbox();
      
      if (method === 'get' && url.includes('/simulator/status')) {
        return Promise.resolve({ data: { active_anomaly: sandbox.active_anomaly, drain_battery: sandbox.drain_battery, last_run: new Date().toISOString() } });
      }
      if (method === 'post' && url.includes('/simulator/trigger')) {
        const payload = JSON.parse(error.config.data);
        if (payload.active_anomaly !== undefined) sandbox.active_anomaly = payload.active_anomaly;
        if (payload.drain_battery !== undefined) sandbox.drain_battery = payload.drain_battery;
        setSandbox(sandbox);
        return Promise.resolve({ data: { message: "Sandbox updated" } });
      }
      if (method === 'post' && url.match(/\/simulator\/sensors\/(.+)\/status/)) {
        const sensorId = url.match(/\/simulator\/sensors\/(.+)\/status/)[1];
        const payload = JSON.parse(error.config.data);
        if (payload.status === 'offline') {
          if (!sandbox.offline_sensors.includes(sensorId)) sandbox.offline_sensors.push(sensorId);
        } else {
          sandbox.offline_sensors = sandbox.offline_sensors.filter(id => id !== sensorId);
        }
        setSandbox(sandbox);
        return Promise.resolve({ data: { message: "Sensor status updated" } });
      }
      if (method === 'post' && url.match(/\/simulator\/sensors\/(.+)\/recharge/)) {
        const sensorId = url.match(/\/simulator\/sensors\/(.+)\/recharge/)[1];
        sandbox.battery_levels[sensorId] = 100;
        sandbox.offline_sensors = sandbox.offline_sensors.filter(id => id !== sensorId);
        setSandbox(sandbox);
        return Promise.resolve({ data: { message: "Sensor recharged" } });
      }
      if (method === 'post' && url.includes('/simulator/reset')) {
        setSandbox({ active_anomaly: 'normal', drain_battery: false, offline_sensors: [], battery_levels: {} });
        return Promise.resolve({ data: { message: "Sandbox reset" } });
      }
    }
    return Promise.reject(error);
  }
);

export default api;
