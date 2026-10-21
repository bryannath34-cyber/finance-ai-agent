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
  return (
    getCookie('pf_csrf') ||
    getCookie('csrf_token') ||
    memoryCsrfToken ||
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pf_csrf') : null) ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('pf_csrf') : null)
  );
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = options.headers || {};

  // Dual-channel Auth: Attach Authorization Bearer token if present in localStorage
  try {
    const bearerToken = typeof localStorage !== 'undefined' ? localStorage.getItem('pf_token') : null;
    if (bearerToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
    }
  } catch (_) {}

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

  const controller = new AbortController();
  const timeoutMs = options.timeout || 30000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const config = {
    ...options,
    headers,
    signal: options.signal || controller.signal,
    cache: options.cache || 'no-store', // Session and financial data must always be revalidated.
    credentials: 'include', // Include HttpOnly session cookie
  };

  try {
    const res = await fetch(url, config);
    clearTimeout(timeoutId);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = (typeof data.detail === 'string' ? data.detail : data.detail?.message) || data.message || `HTTP Error ${res.status}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`Koneksi ke server timeout (${Math.round(timeoutMs / 1000)} detik). Silakan coba lagi.`);
      console.error(`[API Timeout] ${method} ${url}:`, timeoutErr);
      throw timeoutErr;
    }
    console.error(`[API Error] ${method} ${url}:`, err);
    throw err;
  }
}

export const api = {
  // Authentication
  auth: {
    login: async (username, password, totpCode = null) => {
      const res = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, ...(totpCode ? { totp_code: totpCode } : {}) }),
      });
      if (res && res.csrf_token) {
        memoryCsrfToken = res.csrf_token;
        try {
          sessionStorage.setItem('pf_csrf', res.csrf_token);
          localStorage.setItem('pf_csrf', res.csrf_token);
        } catch (_) {}
      }
      if (res && res.token) {
        try {
          localStorage.setItem('pf_token', res.token);
        } catch (_) {}
      }
      return res;
    },
    register: async (fullName, email, password) => {
      const res = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ full_name: fullName, email: email, password: password }),
      });
      if (res && res.csrf_token) {
        memoryCsrfToken = res.csrf_token;
        try {
          sessionStorage.setItem('pf_csrf', res.csrf_token);
          localStorage.setItem('pf_csrf', res.csrf_token);
        } catch (_) {}
      }
      if (res && res.token) {
        try {
          localStorage.setItem('pf_token', res.token);
        } catch (_) {}
      }
      return res;
    },
    logout: async () => {
      try {
        return await request('/auth/logout', { method: 'POST', timeout: 8000 });
      } finally {
        memoryCsrfToken = null;
        try {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('pf_csrf');
          }
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('pf_csrf');
            localStorage.removeItem('pf_token');
          }
        } catch (_) {}
      }
    },
    getMe: (options = {}) => request('/auth/me', { timeout: 8000, ...options }),
    getSessions: () => request('/auth/sessions'),
    revokeSession: (sessionId) => request(`/auth/sessions/${sessionId}`, { method: 'DELETE' }),
    getPreferences: () => request('/auth/preferences'),
    updatePreferences: (preferences) => request('/auth/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    }),
    getTwoFactorStatus: () => request('/auth/2fa'),
    setupTwoFactor: () => request('/auth/2fa/setup', { method: 'POST', body: JSON.stringify({}) }),
    enableTwoFactor: (secret, code) => request('/auth/2fa/enable', {
      method: 'POST', body: JSON.stringify({ secret, code }),
    }),
    disableTwoFactor: (password, code) => request('/auth/2fa/disable', {
      method: 'POST', body: JSON.stringify({ password, code }),
    }),
    changePassword: (currentPassword, newPassword) => request('/auth/change-password', {
      method: 'POST', body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),
    updateProfile: (fullName) => request('/auth/profile', {
      method: 'PATCH', body: JSON.stringify({ full_name: fullName }),
    }),
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
    importCsv: (file) => {
      const formData = new FormData();
      formData.append('file', file, file.name);
      return request('/transactions/import-csv', { method: 'POST', body: formData, timeout: 60000 });
    },
    getDrafts: (batchId) => request(`/transactions/drafts/${batchId}`),
    updateDraft: async (draftId, payload) => {
      // Prioritaskan metode standar RESTful: PUT /transactions/drafts/{draftId}
      try {
        return await request(`/transactions/drafts/${draftId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
          timeout: 30000,
        });
      } catch (err) {
        const isRetryable = err.status === 404 || err.status === 405 || (
          err.message && (
            err.message.includes('404') ||
            err.message.includes('405') ||
            err.message.includes('Not Found') ||
            err.message.includes('Method Not Allowed')
          )
        );
        if (isRetryable) {
          console.warn('[updateDraft] PUT failed, retrying with POST on /update...');
          try {
            return await request(`/transactions/drafts/${draftId}/update`, {
              method: 'POST',
              body: JSON.stringify(payload),
              timeout: 30000,
            });
          } catch (postUpdateErr) {
            console.warn('[updateDraft] POST /update failed, retrying with POST on /drafts/' + draftId);
            return await request(`/transactions/drafts/${draftId}`, {
              method: 'POST',
              body: JSON.stringify(payload),
              timeout: 30000,
            });
          }
        }
        throw err;
      }
    },
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
    exportTransactions: async (params = {}) => {
      const query = new URLSearchParams();
      if (params.year && params.year !== 'ALL') query.append('year', params.year);
      if (params.month && params.month !== 'ALL') query.append('month', params.month);
      if (params.type && params.type !== 'ALL') query.append('type', params.type);
      if (params.format) query.append('format', params.format);

      const url = `${API_BASE}/transactions/export?${query.toString()}`;
      const headers = {};
      try {
        const bearerToken = typeof localStorage !== 'undefined' ? localStorage.getItem('pf_token') : null;
        if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`;
      } catch (_) {}

      const res = await fetch(url, {
        credentials: 'include',
        headers,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Gagal mengekspor data');
      }
      const blob = await res.blob();
      let filename = `Laporan_Transaksi.${params.format || 'xlsx'}`;
      const disposition = res.headers.get('content-disposition');
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename=["']?([^"';]+)["']?/);
        if (match && match[1]) filename = match[1];
      }
      return { blob, filename };
    },
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
    consultPurchase: (query, targetAccountId = null, conversationHistory = []) =>
      request('/planning/advisory/purchase', {
        method: 'POST',
        body: JSON.stringify({
          query,
          target_account_id: targetAccountId,
          conversation_history: conversationHistory,
        }),
      }),
    getScenarios: (limit = 10) =>
      request(`/planning/advisory/scenarios?limit=${limit}`),
    getSpendingPatterns: () =>
      request('/planning/advisory/spending-patterns'),
    getReports: (year = null, month = null) =>
      request(`/planning/reports${year && month ? `?year=${year}&month=${month}` : ''}`),
  },
};
