// src/config.ts

// Base API URL (existing backend)
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// n8n recommendation webhook URL — routed through Vite dev proxy to avoid CORS
// The proxy is configured in vite.config.ts → /api/n8n → https://akalya.app.n8n.cloud/webhook/...
export const N8N_WEBHOOK_URL = '/api/n8n';

// Legal-aid request-review webhook URL — routed through Vite dev proxy to avoid CORS
// The proxy is configured in vite.config.ts → /api/legal-aid-request → https://akalya.app.n8n.cloud/webhook/legal-aid/request
export const LEGAL_AID_REQUEST_URL = '/api/legal-aid-request';
