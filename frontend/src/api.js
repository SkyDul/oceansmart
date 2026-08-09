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

export default api;
