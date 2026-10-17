/**
 * Personal Finance AI Agent - API Client Wrapper v2.3
 * Handles dynamic base path (/finance), session cookies, anti-CSRF headers, and error handling.
 */

const API_BASE = window.location.pathname.startsWith('/finance') ? '/finance/api' : '/api';

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = options.headers || {};

  // Attach CSRF Token for mutation methods
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCookie('csrf_token');
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  // Set default JSON Content-Type unless FormData is passed
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers,
    credentials: 'include', // Include HttpOnly session cookie
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.detail || data.message || `HTTP Error ${res.status}`;
      throw new Error(errorMsg);
    }
    return data;
  } catch (err) {
    console.error(`[API Error] ${method} ${url}:`, err);
    throw err;
  }
}

export const api = {
  // Authentication
  auth: {
    login: (username, password) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    getMe: () => request('/auth/me'),
  },

  // Accounts
  accounts: {
    list: () => request('/accounts'),
    create: (data) =>
      request('/accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Categories
  categories: {
    list: (type = null) =>
      request(`/categories${type ? `?type=${type}` : ''}`),
    create: (data) =>
      request('/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // AI Parser
  ai: {
    parse: (text) =>
      request('/ai/parse', {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
  },

  // Speech Recognition
  speech: {
    transcribe: (audioBlob, filename = 'speech.webm') => {
      const formData = new FormData();
      formData.append('audio', audioBlob, filename);
      return request('/speech/transcribe', {
        method: 'POST',
        body: formData,
      });
    },
    getStatus: (jobId) => request(`/speech/jobs/${jobId}`),
  },

  // Transactions & Drafts
  transactions: {
    getDrafts: (batchId) => request(`/transactions/drafts/${batchId}`),
    updateDraft: (draftId, payload) =>
      request(`/transactions/drafts/${draftId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    cancelDraft: (draftId) =>
      request(`/transactions/drafts/${draftId}/cancel`, {
        method: 'POST',
      }),
    confirmBatch: (batchId) =>
      request('/transactions/confirm-batch', {
        method: 'POST',
        body: JSON.stringify({ batch_id: batchId }),
      }),
    list: (limit = 50, offset = 0) =>
      request(`/transactions?limit=${limit}&offset=${offset}`),
    reverse: (transactionId, reason) =>
      request(`/transactions/${transactionId}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ transaction_id: transactionId, reason }),
      }),
  },
};
