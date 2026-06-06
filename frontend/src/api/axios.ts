import axios from "axios";

// In local dev: http://localhost:3001/api
// In Docker (nginx proxy): /api  (relative — nginx forwards to backend container)
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("vendorbridge_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("vendorbridge_token");
      localStorage.removeItem("vendorbridge_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
