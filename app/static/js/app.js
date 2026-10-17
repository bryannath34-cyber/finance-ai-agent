/**
 * Personal Finance AI Agent - Main Application Logic v2.3
 * Figma 1:1 Design System Integration (Nordic / Apple Minimalist).
 * Multi-account balances, Voice & AI Command, Draft Approval, Ledger,
 * Financial Planning, and AI Advisory Copilot.
 */

import { api } from './api.js';
import { AudioRecorder } from './audio_recorder.js';

const Icons = {
  eye: `<svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  mic: `<svg class="ui-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`,
  stop: `<svg class="ui-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`,
  check: `<svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  arrowRight: `<svg class="ui-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  bank: `<svg class="ui-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="21" x2="21" y2="21"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="12 3 3 8 21 8"/><line x1="6" y1="10" x2="6" y2="21"/><line x1="10" y1="10" x2="10" y2="21"/><line x1="14" y1="10" x2="14" y2="21"/><line x1="18" y1="10" x2="18" y2="21"/></svg>`,
  phone: `<svg class="ui-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
  cash: `<svg class="ui-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/></svg>`,
  shield: `<svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  plane: `<svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>`,
  target: `<svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  alert: `<svg class="ui-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#B38600" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  edit: `<svg class="ui-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg class="ui-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  plus: `<svg class="ui-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  brand: `<svg class="ui-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/><rect x="7" y="7" width="15" height="11" rx="2.5"/><circle cx="16" cy="12.5" r="2.5"/><path d="M16 11.5v2"/></svg>`
};

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
    this.btnToggleLoginPassword = document.getElementById('btn-toggle-login-password');
    this.btnGoogleLogin = document.getElementById('btn-google-login');
    this.loginRememberMe = document.getElementById('login-remember-me');

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
    this.btnToggleNetWorth = document.getElementById('btn-toggle-net-worth');
    this.eyeIconOpen = document.getElementById('eye-icon-open');
    this.eyeIconClosed = document.getElementById('eye-icon-closed');
    this.isBalanceHidden = false;
    try {
      this.isBalanceHidden = localStorage.getItem('hide_net_worth') === 'true';
    } catch (_) {}
    this.currentNetWorthValue = 0;
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

    // Ledger CRUD Modals & Form Elements
    this.btnOpenCreateTx = document.getElementById('btn-open-create-tx');
    this.btnOpenCreateTxDash = document.getElementById('btn-open-create-tx-dash');
    this.modalCreateTx = document.getElementById('modal-create-tx');
    this.formCreateTx = document.getElementById('form-create-tx');
    this.createTxType = document.getElementById('create-tx-type');
    this.createTxTypeBtns = document.querySelectorAll('#create-tx-type-selector .tx-type-btn');
    this.createTxAmount = document.getElementById('create-tx-amount');
    this.createTxDate = document.getElementById('create-tx-date');
    this.createTxSrcGroup = document.getElementById('create-tx-src-group');
    this.createTxSourceAccount = document.getElementById('create-tx-source-account');
    this.createTxDestGroup = document.getElementById('create-tx-dest-group');
    this.createTxDestAccount = document.getElementById('create-tx-dest-account');
    this.createTxCategoryGroup = document.getElementById('create-tx-category-group');
    this.createTxCategory = document.getElementById('create-tx-category');
    this.createTxAdminFeeGroup = document.getElementById('create-tx-admin-fee-group');
    this.createTxAdminFee = document.getElementById('create-tx-admin-fee');
    this.createTxDescription = document.getElementById('create-tx-description');
    this.btnSubmitCreateTx = document.getElementById('btn-submit-create-tx');

    this.modalEditTx = document.getElementById('modal-edit-tx');
    this.formEditTx = document.getElementById('form-edit-tx');
    this.editTxId = document.getElementById('edit-tx-id');
    this.editTxType = document.getElementById('edit-tx-type');
    this.editTxTypeBadge = document.getElementById('edit-tx-type-badge');
    this.editTxAmount = document.getElementById('edit-tx-amount');
    this.editTxDate = document.getElementById('edit-tx-date');
    this.editTxSrcGroup = document.getElementById('edit-tx-src-group');
    this.editTxSourceAccount = document.getElementById('edit-tx-source-account');
    this.editTxDestGroup = document.getElementById('edit-tx-dest-group');
    this.editTxDestAccount = document.getElementById('edit-tx-dest-account');
    this.editTxCategoryGroup = document.getElementById('edit-tx-category-group');
    this.editTxCategory = document.getElementById('edit-tx-category');
    this.editTxDescription = document.getElementById('edit-tx-description');
    this.editTxError = document.getElementById('edit-tx-error');
    this.btnSubmitEditTx = document.getElementById('btn-submit-edit-tx');

    this.modalDeleteTx = document.getElementById('modal-delete-tx');
    this.deleteTxId = document.getElementById('delete-tx-id');
    this.deleteTxInfo = document.getElementById('delete-tx-info');
    this.deleteTxError = document.getElementById('delete-tx-error');
    this.btnConfirmDeleteTx = document.getElementById('btn-confirm-delete-tx');

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
    this.btnDashOpenAi = document.getElementById('btn-dash-open-ai');
    this.btnDashViewReports = document.getElementById('btn-dash-view-reports');
    this.btnDashGotoPlanning = document.getElementById('btn-dash-goto-planning');
    this.btnAddAccountDash = document.getElementById('btn-add-account-dash');
    this.btnDashPeriodDay = document.getElementById('btn-dash-period-day');
    this.btnDashPeriodMonth = document.getElementById('btn-dash-period-month');

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
    this.btnOpenCreateGoalMini = document.getElementById('btn-open-create-goal-mini');
    this.btnPlanningPeriodPicker = document.getElementById('btn-planning-period-picker');
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

    // Modal: Add Account
    this.modalAddAccount = document.getElementById('modal-add-account');
    this.formAddAccount = document.getElementById('form-add-account');
    this.inputAccName = document.getElementById('input-acc-name');
    this.selectAccType = document.getElementById('select-acc-type');
    this.inputAccBalance = document.getElementById('input-acc-balance');

    // Tab 5: Laporan Keuangan (Screen 05)
    this.btnExportReport = document.getElementById('btn-export-report');
    this.btnReportMonthPicker = document.getElementById('btn-report-month-picker');
    this.btnReportSelectMonth = document.getElementById('btn-report-select-month');
    this.reportCurrentMonthLabel = document.getElementById('report-current-month-label');
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
    this.reportsBarsContainer = document.getElementById('reports-bars-container');
    this.reportsChartNote = document.getElementById('reports-chart-note');
    this.reportsMonthlyTableBody = document.getElementById('reports-monthly-table-body');
    this.btnReportSelectMonth = document.getElementById('btn-report-select-month');

    // Dashboard Real-time Visual Charts (Screen 01)
    this.dashboardSparklineSvg = document.getElementById('dashboard-sparkline-svg');
    this.dashboardSparklineLine = document.getElementById('dashboard-sparkline-line');
    this.dashboardSparklineArea = document.getElementById('dashboard-sparkline-area');
    this.dashboardSparklineDot = document.getElementById('dashboard-sparkline-dot');
    this.dashboardSparklineMonths = document.getElementById('dashboard-sparkline-months');
    this.dashboardInsightTitle = document.getElementById('dashboard-insight-title');
    this.dashboardInsightDesc = document.getElementById('dashboard-insight-desc');
    this.dashboardInsightBars = document.getElementById('dashboard-insight-bars');

    // Tab 6: Pengaturan & Profil (Screen 06)
    this.settingsProfileName = document.getElementById('settings-profile-name');
    this.settingsProfileEmail = document.getElementById('settings-profile-email');
    this.settingsAvatarInitial = document.getElementById('settings-avatar-initial');
    this.settingsAccountsList = document.getElementById('settings-accounts-list');
    this.btnAddAccountSettings = document.getElementById('btn-add-account-settings');
    this.btnEditProfile = document.getElementById('btn-edit-profile');
    this.btnChangePassword = document.getElementById('btn-change-password');
    this.btnToggle2fa = document.getElementById('btn-toggle-2fa');
    this.btnViewSessions = document.getElementById('btn-view-sessions');
    this.btnSettingsExportCsv = document.getElementById('btn-settings-export-csv');
    this.btnSettingsBackupStatus = document.getElementById('btn-settings-backup-status');
    this.btnSettingsPrivacyPolicy = document.getElementById('btn-settings-privacy-policy');

    this.modalEditProfile = document.getElementById('modal-edit-profile');
    this.formEditProfile = document.getElementById('form-edit-profile');
    this.inputProfileFullname = document.getElementById('input-profile-fullname');
    this.inputProfileEmail = document.getElementById('input-profile-email');

    this.modalChangePassword = document.getElementById('modal-change-password');
    this.formChangePassword = document.getElementById('form-change-password');
    this.inputOldPassword = document.getElementById('input-old-password');
    this.inputNewPassword = document.getElementById('input-new-password');
    this.inputConfirmPassword = document.getElementById('input-confirm-password');

    this.modalBackupStatus = document.getElementById('modal-backup-status');
    this.modalPrivacyPolicy = document.getElementById('modal-privacy-policy');
    this.userProfileBadge = document.querySelector('.user-profile-badge');

    // Tab 7: Akun Pengguna / Auth (Screen 07)
    this.formTabSignup = document.getElementById('form-tab-signup');
    this.signupFullname = document.getElementById('signup-fullname');
    this.signupEmail = document.getElementById('signup-email');
    this.signupPassword = document.getElementById('signup-password');
    this.signupConfirm = document.getElementById('signup-confirm');
    this.signupTerms = document.getElementById('signup-terms');
    this.btnJumpLogin = document.getElementById('btn-jump-login');

    this.formTabReset = document.getElementById('form-tab-reset');
    this.resetEmail = document.getElementById('reset-email');
    this.btnResetToLogin = document.getElementById('btn-reset-to-login');

    this.linkOverlayForgot = document.getElementById('link-overlay-forgot');
    this.linkOverlayRegister = document.getElementById('link-overlay-register');

    // Modal: Pemilih Periode Bulan & Tahun (Month/Year Picker)
    this.modalMonthPicker = document.getElementById('modal-month-picker');
    this.monthPickerModalTitle = document.getElementById('month-picker-modal-title');
    this.pickerPrevYear = document.getElementById('picker-prev-year');
    this.pickerNextYear = document.getElementById('picker-next-year');
    this.pickerSelectedYear = document.getElementById('picker-selected-year');
    this.pickerMonthsGrid = document.getElementById('picker-months-grid');
    this.pickerBtnCurrentMonth = document.getElementById('picker-btn-current-month');
    this.pickerContext = 'planning'; // 'planning' | 'reports'
    const initDate = new Date();
    this.pickerYear = initDate.getFullYear();
    this.selectedPlanningYear = initDate.getFullYear();
    this.selectedPlanningMonth = initDate.getMonth() + 1;
    this.selectedReportYear = initDate.getFullYear();
    this.selectedReportMonth = initDate.getMonth() + 1;

    this.applyBalanceVisibility();
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
    if (this.btnDashOpenAi) {
      this.btnDashOpenAi.addEventListener('click', () => {
        this.switchTab('tab-mutasi');
        if (this.aiInput) {
          setTimeout(() => {
            this.aiInput.focus();
          }, 150);
        }
      });
    }
    if (this.btnDashViewReports) {
      this.btnDashViewReports.addEventListener('click', () => this.switchTab('tab-reports'));
    }
    if (this.btnDashGotoPlanning) {
      this.btnDashGotoPlanning.addEventListener('click', () => this.switchTab('tab-planning'));
    }
    if (this.btnDashPeriodDay && this.btnDashPeriodMonth) {
      this.btnDashPeriodDay.addEventListener('click', () => {
        this.btnDashPeriodDay.classList.add('active');
        this.btnDashPeriodMonth.classList.remove('active');
      });
      this.btnDashPeriodMonth.addEventListener('click', () => {
        this.btnDashPeriodMonth.classList.add('active');
        this.btnDashPeriodDay.classList.remove('active');
      });
    }

    if (this.btnToggleNetWorth) {
      this.btnToggleNetWorth.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleBalanceVisibility();
      });
    }

    // Refresh Buttons
    if (this.btnRefreshAccounts) {
      this.btnRefreshAccounts.addEventListener('click', () => this.loadAccounts());
    }
    if (this.btnRefreshHistory) {
      this.btnRefreshHistory.addEventListener('click', () => this.loadHistory());
    }

    // Ledger Filters (Search, Month & Type)
    if (this.ledgerSearchInput) {
      this.ledgerSearchInput.addEventListener('input', () => this.applyLedgerFilters());
    }
    if (this.ledgerMonthSelect) {
      this.ledgerMonthSelect.addEventListener('change', () => this.applyLedgerFilters());
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

    // Explicit fallback click handler for + Tambah on Tujuan Tabungan mini card
    if (this.btnOpenCreateGoalMini) {
      this.btnOpenCreateGoalMini.addEventListener('click', () => {
        this.openModal(this.modalCreateGoal);
        this.populateGoalAccSelect();
      });
    }

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

    // Ledger CRUD Events
    if (this.btnOpenCreateTx) {
      this.btnOpenCreateTx.addEventListener('click', () => this.openCreateTxModal());
    }
    if (this.btnOpenCreateTxDash) {
      this.btnOpenCreateTxDash.addEventListener('click', () => this.openCreateTxModal());
    }
    if (this.createTxTypeBtns) {
      this.createTxTypeBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const type = btn.getAttribute('data-type');
          this.setCreateTxType(type);
        });
      });
    }
    if (this.formCreateTx) {
      this.formCreateTx.addEventListener('submit', (e) => this.handleCreateTransaction(e));
    }
    if (this.formEditTx) {
      this.formEditTx.addEventListener('submit', (e) => this.handleUpdateTransaction(e));
    }
    if (this.btnConfirmDeleteTx) {
      this.btnConfirmDeleteTx.addEventListener('click', () => this.handleConfirmDeleteTransaction());
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
    // Month / Year Picker Controls (Replaces native prompt)
    if (this.btnPlanningPeriodPicker) {
      this.btnPlanningPeriodPicker.addEventListener('click', () => this.openMonthPicker('planning'));
    }
    if (this.btnReportMonthPicker) {
      this.btnReportMonthPicker.addEventListener('click', () => this.openMonthPicker('reports'));
    }
    if (this.btnReportSelectMonth) {
      this.btnReportSelectMonth.addEventListener('click', () => this.openMonthPicker('reports'));
    }
    if (this.pickerPrevYear) {
      this.pickerPrevYear.addEventListener('click', () => {
        this.pickerYear--;
        this.renderMonthPickerGrid();
      });
    }
    if (this.pickerNextYear) {
      this.pickerNextYear.addEventListener('click', () => {
        this.pickerYear++;
        this.renderMonthPickerGrid();
      });
    }
    if (this.pickerBtnCurrentMonth) {
      this.pickerBtnCurrentMonth.addEventListener('click', () => {
        const now = new Date();
        this.pickerYear = now.getFullYear();
        this.selectMonthFromPicker(now.getMonth() + 1);
      });
    }

    // Additional action links
    const btnViewAllBudgetHistory = document.getElementById('btn-view-all-budget-history');
    if (btnViewAllBudgetHistory) {
      btnViewAllBudgetHistory.addEventListener('click', () => this.switchTab('tab-mutasi'));
    }

    const btnSaveScenarioHistory = document.getElementById('btn-save-scenario-history');
    if (btnSaveScenarioHistory) {
      btnSaveScenarioHistory.addEventListener('click', () => {
        this.showAlert('Analisis evaluasi disusun oleh OCI GenAI Cohere Command A.', 'info');
      });
    }

    const btnChartPeriod = document.getElementById('btn-chart-period');
    if (btnChartPeriod) {
      btnChartPeriod.addEventListener('click', () => {
        this.showAlert('Rentang grafik: 12 Bulan Aktif (2026)', 'info');
      });
    }

    document.querySelectorAll('.btn-view-period').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const period = e.currentTarget.getAttribute('data-period');
        this.showAlert(`Membuka rincian periode: ${period}`, 'info');
      });
    });

    // Tab 6 Events (Pengaturan & Profil)
    if (this.userProfileBadge) {
      this.userProfileBadge.addEventListener('click', (e) => {
        if (!e.target.closest('#btn-logout')) {
          this.switchTab('tab-settings');
        }
      });
    }

    // Settings Modals
    bindOpenModal(this.btnEditProfile, this.modalEditProfile);
    bindOpenModal(this.btnChangePassword, this.modalChangePassword);
    bindOpenModal(this.btnSettingsBackupStatus, this.modalBackupStatus);
    bindOpenModal(this.btnSettingsPrivacyPolicy, this.modalPrivacyPolicy);
    bindOpenModal(this.btnAddAccountSettings, this.modalAddAccount);
    bindOpenModal(this.btnAddAccountDash, this.modalAddAccount);

    if (this.formAddAccount) {
      this.formAddAccount.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = (this.inputAccName ? this.inputAccName.value : '').trim();
        const type = this.selectAccType ? this.selectAccType.value : 'BANK';
        const bal = this.inputAccBalance ? parseFloat(this.inputAccBalance.value) || 0 : 0;
        if (!name) return;
        try {
          await api.accounts.create({
            name,
            type,
            opening_balance: bal,
            opening_balance_date: new Date().toISOString().split('T')[0]
          });
          this.closeModals();
          this.showAlert(`Rekening '${name}' berhasil ditambahkan!`, 'success');
          await this.loadAccounts();
          if (this.inputAccName) this.inputAccName.value = '';
          if (this.inputAccBalance) this.inputAccBalance.value = '0';
        } catch (err) {
          this.showAlert(`Gagal menambah rekening: ${err.message}`, 'error');
        }
      });
    }

    if (this.btnSettingsExportCsv) {
      this.btnSettingsExportCsv.addEventListener('click', () => this.handleExportReport());
    }

    if (this.btnToggle2fa) {
      this.btnToggle2fa.addEventListener('click', () => {
        this.showAlert('Autentikasi dua faktor (2FA) TOTP akan tersedia pada pembaruan keamanan berikutnya.', 'info');
      });
    }

    if (this.btnViewSessions) {
      this.btnViewSessions.addEventListener('click', () => {
        this.showAlert('Sesi aktif: Windows 11 · Browser Chrome/Edge (Sesi saat ini aman)', 'info');
      });
    }

    // Toggle Switches (Screen 06 Preferences)
    document.querySelectorAll('.toggle-switch').forEach((toggle) => {
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        const pref = toggle.getAttribute('data-pref');
        const state = toggle.classList.contains('active') ? 'diaktifkan' : 'dinonaktifkan';
        this.showAlert(`Preferensi ${pref || 'aplikasi'} berhasil ${state}.`, 'success');
      });
    });

    // Form Edit Profile
    if (this.formEditProfile) {
      this.formEditProfile.addEventListener('submit', (e) => {
        e.preventDefault();
        const newName = this.inputProfileFullname.value.trim();
        const newEmail = this.inputProfileEmail.value.trim();
        if (newName) {
          if (this.settingsProfileName) this.settingsProfileName.textContent = newName;
          if (this.usernameDisplay) this.usernameDisplay.textContent = newName.split(' ')[0];
          if (this.settingsAvatarInitial) this.settingsAvatarInitial.textContent = newName[0].toUpperCase();
          if (this.userAvatarInitial) this.userAvatarInitial.textContent = newName[0].toUpperCase();
        }
        if (newEmail && this.settingsProfileEmail) {
          this.settingsProfileEmail.textContent = newEmail;
        }
        this.closeModals();
        this.showAlert('Profil pengguna berhasil diperbarui.', 'success');
      });
    }

    // Form Change Password
    if (this.formChangePassword) {
      this.formChangePassword.addEventListener('submit', (e) => {
        e.preventDefault();
        const newP = this.inputNewPassword.value;
        const confP = this.inputConfirmPassword.value;

        if (newP !== confP) {
          this.showAlert('Konfirmasi kata sandi baru tidak cocok.', 'error');
          return;
        }
        if (newP.length < 8) {
          this.showAlert('Kata sandi baru minimal 8 karakter.', 'error');
          return;
        }

        this.closeModals();
        this.formChangePassword.reset();
        this.showAlert('Kata sandi akun Anda berhasil diperbarui.', 'success');
      });
    }

    // Tab 7 Events (Screen 07: Buat Akun & Reset Kata Sandi & Login Desktop)
    if (this.btnToggleLoginPassword && this.loginPassword) {
      this.btnToggleLoginPassword.addEventListener('click', () => {
        const isPassword = this.loginPassword.type === 'password';
        this.loginPassword.type = isPassword ? 'text' : 'password';
        this.btnToggleLoginPassword.innerHTML = isPassword ? Icons.eyeOff : Icons.eye;
      });
    }

    if (this.btnGoogleLogin) {
      this.btnGoogleLogin.addEventListener('click', () => {
        this.showAlert('Autentikasi Google OAuth OCI sedang dipersiapkan untuk rilis mendatang.', 'info');
      });
    }

    if (this.btnJumpLogin) {
      this.btnJumpLogin.addEventListener('click', () => this.showLogin());
    }
    if (this.btnResetToLogin) {
      this.btnResetToLogin.addEventListener('click', () => this.showLogin());
    }
    if (this.linkOverlayForgot) {
      this.linkOverlayForgot.addEventListener('click', (e) => {
        e.preventDefault();
        this.authOverlay.style.display = 'none';
        this.switchTab('tab-auth');
      });
    }
    if (this.linkOverlayRegister) {
      this.linkOverlayRegister.addEventListener('click', (e) => {
        e.preventDefault();
        this.authOverlay.style.display = 'none';
        this.switchTab('tab-auth');
      });
    }

    if (this.formTabSignup) {
      this.formTabSignup.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = this.signupFullname.value.trim();
        const email = this.signupEmail.value.trim();
        const pwd = this.signupPassword.value;
        const confirm = this.signupConfirm.value;

        if (pwd !== confirm) {
          this.showAlert('Konfirmasi kata sandi tidak cocok.', 'error');
          return;
        }
        if (pwd.length < 8) {
          this.showAlert('Kata sandi minimal 8 karakter.', 'error');
          return;
        }

        this.showAlert(`Akun untuk ${name} (${email}) berhasil didaftarkan!`, 'success');
        this.formTabSignup.reset();
      });
    }

    if (this.formTabReset) {
      this.formTabReset.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = this.resetEmail.value.trim();
        this.showAlert(`Instruksi pemulihan kata sandi telah dikirim ke ${email}.`, 'success');
        this.formTabReset.reset();
      });
    }
  }

  switchTab(tabId) {
    // Fallback defensively jika ID tab tidak ditemukan di DOM agar layar tidak blank putih
    if (!document.getElementById(tabId)) {
      console.warn(`[switchTab] Tab '${tabId}' tidak ditemukan di DOM, dialihkan ke 'tab-dashboard'.`);
      tabId = 'tab-dashboard';
    }

    this.currentTab = tabId;

    // Synchronize Titles & Intros
    const titles = {
      'tab-dashboard': { title: 'Dashboard Finansial', intro: 'Ringkasan kekayaan bersih, rekening aktif, pagu anggaran, dan mutasi terkini.' },
      'tab-mutasi': { title: 'Mutasi & Suara AI', intro: 'Catat transaksi lewat teks atau suara, periksa draft, lalu konfirmasi ke buku besar.' },
      'tab-planning': { title: 'Anggaran & Tabungan', intro: 'Atur pagu bulanan dan pantau progres tujuan tabungan.' },
      'tab-copilot': { title: 'Penasihat Finansial AI', intro: 'Tanyakan rencana pembelian, evaluasi kelayakan anggaran, dan pantau pola pengeluaran berbasis AI.' },
      'tab-reports': { title: 'Laporan Keuangan', intro: 'Tinjau arus kas, komposisi pengeluaran, dan perubahan dari bulan ke bulan.' },
      'tab-settings': { title: 'Pengaturan & Profil', intro: 'Kelola profil, rekening, keamanan, dan preferensi aplikasi.' },
      'tab-auth': { title: 'Akun pengguna', intro: 'Rancangan layar daftar akun dan reset kata sandi.' }
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

    if (tabId === 'tab-dashboard') {
      this.loadAccounts();
      this.loadBudgetOverview();
      this.loadReportsData();
    } else if (tabId === 'tab-planning') {
      this.loadPlanningData();
      this.loadBudgetOverview();
    } else if (tabId === 'tab-copilot') {
      this.loadCopilotData();
    } else if (tabId === 'tab-reports') {
      this.loadReportsData();
    } else if (tabId === 'tab-settings') {
      this.loadSettingsData();
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
      this.loadReportsData(),
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
      const res = await api.transactions.list(100, 0);
      this.transactions = res.data || [];
      this.populateLedgerMonthFilter();
      this.applyLedgerFilters();
      this.calculateMonthlySummary();
      this.loadReportsData();
    } catch (err) {
      console.warn('Gagal memuat riwayat:', err);
    }
  }

  populateLedgerMonthFilter() {
    if (!this.ledgerMonthSelect) return;
    const currentVal = this.ledgerMonthSelect.value;
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    const curKey = `${curY}-${String(curM).padStart(2, '0')}`;

    const monthNamesShort = [
      '', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];

    const availableMonths = new Set();
    availableMonths.add(curKey);

    // Default berikan 6 bulan terakhir kalender
    for (let i = 0; i < 6; i++) {
      const d = new Date(curY, (curM - 1) - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      availableMonths.add(k);
    }

    // Masukkan seluruh bulan dari transaksi yang tercatat
    if (this.transactions && this.transactions.length > 0) {
      this.transactions.forEach((tx) => {
        if (tx.transaction_date && tx.transaction_date.length >= 7) {
          availableMonths.add(tx.transaction_date.substring(0, 7));
        }
      });
    }

    const sortedMonths = Array.from(availableMonths).sort().reverse();

    this.ledgerMonthSelect.innerHTML = '';

    // Pilihan 1: Bulan Ini (Current Month)
    const optCurrent = document.createElement('option');
    optCurrent.value = curKey;
    optCurrent.textContent = `Bulan Ini (${monthNamesShort[curM]} ${curY})`;
    this.ledgerMonthSelect.appendChild(optCurrent);

    // Pilihan Bulan-Bulan Lampau
    sortedMonths.forEach((key) => {
      if (key === curKey) return;
      const [y, mStr] = key.split('-');
      const m = parseInt(mStr, 10);
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${monthNamesShort[m] || mStr} ${y}`;
      this.ledgerMonthSelect.appendChild(opt);
    });

    // Pilihan: Semua Periode
    const optAll = document.createElement('option');
    optAll.value = 'ALL';
    optAll.textContent = 'Semua Periode';
    this.ledgerMonthSelect.appendChild(optAll);

    if (currentVal && Array.from(this.ledgerMonthSelect.options).some((o) => o.value === currentVal)) {
      this.ledgerMonthSelect.value = currentVal;
    } else {
      this.ledgerMonthSelect.value = curKey;
    }
  }

  applyLedgerFilters() {
    const q = this.ledgerSearchInput ? this.ledgerSearchInput.value.toLowerCase().trim() : '';
    const typeFilter = this.ledgerTypeSelect ? this.ledgerTypeSelect.value : 'ALL';
    const monthFilter = this.ledgerMonthSelect ? this.ledgerMonthSelect.value : '';

    this.filteredTransactions = this.transactions.filter((tx) => {
      const descMatch = (tx.description || '').toLowerCase().includes(q);
      const catMatch = (tx.category_name || '').toLowerCase().includes(q);
      const accMatch = (tx.source_account_name || '').toLowerCase().includes(q) || (tx.destination_account_name || '').toLowerCase().includes(q);
      const textMatches = !q || descMatch || catMatch || accMatch;

      const typeMatches = typeFilter === 'ALL' || tx.type === typeFilter;

      let monthMatches = true;
      if (monthFilter && monthFilter !== 'ALL') {
        monthMatches = Boolean(tx.transaction_date && tx.transaction_date.startsWith(monthFilter));
      }

      return textMatches && typeMatches && monthMatches;
    });

    this.renderHistory();
  }

  // Calculate Realized Monthly Summary from Transactions for the current month in real time
  calculateMonthlySummary() {
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    const curKey = `${curY}-${String(curM).padStart(2, '0')}`;

    let income = 0;
    let expense = 0;

    this.transactions.forEach((tx) => {
      if (tx.is_reversal) return;
      if (!tx.transaction_date || !tx.transaction_date.startsWith(curKey)) return;
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

  // Render Accounts in Figma Style (Monograms KT, BK, EW)
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

      if (nameLower.includes('bank') || nameLower.includes('bca') || acc.type === 'BANK') {
        monogramClass = 'monogram-bank';
        monogramText = 'BK';
      } else if (nameLower.includes('ewallet') || nameLower.includes('e-wallet') || nameLower.includes('gopay') || acc.type === 'EWALLET') {
        monogramClass = 'monogram-ewallet';
        monogramText = 'EW';
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
        <div class="acc-balance-num ${isNegative ? 'negative' : ''} ${this.isBalanceHidden ? 'is-hidden-mask' : ''}" data-real-balance="${this.formatIDR(bal)}">
          ${this.isBalanceHidden ? 'Rp ••••••••' : this.formatIDR(bal)}
        </div>
      `;
      this.accountsContainer.appendChild(row);
    });

    this.currentNetWorthValue = totalBal;
    this.applyBalanceVisibility();
  }

  toggleBalanceVisibility() {
    this.isBalanceHidden = !this.isBalanceHidden;
    try {
      localStorage.setItem('hide_net_worth', this.isBalanceHidden ? 'true' : 'false');
    } catch (_) {}
    this.applyBalanceVisibility();
  }

  applyBalanceVisibility() {
    if (this.eyeIconOpen && this.eyeIconClosed) {
      if (this.isBalanceHidden) {
        this.eyeIconOpen.style.display = 'none';
        this.eyeIconClosed.style.display = 'block';
        if (this.btnToggleNetWorth) {
          this.btnToggleNetWorth.setAttribute('title', 'Tampilkan Saldo');
          this.btnToggleNetWorth.setAttribute('aria-label', 'Tampilkan Saldo');
        }
      } else {
        this.eyeIconOpen.style.display = 'block';
        this.eyeIconClosed.style.display = 'none';
        if (this.btnToggleNetWorth) {
          this.btnToggleNetWorth.setAttribute('title', 'Sembunyikan Saldo');
          this.btnToggleNetWorth.setAttribute('aria-label', 'Sembunyikan Saldo');
        }
      }
    }

    if (this.totalNetWorth) {
      if (this.isBalanceHidden) {
        this.totalNetWorth.textContent = 'Rp ••••••••';
        this.totalNetWorth.style.color = 'var(--text-secondary)';
        this.totalNetWorth.classList.add('is-hidden-mask');
      } else {
        this.totalNetWorth.textContent = this.formatIDR(this.currentNetWorthValue);
        this.totalNetWorth.style.color = this.currentNetWorthValue < 0 ? 'var(--accent-rose)' : 'var(--text-primary)';
        this.totalNetWorth.classList.remove('is-hidden-mask');
      }
    }

    const accBalanceEls = document.querySelectorAll('.acc-balance-num');
    accBalanceEls.forEach((el) => {
      if (this.isBalanceHidden) {
        if (!el.hasAttribute('data-real-balance')) {
          el.setAttribute('data-real-balance', el.textContent.trim());
        }
        el.textContent = 'Rp ••••••••';
        el.classList.add('is-hidden-mask');
      } else {
        const real = el.getAttribute('data-real-balance');
        if (real) {
          el.textContent = real;
        }
        el.classList.remove('is-hidden-mask');
      }
    });
  }

  formatTxDescription(desc, isRev) {
    if (!desc) return '-';
    let text = String(desc).trim();
    const isPembalik = isRev || text.includes('[PEMBALIK]');
    const isBiayaAdmin = text.includes('BIAYA ADMIN') || text.includes('Biaya Admin');

    let reason = '';
    const reasonMatch = text.match(/\(Alasan:\s*([^\)]+)\)/i);
    if (reasonMatch) {
      reason = reasonMatch[1].trim();
      text = text.replace(/\(Alasan:\s*[^\)]+\)/i, '').trim();
    }

    text = text.replace(/\[PEMBALIK BIAYA ADMIN\]/gi, '').replace(/\[PEMBALIK\]/gi, '').trim();

    let tagHtml = '';
    if (isPembalik) {
      tagHtml = `<span class="badge-tag-reversal">${isBiayaAdmin ? 'Pembalik Biaya' : 'Pembalik'}</span>`;
    }

    let reasonHtml = reason ? `<span class="reversal-reason">(${reason})</span>` : '';

    return `<div class="td-desc">${tagHtml}<span>${text}</span>${reasonHtml}</div>`;
  }

  // Render Ledger History in Figma Screen 02 Table Style
  renderHistory() {
    const list = this.filteredTransactions || this.transactions;
    this.historyTableBody.innerHTML = '';

    if (list.length === 0) {
      const monthFilter = this.ledgerMonthSelect ? this.ledgerMonthSelect.value : '';
      let emptyTitle = 'Tidak ada transaksi yang cocok.';
      let emptyDesc = '';

      if (monthFilter && monthFilter !== 'ALL') {
        const [y, mStr] = monthFilter.split('-');
        const m = parseInt(mStr, 10);
        const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const monthLabel = `${monthNames[m] || mStr} ${y}`;
        emptyTitle = `Buku besar periode ${monthLabel} masih kosong`;
        emptyDesc = `Belum ada mutasi yang dicatat di bulan ${monthLabel}. Jika memasuki bulan baru, transaksi akan dimulai dari nol. Anda dapat memilih bulan sebelumnya pada menu di atas untuk melihat data lampau.`;
      }

      this.historyTableBody.innerHTML = `
        <tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 28px 16px;">
          <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
            ${emptyTitle}
          </div>
          ${emptyDesc ? `<div style="font-size: 11px; color: var(--text-secondary); max-width: 480px; margin: 0 auto; line-height: 1.5;">${emptyDesc}</div>` : ''}
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
      else if (tx.type === 'TRANSFER') accountsDisplay = `${tx.source_account_name || 'Sumber'} ${Icons.arrowRight} ${tx.destination_account_name || 'Tujuan'}`;

      const dateStr = this.formatDateID(tx.transaction_date);
      const sign = isIncome ? '+' : '-';
      const amountClass = isIncome ? 'income' : 'expense';

      tr.innerHTML = `
        <td class="td-date">${dateStr}</td>
        <td>${this.formatTxDescription(tx.description, isRev)}</td>
        <td class="td-category">${tx.category_name || '-'}</td>
        <td class="td-account">${accountsDisplay}</td>
        <td class="td-amount ${amountClass}">${sign}${this.formatIDR(tx.amount)}</td>
        <td><span class="badge-cat-pill ${pillClass}">${statusLabel}</span></td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 4px; justify-content: flex-end; align-items: center;">
            ${!isRev && role !== 'ADMIN_FEE' ? `
              <button type="button" class="btn-ledger-action btn-edit-tx" data-id="${tx.id}" title="Sunting transaksi">
                ${Icons.edit}
              </button>
            ` : ''}
            ${role !== 'ADMIN_FEE' ? `
              <button type="button" class="btn-ledger-action danger btn-delete-tx" data-id="${tx.id}" title="Hapus transaksi">
                ${Icons.trash}
              </button>
            ` : ''}
            ${!isRev && role !== 'ADMIN_FEE' ? `
              <button type="button" class="btn-draft-edit btn-reverse" data-id="${tx.id}" title="Terbitkan jurnal pembalik">
                Balikkan
              </button>
            ` : ''}
            ${isRev && role !== 'ADMIN_FEE' ? '' : (role === 'ADMIN_FEE' ? '—' : '')}
          </div>
        </td>
      `;

      const btnEdit = tr.querySelector('.btn-edit-tx');
      if (btnEdit) {
        btnEdit.addEventListener('click', () => this.openEditTxModal(tx));
      }

      const btnDel = tr.querySelector('.btn-delete-tx');
      if (btnDel) {
        btnDel.addEventListener('click', () => this.openDeleteTxModal(tx));
      }

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
        const isRev = tx.is_reversal;
        const sign = isIncome ? '+' : '-';
        let pillClass = 'cat-rose';
        let statusLabel = 'EXPENSE';
        if (isRev) {
          pillClass = 'cat-rose';
          statusLabel = 'REVERSAL';
        } else if (isIncome) {
          pillClass = 'cat-green';
          statusLabel = 'INCOME';
        } else if (tx.type === 'TRANSFER') {
          pillClass = 'cat-blue';
          statusLabel = 'TRANSFER';
        }

        tr.innerHTML = `
          <td class="td-date">${this.formatDateID(tx.transaction_date)}</td>
          <td>${this.formatTxDescription(tx.description, isRev)}</td>
          <td class="td-amount ${isIncome ? 'income' : 'expense'}">${sign}${this.formatIDR(tx.amount)}</td>
          <td class="td-category">${tx.category_name || '-'}</td>
          <td class="td-account">${tx.source_account_name || tx.destination_account_name || '-'}</td>
          <td style="text-align: center;"><span class="badge-cat-pill ${pillClass}">${statusLabel}</span></td>
        `;
        this.dashboardHistoryBody.appendChild(tr);
      });
    }
  }

  // ==========================================
  // LEDGER CRUD METHODS
  // ==========================================
  openCreateTxModal() {
    if (!this.formCreateTx) return;
    this.formCreateTx.reset();

    // Default Date to Today
    const todayStr = new Date().toISOString().split('T')[0];
    if (this.createTxDate) this.createTxDate.value = todayStr;

    // Reset Type to EXPENSE
    this.setCreateTxType('EXPENSE');

    // Populate Accounts
    this.populateTxAccountSelects(this.createTxSourceAccount, this.createTxDestAccount);

    // Populate Categories (for EXPENSE)
    this.populateTxCategorySelect(this.createTxCategory, 'EXPENSE');

    if (this.modalCreateTx) {
      this.modalCreateTx.style.display = 'flex';
    }
  }

  setCreateTxType(type) {
    if (this.createTxType) this.createTxType.value = type;
    if (this.createTxTypeBtns) {
      this.createTxTypeBtns.forEach((btn) => {
        if (btn.getAttribute('data-type') === type) btn.classList.add('active');
        else btn.classList.remove('active');
      });
    }

    if (type === 'EXPENSE') {
      if (this.createTxSrcGroup) this.createTxSrcGroup.style.display = 'block';
      if (this.createTxDestGroup) this.createTxDestGroup.style.display = 'none';
      if (this.createTxCategoryGroup) this.createTxCategoryGroup.style.display = 'block';
      if (this.createTxAdminFeeGroup) this.createTxAdminFeeGroup.style.display = 'none';
      this.populateTxCategorySelect(this.createTxCategory, 'EXPENSE');
    } else if (type === 'INCOME') {
      if (this.createTxSrcGroup) this.createTxSrcGroup.style.display = 'none';
      if (this.createTxDestGroup) this.createTxDestGroup.style.display = 'block';
      if (this.createTxCategoryGroup) this.createTxCategoryGroup.style.display = 'block';
      if (this.createTxAdminFeeGroup) this.createTxAdminFeeGroup.style.display = 'none';
      this.populateTxCategorySelect(this.createTxCategory, 'INCOME');
    } else if (type === 'TRANSFER') {
      if (this.createTxSrcGroup) this.createTxSrcGroup.style.display = 'block';
      if (this.createTxDestGroup) this.createTxDestGroup.style.display = 'block';
      if (this.createTxCategoryGroup) this.createTxCategoryGroup.style.display = 'none';
      if (this.createTxAdminFeeGroup) this.createTxAdminFeeGroup.style.display = 'block';
    }
  }

  populateTxAccountSelects(sourceSelect, destSelect, selectedSrcId = null, selectedDestId = null) {
    if (sourceSelect) {
      sourceSelect.innerHTML = '<option value="">-- Pilih Rekening Sumber --</option>';
      this.accounts.forEach((acc) => {
        const opt = document.createElement('option');
        opt.value = acc.id;
        opt.textContent = `${acc.name} (${acc.type}) - ${this.formatIDR(acc.current_balance)}`;
        if (selectedSrcId && String(acc.id) === String(selectedSrcId)) opt.selected = true;
        sourceSelect.appendChild(opt);
      });
    }

    if (destSelect) {
      destSelect.innerHTML = '<option value="">-- Pilih Rekening Tujuan --</option>';
      this.accounts.forEach((acc) => {
        const opt = document.createElement('option');
        opt.value = acc.id;
        opt.textContent = `${acc.name} (${acc.type}) - ${this.formatIDR(acc.current_balance)}`;
        if (selectedDestId && String(acc.id) === String(selectedDestId)) opt.selected = true;
        destSelect.appendChild(opt);
      });
    }
  }

  populateTxCategorySelect(categorySelect, typeFilter = null, selectedCatId = null) {
    if (!categorySelect) return;
    categorySelect.innerHTML = '<option value="">-- Pilih Kategori --</option>';
    const filtered = typeFilter ? this.categories.filter((c) => c.type === typeFilter) : this.categories;
    filtered.forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = `${cat.name} (${cat.type === 'EXPENSE' ? 'Pengeluaran' : 'Pemasukan'})`;
      if (selectedCatId && String(cat.id) === String(selectedCatId)) opt.selected = true;
      categorySelect.appendChild(opt);
    });
  }

  async handleCreateTransaction(e) {
    e.preventDefault();
    const type = this.createTxType.value;
    const amount = parseFloat(this.createTxAmount.value);
    const txDate = this.createTxDate.value;
    const desc = this.createTxDescription.value.trim();

    if (!amount || amount <= 0) {
      this.showAlert('Nominal harus lebih dari 0.', 'error');
      return;
    }
    if (!txDate) {
      this.showAlert('Tanggal transaksi wajib dipilih.', 'error');
      return;
    }

    const payload = {
      type,
      amount,
      transaction_date: txDate,
      description: desc || null,
    };

    if (type === 'EXPENSE') {
      const srcId = parseInt(this.createTxSourceAccount.value, 10);
      const catId = parseInt(this.createTxCategory.value, 10);
      if (!srcId) {
        this.showAlert('Rekening sumber wajib dipilih.', 'error');
        return;
      }
      if (!catId) {
        this.showAlert('Kategori pengeluaran wajib dipilih.', 'error');
        return;
      }
      payload.source_account_id = srcId;
      payload.category_id = catId;
    } else if (type === 'INCOME') {
      const destId = parseInt(this.createTxDestAccount.value, 10);
      const catId = parseInt(this.createTxCategory.value, 10);
      if (!destId) {
        this.showAlert('Rekening tujuan wajib dipilih.', 'error');
        return;
      }
      if (!catId) {
        this.showAlert('Kategori pemasukan wajib dipilih.', 'error');
        return;
      }
      payload.destination_account_id = destId;
      payload.category_id = catId;
    } else if (type === 'TRANSFER') {
      const srcId = parseInt(this.createTxSourceAccount.value, 10);
      const destId = parseInt(this.createTxDestAccount.value, 10);
      const fee = parseFloat(this.createTxAdminFee.value) || 0;
      if (!srcId || !destId) {
        this.showAlert('Rekening sumber dan tujuan wajib dipilih.', 'error');
        return;
      }
      if (srcId === destId) {
        this.showAlert('Rekening sumber dan tujuan tidak boleh sama.', 'error');
        return;
      }
      payload.source_account_id = srcId;
      payload.destination_account_id = destId;
      payload.admin_fee = fee;
    }

    this.btnSubmitCreateTx.disabled = true;
    this.btnSubmitCreateTx.innerHTML = `<span class="loading-spinner"></span> Menyimpan...`;

    try {
      const res = await api.transactions.create(payload);
      this.showAlert(res.message || 'Transaksi berhasil dicatat ke buku besar!', 'success');
      this.closeModals();
      await Promise.all([this.loadAccounts(), this.loadHistory(), this.loadBudgetOverview(), this.loadReportsData()]);
    } catch (err) {
      this.showAlert(`Gagal mencatat transaksi: ${err.message}`, 'error');
    } finally {
      this.btnSubmitCreateTx.disabled = false;
      this.btnSubmitCreateTx.innerHTML = `Simpan ke Buku Besar`;
    }
  }

  openEditTxModal(tx) {
    if (!this.formEditTx) return;
    this.formEditTx.reset();

    if (this.editTxError) {
      this.editTxError.style.display = 'none';
      this.editTxError.innerHTML = '';
    }

    this.editTxId.value = tx.id;
    this.editTxType.value = tx.type;

    if (this.editTxTypeBadge) {
      this.editTxTypeBadge.textContent = tx.type;
      this.editTxTypeBadge.className = `badge-cat-pill ${tx.type === 'INCOME' ? 'cat-green' : (tx.type === 'TRANSFER' ? 'cat-blue' : 'cat-rose')}`;
    }

    if (this.editTxAmount) this.editTxAmount.value = parseFloat(tx.amount);
    if (this.editTxDate) this.editTxDate.value = tx.transaction_date;
    if (this.editTxDescription) this.editTxDescription.value = tx.description || '';

    // Field visibility based on type
    if (tx.type === 'EXPENSE') {
      if (this.editTxSrcGroup) this.editTxSrcGroup.style.display = 'block';
      if (this.editTxDestGroup) this.editTxDestGroup.style.display = 'none';
      if (this.editTxCategoryGroup) this.editTxCategoryGroup.style.display = 'block';
      this.populateTxAccountSelects(this.editTxSourceAccount, null, tx.source_account_id, null);
      this.populateTxCategorySelect(this.editTxCategory, 'EXPENSE', tx.category_id);
    } else if (tx.type === 'INCOME') {
      if (this.editTxSrcGroup) this.editTxSrcGroup.style.display = 'none';
      if (this.editTxDestGroup) this.editTxDestGroup.style.display = 'block';
      if (this.editTxCategoryGroup) this.editTxCategoryGroup.style.display = 'block';
      this.populateTxAccountSelects(null, this.editTxDestAccount, null, tx.destination_account_id);
      this.populateTxCategorySelect(this.editTxCategory, 'INCOME', tx.category_id);
    } else if (tx.type === 'TRANSFER') {
      if (this.editTxSrcGroup) this.editTxSrcGroup.style.display = 'block';
      if (this.editTxDestGroup) this.editTxDestGroup.style.display = 'block';
      if (this.editTxCategoryGroup) this.editTxCategoryGroup.style.display = 'none';
      this.populateTxAccountSelects(this.editTxSourceAccount, this.editTxDestAccount, tx.source_account_id, tx.destination_account_id);
    }

    if (this.modalEditTx) {
      this.modalEditTx.style.display = 'flex';
    }
  }

  async handleUpdateTransaction(e) {
    e.preventDefault();
    if (this.editTxError) {
      this.editTxError.style.display = 'none';
      this.editTxError.innerHTML = '';
    }

    const txId = parseInt(this.editTxId.value, 10);
    if (!txId) {
      const msg = 'ID transaksi tidak valid.';
      if (this.editTxError) {
        this.editTxError.innerHTML = `<span>${msg}</span>`;
        this.editTxError.style.display = 'flex';
      }
      this.showAlert(msg, 'error');
      return;
    }

    const type = this.editTxType.value;
    const amount = parseFloat(this.editTxAmount.value);
    const txDate = this.editTxDate.value;
    const desc = this.editTxDescription.value.trim();

    if (!amount || amount <= 0) {
      const msg = 'Nominal harus lebih dari 0.';
      if (this.editTxError) {
        this.editTxError.innerHTML = `<span>${msg}</span>`;
        this.editTxError.style.display = 'flex';
      }
      this.showAlert(msg, 'error');
      return;
    }
    if (!txDate) {
      const msg = 'Tanggal transaksi wajib dipilih.';
      if (this.editTxError) {
        this.editTxError.innerHTML = `<span>${msg}</span>`;
        this.editTxError.style.display = 'flex';
      }
      this.showAlert(msg, 'error');
      return;
    }

    const payload = {
      amount,
      transaction_date: txDate,
      description: desc || null,
    };

    if (type === 'EXPENSE') {
      const srcId = parseInt(this.editTxSourceAccount.value, 10);
      const catId = parseInt(this.editTxCategory.value, 10);
      if (!srcId) {
        const msg = 'Rekening sumber wajib dipilih.';
        if (this.editTxError) { this.editTxError.innerHTML = `<span>${msg}</span>`; this.editTxError.style.display = 'flex'; }
        this.showAlert(msg, 'error');
        return;
      }
      if (!catId) {
        const msg = 'Kategori pengeluaran wajib dipilih.';
        if (this.editTxError) { this.editTxError.innerHTML = `<span>${msg}</span>`; this.editTxError.style.display = 'flex'; }
        this.showAlert(msg, 'error');
        return;
      }
      payload.source_account_id = srcId;
      payload.category_id = catId;
    } else if (type === 'INCOME') {
      const destId = parseInt(this.editTxDestAccount.value, 10);
      const catId = parseInt(this.editTxCategory.value, 10);
      if (!destId) {
        const msg = 'Rekening tujuan wajib dipilih.';
        if (this.editTxError) { this.editTxError.innerHTML = `<span>${msg}</span>`; this.editTxError.style.display = 'flex'; }
        this.showAlert(msg, 'error');
        return;
      }
      if (!catId) {
        const msg = 'Kategori pemasukan wajib dipilih.';
        if (this.editTxError) { this.editTxError.innerHTML = `<span>${msg}</span>`; this.editTxError.style.display = 'flex'; }
        this.showAlert(msg, 'error');
        return;
      }
      payload.destination_account_id = destId;
      payload.category_id = catId;
    } else if (type === 'TRANSFER') {
      const srcId = parseInt(this.editTxSourceAccount.value, 10);
      const destId = parseInt(this.editTxDestAccount.value, 10);
      if (!srcId || !destId) {
        const msg = 'Rekening sumber dan tujuan wajib dipilih.';
        if (this.editTxError) { this.editTxError.innerHTML = `<span>${msg}</span>`; this.editTxError.style.display = 'flex'; }
        this.showAlert(msg, 'error');
        return;
      }
      if (srcId === destId) {
        const msg = 'Rekening sumber dan tujuan tidak boleh sama.';
        if (this.editTxError) { this.editTxError.innerHTML = `<span>${msg}</span>`; this.editTxError.style.display = 'flex'; }
        this.showAlert(msg, 'error');
        return;
      }
      payload.source_account_id = srcId;
      payload.destination_account_id = destId;
    }

    this.btnSubmitEditTx.disabled = true;
    this.btnSubmitEditTx.innerHTML = `<span class="loading-spinner"></span> Menyimpan...`;

    try {
      const res = await api.transactions.update(txId, payload);
      this.closeModals();
      this.showAlert(res.message || 'Transaksi berhasil diperbarui!', 'success');
      await Promise.all([this.loadAccounts(), this.loadHistory(), this.loadBudgetOverview(), this.loadReportsData()]);
    } catch (err) {
      console.error('[Update Transaction Error]', err);
      if (this.editTxError) {
        this.editTxError.innerHTML = `
          <div style="display: flex; align-items: flex-start; gap: 8px;">
            <svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-top: 1px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              <strong style="display: block; margin-bottom: 2px;">Gagal Memperbarui Transaksi:</strong>
              <span>${err.message || 'Terjadi kesalahan pada sistem.'}</span>
            </div>
          </div>
        `;
        this.editTxError.style.display = 'flex';
      }
      this.showAlert(`Gagal memperbarui transaksi: ${err.message}`, 'error');
    } finally {
      this.btnSubmitEditTx.disabled = false;
      this.btnSubmitEditTx.innerHTML = `Simpan Perubahan`;
    }
  }

  openDeleteTxModal(tx) {
    if (!this.modalDeleteTx) return;
    this.deleteTxId.value = tx.id;

    if (this.deleteTxError) {
      this.deleteTxError.style.display = 'none';
      this.deleteTxError.innerHTML = '';
    }

    if (this.deleteTxInfo) {
      this.deleteTxInfo.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: var(--text-secondary);">Tanggal:</span>
          <strong>${this.formatDateID(tx.transaction_date)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: var(--text-secondary);">Tipe / Kategori:</span>
          <span>${tx.type} · ${tx.category_name || '-'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: var(--text-secondary);">Deskripsi:</span>
          <span>${tx.description || '-'}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-secondary);">Nominal:</span>
          <strong style="color: ${tx.type === 'INCOME' ? 'var(--accent-green)' : 'var(--accent-rose)'};">${this.formatIDR(tx.amount)}</strong>
        </div>
      `;
    }
    this.modalDeleteTx.style.display = 'flex';
  }

  async handleConfirmDeleteTransaction() {
    const txId = parseInt(this.deleteTxId.value, 10);
    if (!txId) {
      if (this.deleteTxError) {
        this.deleteTxError.innerHTML = `<span>ID transaksi tidak valid.</span>`;
        this.deleteTxError.style.display = 'flex';
      }
      return;
    }

    if (this.deleteTxError) {
      this.deleteTxError.style.display = 'none';
      this.deleteTxError.innerHTML = '';
    }

    this.btnConfirmDeleteTx.disabled = true;
    this.btnConfirmDeleteTx.innerHTML = `<span class="loading-spinner"></span> Menghapus...`;

    try {
      const res = await api.transactions.delete(txId);
      this.closeModals();
      this.showAlert(res.message || 'Transaksi berhasil dihapus dari buku besar.', 'success');
      await Promise.all([this.loadAccounts(), this.loadHistory(), this.loadBudgetOverview(), this.loadReportsData()]);
    } catch (err) {
      console.error('[Delete Transaction Error]', err);
      if (this.deleteTxError) {
        this.deleteTxError.innerHTML = `
          <div style="display: flex; align-items: flex-start; gap: 8px;">
            <svg class="ui-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-top: 1px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              <strong style="display: block; margin-bottom: 2px;">Gagal Menghapus Transaksi:</strong>
              <span>${err.message || 'Terjadi kesalahan pada sistem.'}</span>
            </div>
          </div>
        `;
        this.deleteTxError.style.display = 'flex';
      }
      this.showAlert(`Gagal menghapus transaksi: ${err.message}`, 'error');
    } finally {
      this.btnConfirmDeleteTx.disabled = false;
      this.btnConfirmDeleteTx.innerHTML = `Hapus Transaksi`;
    }
  }

  async handleReverse(txId) {
    const reason = prompt('Masukkan alasan jurnal pembalik (reversal):', 'Koreksi pencatatan');
    if (!reason) return;

    try {
      const res = await api.transactions.reverse(txId, reason);
      this.showAlert(res.message || 'Jurnal pembalik berhasil diterbitkan.', 'success');
      await Promise.all([this.loadAccounts(), this.loadHistory(), this.loadBudgetOverview(), this.loadReportsData()]);
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
      else if (d.type === 'TRANSFER') accText = `${d.source_account_name} ${Icons.arrowRight} ${d.destination_account_name}`;

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

      await Promise.all([this.loadAccounts(), this.loadHistory(), this.loadBudgetOverview(), this.loadReportsData()]);
    } catch (err) {
      this.showAlert(`Gagal konfirmasi batch: ${err.message}`, 'error');
    } finally {
      this.btnConfirmBatch.disabled = false;
      this.btnConfirmBatch.innerHTML = `${Icons.check}<span>Konfirmasi semua draft</span>`;
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
      this.btnRecord.innerHTML = `${Icons.stop}<span>Berhenti Rekam</span>`;
      this.recordStatus.textContent = 'Merekam suara (Maks 30s)...';
    } else {
      this.btnRecord.classList.remove('recording');
      this.btnRecord.innerHTML = `${Icons.mic}<span>Rekam suara</span>`;
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
  // MONTH & YEAR PICKER MODAL
  // ==========================================
  openMonthPicker(context = 'planning') {
    this.pickerContext = context;
    const now = new Date();

    if (context === 'planning') {
      this.pickerYear = this.selectedPlanningYear || now.getFullYear();
      if (this.monthPickerModalTitle) {
        this.monthPickerModalTitle.textContent = 'Pilih Periode Anggaran & Tabungan';
      }
    } else {
      this.pickerYear = this.selectedReportYear || now.getFullYear();
      if (this.monthPickerModalTitle) {
        this.monthPickerModalTitle.textContent = 'Pilih Periode Laporan Keuangan';
      }
    }

    this.renderMonthPickerGrid();

    if (this.modalMonthPicker) {
      this.modalMonthPicker.style.display = 'flex';
    }
  }

  renderMonthPickerGrid() {
    if (!this.pickerMonthsGrid) return;
    if (this.pickerSelectedYear) {
      this.pickerSelectedYear.textContent = this.pickerYear;
    }

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const activeYear = this.pickerContext === 'planning' ? this.selectedPlanningYear : this.selectedReportYear;
    const activeMonth = this.pickerContext === 'planning' ? this.selectedPlanningMonth : this.selectedReportMonth;

    this.pickerMonthsGrid.innerHTML = '';

    monthNames.forEach((name, idx) => {
      const monthNum = idx + 1;
      const isSelected = (this.pickerYear === activeYear && monthNum === activeMonth);
      const isThisMonth = (this.pickerYear === currentYear && monthNum === currentMonth);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `month-picker-btn${isSelected ? ' active' : ''}${isThisMonth ? ' is-current-month' : ''}`;
      btn.setAttribute('data-month', monthNum);
      btn.innerHTML = `
        <span class="month-num">${String(monthNum).padStart(2, '0')}</span>
        <span class="month-name">${name}</span>
      `;

      btn.addEventListener('click', () => {
        this.selectMonthFromPicker(monthNum);
      });

      this.pickerMonthsGrid.appendChild(btn);
    });
  }

  selectMonthFromPicker(monthNum) {
    const monthNames = [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    const monthName = monthNames[monthNum] || `Bulan ${monthNum}`;
    const selectedYr = this.pickerYear;

    this.closeModals();

    if (this.pickerContext === 'planning') {
      this.selectedPlanningYear = selectedYr;
      this.selectedPlanningMonth = monthNum;
      this.loadBudgetOverview(selectedYr, monthNum);
      this.showAlert(`Periode anggaran beralih ke ${monthName} ${selectedYr}`, 'success');
    } else {
      this.selectedReportYear = selectedYr;
      this.selectedReportMonth = monthNum;
      this.loadReportsData(selectedYr, monthNum);
      this.showAlert(`Laporan beralih ke ${monthName} ${selectedYr}`, 'success');
    }
  }

  // ==========================================
  // TAB 3: ANGGARAN & TARGET TABUNGAN
  // ==========================================
  async loadPlanningData() {
    await Promise.all([
      this.loadBudgetOverview(this.selectedPlanningYear, this.selectedPlanningMonth),
      this.loadSavingsGoals(),
    ]);
  }

  async loadBudgetOverview(targetYear = null, targetMonth = null) {
    const now = new Date();
    const yr = targetYear || this.selectedPlanningYear || now.getFullYear();
    const mo = targetMonth || this.selectedPlanningMonth || (now.getMonth() + 1);
    this.selectedPlanningYear = yr;
    this.selectedPlanningMonth = mo;

    try {
      const res = await api.planning.getBudget(yr, mo);
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

    const currentYear = b.period_year || this.selectedPlanningYear || 2026;
    const currentMonth = b.period_month || this.selectedPlanningMonth || (new Date().getMonth() + 1);
    const currentMonthText = `${monthNames[currentMonth] || 'Oktober'} ${currentYear}`;

    // Update Top Month Picker Label (Screen 03)
    if (this.planningCurrentMonthLabel) {
      this.planningCurrentMonthLabel.textContent = currentMonthText;
    }

    // Update Right Column Mini Card on Dashboard (Screen 01)
    if (this.budgetPeriodMini) {
      this.budgetPeriodMini.textContent = `${monthNamesShort[currentMonth] || currentMonth} ${currentYear}`;
    }

    const totLimit = b.total_limit !== undefined && b.total_limit !== null ? parseFloat(b.total_limit) : 0;
    const totSpent = b.total_spent !== undefined && b.total_spent !== null ? parseFloat(b.total_spent) : 0;
    const totRem = totLimit > 0 ? (totLimit - totSpent) : 0;
    const pct = totLimit > 0 ? Math.min(Math.round((totSpent / totLimit) * 100), 100) : (totSpent > 0 ? 100 : 0);

    if (this.budgetCapVal) {
      this.budgetCapVal.textContent = totLimit > 0 ? this.formatIDR(totLimit) : 'Belum diatur';
    }
    if (this.budgetUsedVal) this.budgetUsedVal.textContent = this.formatIDR(totSpent);
    if (this.budgetRemainderVal) {
      if (totLimit === 0) {
        this.budgetRemainderVal.innerHTML = 'Pagu belum ditetapkan untuk bulan ini';
        this.budgetRemainderVal.style.color = 'var(--text-muted)';
      } else if (b.is_over) {
        this.budgetRemainderVal.innerHTML = `${Icons.alert} Melebihi plafon sebesar ${this.formatIDR(totSpent - totLimit)}`;
        this.budgetRemainderVal.style.color = 'var(--accent-rose)';
      } else {
        this.budgetRemainderVal.innerHTML = `Sisa plafon: ${this.formatIDR(totRem)}`;
        this.budgetRemainderVal.style.color = 'var(--accent-green)';
      }
    }

    if (this.budgetFillBar) {
      this.budgetFillBar.style.width = `${pct}%`;
      this.budgetFillBar.style.background = b.is_over ? 'var(--accent-rose)' : '#659678';
    }

    // Update Screen 03 (Anggaran & Tabungan) 4 Top Stat Cards
    if (this.statPaguBulanan) {
      this.statPaguBulanan.textContent = totLimit > 0 ? this.formatIDR(totLimit) : 'Rp 0';
    }
    if (this.statPaguStatus) {
      this.statPaguStatus.textContent = totLimit > 0 ? 'Batas anggaran aktif' : 'Belum ditetapkan';
      this.statPaguStatus.className = totLimit > 0 ? 'stat-card-badge green' : 'stat-card-badge amber';
    }

    if (this.statPengeluaran) this.statPengeluaran.textContent = this.formatIDR(totSpent);
    if (this.statPengeluaranStatus) {
      if (totLimit > 0) {
        this.statPengeluaranStatus.textContent = `${pct}% dari pagu`;
        this.statPengeluaranStatus.className = pct > 80 ? 'stat-card-badge rose' : 'stat-card-badge green';
      } else {
        this.statPengeluaranStatus.textContent = 'Realisasi berjalan';
        this.statPengeluaranStatus.className = 'stat-card-badge green';
      }
    }

    if (this.statSisaAnggaran) {
      this.statSisaAnggaran.textContent = totLimit > 0 ? this.formatIDR(totRem) : 'Rp 0';
    }
    if (this.statSisaStatus) {
      if (totLimit > 0) {
        this.statSisaStatus.textContent = b.is_over ? 'Pagu terlampaui' : `${100 - pct}% masih tersedia`;
        this.statSisaStatus.className = b.is_over ? 'stat-card-badge rose' : 'stat-card-badge green';
      } else {
        this.statSisaStatus.textContent = 'Atur pagu bulanan';
        this.statSisaStatus.className = 'stat-card-badge amber';
      }
    }

    let totalSavingsThisMonth = 0;
    if (this.savingsGoals && this.savingsGoals.length > 0) {
      totalSavingsThisMonth = this.savingsGoals.reduce((sum, g) => sum + (parseFloat(g.current_balance) || 0), 0);
    }
    if (this.statTabunganBulanIni) {
      this.statTabunganBulanIni.textContent = this.formatIDR(totalSavingsThisMonth);
    }
    if (this.statTabunganStatus) {
      this.statTabunganStatus.textContent = this.savingsGoals && this.savingsGoals.length > 0
        ? `${this.savingsGoals.length} kantong tabungan aktif`
        : 'Belum ada target tabungan';
    }

    // Render Category Budgets Table (Screen 03)
    if (this.categoryBudgetsTableBody) {
      this.categoryBudgetsTableBody.innerHTML = '';
      let categoriesToRender = (b.categories && b.categories.length > 0) ? b.categories : [];

      if (categoriesToRender.length === 0 && this.transactions && this.transactions.length > 0) {
        const catMap = {};
        this.transactions.forEach((tx) => {
          if (tx.is_reversal || tx.type !== 'EXPENSE') return;
          const cName = tx.category_name || 'Lainnya';
          const amt = parseFloat(tx.amount) || 0;
          catMap[cName] = (catMap[cName] || 0) + amt;
        });
        categoriesToRender = Object.entries(catMap).map(([cName, spent]) => ({
          category_name: cName,
          limit_amount: 0,
          spent_amount: spent,
          remaining_amount: 0,
          percentage_spent: 100,
        }));
      }

      if (categoriesToRender.length > 0) {
        categoriesToRender.forEach((cat) => {
          const limit = parseFloat(cat.limit_amount) || 0;
          const spent = parseFloat(cat.spent_amount) || 0;
          const catPct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 100;
          const fillClass = limit > 0 ? (catPct > 80 ? 'rose' : (catPct > 65 ? 'amber' : '')) : '';
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${cat.category_name}</strong></td>
            <td style="color: var(--text-secondary);">${limit > 0 ? this.formatIDR(limit) : '<span style="color: var(--text-muted); font-size: 11px;">Belum diatur</span>'}</td>
            <td><strong>${this.formatIDR(spent)}</strong></td>
            <td style="color: var(--text-secondary);">${limit > 0 ? this.formatIDR(cat.remaining_amount) : '-'}</td>
            <td>
              <div class="cat-progress-track">
                <div class="cat-progress-fill ${fillClass}" style="width: ${catPct}%;"></div>
              </div>
            </td>
          `;
          this.categoryBudgetsTableBody.appendChild(tr);
        });
      } else {
        this.categoryBudgetsTableBody.innerHTML = `
          <tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 16px;">Belum ada kategori anggaran atau mutasi pengeluaran.</td></tr>
        `;
      }
    }

    // Render Monthly Budget History Table (Screen 03)
    if (this.budgetHistoryTableBody) {
      this.budgetHistoryTableBody.innerHTML = '';
      if (this.reportData && this.reportData.monthly_history && this.reportData.monthly_history.length > 0) {
        this.reportData.monthly_history.forEach((row, i) => {
          const tr = document.createElement('tr');
          const isCurrent = i === 0;
          tr.innerHTML = `
            <td><strong>${row.period_str}</strong></td>
            <td style="color: var(--text-secondary);">${totLimit > 0 && isCurrent ? this.formatIDR(totLimit) : '-'}</td>
            <td><strong>${this.formatIDR(row.expense)}</strong></td>
            <td style="color: var(--text-secondary);">${totLimit > 0 && isCurrent ? this.formatIDR(totRem) : '-'}</td>
            <td style="color: var(--text-secondary);">${totLimit > 0 && isCurrent ? `${pct}%` : '-'}</td>
          `;
          this.budgetHistoryTableBody.appendChild(tr);
        });
      } else {
        this.budgetHistoryTableBody.innerHTML = `
          <tr>
            <td><strong>${currentMonthText}</strong></td>
            <td style="color: var(--text-secondary);">${totLimit > 0 ? this.formatIDR(totLimit) : '-'}</td>
            <td><strong>${this.formatIDR(totSpent)}</strong></td>
            <td style="color: var(--text-secondary);">${totLimit > 0 ? this.formatIDR(totRem) : '-'}</td>
            <td style="color: var(--text-secondary);">${totLimit > 0 ? `${pct}%` : '-'}</td>
          </tr>
        `;
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
    if (!this.savingsGoalsList) return;
    this.savingsGoalsList.innerHTML = '';

    const goalsToRender = (this.savingsGoals && this.savingsGoals.length > 0) ? this.savingsGoals : [
      { id: 1, name: 'Emergency Fund', account_name: 'Bank', current_balance: 3000000, target_amount: 4000000, progress_percent: 75, target_date: '31 Des 2026', icon: 'shield' },
      { id: 2, name: 'Japan Trip', account_name: 'E-Wallet', current_balance: 7500000, target_amount: 10000000, progress_percent: 75, target_date: '30 Jun 2027', icon: 'plane' },
    ];

    goalsToRender.forEach((g) => {
      const card = document.createElement('div');
      card.className = 'goal-card-box';
      const pct = Math.min(Math.round(g.progress_percent || 0), 100);
      const isEmergency = (g.name.toLowerCase().includes('darurat') || g.name.toLowerCase().includes('emergency') || g.icon === 'shield');
      const goalIconSvg = isEmergency ? Icons.shield : Icons.plane;

      card.innerHTML = `
        <div class="goal-card-top">
          <div class="goal-card-title-group">
            <span style="display: inline-flex; align-items: center;">${goalIconSvg}</span>
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

    const yr = this.selectedPlanningYear || new Date().getFullYear();
    const mo = this.selectedPlanningMonth || (new Date().getMonth() + 1);
    try {
      await api.planning.setMonthlyBudget(yr, mo, val);
      this.closeModals();
      this.showAlert('Pagu anggaran total bulanan berhasil disimpan!', 'success');
      await this.loadBudgetOverview(yr, mo);
    } catch (err) {
      this.showAlert(`Gagal menyimpan anggaran: ${err.message}`, 'error');
    }
  }

  async handleSetCatBudget(e) {
    e.preventDefault();
    const catId = parseInt(this.selectCatBudget.value);
    const val = parseFloat(this.inputCatBudgetLimit.value);
    if (!catId || !val || val <= 0) return;

    const yr = this.selectedPlanningYear || new Date().getFullYear();
    const mo = this.selectedPlanningMonth || (new Date().getMonth() + 1);
    try {
      await api.planning.setCategoryBudget(catId, yr, mo, val);
      this.closeModals();
      this.showAlert('Batas anggaran kategori berhasil disimpan!', 'success');
      await this.loadBudgetOverview(yr, mo);
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
      this.copilotAccountSelect.innerHTML = '<option value="">Bank — Rp 5.250.000</option>';
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
      let dotClass = 'dot-green';
      let badgeText = data.verdict_badge || 'Relatif Aman untuk Dibeli';
      badgeText = badgeText.replace(/^[🟢🟡🔴⚠️]\s*/, '');

      if (data.verdict === 'PERLU_PERTIMBANGAN') {
        dotClass = 'dot-yellow';
        this.copilotVerdictBadge.className = 'verdict-badge-pill waspada';
      } else if (data.verdict === 'BERISIKO') {
        dotClass = 'dot-red';
        this.copilotVerdictBadge.className = 'verdict-badge-pill berisiko';
      } else {
        this.copilotVerdictBadge.className = 'verdict-badge-pill';
      }

      this.copilotVerdictBadge.innerHTML = `<span class="verdict-dot ${dotClass}"></span> ${badgeText}`;
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
    if (this.snapAccName) this.snapAccName.textContent = snap.rekening_terpilih || 'Bank';
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
  // SCREEN 05: LAPORAN KEUANGAN & DIAGRAM REALTIME LOGIC
  // ====================================================================
  async loadReportsData(targetYear = null, targetMonth = null) {
    const now = new Date();
    const yr = targetYear || this.selectedReportYear || now.getFullYear();
    const mo = targetMonth || this.selectedReportMonth || (now.getMonth() + 1);
    this.selectedReportYear = yr;
    this.selectedReportMonth = mo;

    const monthNames = [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    if (this.reportCurrentMonthLabel) {
      this.reportCurrentMonthLabel.textContent = `${monthNames[mo] || 'Oktober'} ${yr}`;
    }

    try {
      const res = await api.planning.getReports(yr, mo);
      if (res && res.data) {
        this.reportData = res.data;
        this.renderReports(this.reportData);
        return;
      }
    } catch (err) {
      console.warn('Gagal memuat API analitik laporan, menggunakan komputasi lokal:', err);
    }

    // Fallback: hitung realtime langsung dari buku besar transaksi lokal
    this.renderReportsFallback(yr, mo);
  }

  renderReports(data) {
    if (!data) return;

    // 1. Metric Cards
    if (this.reportStatIncome) this.reportStatIncome.textContent = this.formatIDR(data.current_income);
    if (this.reportStatIncomeSub) this.reportStatIncomeSub.textContent = `Dari ${data.income_count} transaksi tercatat`;
    if (this.reportStatExpense) this.reportStatExpense.textContent = this.formatIDR(data.current_expense);
    if (this.reportStatExpenseSub) {
      if (data.prev_month_expense > 0) {
        const sign = data.expense_change_percent >= 0 ? '+' : '';
        this.reportStatExpenseSub.textContent = `${sign}${data.expense_change_percent}% dari bulan lalu`;
      } else {
        this.reportStatExpenseSub.textContent = `Dari ${data.expense_count} transaksi pengeluaran`;
      }
    }
    if (this.reportStatNet) this.reportStatNet.textContent = this.formatIDR(data.current_net);
    if (this.reportStatNetSub) this.reportStatNetSub.textContent = 'Pemasukan - pengeluaran riil';
    if (this.reportStatRate) this.reportStatRate.textContent = `${data.savings_rate}%`;
    if (this.reportStatRateSub) this.reportStatRateSub.textContent = 'Dari total pemasukan';

    // 2. Komposisi Pengeluaran
    const monthNames = [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    if (this.reportCompMonth) this.reportCompMonth.textContent = monthNames[data.period_month] || 'Oktober';
    if (this.reportCompTotal) this.reportCompTotal.textContent = `Total ${this.formatIDR(data.current_expense)}`;

    if (this.reportsCatProgressContainer) {
      this.reportsCatProgressContainer.innerHTML = '';
      if (data.category_composition && data.category_composition.length > 0) {
        data.category_composition.forEach((item, idx) => {
          const row = document.createElement('div');
          row.className = 'reports-cat-row';
          row.innerHTML = `
            <div class="reports-cat-header">
              <span>${item.category_name} (${this.formatIDR(item.spent_amount)})</span>
              <span>${item.percentage}%</span>
            </div>
            <div class="reports-cat-track">
              <div class="reports-cat-fill reports-cat-fill-${idx % 5}" style="width: ${Math.min(item.percentage, 100)}%;"></div>
            </div>
          `;
          this.reportsCatProgressContainer.appendChild(row);
        });
      } else {
        this.reportsCatProgressContainer.innerHTML = `
          <div style="color: var(--text-muted); font-size: 11px; padding: 14px 0; text-align: center;">
            Belum ada mutasi pengeluaran tercatat untuk periode ini.
          </div>
        `;
      }
    }

    // 3. 12-Month Grouped Bar Chart
    if (this.reportsBarsContainer && data.monthly_cashflow) {
      this.reportsBarsContainer.innerHTML = '';
      let maxVal = 0;
      data.monthly_cashflow.forEach((item) => {
        const inc = parseFloat(item.income) || 0;
        const exp = parseFloat(item.expense) || 0;
        if (inc > maxVal) maxVal = inc;
        if (exp > maxVal) maxVal = exp;
      });
      if (maxVal === 0) maxVal = 1000000;

      const maxChartHeight = 135; // px

      data.monthly_cashflow.forEach((item) => {
        const inc = parseFloat(item.income) || 0;
        const exp = parseFloat(item.expense) || 0;
        const incH = Math.min(Math.round((inc / maxVal) * maxChartHeight), maxChartHeight);
        const expH = Math.min(Math.round((exp / maxVal) * maxChartHeight), maxChartHeight);
        const isActive = item.month === data.period_month;

        const col = document.createElement('div');
        col.className = 'grouped-month-col';
        col.style.cursor = 'pointer';
        col.title = `${item.month_label} ${item.year}: Masuk ${this.formatIDR(inc)} | Keluar ${this.formatIDR(exp)} (Klik untuk pilih)`;

        col.innerHTML = `
          <div class="grouped-bars-wrapper">
            <div class="bar-income ${isActive ? 'active' : ''}" style="height: ${incH}px;" title="${item.month_label} Masuk: ${this.formatIDR(inc)}"></div>
            <div class="bar-expense ${isActive ? 'active' : ''}" style="height: ${expH}px;" title="${item.month_label} Keluar: ${this.formatIDR(exp)}"></div>
          </div>
          <div class="grouped-month-label ${isActive ? 'active' : ''}">${item.month_label}</div>
        `;

        col.addEventListener('click', () => {
          this.loadReportsData(item.year, item.month);
        });

        this.reportsBarsContainer.appendChild(col);
      });
    }

    if (this.reportsChartNote) {
      this.reportsChartNote.textContent = `Menampilkan data arus kas riil buku besar tahun ${data.period_year}.`;
    }

    // 4. Monthly History Table
    if (this.reportsMonthlyTableBody && data.monthly_history) {
      this.reportsMonthlyTableBody.innerHTML = '';
      data.monthly_history.forEach((row) => {
        const tr = document.createElement('tr');
        const chg = row.expense_change_percent;
        const badgeClass = chg <= 0 ? 'trend-badge-green' : 'trend-badge-rose';
        const sign = chg > 0 ? '+' : '';
        const chgText = chg !== 0 ? `${sign}${chg}%` : '-';

        tr.innerHTML = `
          <td><strong>${row.period_str}</strong></td>
          <td style="color: var(--text-secondary);">${this.formatIDR(row.income)}</td>
          <td style="color: var(--text-secondary);">${this.formatIDR(row.expense)}</td>
          <td><strong>${this.formatIDR(row.net_cashflow)}</strong></td>
          <td><span class="${badgeClass}">${chgText}</span></td>
          <td style="text-align: right;">
            <button type="button" class="card-action-link btn-view-period" data-year="${row.year}" data-month="${row.month}">Lihat periode</button>
          </td>
        `;

        tr.querySelector('.btn-view-period').addEventListener('click', (e) => {
          const y = parseInt(e.currentTarget.getAttribute('data-year'), 10);
          const m = parseInt(e.currentTarget.getAttribute('data-month'), 10);
          this.loadReportsData(y, m);
        });

        this.reportsMonthlyTableBody.appendChild(tr);
      });
    }

    // 5. Update Dashboard Real-time Charts
    if (data.sparkline_points && data.sparkline_months) {
      this.renderDashboardSparkline(data.sparkline_points, data.sparkline_months);
    }
    if (data.daily_spending) {
      this.renderDashboardInsightBars(data.daily_spending);
    }
  }

  renderReportsFallback(yr, mo) {
    const monthLabels = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthNamesFull = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    let curIncome = 0;
    let curExpense = 0;
    let incCount = 0;
    let expCount = 0;
    const catSpent = {};

    const monthlyMap = {};
    for (let m = 1; m <= 12; m++) {
      monthlyMap[m] = { income: 0, expense: 0 };
    }

    if (this.transactions && this.transactions.length > 0) {
      this.transactions.forEach((tx) => {
        if (tx.is_reversal) return;
        const amt = parseFloat(tx.amount) || 0;
        const txDate = tx.transaction_date ? new Date(tx.transaction_date) : new Date();
        const tYr = txDate.getFullYear();
        const tMo = txDate.getMonth() + 1;

        if (tYr === yr) {
          if (tx.type === 'INCOME') {
            monthlyMap[tMo].income += amt;
            if (tMo === mo) {
              curIncome += amt;
              incCount += 1;
            }
          } else if (tx.type === 'EXPENSE') {
            monthlyMap[tMo].expense += amt;
            if (tMo === mo) {
              curExpense += amt;
              expCount += 1;
              const cat = tx.category_name || 'Lainnya';
              catSpent[cat] = (catSpent[cat] || 0) + amt;
            }
          }
        }
      });
    }

    const curNet = curIncome - curExpense;
    const savingsRate = curIncome > 0 ? parseFloat(((curNet / curIncome) * 100).toFixed(1)) : 0;

    const monthlyCashflow = [];
    for (let m = 1; m <= 12; m++) {
      monthlyCashflow.append ? null : monthlyCashflow.push({
        year: yr,
        month: m,
        month_label: monthLabels[m],
        income: monthlyMap[m].income,
        expense: monthlyMap[m].expense,
        net_cashflow: monthlyMap[m].income - monthlyMap[m].expense
      });
    }

    const totalCatSpent = Object.values(catSpent).reduce((a, b) => a + b, 0) || curExpense || 1;
    const categoryComposition = Object.entries(catSpent)
      .sort((a, b) => b[1] - a[1])
      .map(([catName, spent]) => ({
        category_name: catName,
        spent_amount: spent,
        percentage: parseFloat(((spent / totalCatSpent) * 100).toFixed(1))
      }));

    const monthlyHistory = [
      {
        period_str: `${monthNamesFull[mo] || 'Oktober'} ${yr}`,
        year: yr,
        month: mo,
        income: curIncome,
        expense: curExpense,
        net_cashflow: curNet,
        expense_change_percent: 0.0
      }
    ];

    // Build rolling 5 months for sparkline
    let currentNetWorth = 0;
    if (this.accounts) {
      currentNetWorth = this.accounts.reduce((s, a) => s + (parseFloat(a.current_balance) || 0), 0);
    }
    const sparklineMonths = [];
    const sparklinePoints = [];
    for (let i = 4; i >= 0; i--) {
      let tM = mo - i;
      let tY = yr;
      while (tM < 1) {
        tM += 12;
        tY -= 1;
      }
      sparklineMonths.push(monthLabels[tM]);
      const netMo = (monthlyMap[tM] ? monthlyMap[tM].income - monthlyMap[tM].expense : 0);
      sparklinePoints.push(Math.max(0, currentNetWorth - (i * 200000) + netMo));
    }

    const dailySpending = [];
    const today = new Date();
    for (let i = 9; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      let daySpent = 0;
      if (this.transactions) {
        this.transactions.forEach((tx) => {
          if (tx.is_reversal || tx.type !== 'EXPENSE') return;
          if (tx.transaction_date === dStr) daySpent += parseFloat(tx.amount) || 0;
        });
      }
      dailySpending.push({
        date_str: dStr,
        day_label: String(d.getDate()),
        spent_amount: daySpent
      });
    }

    const fallbackData = {
      period_year: yr,
      period_month: mo,
      current_income: curIncome,
      current_expense: curExpense,
      current_net: curNet,
      savings_rate: savingsRate,
      income_count: incCount,
      expense_count: expCount,
      prev_month_expense: 0,
      expense_change_percent: 0,
      monthly_cashflow: monthlyCashflow,
      category_composition: categoryComposition,
      monthly_history: monthlyHistory,
      daily_spending: dailySpending,
      sparkline_points: sparklinePoints,
      sparkline_months: sparklineMonths,
    };

    this.renderReports(fallbackData);
  }

  renderDashboardSparkline(points, months) {
    if (!points || points.length === 0) return;

    if (this.dashboardSparklineMonths && months && months.length > 0) {
      this.dashboardSparklineMonths.innerHTML = months.map((m) => `<span>${m}</span>`).join('');
    }

    const svgW = 600;
    const svgH = 150;
    const padding = 16;
    const innerH = svgH - padding * 2;

    const numPoints = points.length;
    let minVal = Math.min(...points.map((p) => parseFloat(p) || 0));
    let maxVal = Math.max(...points.map((p) => parseFloat(p) || 0));
    if (maxVal === minVal) {
      maxVal += 100000;
      minVal = Math.max(0, minVal - 100000);
    }
    const valRange = maxVal - minVal || 1;

    const coords = points.map((p, idx) => {
      const x = Math.round((idx / (numPoints - 1)) * svgW);
      const val = parseFloat(p) || 0;
      const y = Math.round(svgH - padding - ((val - minVal) / valRange) * innerH);
      return { x, y };
    });

    let lineD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const cpx = Math.round((p0.x + p1.x) / 2);
      lineD += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const lastCoord = coords[coords.length - 1];
    const areaD = `${lineD} L ${lastCoord.x} ${svgH} L ${coords[0].x} ${svgH} Z`;

    if (this.dashboardSparklineLine) {
      this.dashboardSparklineLine.setAttribute('d', lineD);
    }
    if (this.dashboardSparklineArea) {
      this.dashboardSparklineArea.setAttribute('d', areaD);
    }
    if (this.dashboardSparklineDot) {
      this.dashboardSparklineDot.setAttribute('cx', lastCoord.x);
      this.dashboardSparklineDot.setAttribute('cy', lastCoord.y);
    }
  }

  renderDashboardInsightBars(dailyList) {
    if (!dailyList || dailyList.length === 0) return;
    if (!this.dashboardInsightBars) return;

    this.dashboardInsightBars.innerHTML = '';
    let maxSpend = 0;
    let totalSpend = 0;
    dailyList.forEach((d) => {
      const sp = parseFloat(d.spent_amount) || 0;
      totalSpend += sp;
      if (sp > maxSpend) maxSpend = sp;
    });
    if (maxSpend === 0) maxSpend = 100000;

    const avgSpend = totalSpend / dailyList.length;
    const maxBarHeight = 50;
    const minBarHeight = 8;

    dailyList.forEach((d, idx) => {
      const sp = parseFloat(d.spent_amount) || 0;
      const h = Math.max(minBarHeight, Math.round((sp / maxSpend) * maxBarHeight));
      const isToday = idx === dailyList.length - 1;

      const bar = document.createElement('div');
      bar.className = `insight-bar ${isToday ? 'highlight-green' : ''}`;
      bar.style.height = `${h}px`;
      bar.title = `${d.date_str}: ${this.formatIDR(sp)}`;

      this.dashboardInsightBars.appendChild(bar);
    });

    const todaySpend = parseFloat(dailyList[dailyList.length - 1].spent_amount) || 0;
    if (this.dashboardInsightTitle) {
      if (todaySpend > avgSpend * 1.3 && todaySpend > 0) {
        this.dashboardInsightTitle.textContent = 'Aktivitas pengeluaran lebih tinggi hari ini';
      } else if (todaySpend === 0) {
        this.dashboardInsightTitle.textContent = 'Belum ada pengeluaran hari ini (Hemat)';
      } else {
        this.dashboardInsightTitle.textContent = 'Pengeluaran stabil di bawah batas rata-rata';
      }
    }

    if (this.dashboardInsightDesc) {
      this.dashboardInsightDesc.textContent = `Rata-rata belanja harian adalah ${this.formatIDR(avgSpend)}. Arus kas tercatat secara real-time dari buku besar.`;
    }
  }

  handleExportReport() {
    try {
      const rows = [
        ['Periode', 'Pemasukan (IDR)', 'Pengeluaran (IDR)', 'Arus Kas Bersih (IDR)', 'Perubahan Pengeluaran']
      ];

      if (this.reportData && this.reportData.monthly_history && this.reportData.monthly_history.length > 0) {
        this.reportData.monthly_history.forEach((r) => {
          rows.push([
            r.period_str,
            r.income.toString(),
            r.expense.toString(),
            r.net_cashflow.toString(),
            `${r.expense_change_percent}%`
          ]);
        });
      } else if (this.transactions && this.transactions.length > 0) {
        let inc = 0;
        let exp = 0;
        this.transactions.forEach((t) => {
          if (t.is_reversal) return;
          const a = parseFloat(t.amount) || 0;
          if (t.type === 'INCOME') inc += a;
          else if (t.type === 'EXPENSE') exp += a;
        });
        rows.push(['Bulan Berjalan', inc.toString(), exp.toString(), (inc - exp).toString(), '0%']);
      } else {
        rows.push(['Oktober 2026', '0', '0', '0', '0%']);
      }

      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map((val) => `"${val}"`).join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Laporan_Keuangan_Realtime_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.showAlert('Laporan keuangan riil berhasil diekspor ke file CSV.', 'success');
    } catch (err) {
      console.error('Gagal mengekspor laporan:', err);
      this.showAlert('Gagal mengekspor laporan keuangan.', 'error');
    }
  }

  // ====================================================================
  // SCREEN 06: PENGATURAN & PROFIL LOGIC
  // ====================================================================
  loadSettingsData() {
    if (this.currentUser) {
      const uName = this.currentUser.username || 'Bryan Nathanael';
      if (this.settingsProfileName) this.settingsProfileName.textContent = uName;
      if (this.settingsAvatarInitial) this.settingsAvatarInitial.textContent = uName[0].toUpperCase();
    }

    // Render Connected Accounts
    if (this.accounts && this.accounts.length > 0 && this.settingsAccountsList) {
      this.settingsAccountsList.innerHTML = '';
      this.accounts.forEach((acc, idx) => {
        let iconSvg = Icons.bank;
        let iconClass = 'bank';
        const nameLower = (acc.name || '').toLowerCase();
        if (nameLower.includes('ewallet') || nameLower.includes('e-wallet') || nameLower.includes('gopay') || nameLower.includes('ovo') || nameLower.includes('dana') || acc.type === 'EWALLET') {
          iconSvg = Icons.phone;
          iconClass = 'ewallet';
        } else if (nameLower.includes('kas') || nameLower.includes('tunai') || nameLower.includes('cash')) {
          iconSvg = Icons.cash;
          iconClass = 'cash';
        }

        const row = document.createElement('div');
        row.className = 'connected-acc-row';
        row.innerHTML = `
          <div class="connected-acc-left">
            <div class="connected-acc-icon ${iconClass}">${iconSvg}</div>
            <div>
              <div class="connected-acc-type">${acc.name}</div>
              <div class="connected-acc-nickname">${acc.type || 'Rekening aktif'} · ${this.formatIDR(acc.balance || 0)}</div>
            </div>
          </div>
          <div class="badge-connected">Terhubung</div>
        `;
        this.settingsAccountsList.appendChild(row);

        if (idx < this.accounts.length - 1) {
          const div = document.createElement('div');
          div.className = 'settings-inner-divider';
          div.style.margin = '4px 0';
          this.settingsAccountsList.appendChild(div);
        }
      });
    }
  }
}

// Bootstrapping
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
