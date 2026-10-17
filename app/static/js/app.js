/**
 * Personal Finance AI Agent - Main Application Logic v2.3
 * Figma 1:1 Design System Integration (Nordic / Apple Minimalist).
 * Multi-account balances, Voice & AI Command, Draft Approval, Ledger,
 * Financial Planning, and AI Advisory Copilot.
 */

import { api } from './api.js';
import { AudioRecorder } from './audio_recorder.js';

class App {
  constructor() {
    this.currentUser = null;
    this.accounts = [];
    this.categories = [];
    this.currentBatch = null; // { batch_id, drafts }
    this.transactions = [];
    this.filteredTransactions = [];

    // Planning & Copilot State
    this.currentTab = 'tab-mutasi';
    this.budgetData = null;
    this.savingsGoals = [];
    this.scenarios = [];

    this.recorder = new AudioRecorder({
      maxDurationSeconds: 30,
      onStateChange: (isRecording) => this.handleRecordingState(isRecording),
    });

    this.initElements();
    this.attachEventListeners();
    this.checkSession();
  }

  initElements() {
    // Auth & User Profile
    this.authOverlay = document.getElementById('auth-overlay');
    this.loginForm = document.getElementById('login-form');
    this.loginUsername = document.getElementById('login-username');
    this.loginPassword = document.getElementById('login-password');
    this.loginError = document.getElementById('login-error');

    this.usernameDisplay = document.getElementById('username-display');
    this.userAvatarInitial = document.getElementById('user-avatar-initial');
    this.btnLogout = document.getElementById('btn-logout');

    this.pageTitle = document.getElementById('page-title');
    this.pageIntro = document.getElementById('page-intro');

    // Navigation Tabs (Both Feature Pills and Sidebar Links)
    this.tabBtns = document.querySelectorAll('.tab-btn');
    this.sidebarNavBtns = document.querySelectorAll('.sidebar-nav-btn[data-tab]');
    this.tabContents = document.querySelectorAll('.tab-content');

    // Tab 1: Dashboard Mutasi & Accounts
    this.accountsContainer = document.getElementById('accounts-container');
    this.totalNetWorth = document.getElementById('total-net-worth');
    this.btnRefreshAccounts = document.getElementById('btn-refresh-accounts');
    this.btnRefreshHistory = document.getElementById('btn-refresh-history');

    // AI Command Center
    this.aiInput = document.getElementById('ai-input');
    this.btnParse = document.getElementById('btn-parse');
    this.btnRecord = document.getElementById('btn-record');
    this.recordStatus = document.getElementById('record-status');

    // Staging Drafts
    this.draftSection = document.getElementById('draft-section');
    this.draftCountText = document.getElementById('draft-count-text');
    this.draftTableBody = document.getElementById('draft-table-body');
    this.draftFooterRow = document.getElementById('draft-footer-row');
    this.draftTotalSummary = document.getElementById('draft-total-summary');
    this.btnConfirmBatch = document.getElementById('btn-confirm-batch');

    // Immutable Ledger History
    this.historyTableBody = document.getElementById('history-table-body');
    this.dashboardHistoryBody = document.getElementById('dashboard-history-body');
    this.ledgerSearchInput = document.getElementById('ledger-search-input');
    this.ledgerTypeSelect = document.getElementById('ledger-type-select');
    this.ledgerMonthSelect = document.getElementById('ledger-month-select');
    this.alertBox = document.getElementById('alert-box');

    // Right Column Mini Cards
    this.budgetCapVal = document.getElementById('budget-cap-val');
    this.budgetUsedVal = document.getElementById('budget-used-val');
    this.budgetFillBar = document.getElementById('budget-fill-bar');
    this.budgetRemainderVal = document.getElementById('budget-remainder-val');
    this.budgetPeriodMini = document.getElementById('budget-period-mini');

    this.summaryIncomeVal = document.getElementById('summary-income-val');
    this.summaryExpenseVal = document.getElementById('summary-expense-val');
    this.summarySurplusVal = document.getElementById('summary-surplus-val');

    this.btnJumpToCopilot = document.getElementById('btn-jump-to-copilot');
    this.btnJumpToMutasi = document.getElementById('btn-jump-to-mutasi');

    // Tab 2: Planning & Budgets
    this.btnOpenSetBudget = document.getElementById('btn-open-set-budget');
    this.btnOpenSetBudgetNav = document.getElementById('btn-open-set-budget-nav');
    this.btnOpenCatBudget = document.getElementById('btn-open-cat-budget');
    this.btnOpenCreateGoal = document.getElementById('btn-open-create-goal');
    this.btnOpenCreateGoalMini = document.getElementById('btn-open-create-goal-mini');

    this.budgetPeriodLabel = document.getElementById('budget-period-label');
    this.budgetTotalLimit = document.getElementById('budget-total-limit');
    this.budgetTotalSpent = document.getElementById('budget-total-spent');
    this.budgetTotalRemaining = document.getElementById('budget-total-remaining');
    this.budgetPercentLabel = document.getElementById('budget-percent-label');
    this.budgetProgressBar = document.getElementById('budget-progress-bar');
    this.categoryBudgetsList = document.getElementById('category-budgets-list');
    this.savingsGoalsContainer = document.getElementById('savings-goals-container');

    // Tab 3: Copilot & Advisory
    this.copilotInput = document.getElementById('copilot-input');
    this.copilotAccountSelect = document.getElementById('copilot-account-select');
    this.btnConsultCopilot = document.getElementById('btn-consult-copilot');
    this.copilotResult = document.getElementById('copilot-result');
    this.copilotVerdictBox = document.getElementById('copilot-verdict-box');
    this.copilotVerdictBadge = document.getElementById('copilot-verdict-badge');
    this.copilotItemCost = document.getElementById('copilot-item-cost');
    this.copilotAdviceText = document.getElementById('copilot-advice-text');
    this.copilotSnapshotGrid = document.getElementById('copilot-snapshot-grid');

    this.btnAnalyzePatterns = document.getElementById('btn-analyze-patterns');
    this.patternResult = document.getElementById('pattern-result');
    this.patternAiText = document.getElementById('pattern-ai-text');
    this.patternTableBody = document.getElementById('pattern-table-body');
    this.scenariosList = document.getElementById('scenarios-list');

    // Modals
    this.modalSetBudget = document.getElementById('modal-set-budget');
    this.formSetBudget = document.getElementById('form-set-budget');
    this.inputBudgetLimit = document.getElementById('input-budget-limit');

    this.modalSetCatBudget = document.getElementById('modal-set-cat-budget');
    this.formSetCatBudget = document.getElementById('form-set-cat-budget');
    this.selectCatBudget = document.getElementById('select-cat-budget');
    this.inputCatBudgetLimit = document.getElementById('input-cat-budget-limit');

    this.modalCreateGoal = document.getElementById('modal-create-goal');
    this.formCreateGoal = document.getElementById('form-create-goal');
    this.inputGoalName = document.getElementById('input-goal-name');
    this.selectGoalAccount = document.getElementById('select-goal-account');
    this.inputGoalTarget = document.getElementById('input-goal-target');
    this.inputGoalDate = document.getElementById('input-goal-date');

    this.modalAbout = document.getElementById('modal-about');
    this.btnOpenAbout = document.getElementById('btn-open-about');
    this.btnOpenHelp = document.getElementById('btn-open-help');
  }

  attachEventListeners() {
    // Authentication
    this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    this.btnLogout.addEventListener('click', () => this.handleLogout());

    // Tab Navigation (Pills & Sidebar)
    const handleTabClick = (targetTab) => {
      this.switchTab(targetTab);
    };

    this.tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => handleTabClick(btn.getAttribute('data-tab')));
    });

    this.sidebarNavBtns.forEach((btn) => {
      btn.addEventListener('click', () => handleTabClick(btn.getAttribute('data-tab')));
    });

    if (this.btnJumpToCopilot) {
      this.btnJumpToCopilot.addEventListener('click', () => this.switchTab('tab-copilot'));
    }
    if (this.btnJumpToMutasi) {
      this.btnJumpToMutasi.addEventListener('click', () => this.switchTab('tab-mutasi'));
    }

    // Refresh Buttons
    if (this.btnRefreshAccounts) {
      this.btnRefreshAccounts.addEventListener('click', () => this.loadAccounts());
    }
    if (this.btnRefreshHistory) {
      this.btnRefreshHistory.addEventListener('click', () => this.loadHistory());
    }

    // Ledger Filters (Search & Type)
    if (this.ledgerSearchInput) {
      this.ledgerSearchInput.addEventListener('input', () => this.applyLedgerFilters());
    }
    if (this.ledgerTypeSelect) {
      this.ledgerTypeSelect.addEventListener('change', () => this.applyLedgerFilters());
    }

    // Tab 1 Events (AI Parse & Voice)
    this.btnParse.addEventListener('click', () => this.handleAIParse());
    this.btnRecord.addEventListener('click', () => this.toggleRecording());
    this.btnConfirmBatch.addEventListener('click', () => this.handleConfirmBatch());

    this.aiInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        this.handleAIParse();
      }
    });

    // Modal Triggers
    const bindOpenModal = (btn, modal, onOpen = null) => {
      if (btn) {
        btn.addEventListener('click', () => {
          if (onOpen) onOpen();
          this.openModal(modal);
        });
      }
    };

    bindOpenModal(this.btnOpenSetBudget, this.modalSetBudget);
    bindOpenModal(this.btnOpenSetBudgetNav, this.modalSetBudget);
    bindOpenModal(this.btnOpenCatBudget, this.modalSetCatBudget, () => this.populateCatSelect());
    bindOpenModal(this.btnOpenCreateGoal, this.modalCreateGoal, () => this.populateGoalAccSelect());
    bindOpenModal(this.btnOpenCreateGoalMini, this.modalCreateGoal, () => this.populateGoalAccSelect());
    bindOpenModal(this.btnOpenAbout, this.modalAbout);
    bindOpenModal(this.btnOpenHelp, this.modalAbout);

    // Modal Close
    document.querySelectorAll('.btn-close-modal').forEach((btn) => {
      btn.addEventListener('click', () => this.closeModals());
    });
    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeModals();
      });
    });

    // Modal Form Submissions
    if (this.formSetBudget) {
      this.formSetBudget.addEventListener('submit', (e) => this.handleSetBudget(e));
    }
    if (this.formSetCatBudget) {
      this.formSetCatBudget.addEventListener('submit', (e) => this.handleSetCatBudget(e));
    }
    if (this.formCreateGoal) {
      this.formCreateGoal.addEventListener('submit', (e) => this.handleCreateGoal(e));
    }

    // Tab 3 Events (Copilot & Patterns)
    if (this.btnConsultCopilot) {
      this.btnConsultCopilot.addEventListener('click', () => this.handleConsultCopilot());
    }
    if (this.copilotInput) {
      this.copilotInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          this.handleConsultCopilot();
        }
      });
    }
    if (this.btnAnalyzePatterns) {
      this.btnAnalyzePatterns.addEventListener('click', () => this.handleAnalyzePatterns());
    }
  }

  switchTab(tabId) {
    this.currentTab = tabId;

    // Synchronize Titles & Intros
    const titles = {
      'tab-dashboard': { title: 'Personal Finance Dashboard', intro: 'Kelola mutasi, anggaran, dan konsultasi cerdas berbasis OCI Native AI.' },
      'tab-mutasi': { title: 'Mutasi & Suara AI', intro: 'Catat transaksi, tinjau draft, dan pantau buku besar.' },
      'tab-planning': { title: 'Anggaran & Target Tabungan', intro: 'Pantau pagu bulanan, batas kategori, dan akumulasi dana impian.' },
      'tab-copilot': { title: 'Penasihat Finansial AI', intro: 'Analisis kelayakan belanja cerdas dan detektif pola mutasi.' }
    };

    if (this.pageTitle && titles[tabId]) this.pageTitle.textContent = titles[tabId].title;
    if (this.pageIntro && titles[tabId]) this.pageIntro.textContent = titles[tabId].intro;

    // Synchronize Top Feature Tabs
    this.tabBtns.forEach((b) => {
      if (b.getAttribute('data-tab') === tabId) b.classList.add('active');
      else b.classList.remove('active');
    });

    // Synchronize Sidebar Nav Items
    this.sidebarNavBtns.forEach((b) => {
      if (b.getAttribute('data-tab') === tabId) b.classList.add('active');
      else b.classList.remove('active');
    });

    // Show Selected Tab Content
    this.tabContents.forEach((c) => {
      if (c.id === tabId) c.classList.add('active');
      else c.classList.remove('active');
    });

    if (tabId === 'tab-planning') {
      this.loadPlanningData();
    } else if (tabId === 'tab-copilot') {
      this.loadCopilotData();
    }
  }

  openModal(modal) {
    if (modal) modal.style.display = 'flex';
  }

  closeModals() {
    document.querySelectorAll('.modal-overlay').forEach((m) => {
      if (m.id !== 'auth-overlay') m.style.display = 'none';
    });
  }

  showAlert(message, type = 'success') {
    this.alertBox.className = `alert-box alert-${type}`;
    this.alertBox.innerHTML = `<span>${message}</span>`;
    this.alertBox.style.display = 'flex';
    setTimeout(() => {
      this.alertBox.style.display = 'none';
    }, 5000);
  }

  formatIDR(num) {
    const val = parseFloat(num) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  }

  formatDateID(dateStr) {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const m = parseInt(parts[1], 10);
        return `${parts[2]} ${months[m] || parts[1]} ${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  }

  async checkSession() {
    try {
      const res = await api.auth.getMe();
      if (res.data && res.data.id) {
        this.currentUser = res.data;
        this.showDashboard();
      } else {
        this.showLogin();
      }
    } catch {
      this.showLogin();
    }
  }

  showLogin() {
    this.authOverlay.style.display = 'flex';
    this.loginUsername.focus();
  }

  showDashboard() {
    this.authOverlay.style.display = 'none';
    const username = this.currentUser ? this.currentUser.username : 'Bryan';
    if (this.usernameDisplay) this.usernameDisplay.textContent = username;
    if (this.userAvatarInitial) this.userAvatarInitial.textContent = username.charAt(0).toUpperCase();
    this.loadInitialData();
  }

  async handleLogin(e) {
    e.preventDefault();
    this.loginError.style.display = 'none';
    const user = this.loginUsername.value.trim();
    const pass = this.loginPassword.value;

    if (!user || !pass) return;

    try {
      const res = await api.auth.login(user, pass);
      this.currentUser = res.user || (res.data ? (res.data.user || res.data) : res);
      this.loginPassword.value = '';
      this.showDashboard();
    } catch (err) {
      this.loginError.textContent = err.message || 'Username atau password salah.';
      this.loginError.style.display = 'block';
    }
  }

  async handleLogout() {
    try {
      await api.auth.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    this.currentUser = null;
    this.usernameDisplay.textContent = '-';
    this.accounts = [];
    this.transactions = [];
    this.renderAccounts();
    this.renderHistory();
    this.showLogin();
  }

  async loadInitialData() {
    await Promise.all([
      this.loadAccounts(),
      this.loadCategories(),
      this.loadHistory(),
      this.loadBudgetOverview(),
    ]);
  }

  async loadAccounts() {
    try {
      const res = await api.accounts.list();
      this.accounts = res.data || [];
      this.renderAccounts();
      this.populateCopilotAccSelect();
    } catch (err) {
      this.showAlert(`Gagal memuat rekening: ${err.message}`, 'error');
    }
  }

  async loadCategories() {
    try {
      const res = await api.categories.list();
      this.categories = res.data || [];
    } catch (err) {
      console.warn('Gagal memuat kategori:', err);
    }
  }

  async loadHistory() {
    try {
      const res = await api.transactions.list(50, 0);
      this.transactions = res.data || [];
      this.filteredTransactions = [...this.transactions];
      this.renderHistory();
      this.calculateMonthlySummary();
    } catch (err) {
      console.warn('Gagal memuat riwayat:', err);
    }
  }

  applyLedgerFilters() {
    const q = this.ledgerSearchInput ? this.ledgerSearchInput.value.toLowerCase().trim() : '';
    const typeFilter = this.ledgerTypeSelect ? this.ledgerTypeSelect.value : 'ALL';

    this.filteredTransactions = this.transactions.filter((tx) => {
      const descMatch = (tx.description || '').toLowerCase().includes(q);
      const catMatch = (tx.category_name || '').toLowerCase().includes(q);
      const accMatch = (tx.source_account_name || '').toLowerCase().includes(q) || (tx.destination_account_name || '').toLowerCase().includes(q);
      const textMatches = !q || descMatch || catMatch || accMatch;

      const typeMatches = typeFilter === 'ALL' || tx.type === typeFilter;
      return textMatches && typeMatches;
    });

    this.renderHistory();
  }

  // Calculate Realized Monthly Summary from Transactions
  calculateMonthlySummary() {
    let income = 0;
    let expense = 0;

    this.transactions.forEach((tx) => {
      if (tx.is_reversal) return;
      const amt = parseFloat(tx.amount) || 0;
      if (tx.type === 'INCOME') income += amt;
      else if (tx.type === 'EXPENSE') expense += amt;
    });

    const surplus = income - expense;
    if (this.summaryIncomeVal) this.summaryIncomeVal.textContent = this.formatIDR(income);
    if (this.summaryExpenseVal) this.summaryExpenseVal.textContent = this.formatIDR(expense);
    if (this.summarySurplusVal) {
      this.summarySurplusVal.textContent = this.formatIDR(surplus);
      this.summarySurplusVal.style.color = surplus < 0 ? 'var(--accent-rose)' : 'var(--text-primary)';
    }
  }

  // Render Accounts in Figma Style (Monograms KT, BCA, GP)
  renderAccounts() {
    this.accountsContainer.innerHTML = '';
    let totalBal = 0;

    if (this.accounts.length === 0) {
      this.accountsContainer.innerHTML = `
        <div style="color: var(--text-muted); font-size: 9px; padding: 10px 0;">Belum ada rekening aktif.</div>
      `;
      return;
    }

    this.accounts.forEach((acc) => {
      const bal = parseFloat(acc.current_balance) || 0;
      totalBal += bal;

      const nameLower = acc.name.toLowerCase();
      let monogramClass = 'monogram-cash';
      let monogramText = 'KT';

      if (nameLower.includes('bca') || acc.type === 'BANK') {
        monogramClass = 'monogram-bank';
        monogramText = 'BCA';
      } else if (nameLower.includes('gopay') || acc.type === 'EWALLET') {
        monogramClass = 'monogram-ewallet';
        monogramText = 'GP';
      } else if (nameLower.includes('kas') || acc.type === 'CASH') {
        monogramClass = 'monogram-cash';
        monogramText = 'KT';
      } else {
        monogramText = acc.name.substring(0, 3).toUpperCase();
      }

      const isNegative = bal < 0;
      const row = document.createElement('div');
      row.className = 'account-row';

      row.innerHTML = `
        <div class="account-left-side">
          <div class="account-monogram ${monogramClass}">${monogramText}</div>
          <div class="account-info-col">
            <span class="acc-title">${acc.name}</span>
            <span class="acc-subtitle">${acc.type}</span>
          </div>
        </div>
        <div class="acc-balance-num ${isNegative ? 'negative' : ''}">
          ${this.formatIDR(bal)}
        </div>
      `;
      this.accountsContainer.appendChild(row);
    });

    if (this.totalNetWorth) {
      this.totalNetWorth.textContent = this.formatIDR(totalBal);
      this.totalNetWorth.style.color = totalBal < 0 ? 'var(--accent-rose)' : 'var(--text-primary)';
    }
  }

  // Render Ledger History in Figma Screen 02 Table Style
  renderHistory() {
    const list = this.filteredTransactions || this.transactions;
    this.historyTableBody.innerHTML = '';

    if (list.length === 0) {
      this.historyTableBody.innerHTML = `
        <tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 18px;">
          Tidak ada transaksi yang cocok.
        </td></tr>
      `;
      return;
    }

    list.forEach((tx) => {
      const tr = document.createElement('tr');
      const isRev = tx.is_reversal;
      const role = tx.ledger_role;

      let pillClass = 'cat-rose';
      let statusLabel = 'EXPENSE';
      let isIncome = false;

      if (isRev) {
        pillClass = 'cat-rose';
        statusLabel = 'REVERSAL';
      } else if (tx.type === 'INCOME') {
        pillClass = 'cat-green';
        statusLabel = 'INCOME';
        isIncome = true;
      } else if (tx.type === 'TRANSFER') {
        pillClass = 'cat-blue';
        statusLabel = 'TRANSFER';
      }

      let accountsDisplay = '-';
      if (tx.type === 'EXPENSE') accountsDisplay = `${tx.source_account_name || 'Rekening'}`;
      else if (tx.type === 'INCOME') accountsDisplay = `${tx.destination_account_name || 'Rekening'}`;
      else if (tx.type === 'TRANSFER') accountsDisplay = `${tx.source_account_name || 'Sumber'} ➔ ${tx.destination_account_name || 'Tujuan'}`;

      const dateStr = this.formatDateID(tx.transaction_date);
      const sign = isIncome ? '+' : '-';
      const amountColor = isIncome ? 'var(--accent-green)' : 'var(--text-primary)';

      tr.innerHTML = `
        <td style="color: var(--text-secondary); font-size: 9px;">${dateStr}</td>
        <td><strong>${tx.description || '-'}</strong></td>
        <td style="color: var(--text-secondary);">${tx.category_name || '-'}</td>
        <td style="color: var(--text-secondary); font-size: 9px;">${accountsDisplay}</td>
        <td style="font-weight: 600; color: ${amountColor};">${sign}${this.formatIDR(tx.amount)}</td>
        <td><span class="badge-cat-pill ${pillClass}">${statusLabel}</span></td>
        <td style="text-align: right;">
          ${!isRev && role !== 'ADMIN_FEE' ? `
            <button class="btn-draft-edit btn-reverse" data-id="${tx.id}">
              Balikkan
            </button>
          ` : '—'}
        </td>
      `;

      const btnRev = tr.querySelector('.btn-reverse');
      if (btnRev) {
        btnRev.addEventListener('click', () => this.handleReverse(tx.id));
      }

      this.historyTableBody.appendChild(tr);
    });

    // Also populate dashboard history preview if element exists
    if (this.dashboardHistoryBody) {
      this.dashboardHistoryBody.innerHTML = '';
      this.transactions.slice(0, 5).forEach((tx) => {
        const tr = document.createElement('tr');
        const isIncome = tx.type === 'INCOME';
        const sign = isIncome ? '+' : '-';
        tr.innerHTML = `
          <td>${this.formatDateID(tx.transaction_date)}</td>
          <td><strong>${tx.description || '-'}</strong></td>
          <td style="font-weight: 600; color: ${isIncome ? 'var(--accent-green)' : 'var(--text-primary)'};">${sign}${this.formatIDR(tx.amount)}</td>
          <td>${tx.category_name || '-'}</td>
          <td>${tx.source_account_name || tx.destination_account_name || '-'}</td>
          <td><span class="badge-cat-pill ${isIncome ? 'cat-green' : (tx.type === 'TRANSFER' ? 'cat-blue' : 'cat-rose')}">${tx.type}</span></td>
        `;
        this.dashboardHistoryBody.appendChild(tr);
      });
    }
  }

  async handleReverse(txId) {
    const reason = prompt('Masukkan alasan jurnal pembalik (reversal):', 'Koreksi pencatatan');
    if (!reason) return;

    try {
      const res = await api.transactions.reverse(txId, reason);
      this.showAlert(res.message || 'Jurnal pembalik berhasil diterbitkan.', 'success');
      await Promise.all([this.loadAccounts(), this.loadHistory(), this.loadBudgetOverview()]);
    } catch (err) {
      this.showAlert(`Gagal membalik transaksi: ${err.message}`, 'error');
    }
  }

  // ==========================================
  // AI & Voice Flow (Tab 1 / Screen 02)
  // ==========================================
  async handleAIParse() {
    const text = this.aiInput.value.trim();
    if (!text) {
      this.showAlert('Masukkan kalimat mutasi terlebih dahulu.', 'warning');
      return;
    }

    this.btnParse.disabled = true;
    this.btnParse.innerHTML = `<span class="loading-spinner"></span> Memproses AI...`;

    try {
      const res = await api.ai.parse(text);
      this.currentBatch = {
        batch_id: res.data.batch_id,
        drafts: res.data.drafts || [],
      };
      this.renderDrafts();
      this.showAlert(`Berhasil mengekstrak ${res.data.items_count} draft transaksi.`, 'success');
    } catch (err) {
      this.showAlert(`Gagal menganalisis kalimat: ${err.message}`, 'error');
    } finally {
      this.btnParse.disabled = false;
      this.btnParse.innerHTML = `<span>Proses Mutasi AI</span>`;
    }
  }

  // Render Drafts in Screen 02 1:1 Table Style
  renderDrafts() {
    if (!this.currentBatch || this.currentBatch.drafts.length === 0) {
      if (this.draftFooterRow) this.draftFooterRow.style.display = 'none';
      if (this.draftCountText) this.draftCountText.textContent = '0 draft';
      this.draftTableBody.innerHTML = `
        <tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 18px;">
          Belum ada draft mutasi. Tulis atau rekam kalimat mutasi pada Command Center di atas.
        </td></tr>
      `;
      return;
    }

    const pendingDrafts = this.currentBatch.drafts.filter((d) => d.status === 'PENDING');
    if (pendingDrafts.length === 0) {
      if (this.draftFooterRow) this.draftFooterRow.style.display = 'none';
      if (this.draftCountText) this.draftCountText.textContent = '0 draft';
      this.draftTableBody.innerHTML = `
        <tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 18px;">
          Semua draft mutasi dalam batch ini telah diproses atau dibatalkan.
        </td></tr>
      `;
      return;
    }

    if (this.draftCountText) this.draftCountText.textContent = `${pendingDrafts.length} draft`;
    this.draftTableBody.innerHTML = '';

    let totalExpense = 0;

    pendingDrafts.forEach((d, idx) => {
      const tr = document.createElement('tr');
      const pillCatClass = d.category_name && d.category_name.toLowerCase().includes('makan') ? 'cat-amber' : 'cat-blue';
      const typeClass = d.type === 'INCOME' ? 'cat-green' : (d.type === 'TRANSFER' ? 'cat-blue' : 'cat-rose');

      let accText = '-';
      if (d.type === 'EXPENSE') accText = `${d.source_account_name || 'Rekening'}`;
      else if (d.type === 'INCOME') accText = `${d.destination_account_name || 'Rekening'}`;
      else if (d.type === 'TRANSFER') accText = `${d.source_account_name} ➔ ${d.destination_account_name}`;

      if (d.type === 'EXPENSE') totalExpense += parseFloat(d.amount) || 0;

      tr.innerHTML = `
        <td style="color: var(--text-secondary); font-size: 9px;">${idx + 1}</td>
        <td><strong>${d.description || d.type}</strong></td>
        <td><span class="badge-cat-pill ${pillCatClass}">${d.category_name || '-'}</span></td>
        <td><strong>${this.formatIDR(d.amount)}</strong></td>
        <td style="color: var(--text-secondary); font-size: 9px;">${accText}</td>
        <td><span class="badge-cat-pill ${typeClass}">${d.type}</span></td>
        <td><span class="ready-status-dot">Siap</span></td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 4px; justify-content: flex-end;">
            <button class="btn-draft-edit btn-edit-draft" data-id="${d.id}">Edit</button>
            <button class="btn-draft-remove btn-cancel-draft" data-id="${d.id}">Hapus</button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-cancel-draft').addEventListener('click', () => this.handleCancelDraft(d.id));
      tr.querySelector('.btn-edit-draft').addEventListener('click', () => this.handleEditDraft(d));
      this.draftTableBody.appendChild(tr);
    });

    if (this.draftTotalSummary) {
      this.draftTotalSummary.textContent = `Total pengeluaran draft: ${this.formatIDR(totalExpense)}`;
    }
    if (this.draftFooterRow) {
      this.draftFooterRow.style.display = 'flex';
    }
  }

  handleEditDraft(draft) {
    const newDesc = prompt('Ubah deskripsi transaksi:', draft.description);
    if (!newDesc) return;
    const newAmount = prompt('Ubah jumlah nominal (Rp):', draft.amount);
    if (!newAmount) return;

    draft.description = newDesc;
    draft.amount = parseFloat(newAmount) || draft.amount;
    this.renderDrafts();
    this.showAlert('Draft transaksi berhasil disunting lokal.', 'info');
  }

  async handleCancelDraft(draftId) {
    try {
      await api.transactions.cancelDraft(draftId);
      this.currentBatch.drafts = this.currentBatch.drafts.filter((d) => d.id !== draftId);
      this.renderDrafts();
      this.showAlert('Draft transaksi dibatalkan.', 'info');
    } catch (err) {
      this.showAlert(`Gagal membatalkan draft: ${err.message}`, 'error');
    }
  }

  async handleConfirmBatch() {
    if (!this.currentBatch) return;

    this.btnConfirmBatch.disabled = true;
    this.btnConfirmBatch.innerHTML = `<span class="loading-spinner"></span> Mengonfirmasi...`;

    try {
      const res = await api.transactions.confirmBatch(this.currentBatch.batch_id);
      this.showAlert(res.message || 'Seluruh transaksi berhasil dibukukan!', 'success');
      this.currentBatch = null;
      this.renderDrafts();
      this.aiInput.value = '';

      await Promise.all([this.loadAccounts(), this.loadHistory(), this.loadBudgetOverview()]);
    } catch (err) {
      this.showAlert(`Gagal konfirmasi batch: ${err.message}`, 'error');
    } finally {
      this.btnConfirmBatch.disabled = false;
      this.btnConfirmBatch.innerHTML = `<span>✓</span><span>Konfirmasi semua draft</span>`;
    }
  }

  // Voice Recording
  async toggleRecording() {
    if (this.recorder.isRecording) {
      this.stopRecordingAndTranscribe();
    } else {
      this.startRecording();
    }
  }

  async startRecording() {
    try {
      await this.recorder.start();
    } catch (err) {
      this.showAlert(err.message, 'error');
    }
  }

  handleRecordingState(isRecording) {
    if (isRecording) {
      this.btnRecord.classList.add('recording');
      this.btnRecord.innerHTML = `<span>⏹</span><span>Berhenti Rekam</span>`;
      this.recordStatus.textContent = 'Merekam suara (Maks 30s)...';
    } else {
      this.btnRecord.classList.remove('recording');
      this.btnRecord.innerHTML = `<span>🎤</span><span>Rekam suara</span>`;
      this.recordStatus.textContent = 'Bahasa Indonesia · hasil transkripsi ditinjau sebelum diproses';
    }
  }

  async stopRecordingAndTranscribe() {
    const audioBlob = await this.recorder.stop();
    if (!audioBlob) return;

    this.recordStatus.innerHTML = `<span class="loading-spinner"></span> Mengunggah ke OCI Speech...`;
    this.btnRecord.disabled = true;

    try {
      const jobRes = await api.speech.transcribe(audioBlob, 'recorded_speech.webm');
      const jobId = jobRes.job_id;
      this.pollTranscription(jobId);
    } catch (err) {
      this.showAlert(`Gagal memulai transkripsi: ${err.message}`, 'error');
      this.recordStatus.textContent = 'Bahasa Indonesia · hasil transkripsi ditinjau sebelum diproses';
      this.btnRecord.disabled = false;
    }
  }

  async pollTranscription(jobId) {
    const startTime = Date.now();
    const maxPollTimeMs = 90 * 1000;
    this.recordStatus.innerHTML = `<span class="loading-spinner"></span> Menerjemahkan suara (OCI Whisper)...`;

    const pollInterval = setInterval(async () => {
      if (Date.now() - startTime > maxPollTimeMs) {
        clearInterval(pollInterval);
        this.recordStatus.textContent = 'Bahasa Indonesia · hasil transkripsi ditinjau sebelum diproses';
        this.btnRecord.disabled = false;
        this.showAlert('Transkripsi suara timeout. Silakan coba lagi.', 'error');
        return;
      }

      try {
        const res = await api.speech.getStatus(jobId);
        const data = res.data;

        if (data.status === 'SUCCEEDED') {
          clearInterval(pollInterval);
          this.recordStatus.textContent = 'Bahasa Indonesia · hasil transkripsi ditinjau sebelum diproses';
          this.btnRecord.disabled = false;

          const transcript = data.transcript || '';
          if (transcript) {
            this.aiInput.value = transcript;
            this.showAlert('Suara berhasil ditranskrip! Silakan tinjau teks lalu klik Proses.', 'success');
            this.aiInput.focus();
          } else {
            this.showAlert('Tidak ada suara terdeteksi dalam rekaman.', 'warning');
          }
        } else if (data.status === 'FAILED') {
          clearInterval(pollInterval);
          this.recordStatus.textContent = 'Bahasa Indonesia · hasil transkripsi ditinjau sebelum diproses';
          this.btnRecord.disabled = false;
          this.showAlert(`Transkripsi gagal: ${data.error_message || 'Terjadi kesalahan sistem.'}`, 'error');
        }
      } catch (err) {
        console.warn('Polling error:', err);
      }
    }, 2500);
  }

  // ==========================================
  // TAB 3: ANGGARAN & TARGET TABUNGAN
  // ==========================================
  async loadPlanningData() {
    await Promise.all([
      this.loadBudgetOverview(),
      this.loadSavingsGoals(),
    ]);
  }

  async loadBudgetOverview() {
    try {
      const res = await api.planning.getBudget();
      this.budgetData = res.data;
      this.renderBudgetOverview();
    } catch (err) {
      console.warn('Gagal memuat anggaran:', err);
    }
  }

  renderBudgetOverview() {
    if (!this.budgetData) return;
    const b = this.budgetData;
    const monthNames = [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    const monthNamesShort = [
      '', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
    ];

    // Update Right Column Mini Card
    if (this.budgetPeriodMini) {
      this.budgetPeriodMini.textContent = `${monthNamesShort[b.period_month] || b.period_month} ${b.period_year}`;
    }
    if (this.budgetCapVal) this.budgetCapVal.textContent = this.formatIDR(b.total_limit);
    if (this.budgetUsedVal) this.budgetUsedVal.textContent = this.formatIDR(b.total_spent);
    if (this.budgetRemainderVal) {
      this.budgetRemainderVal.textContent = b.is_over 
        ? `⚠️ Melebihi plafon sebesar ${this.formatIDR(b.total_spent - b.total_limit)}`
        : `Sisa plafon: ${this.formatIDR(b.total_remaining)}`;
      this.budgetRemainderVal.style.color = b.is_over ? 'var(--accent-rose)' : 'var(--accent-green)';
    }

    const pct = Math.min(Math.round(b.percentage_spent || 0), 100);
    if (this.budgetFillBar) {
      this.budgetFillBar.style.width = `${pct}%`;
      this.budgetFillBar.style.background = b.is_over ? 'var(--accent-rose)' : '#659678';
    }

    // Update Tab 2 Expanded Planning View
    if (this.budgetPeriodLabel) {
      this.budgetPeriodLabel.textContent = `Periode: ${monthNames[b.period_month] || b.period_month} ${b.period_year}`;
    }
    if (this.budgetTotalLimit) this.budgetTotalLimit.textContent = this.formatIDR(b.total_limit);
    if (this.budgetTotalSpent) this.budgetTotalSpent.textContent = this.formatIDR(b.total_spent);
    if (this.budgetTotalRemaining) {
      this.budgetTotalRemaining.textContent = this.formatIDR(b.total_remaining);
      this.budgetTotalRemaining.style.color = b.is_over ? 'var(--accent-rose)' : 'var(--accent-green)';
    }
    if (this.budgetPercentLabel) this.budgetPercentLabel.textContent = `${b.percentage_spent}%`;
    if (this.budgetProgressBar) {
      this.budgetProgressBar.style.width = `${pct}%`;
      this.budgetProgressBar.style.background = b.is_over ? 'var(--accent-rose)' : '#659678';
    }

    // Category Breakdown in Tab 2
    if (this.categoryBudgetsList) {
      this.categoryBudgetsList.innerHTML = '';
      if (!b.categories || b.categories.length === 0) {
        this.categoryBudgetsList.innerHTML = `
          <div style="color: var(--text-muted); font-size: 10px;">
            Belum ada batas per kategori. Klik tombol <strong>"➕ Limit Kategori"</strong> di atas.
          </div>
        `;
      } else {
        b.categories.forEach((cat) => {
          const catPct = Math.min(Math.round(cat.percentage_spent || 0), 100);
          const row = document.createElement('div');
          row.className = 'figma-card';
          row.style.padding = '10px 14px';
          row.style.background = 'var(--bg-input)';

          row.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-weight: 600; font-size: 11px;">${cat.category_name}</span>
              <span style="font-size: 10px; color: var(--text-secondary);">
                ${this.formatIDR(cat.spent_amount)} / <strong>${this.formatIDR(cat.limit_amount)}</strong> (${cat.percentage_spent}%)
              </span>
            </div>
            <div class="budget-progress-track" style="height: 6px; margin-top: 2px;">
              <div class="budget-progress-fill" style="width: ${catPct}%; background: ${cat.is_over ? 'var(--accent-rose)' : '#68A382'};"></div>
            </div>
            ${cat.is_over ? `<div style="font-size: 9px; color: var(--accent-rose); margin-top: 3px;">⚠️ Melebihi plafon sebesar ${this.formatIDR(cat.spent_amount - cat.limit_amount)}</div>` : ''}
          `;
          this.categoryBudgetsList.appendChild(row);
        });
      }
    }
  }

  async loadSavingsGoals() {
    try {
      const res = await api.planning.getGoals();
      this.savingsGoals = res.data || [];
      this.renderSavingsGoals();
    } catch (err) {
      console.warn('Gagal memuat target tabungan:', err);
    }
  }

  renderSavingsGoals() {
    if (!this.savingsGoalsContainer) return;
    this.savingsGoalsContainer.innerHTML = '';

    if (this.savingsGoals.length === 0) {
      this.savingsGoalsContainer.innerHTML = `
        <div style="color: var(--text-muted); font-size: 10px; grid-column: 1 / -1; padding: 12px 0;">
          Belum ada target tabungan yang dibuat. Tekan tombol <strong>"➕ Target Baru"</strong> untuk memantau tabungan impian Anda secara otomatis!
        </div>
      `;
      return;
    }

    this.savingsGoals.forEach((g) => {
      const card = document.createElement('div');
      card.className = 'figma-card';
      card.style.padding = '14px 16px';
      const pct = Math.min(Math.round(g.progress_percent || 0), 100);

      let statusBadge = '<span class="badge-cat-pill cat-green">BERJALAN</span>';
      if (g.status === 'ACHIEVED' || g.is_achieved) {
        statusBadge = '<span class="badge-cat-pill cat-green">🎉 TERCAPAI</span>';
      } else if (g.status === 'CANCELLED') {
        statusBadge = '<span class="badge-cat-pill cat-rose">DIBATALKAN</span>';
      }

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
          <div>
            <h4 style="font-size: 13px; font-weight: 600; margin-bottom: 2px;">${g.name}</h4>
            <span style="font-size: 9px; color: var(--text-secondary);">Rekening: <strong>${g.account_name}</strong></span>
          </div>
          ${statusBadge}
        </div>

        <div style="margin-top: 10px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 4px;">
            <span style="color: var(--text-secondary);">Terkumpul: <strong>${this.formatIDR(g.current_balance)}</strong></span>
            <span style="color: var(--text-muted);">Sasaran: <strong>${this.formatIDR(g.target_amount)}</strong></span>
          </div>
          <div class="goal-progress-track">
            <div class="goal-progress-fill" style="width: ${pct}%;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 9px; color: var(--text-secondary); margin-top: 4px;">
            <span>Progres: ${g.progress_percent}%</span>
            ${g.target_date ? `<span>Tenggat: ${g.target_date}</span>` : '<span>Tanpa batas waktu</span>'}
          </div>
        </div>

        ${g.status === 'ACTIVE' ? `
          <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 10px;">
            <button class="btn-reverse-action btn-mark-achieved" data-id="${g.id}">
              Tandai Tercapai
            </button>
            <button class="btn-reverse-action btn-cancel-goal" data-id="${g.id}" style="color: var(--accent-rose);">
              Batalkan
            </button>
          </div>
        ` : ''}
      `;

      const btnAchieve = card.querySelector('.btn-mark-achieved');
      if (btnAchieve) {
        btnAchieve.addEventListener('click', () => this.handleUpdateGoalStatus(g.id, 'ACHIEVED'));
      }
      const btnCancel = card.querySelector('.btn-cancel-goal');
      if (btnCancel) {
        btnCancel.addEventListener('click', () => this.handleUpdateGoalStatus(g.id, 'CANCELLED'));
      }

      this.savingsGoalsContainer.appendChild(card);
    });
  }

  async handleUpdateGoalStatus(goalId, newStatus) {
    try {
      await api.planning.updateGoalStatus(goalId, newStatus);
      this.showAlert(`Status target berhasil diubah ke ${newStatus}.`, 'success');
      await this.loadSavingsGoals();
    } catch (err) {
      this.showAlert(`Gagal mengubah status: ${err.message}`, 'error');
    }
  }

  populateCatSelect() {
    if (!this.selectCatBudget) return;
    this.selectCatBudget.innerHTML = '';
    const expenseCats = this.categories.filter((c) => c.type === 'EXPENSE' || !c.type);
    const list = expenseCats.length > 0 ? expenseCats : this.categories;

    list.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      this.selectCatBudget.appendChild(opt);
    });
  }

  populateGoalAccSelect() {
    if (!this.selectGoalAccount) return;
    this.selectGoalAccount.innerHTML = '';
    this.accounts.forEach((a) => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = `${a.name} (${this.formatIDR(a.current_balance)})`;
      this.selectGoalAccount.appendChild(opt);
    });
  }

  async handleSetBudget(e) {
    e.preventDefault();
    const val = parseFloat(this.inputBudgetLimit.value);
    if (!val || val <= 0) return;

    const now = new Date();
    try {
      await api.planning.setMonthlyBudget(now.getFullYear(), now.getMonth() + 1, val);
      this.closeModals();
      this.showAlert('Pagu anggaran total bulanan berhasil disimpan!', 'success');
      await this.loadBudgetOverview();
    } catch (err) {
      this.showAlert(`Gagal menyimpan anggaran: ${err.message}`, 'error');
    }
  }

  async handleSetCatBudget(e) {
    e.preventDefault();
    const catId = parseInt(this.selectCatBudget.value);
    const val = parseFloat(this.inputCatBudgetLimit.value);
    if (!catId || !val || val <= 0) return;

    const now = new Date();
    try {
      await api.planning.setCategoryBudget(catId, now.getFullYear(), now.getMonth() + 1, val);
      this.closeModals();
      this.showAlert('Batas anggaran kategori berhasil disimpan!', 'success');
      await this.loadBudgetOverview();
    } catch (err) {
      this.showAlert(`Gagal menyimpan limit kategori: ${err.message}`, 'error');
    }
  }

  async handleCreateGoal(e) {
    e.preventDefault();
    const dedicatedAccountId = parseInt(this.selectGoalAccount.value);
    const name = this.inputGoalName.value.trim();
    const targetAmount = parseFloat(this.inputGoalTarget.value);
    const targetDate = this.inputGoalDate.value || null;

    if (!dedicatedAccountId || !name || !targetAmount) return;

    try {
      await api.planning.createGoal({
        dedicated_account_id: dedicatedAccountId,
        name,
        target_amount: targetAmount,
        target_date: targetDate,
      });
      this.closeModals();
      this.formCreateGoal.reset();
      this.showAlert('Target tabungan baru berhasil ditambahkan!', 'success');
      await this.loadSavingsGoals();
    } catch (err) {
      this.showAlert(`Gagal membuat target tabungan: ${err.message}`, 'error');
    }
  }

  // ==========================================
  // TAB 4: PENASIHAT KEUANGAN AI & COPILOT
  // ==========================================
  async loadCopilotData() {
    this.populateCopilotAccSelect();
    await this.loadScenarios();
  }

  populateCopilotAccSelect() {
    if (!this.copilotAccountSelect) return;
    this.copilotAccountSelect.innerHTML = '<option value="">Otomatis (Pilih Terbaik)</option>';
    this.accounts.forEach((a) => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = `${a.name} (${this.formatIDR(a.current_balance)})`;
      this.copilotAccountSelect.appendChild(opt);
    });
  }

  async loadScenarios() {
    try {
      const res = await api.planning.getScenarios(10);
      this.scenarios = res.data || [];
      this.renderScenarios();
    } catch (err) {
      console.warn('Gagal memuat memori skenario:', err);
    }
  }

  renderScenarios() {
    if (!this.scenariosList) return;
    this.scenariosList.innerHTML = '';

    if (this.scenarios.length === 0) {
      this.scenariosList.innerHTML = `
        <div style="color: var(--text-muted); font-size: 10px;">
          Belum ada riwayat skenario pembelian yang tersimpan.
        </div>
      `;
      return;
    }

    this.scenarios.forEach((s) => {
      const row = document.createElement('div');
      row.className = 'figma-card';
      row.style.padding = '12px 14px';
      row.style.background = 'var(--bg-input)';

      const dateStr = s.created_at ? s.created_at.slice(0, 16).replace('T', ' ') : '-';
      row.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <strong style="font-size: 12px;">${s.item_name}</strong>
          <span style="font-weight: 600; font-size: 11px; color: var(--accent-rose);">${this.formatIDR(s.estimated_cost)}</span>
        </div>
        <p style="font-size: 10px; color: var(--text-primary); line-height: 1.5; margin-bottom: 4px; white-space: pre-line;">
          ${s.ai_summary_advice}
        </p>
        <div style="display: flex; justify-content: space-between; font-size: 8.5px; color: var(--text-muted);">
          <span>Rekening: ${s.target_account_name || 'Utama'}</span>
          <span>${dateStr}</span>
        </div>
      `;
      this.scenariosList.appendChild(row);
    });
  }

  async handleConsultCopilot() {
    const query = this.copilotInput.value.trim();
    if (!query) {
      this.showAlert('Ketikkan rencana pembelian Anda terlebih dahulu.', 'warning');
      return;
    }

    const targetAccId = this.copilotAccountSelect.value ? parseInt(this.copilotAccountSelect.value) : null;
    this.btnConsultCopilot.disabled = true;
    this.btnConsultCopilot.innerHTML = `<span class="loading-spinner"></span> Menganalisis...`;

    try {
      const res = await api.planning.consultPurchase(query, targetAccId);
      const d = res.data;
      this.renderCopilotAdvice(d);
      await this.loadScenarios();
      this.showAlert('Analisis kelayakan pembelian berhasil disusun!', 'success');
    } catch (err) {
      this.showAlert(`Gagal analisis copilot: ${err.message}`, 'error');
    } finally {
      this.btnConsultCopilot.disabled = false;
      this.btnConsultCopilot.innerHTML = `✨ Minta Pertimbangan AI`;
    }
  }

  renderCopilotAdvice(data) {
    if (!this.copilotResult) return;
    this.copilotResult.style.display = 'block';

    if (this.copilotVerdictBadge) this.copilotVerdictBadge.textContent = data.verdict_badge;
    if (this.copilotItemCost) this.copilotItemCost.textContent = `${data.item_name}: ${this.formatIDR(data.estimated_cost)}`;
    if (this.copilotAdviceText) this.copilotAdviceText.textContent = data.advice;

    // Styling verdict box
    if (this.copilotVerdictBox) {
      this.copilotVerdictBox.className = 'verdict-box';
      if (data.verdict === 'AMAN') {
        this.copilotVerdictBox.classList.add('verdict-aman');
      } else if (data.verdict === 'PERLU_PERTIMBANGAN') {
        this.copilotVerdictBox.classList.add('verdict-waspada');
      } else {
        this.copilotVerdictBox.classList.add('verdict-berisiko');
      }
    }

    // Snapshot Breakdown
    if (this.copilotSnapshotGrid) {
      const snap = data.financial_snapshot || {};
      this.copilotSnapshotGrid.innerHTML = `
        <div class="snapshot-card">
          <span class="snapshot-label">Rekening Terpilih</span>
          <span class="snapshot-val">${snap.rekening_terpilih || '-'}</span>
        </div>
        <div class="snapshot-card">
          <span class="snapshot-label">Saldo Saat Ini</span>
          <span class="snapshot-val">${this.formatIDR(snap.saldo_saat_ini)}</span>
        </div>
        <div class="snapshot-card">
          <span class="snapshot-label">Saldo Pasca Beli</span>
          <span class="snapshot-val" style="color: ${snap.saldo_setelah_beli < 0 ? 'var(--accent-rose)' : 'var(--accent-green)'}">
            ${this.formatIDR(snap.saldo_setelah_beli)}
          </span>
        </div>
        <div class="snapshot-card">
          <span class="snapshot-label">Sisa Anggaran Bulan Ini</span>
          <span class="snapshot-val">${this.formatIDR(snap.sisa_anggaran_bulan_ini)}</span>
        </div>
        <div class="snapshot-card">
          <span class="snapshot-label">Sisa Anggaran Pasca Beli</span>
          <span class="snapshot-val" style="color: ${snap.sisa_anggaran_setelah_beli < 0 ? 'var(--accent-rose)' : 'var(--accent-green)'}">
            ${this.formatIDR(snap.sisa_anggaran_setelah_beli)}
          </span>
        </div>
        <div class="snapshot-card">
          <span class="snapshot-label">Target Tabungan Aktif</span>
          <span class="snapshot-val">${snap.target_tabungan_aktif || 0} sasaran</span>
        </div>
      `;
    }
  }

  async handleAnalyzePatterns() {
    this.btnAnalyzePatterns.disabled = true;
    this.btnAnalyzePatterns.innerHTML = `<span class="loading-spinner"></span> Mendeteksi Pola...`;

    try {
      const res = await api.planning.getSpendingPatterns();
      const d = res.data;
      if (this.patternResult) this.patternResult.style.display = 'block';
      if (this.patternAiText) this.patternAiText.textContent = d.ai_summary;

      if (this.patternTableBody) {
        this.patternTableBody.innerHTML = '';
        if (!d.category_comparisons || d.category_comparisons.length === 0) {
          this.patternTableBody.innerHTML = `
            <tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 14px;">
              Belum cukup transaksi untuk perbandingan pola pengeluaran.
            </td></tr>
          `;
        } else {
          d.category_comparisons.forEach((c) => {
            const tr = document.createElement('tr');
            const diff = parseFloat(c.diff) || 0;
            const pct = c.percentage_change || 0;
            const isIncrease = diff > 0;
            const changeColor = diff === 0 ? 'var(--text-secondary)' : (isIncrease ? 'var(--accent-rose)' : 'var(--accent-green)');
            const arrow = diff === 0 ? '➖' : (isIncrease ? '📈 Naik' : '📉 Turun');

            tr.innerHTML = `
              <td><strong>${c.category_name}</strong></td>
              <td>${this.formatIDR(c.prev_spent)}</td>
              <td>${this.formatIDR(c.curr_spent)}</td>
              <td style="color: ${changeColor}">${diff > 0 ? '+' : ''}${this.formatIDR(diff)}</td>
              <td style="color: ${changeColor}; font-size: 8.5px;">${arrow} ${pct}%</td>
            `;
            this.patternTableBody.appendChild(tr);
          });
        }
      }
      this.showAlert('Analisis perbandingan pengeluaran berhasil!', 'success');
    } catch (err) {
      this.showAlert(`Gagal analisis pola: ${err.message}`, 'error');
    } finally {
      this.btnAnalyzePatterns.disabled = false;
      this.btnAnalyzePatterns.innerHTML = `🔄 Analisis Perubahan Pola`;
    }
  }
}

// Bootstrapping
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
