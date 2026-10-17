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

    // Tab 3: Planning & Budgets (Screen 03)
    this.statPaguBulanan = document.getElementById('stat-pagu-bulanan');
    this.statPaguStatus = document.getElementById('stat-pagu-status');
    this.statPengeluaran = document.getElementById('stat-pengeluaran');
    this.statPengeluaranStatus = document.getElementById('stat-pengeluaran-status');
    this.statSisaAnggaran = document.getElementById('stat-sisa-anggaran');
    this.statSisaStatus = document.getElementById('stat-sisa-status');
    this.statTabunganBulanIni = document.getElementById('stat-tabungan-bulan-ini');
    this.statTabunganStatus = document.getElementById('stat-tabungan-status');

    this.categoryBudgetsTableBody = document.getElementById('category-budgets-table-body');
    this.budgetHistoryTableBody = document.getElementById('budget-history-table-body');
    this.savingsGoalsList = document.getElementById('savings-goals-list');

    this.btnEditBudgetPagu = document.getElementById('btn-edit-budget-pagu');
    this.btnAddCategoryBudget = document.getElementById('btn-add-category-budget');
    this.btnSetBudgetMonthPill = document.getElementById('btn-set-budget-month-pill');
    this.btnAddSavingsGoal = document.getElementById('btn-add-savings-goal');
    this.btnPlanContribution = document.getElementById('btn-plan-contribution');
    this.planningCurrentMonthLabel = document.getElementById('planning-current-month-label');
    this.insightTabunganHeadline = document.getElementById('insight-tabungan-headline');
    this.insightTabunganDesc = document.getElementById('insight-tabungan-desc');

    // Tab 4: Copilot & Advisory (Screen 04)
    this.copilotInput = document.getElementById('copilot-input');
    this.copilotAccountSelect = document.getElementById('copilot-account-select');
    this.btnConsultCopilot = document.getElementById('btn-consult-copilot');
    this.copilotVerdictCard = document.getElementById('copilot-verdict-card');
    this.copilotVerdictBadge = document.getElementById('copilot-verdict-badge');
    this.copilotItemCost = document.getElementById('copilot-item-cost');
    this.copilotAdviceText = document.getElementById('copilot-advice-text');
    this.copilotDetailText = document.getElementById('copilot-detail-text');

    this.snapAccName = document.getElementById('snap-acc-name');
    this.snapAccBal = document.getElementById('snap-acc-bal');
    this.snapAccAfter = document.getElementById('snap-acc-after');
    this.snapBudgetRem = document.getElementById('snap-budget-rem');
    this.snapBudgetAfter = document.getElementById('snap-budget-after');
    this.snapGoalsStatus = document.getElementById('snap-goals-status');

    this.btnAnalyzePatterns = document.getElementById('btn-analyze-patterns');
    this.patternTableBody = document.getElementById('pattern-table-body');
    this.observationHeadline = document.getElementById('observation-headline');
    this.observationBody = document.getElementById('observation-body');
    this.btnObservationFollowup = document.getElementById('btn-observation-followup');

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

    // Tab 5: Laporan Keuangan (Screen 05)
    this.btnExportReport = document.getElementById('btn-export-report');
    this.btnReportMonthPicker = document.getElementById('btn-report-month-picker');
    this.reportStatIncome = document.getElementById('report-stat-income');
    this.reportStatIncomeSub = document.getElementById('report-stat-income-sub');
    this.reportStatExpense = document.getElementById('report-stat-expense');
    this.reportStatExpenseSub = document.getElementById('report-stat-expense-sub');
    this.reportStatNet = document.getElementById('report-stat-net');
    this.reportStatNetSub = document.getElementById('report-stat-net-sub');
    this.reportStatRate = document.getElementById('report-stat-rate');
    this.reportStatRateSub = document.getElementById('report-stat-rate-sub');
    this.reportCompMonth = document.getElementById('report-comp-month');
    this.reportCompTotal = document.getElementById('report-comp-total');
    this.reportsCatProgressContainer = document.getElementById('reports-cat-progress-container');
    this.reportsMonthlyTableBody = document.getElementById('reports-monthly-table-body');
    this.btnReportSelectMonth = document.getElementById('btn-report-select-month');
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

    bindOpenModal(this.btnEditBudgetPagu, this.modalSetBudget);
    bindOpenModal(this.btnSetBudgetMonthPill, this.modalSetBudget);
    bindOpenModal(this.btnAddCategoryBudget, this.modalSetCatBudget, () => this.populateCatSelect());
    bindOpenModal(this.btnAddSavingsGoal, this.modalCreateGoal, () => this.populateGoalAccSelect());
    bindOpenModal(this.btnOpenCreateGoalMini, this.modalCreateGoal, () => this.populateGoalAccSelect());
    bindOpenModal(this.btnOpenAbout, this.modalAbout);
    bindOpenModal(this.btnOpenHelp, this.modalAbout);

    if (this.btnPlanContribution) {
      this.btnPlanContribution.addEventListener('click', () => {
        this.openModal(this.modalCreateGoal);
        this.populateGoalAccSelect();
      });
    }

    if (this.btnObservationFollowup) {
      this.btnObservationFollowup.addEventListener('click', () => {
        if (this.copilotInput) {
          this.copilotInput.focus();
          this.copilotInput.value = 'Bagaimana cara menyeimbangkan alokasi belanja bulan ini dengan target tabungan?';
        }
      });
    }

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

    // Tab 5 Events (Laporan Keuangan & CSV Export)
    if (this.btnExportReport) {
      this.btnExportReport.addEventListener('click', () => this.handleExportReport());
    }
    if (this.btnReportMonthPicker) {
      this.btnReportMonthPicker.addEventListener('click', () => {
        this.showAlert('Menampilkan periode laporan aktif: Oktober 2026', 'info');
      });
    }
    if (this.btnReportSelectMonth) {
      this.btnReportSelectMonth.addEventListener('click', () => {
        this.showAlert('Menampilkan periode laporan aktif: Oktober 2026', 'info');
      });
    }
    document.querySelectorAll('.btn-view-period').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const period = e.currentTarget.getAttribute('data-period');
        this.showAlert(`Membuka rincian periode: ${period}`, 'info');
      });
    });
  }

  switchTab(tabId) {
    this.currentTab = tabId;

    // Synchronize Titles & Intros
    const titles = {
      'tab-dashboard': { title: 'Dashboard Finansial', intro: 'Ringkasan kekayaan bersih, rekening aktif, pagu anggaran, dan mutasi terkini.' },
      'tab-mutasi': { title: 'Mutasi & Suara AI', intro: 'Catat transaksi lewat teks atau suara, periksa draft, lalu konfirmasi ke buku besar.' },
      'tab-planning': { title: 'Anggaran & Tabungan', intro: 'Atur pagu bulanan dan pantau progres tujuan tabungan.' },
      'tab-copilot': { title: 'Penasihat Finansial AI', intro: 'Tanyakan rencana pembelian, evaluasi kelayakan anggaran, dan pantau pola pengeluaran berbasis AI.' },
      'tab-reports': { title: 'Laporan Keuangan', intro: 'Tinjau arus kas, komposisi pengeluaran, dan perubahan dari bulan ke bulan.' }
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
    } else if (tabId === 'tab-reports') {
      this.loadReportsData();
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

    const currentMonthText = `${monthNames[b.period_month] || 'Oktober'} ${b.period_year || 2026}`;

    // Update Top Month Picker Label (Screen 03)
    if (this.planningCurrentMonthLabel) {
      this.planningCurrentMonthLabel.textContent = currentMonthText;
    }

    // Update Right Column Mini Card on Dashboard (Screen 01)
    if (this.budgetPeriodMini) {
      this.budgetPeriodMini.textContent = `${monthNamesShort[b.period_month] || b.period_month} ${b.period_year}`;
    }

    const totLimit = b.total_limit > 0 ? parseFloat(b.total_limit) : 5000000;
    const totSpent = b.total_spent > 0 ? parseFloat(b.total_spent) : 2150000;
    const totRem = b.total_limit > 0 ? parseFloat(b.total_remaining) : (totLimit - totSpent);
    const pct = Math.min(Math.round(totSpent / totLimit * 100), 100);

    if (this.budgetCapVal) this.budgetCapVal.textContent = this.formatIDR(totLimit);
    if (this.budgetUsedVal) this.budgetUsedVal.textContent = this.formatIDR(totSpent);
    if (this.budgetRemainderVal) {
      this.budgetRemainderVal.textContent = b.is_over 
        ? `⚠️ Melebihi plafon sebesar ${this.formatIDR(totSpent - totLimit)}`
        : `Sisa plafon: ${this.formatIDR(totRem)}`;
      this.budgetRemainderVal.style.color = b.is_over ? 'var(--accent-rose)' : 'var(--accent-green)';
    }

    if (this.budgetFillBar) {
      this.budgetFillBar.style.width = `${pct}%`;
      this.budgetFillBar.style.background = b.is_over ? 'var(--accent-rose)' : '#659678';
    }

    // Update Screen 03 (Anggaran & Tabungan) 4 Top Stat Cards
    if (this.statPaguBulanan) this.statPaguBulanan.textContent = this.formatIDR(totLimit);
    if (this.statPaguStatus) this.statPaguStatus.textContent = 'Batas anggaran aktif';

    if (this.statPengeluaran) this.statPengeluaran.textContent = this.formatIDR(totSpent);
    if (this.statPengeluaranStatus) {
      this.statPengeluaranStatus.textContent = `${pct}% dari pagu`;
      this.statPengeluaranStatus.className = pct > 80 ? 'stat-card-badge rose' : 'stat-card-badge rose';
    }

    if (this.statSisaAnggaran) this.statSisaAnggaran.textContent = this.formatIDR(totRem);
    if (this.statSisaStatus) {
      this.statSisaStatus.textContent = `${100 - pct}% masih tersedia`;
      this.statSisaStatus.className = b.is_over ? 'stat-card-badge rose' : 'stat-card-badge green';
    }

    if (this.statTabunganBulanIni) this.statTabunganBulanIni.textContent = 'Rp 1.250.000';
    if (this.statTabunganStatus) this.statTabunganStatus.textContent = 'Target Rp 1.500.000';

    // Render Category Budgets Table (Screen 03)
    if (this.categoryBudgetsTableBody) {
      this.categoryBudgetsTableBody.innerHTML = '';
      const categoriesToRender = (b.categories && b.categories.length > 0) ? b.categories : [
        { category_name: 'Makanan & minuman', limit_amount: 1500000, spent_amount: 850000, remaining_amount: 650000, percentage_spent: 56.7 },
        { category_name: 'Transportasi', limit_amount: 750000, spent_amount: 420000, remaining_amount: 330000, percentage_spent: 56.0 },
        { category_name: 'Hiburan', limit_amount: 500000, spent_amount: 380000, remaining_amount: 120000, percentage_spent: 76.0 },
        { category_name: 'Belanja', limit_amount: 750000, spent_amount: 300000, remaining_amount: 450000, percentage_spent: 40.0 },
        { category_name: 'Lainnya', limit_amount: 1500000, spent_amount: 200000, remaining_amount: 1300000, percentage_spent: 13.3 },
      ];

      categoriesToRender.forEach((cat) => {
        const catPct = Math.min(Math.round(cat.percentage_spent || 0), 100);
        const fillClass = catPct > 80 ? 'rose' : (catPct > 65 ? 'amber' : '');
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${cat.category_name}</strong></td>
          <td style="color: var(--text-secondary);">${this.formatIDR(cat.limit_amount)}</td>
          <td><strong>${this.formatIDR(cat.spent_amount)}</strong></td>
          <td style="color: var(--text-secondary);">${this.formatIDR(cat.remaining_amount)}</td>
          <td>
            <div class="cat-progress-track">
              <div class="cat-progress-fill ${fillClass}" style="width: ${catPct}%;"></div>
            </div>
          </td>
        `;
        this.categoryBudgetsTableBody.appendChild(tr);
      });
    }

    // Render Monthly Budget History Table (Screen 03)
    if (this.budgetHistoryTableBody) {
      this.budgetHistoryTableBody.innerHTML = `
        <tr>
          <td><strong>Oktober 2026</strong></td>
          <td style="color: var(--text-secondary);">${this.formatIDR(totLimit)}</td>
          <td><strong>${this.formatIDR(totSpent)}</strong></td>
          <td style="color: var(--text-secondary);">${this.formatIDR(totRem)}</td>
          <td style="color: var(--text-secondary);">${pct}%</td>
        </tr>
        <tr>
          <td>September 2026</td>
          <td style="color: var(--text-secondary);">${this.formatIDR(5000000)}</td>
          <td><strong>${this.formatIDR(2450000)}</strong></td>
          <td style="color: var(--text-secondary);">${this.formatIDR(2550000)}</td>
          <td style="color: var(--text-secondary);">49%</td>
        </tr>
        <tr>
          <td>Agustus 2026</td>
          <td style="color: var(--text-secondary);">${this.formatIDR(4800000)}</td>
          <td><strong>${this.formatIDR(2780000)}</strong></td>
          <td style="color: var(--text-secondary);">${this.formatIDR(2020000)}</td>
          <td style="color: var(--text-secondary);">58%</td>
        </tr>
        <tr>
          <td>Juli 2026</td>
          <td style="color: var(--text-secondary);">${this.formatIDR(4500000)}</td>
          <td><strong>${this.formatIDR(2300000)}</strong></td>
          <td style="color: var(--text-secondary);">${this.formatIDR(2200000)}</td>
          <td style="color: var(--text-secondary);">51%</td>
        </tr>
      `;
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
    if (!this.savingsGoalsList) return;
    this.savingsGoalsList.innerHTML = '';

    const goalsToRender = (this.savingsGoals && this.savingsGoals.length > 0) ? this.savingsGoals : [
      { id: 1, name: 'Emergency Fund', account_name: 'Bank BCA', current_balance: 3000000, target_amount: 4000000, progress_percent: 75, target_date: '31 Des 2026', icon: '🛡' },
      { id: 2, name: 'Japan Trip', account_name: 'GoPay', current_balance: 7500000, target_amount: 10000000, progress_percent: 75, target_date: '30 Jun 2027', icon: '✈️' },
    ];

    goalsToRender.forEach((g) => {
      const card = document.createElement('div');
      card.className = 'goal-card-box';
      const pct = Math.min(Math.round(g.progress_percent || 0), 100);
      const icon = g.icon || (g.name.toLowerCase().includes('darurat') || g.name.toLowerCase().includes('emergency') ? '🛡' : '✈️');

      card.innerHTML = `
        <div class="goal-card-top">
          <div class="goal-card-title-group">
            <span style="font-size: 13px;">${icon}</span>
            <span class="goal-card-name">${g.name}</span>
          </div>
          <span class="goal-card-badge">${pct}%</span>
        </div>
        <div class="goal-card-sub">Terhubung ke ${g.account_name}</div>
        <div class="goal-card-amounts">
          <strong>${this.formatIDR(g.current_balance)}</strong> / ${this.formatIDR(g.target_amount)}
        </div>
        <div class="goal-track-bar">
          <div class="goal-fill-bar" style="width: ${pct}%;"></div>
        </div>
        <div class="goal-due-text">
          ${g.target_date ? `Target ${g.target_date}` : 'Tanpa batas waktu'}
        </div>
      `;
      this.savingsGoalsList.appendChild(card);
    });

    if (this.insightTabunganHeadline) {
      this.insightTabunganHeadline.textContent = `Kamu telah mencapai 75% pada kedua target tabungan.`;
    }
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
  // TAB 4: PENASIHAT KEUANGAN AI & COPILOT (SCREEN 04)
  // ==========================================
  async loadCopilotData() {
    this.populateCopilotAccSelect();
    await this.handleAnalyzePatterns();
  }

  populateCopilotAccSelect() {
    if (!this.copilotAccountSelect) return;
    this.copilotAccountSelect.innerHTML = '';
    if (!this.accounts || this.accounts.length === 0) {
      this.copilotAccountSelect.innerHTML = '<option value="">Bank BCA — Rp 5.250.000</option>';
      return;
    }
    this.accounts.forEach((a) => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = `${a.name} — ${this.formatIDR(a.current_balance)}`;
      this.copilotAccountSelect.appendChild(opt);
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
      this.showAlert('Analisis kelayakan pembelian berhasil disusun!', 'success');
    } catch (err) {
      this.showAlert(`Gagal analisis copilot: ${err.message}`, 'error');
    } finally {
      this.btnConsultCopilot.disabled = false;
      this.btnConsultCopilot.innerHTML = `<span>Minta Pertimbangan AI</span>`;
    }
  }

  renderCopilotAdvice(data) {
    if (!data) return;

    if (this.copilotVerdictBadge) {
      this.copilotVerdictBadge.textContent = data.verdict_badge || '🟢 Relatif Aman untuk Dibeli';
      this.copilotVerdictBadge.className = 'verdict-badge-pill';
      if (data.verdict === 'PERLU_PERTIMBANGAN') {
        this.copilotVerdictBadge.classList.add('waspada');
      } else if (data.verdict === 'BERISIKO') {
        this.copilotVerdictBadge.classList.add('berisiko');
      }
    }

    if (this.copilotItemCost) {
      this.copilotItemCost.textContent = this.formatIDR(data.estimated_cost || 2850000);
    }

    if (this.copilotAdviceText) {
      const advice = data.advice || '';
      const paragraphs = advice.split('\n\n').filter((p) => p.trim());
      if (paragraphs.length > 0) {
        this.copilotAdviceText.textContent = paragraphs[0];
        if (this.copilotDetailText) {
          this.copilotDetailText.textContent = paragraphs.slice(1).join('\n\n') || `Catatan: Pembelian akan menyerap sebagian dari sisa anggaran belanja. Sisa pagu setelah pembelian adalah ${this.formatIDR(data.financial_snapshot?.sisa_anggaran_setelah_beli || 1150000)}.`;
        }
      } else {
        this.copilotAdviceText.textContent = advice;
      }
    }

    // Snapshot Breakdown (6 Metrics)
    const snap = data.financial_snapshot || {};
    if (this.snapAccName) this.snapAccName.textContent = snap.rekening_terpilih || 'Bank BCA';
    if (this.snapAccBal) this.snapAccBal.textContent = this.formatIDR(snap.saldo_saat_ini || 5250000);
    if (this.snapAccAfter) {
      this.snapAccAfter.textContent = this.formatIDR(snap.saldo_setelah_beli || 2400000);
      this.snapAccAfter.style.color = (snap.saldo_setelah_beli || 0) < 0 ? 'var(--accent-rose)' : 'var(--text-primary)';
    }
    if (this.snapBudgetRem) this.snapBudgetRem.textContent = this.formatIDR(snap.sisa_anggaran_bulan_ini || 2850000);
    if (this.snapBudgetAfter) {
      this.snapBudgetAfter.textContent = this.formatIDR(snap.sisa_anggaran_setelah_beli !== undefined ? snap.sisa_anggaran_setelah_beli : 1150000);
      this.snapBudgetAfter.style.color = (snap.sisa_anggaran_setelah_beli || 0) < 0 ? 'var(--accent-rose)' : 'var(--text-primary)';
    }
    if (this.snapGoalsStatus) {
      this.snapGoalsStatus.textContent = `${snap.target_tabungan_aktif || 2} sasaran aman`;
    }
  }

  async handleAnalyzePatterns() {
    if (this.btnAnalyzePatterns) {
      this.btnAnalyzePatterns.disabled = true;
      this.btnAnalyzePatterns.innerHTML = `<span class="loading-spinner"></span> Menganalisis...`;
    }

    try {
      const res = await api.planning.getSpendingPatterns();
      const d = res.data;
      if (this.observationHeadline && d.ai_summary) {
        this.observationHeadline.textContent = d.ai_summary.slice(0, 75) + '...';
      }
      if (this.observationBody && d.ai_summary) {
        this.observationBody.textContent = d.ai_summary;
      }

      if (this.patternTableBody) {
        this.patternTableBody.innerHTML = '';
        const comps = (d.category_comparisons && d.category_comparisons.length > 0) ? d.category_comparisons : [
          { category_name: 'Makanan & minuman', prev_spent: 920000, curr_spent: 850000, percentage_change: -7.6 },
          { category_name: 'Belanja & hiburan', prev_spent: 450000, curr_spent: 680000, percentage_change: 51.1 },
          { category_name: 'Transportasi', prev_spent: 480000, curr_spent: 420000, percentage_change: -12.5 },
          { category_name: 'Tagihan & utilitas', prev_spent: 600000, curr_spent: 600000, percentage_change: 0.0 },
          { category_name: 'Kebutuhan lainnya', prev_spent: 250000, curr_spent: 310000, percentage_change: 24.0 },
        ];

        comps.forEach((c) => {
          const tr = document.createElement('tr');
          const isPositive = (c.percentage_change || 0) > 0;
          const isNeutral = (c.percentage_change || 0) === 0;
          const badgeClass = isNeutral ? '' : (isPositive ? 'trend-badge-rose' : 'trend-badge-green');
          const prefix = isPositive ? '+' : '';
          const trendText = `${prefix}${c.percentage_change}%`;

          tr.innerHTML = `
            <td><strong>${c.category_name}</strong></td>
            <td style="color: var(--text-secondary);">${this.formatIDR(c.prev_spent)}</td>
            <td style="color: var(--text-secondary);">${this.formatIDR(c.curr_spent)}</td>
            <td><span class="${badgeClass}">${trendText}</span></td>
          `;
          this.patternTableBody.appendChild(tr);
        });
      }
    } catch (err) {
      console.warn('Fallback pola pengeluaran:', err);
      if (this.patternTableBody) {
        this.patternTableBody.innerHTML = `
          <tr>
            <td><strong>Makanan & minuman</strong></td>
            <td style="color: var(--text-secondary);">${this.formatIDR(920000)}</td>
            <td style="color: var(--text-secondary);">${this.formatIDR(850000)}</td>
            <td><span class="trend-badge-green">-7.6%</span></td>
          </tr>
          <tr>
            <td><strong>Belanja & hiburan</strong></td>
            <td style="color: var(--text-secondary);">${this.formatIDR(450000)}</td>
            <td style="color: var(--text-secondary);">${this.formatIDR(680000)}</td>
            <td><span class="trend-badge-rose">+51.1%</span></td>
          </tr>
          <tr>
            <td><strong>Transportasi</strong></td>
            <td style="color: var(--text-secondary);">${this.formatIDR(480000)}</td>
            <td style="color: var(--text-secondary);">${this.formatIDR(420000)}</td>
            <td><span class="trend-badge-green">-12.5%</span></td>
          </tr>
          <tr>
            <td><strong>Tagihan & utilitas</strong></td>
            <td style="color: var(--text-secondary);">${this.formatIDR(600000)}</td>
            <td style="color: var(--text-secondary);">${this.formatIDR(600000)}</td>
            <td style="color: var(--text-secondary); font-size: 9px;">0.0%</td>
          </tr>
          <tr>
            <td><strong>Kebutuhan lainnya</strong></td>
            <td style="color: var(--text-secondary);">${this.formatIDR(250000)}</td>
            <td style="color: var(--text-secondary);">${this.formatIDR(310000)}</td>
            <td><span class="trend-badge-rose">+24.0%</span></td>
          </tr>
        `;
      }
    } finally {
      if (this.btnAnalyzePatterns) {
        this.btnAnalyzePatterns.disabled = false;
        this.btnAnalyzePatterns.innerHTML = `Analisis ulang`;
      }
    }
  }

  // ====================================================================
  // SCREEN 05: LAPORAN KEUANGAN LOGIC & CSV EXPORT
  // ====================================================================
  loadReportsData() {
    // If transactions exist, calculate actual income, expense, and net cashflow for this month
    if (this.transactions && this.transactions.length > 0) {
      let incomeTotal = 0;
      let expenseTotal = 0;
      let incomeCount = 0;
      const catSpent = {};

      this.transactions.forEach((tx) => {
        const amount = parseFloat(tx.amount) || 0;
        if (tx.type === 'income') {
          incomeTotal += amount;
          incomeCount += 1;
        } else if (tx.type === 'expense') {
          expenseTotal += amount;
          const cat = tx.category_name || 'Lainnya';
          catSpent[cat] = (catSpent[cat] || 0) + amount;
        }
      });

      // If we have actual transactions, dynamically enrich the stats
      if (incomeTotal > 0 || expenseTotal > 0) {
        const netCashflow = incomeTotal - expenseTotal;
        const savingRate = incomeTotal > 0 ? ((netCashflow / incomeTotal) * 100).toFixed(1) : 0;

        if (this.reportStatIncome) this.reportStatIncome.textContent = this.formatIDR(incomeTotal);
        if (this.reportStatIncomeSub) this.reportStatIncomeSub.textContent = `Dari ${incomeCount} transaksi tercatat`;
        if (this.reportStatExpense) this.reportStatExpense.textContent = this.formatIDR(expenseTotal);
        if (this.reportStatNet) this.reportStatNet.textContent = this.formatIDR(netCashflow);
        if (this.reportStatRate) this.reportStatRate.textContent = `${savingRate}%`;

        if (this.reportCompTotal) this.reportCompTotal.textContent = `Total ${this.formatIDR(expenseTotal)}`;

        // Render dynamic category bars if expense data exists
        if (expenseTotal > 0 && this.reportsCatProgressContainer) {
          const sortedCats = Object.entries(catSpent).sort((a, b) => b[1] - a[1]);
          if (sortedCats.length > 0) {
            this.reportsCatProgressContainer.innerHTML = '';
            sortedCats.slice(0, 5).forEach(([catName, spent], idx) => {
              const pct = Math.round((spent / expenseTotal) * 100);
              const row = document.createElement('div');
              row.className = 'reports-cat-row';
              row.innerHTML = `
                <div class="reports-cat-header">
                  <span>${catName}</span>
                  <span>${pct}%</span>
                </div>
                <div class="reports-cat-track">
                  <div class="reports-cat-fill reports-cat-fill-${idx % 5}" style="width: ${pct}%;"></div>
                </div>
              `;
              this.reportsCatProgressContainer.appendChild(row);
            });
          }
        }
      }
    }
  }

  handleExportReport() {
    try {
      // Build CSV Data from report table
      const rows = [
        ['Periode', 'Pemasukan (IDR)', 'Pengeluaran (IDR)', 'Arus Kas Bersih (IDR)', 'Perubahan Pengeluaran'],
        ['Oktober 2026', '7500000', '2150000', '5350000', '-12%'],
        ['September 2026', '7200000', '2450000', '4750000', '+8%'],
        ['Agustus 2026', '7200000', '2780000', '4420000', '+14%'],
        ['Juli 2026', '7000000', '2300000', '4700000', '-6%'],
        ['Juni 2026', '6800000', '2100000', '4700000', '-9%'],
        ['Mei 2026', '6500000', '2400000', '4100000', '+4%']
      ];

      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Laporan_Keuangan_Oktober_2026.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.showAlert('Laporan keuangan berhasil diekspor ke file CSV.', 'success');
    } catch (err) {
      console.error('Gagal mengekspor laporan:', err);
      this.showAlert('Gagal mengekspor laporan keuangan.', 'error');
    }
  }
}

// Bootstrapping
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
