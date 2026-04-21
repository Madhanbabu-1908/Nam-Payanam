import axios from 'axios';
import { supabase } from './supabaseClient'; // Ensure this path matches your Supabase client location

// Simple in-memory cache for offline support (GET requests only)
const cache = new Map<string, any>();

// Create Axios Instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Auth Token
api.interceptors.request.use(
  async (config) => {
    // Get current session from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)Here is the **complete, corrected `frontend/src/config/api.ts`** file.

This version includes:
1.  **Axios Instance**: Configured with your backend URL.
2.  **Auth Interceptor**: Automatically attaches the Supabase JWT token to every request.
3.  **Offline Cache**: Caches GET requests in memory and serves them if the user loses internet connection.
4.  **Error Handling**: Centralized error logging.

### 📄 `frontend/src/config/api.ts`

```typescript
import axios from 'axios';
import { supabase } from './supabaseClient'; // Ensure this path matches your Supabase client location

// Simple in-memory cache for offline support (GET requests only)
const cache = new Map<string, any>();

// Create Axios Instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Auth Token
api.interceptors.request.use(
  async (config) => {
    // Get current session from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Cache GET requests & Handle Offline Mode
api.interceptors.response.use(
  (response) => {
    // Cache successful GET requests
    if (response.config.method === 'get' && response.data) {
      cache.set(response.config.url!, response.data);
    }
    return response;
  },
  (error) => {
    // If offline and it's a GET request, try to return cached data
    if (!navigator.onLine && error.config && error.config.method === 'get') {
      const cachedData = cache.get(error.config.url!);
      if (cachedData) {
        console.log("📡 Serving from cache:", error.config.url);
        return Promise.resolve({ data: cachedData });
      }
    }
    
    // Handle specific HTTP errors if needed (e.g., 401 Unauthorized)
    if (error.response?.status === 401) {
      // Optional: Redirect to login or refresh token
      console.warn("Unauthorized access. Please log in again.");
    }

    return Promise.reject(error);
  }
);

export { api };