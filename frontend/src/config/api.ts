import axios from 'axios';
import { supabase } from './supabaseClient';

const cache = new Map<string, any>();

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (response.config.method === 'get' && response.data) {
      cache.set(response.config.url!, response.data);
    }
    return response;
  },
  (error) => {
    if (!navigator.onLine && error.config && error.config.method === 'get') {
      const cachedData = cache.get(error.config.url!);
      if (cachedData) {
        console.log("Serving from cache:", error.config.url);
        return Promise.resolve({ data: cachedData });
      }
    }
    return Promise.reject(error);
  }
);

export { api };