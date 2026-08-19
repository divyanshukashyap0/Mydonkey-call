export const BACKEND_URL = import.meta.env.VITE_API_URL || '';
export const API_BASE = BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}/api` : '/api';
