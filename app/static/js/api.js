/**
 * Personal Finance AI Agent - API Client Wrapper v2.3
 * Handles dynamic base path (/finance), session cookies, anti-CSRF headers, and error handling.
 */

const API_BASE = window.location.pathname.startsWith('/finance') ? '/finance/api' : '/api';

let memoryCsrfToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pf_csrf') : null;

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

function getCsrfToken() {
  return getCookie('pf_csrf') || getCookie('csrf_token') || memoryCsrfToken || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pf_csrf') : null);
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = options.headers || {};

  // Attach CSRF Token for mutation methods
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  // Set default JSON Content-Type only if options.body is provided and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
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
    login: async (username, password) => {
      const res = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (res && res.csrf_token) {
        memoryCsrfToken = res.csrf_token;
        sessionStorage.setItem('pf_csrf', res.csrf_token);
      }
      return res;
    },
    logout: async () => {
      try {
        return await request('/auth/logout', { method: 'POST' });
      } finally {
        memoryCsrfToken = null;
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('pf_csrf');
        }
      }
    },
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
    list: (limit = 100, offset = 0, year = null, month = null) => {
      let url = `/transactions?limit=${limit}&offset=${offset}`;
      if (year) url += `&year=${year}`;
      if (month) url += `&month=${month}`;
      return request(url);
    },
    get: (transactionId) =>
      request(`/transactions/${transactionId}`),
    create: (payload) =>
      request('/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (transactionId, payload) =>
      request(`/transactions/${transactionId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    delete: (transactionId) =>
      request(`/transactions/${transactionId}`, {
        method: 'DELETE',
      }),
    reverse: (transactionId, reason) =>
      request(`/transactions/${transactionId}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ transaction_id: transactionId, reason }),
      }),
  },

  // Planning & AI Advisory (Fase 7)
  planning: {
    getBudget: (year = null, month = null) =>
      request(`/planning/budget${year && month ? `?year=${year}&month=${month}` : ''}`),
    setMonthlyBudget: (year, month, limitAmount) =>
      request('/planning/budget', {
        method: 'POST',
        body: JSON.stringify({ period_year: year, period_month: month, limit_amount: limitAmount }),
      }),
    setCategoryBudget: (categoryId, year, month, limitAmount) =>
      request('/planning/budget/category', {
        method: 'POST',
        body: JSON.stringify({ category_id: categoryId, period_year: year, period_month: month, limit_amount: limitAmount }),
      }),
    getGoals: () => request('/planning/goals'),
    createGoal: (data) =>
      request('/planning/goals', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateGoalStatus: (goalId, status) =>
      request(`/planning/goals/${goalId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    consultPurchase: (query, targetAccountId = null) =>
      request('/planning/advisory/purchase', {
        method: 'POST',
        body: JSON.stringify({ query, target_account_id: targetAccountId }),
      }),
    getScenarios: (limit = 10) =>
      request(`/planning/advisory/scenarios?limit=${limit}`),
    getSpendingPatterns: () =>
      request('/planning/advisory/spending-patterns'),
    getReports: (year = null, month = null) =>
      request(`/planning/reports${year && month ? `?year=${year}&month=${month}` : ''}`),
  },

  // MySQL Database Studio
  database: {
    getTables: () => request('/database/tables'),
    getTableData: (table, page = 1, limit = 50) => request(`/database/table/${table}?page=${page}&limit=${limit}`),
    executeQuery: (query) =>
      request('/database/query', {
        method: 'POST',
        body: JSON.stringify({ query }),
      }),
  },
};


