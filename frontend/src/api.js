import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const role = localStorage.getItem('ocean_role');
  const wilayah = localStorage.getItem('ocean_wilayah');
  const provinsi = localStorage.getItem('ocean_provinsi');
  
  if (role) config.headers['X-User-Role'] = role;
  if (wilayah) config.headers['X-User-Wilayah'] = wilayah;
  if (provinsi) config.headers['X-User-Provinsi'] = provinsi;
  
  return config;
});

export default api;
