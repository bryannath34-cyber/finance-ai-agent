/**
 * Personal Finance AI Agent - Main Application Logic v2.3
 * Figma 1:1 Design System Integration (Nordic / Apple Minimalist).
 * Multi-account balances, Voice & AI Command, Draft Approval, Ledger,
 * Financial Planning, and AI Advisory Copilot.
 */

import { api } from './api.js?v=2.7.4';
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
    this.logoutInProgress = false;
    this.sessionCheckRun = 0;
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
    this.userPreferences = {
      'budget-alert': true,
      'monthly-summary': true,
      'savings-reminder': false,
      'currency-format': true,
    };

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
    this.appShell = document.querySelector('.app-shell');
    this.authOverlay = document.getElementById('auth-overlay');
    this.loginForm = document.getElementById('login-form');
    this.loginUsername = document.getElementById('login-username');
    this.loginPassword = document.getElementById('login-password');
    this.loginTotpGroup = document.getElementById('login-totp-group');
    this.loginTotpCode = document.getElementById('login-totp-code');
    this.loginError = document.getElementById('login-error');
    this.authFeedback = document.getElementById('auth-feedback');
    this.authFeedbackMessage = document.getElementById('auth-feedback-message');
    this.authFeedbackClose = document.getElementById('auth-feedback-close');
    this.sessionCheckPanel = document.getElementById('session-check-panel');
    this.sessionCheckMessage = document.getElementById('session-check-message');
    this.btnRetrySessionCheck = document.getElementById('btn-retry-session-check');
    this.btnToggleLoginPassword = document.getElementById('btn-toggle-login-password');
    this.btnGoogleLogin = document.getElementById('btn-google-login');
    this.loginRememberMe = document.getElementById('login-remember-me');
    this.authViewLogin = document.getElementById('auth-view-login');
    this.authViewSignup = document.getElementById('auth-view-signup');
    this.authViewReset = document.getElementById('auth-view-reset');
    this.formMobileSignup = document.getElementById('form-mobile-signup');
    this.formMobileReset = document.getElementById('form-mobile-reset');
    this.btnSignupToLogin = document.getElementById('btn-signup-to-login');
    this.btnResetToLoginLink = document.getElementById('btn-reset-to-login-link');
    this.linkOverlayForgot = document.getElementById('link-overlay-forgot');
    this.linkOverlayRegister = document.getElementById('link-overlay-register');

    this.usernameDisplay = document.getElementById('username-display');
    this.desktopGreetingName = document.getElementById('desktop-greeting-name');
    this.userAvatarInitial = document.getElementById('user-avatar-initial');
    this.btnLogout = document.getElementById('btn-logout');
    this.btnSidebarLogout = document.getElementById('btn-sidebar-logout');
    this.btnSettingsLogout = document.getElementById('btn-settings-logout');
    this.btnSettingsSecurityLogout = document.getElementById('btn-settings-security-logout');

    this.pageTitle = document.getElementById('page-title');
    this.pageIntro = document.getElementById('page-intro');
    this.pageTitlesContainer = document.querySelector('.page-titles');

    // Navigation Tabs (Both Feature Pills and Sidebar Links)
    this.tabBtns = document.querySelectorAll('.tab-btn');
    this.sidebarNavBtns = document.querySelectorAll('.sidebar-nav-btn[data-tab]');
    this.tabContents = document.querySelectorAll('.tab-content');

    // Tab 1: Dashboard Mutasi & Accounts
    this.accountsContainer = document.getElementById('accounts-container');
    this.aiAccountsGrid = document.getElementById('ai-accounts-grid');
    this.aiTotalLiquidBalance = document.getElementById('ai-total-liquid-balance');
    this.btnRefreshAiAccounts = document.getElementById('btn-refresh-ai-accounts');
    this.btnAddAccountAi = document.getElementById('btn-add-account-ai');
    this.btnToggleAiBalances = document.getElementById('btn-toggle-ai-balances');
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
    this.dashboardAiInput = document.getElementById('dashboard-ai-input');
    this.dashboardAiButton = document.getElementById('dashboard-ai-process');
    this.btnParse = document.getElementById('btn-parse');
    this.aiProcessStatus = document.getElementById('ai-process-status');
    this.aiProcessTitle = document.getElementById('ai-process-title');
    this.aiProcessDetail = document.getElementById('ai-process-detail');
    this.btnRetryAi = document.getElementById('btn-retry-ai');
    this.lastAIInput = '';
    this.aiRequestBusy = false;
    this.lastAudioBlob = null;
    this.retryMode = null;
    this.btnRecord = document.getElementById('btn-record');
    this.recordStatus = document.getElementById('record-status');
    this.aiResponseBox = document.getElementById('ai-response-box');
    this.aiResponseBody = document.getElementById('ai-response-body');
    this.btnCloseAiResponse = document.getElementById('btn-close-ai-response');
    this.mobileAiResponseBox = document.getElementById('mobile-ai-response-box');
    this.mobileAiResponseBody = document.getElementById('mobile-ai-response-body');
    this.mobileBtnCloseAiResponse = document.getElementById('mobile-btn-close-ai-response');

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
    this.ledgerCategorySelect = document.getElementById('ledger-category-select');
    this.transaksiPeriodText = document.getElementById('transaksi-period-text');
    this.ledgerAktivitasSubtitle = document.getElementById('ledger-aktivitas-subtitle');
    this.alertBox = document.getElementById('alert-box');

    // Ledger CRUD Modals & Form Elements
    this.btnOpenCreateTx = document.getElementById('btn-open-create-tx');
    this.btnOpenCreateTxDash = document.getElementById('btn-open-create-tx-dash');
    this.btnMobileOpenCreateTx = document.getElementById('mobile-dashboard-create-tx');
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
    this.copilotChatFeed = document.getElementById('copilot-chat-feed');
    this.copilotNewChatButton = document.getElementById('btn-copilot-new-chat');
    this.copilotConversation = [];
    this.copilotWelcomeMarkup = this.copilotChatFeed?.querySelector('.copilot-welcome-message')?.outerHTML || '';
    this.copilotAccountSelect = document.getElementById('copilot-account-select');
    this.btnConsultCopilot = document.getElementById('btn-consult-copilot');
    this.copilotAiStatus = document.getElementById('copilot-ai-status');

    this.snapAccName = document.getElementById('snap-acc-name');
    this.snapAccBal = document.getElementById('snap-acc-bal');
    this.snapAccAfter = document.getElementById('snap-acc-after');
    this.snapBudgetRem = document.getElementById('snap-budget-rem');
    this.snapBudgetAfter = document.getElementById('snap-budget-after');
    this.snapGoalsStatus = document.getElementById('snap-goals-status');

    this.btnAnalyzePatterns = document.getElementById('btn-analyze-patterns');
    this.patternTableBody = document.getElementById('pattern-table-body');

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
    this.mobileReportsMonthlyList = document.getElementById('mobile-reports-monthly-list');
    this.btnReportSelectMonth = document.getElementById('btn-report-select-month');
    this.activeChartSeries = 'ALL'; // 'ALL' | 'INCOME' | 'EXPENSE'

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
    this.preferenceToggles = document.querySelectorAll('.toggle-switch[data-pref], .mobile-pref-toggle[data-pref]');
    this.sessionsList = document.getElementById('sessions-list');
    this.modalTwoFactor = document.getElementById('modal-two-factor');
    this.twoFactorSecret = document.getElementById('two-factor-secret');
    this.twoFactorCode = document.getElementById('two-factor-code');
    this.twoFactorPassword = document.getElementById('two-factor-password');
    this.twoFactorSetupFields = document.getElementById('two-factor-setup-fields');
    this.twoFactorPasswordField = document.getElementById('two-factor-password-field');
    this.btnEnableTwoFactor = document.getElementById('btn-enable-two-factor');
    this.btnDisableTwoFactor = document.getElementById('btn-disable-two-factor');
    this.btnCopyTwoFactorSecret = document.getElementById('btn-copy-two-factor-secret');
    this.btnImportCsv = document.getElementById('btn-import-csv');
    this.inputImportCsv = document.getElementById('input-import-csv');

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
    this.modalActiveSessions = document.getElementById('modal-active-sessions');
    this.btnDashCashflowPeriod = document.getElementById('btn-dash-cashflow-period');
    this.dashboardPeriodMode = 'MONTH'; // 'MONTH' | 'DAY'
    this.reportsChartPeriodMonths = 12; // 12 | 6
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

    // Modal: Rincian Periode (Lihat Periode)
    this.modalPeriodDetail = document.getElementById('modal-period-detail');
    this.periodDetailModalTitle = document.getElementById('period-detail-modal-title');
    this.periodDetailIncome = document.getElementById('period-detail-income');
    this.periodDetailExpense = document.getElementById('period-detail-expense');
    this.periodDetailNet = document.getElementById('period-detail-net');
    this.periodDetailTxBody = document.getElementById('period-detail-tx-body');
    this.periodDetailBtnGotoMutasi = document.getElementById('period-detail-btn-goto-mutasi');
    this.periodDetailBtnViewReport = document.getElementById('period-detail-btn-view-report');
    this.modalPeriodActiveYear = null;
    this.modalPeriodActiveMonth = null;

    // Mobile Viewport Elements (<= 768px - Matching Figma 1:1)
    this.mobileNavBtns = document.querySelectorAll('.mobile-nav-btn');
    this.btnMobileNotif = document.getElementById('btn-mobile-notif');
    this.modalMobileNotif = document.getElementById('modal-mobile-notif');
    this.btnTransaksiNotif = document.getElementById('btn-transaksi-notif');
    this.transaksiNotifPopover = document.getElementById('transaksi-notif-popover');
    this.notifBackdrop = document.getElementById('notif-backdrop');
    this.btnCloseNotifPopover = document.getElementById('btn-close-notif-popover');
    this.btnNotifFooterClose = document.getElementById('btn-notif-footer-close');
    this.btnMarkNotifRead = document.getElementById('btn-mark-notif-read');
    this.notifItemsList = document.getElementById('notif-items-list');
    this.notifUnreadBadge = document.getElementById('notif-unread-badge');
    this.transaksiBellDot = document.getElementById('transaksi-bell-dot');
    this.btnNotifGoSettings = document.getElementById('btn-notif-go-settings');
    this.notificationsRead = false;
    try {
      this.notificationsRead = localStorage.getItem('pf_notifications_read') === '1';
    } catch (_) {}
    this.mobileGreetingName = document.getElementById('mobile-greeting-name');
    this.mobileTotalNetWorth = document.getElementById('mobile-total-net-worth');
    this.mobileBtnToggleNetWorth = document.getElementById('mobile-btn-toggle-net-worth');
    this.mobileEyeOpen = document.getElementById('mobile-eye-open');
    this.mobileEyeClosed = document.getElementById('mobile-eye-closed');
    this.mobileAccountsList = document.getElementById('mobile-accounts-list');
    this.mobileBtnSeeAccounts = document.getElementById('mobile-btn-see-accounts');
    this.mobileBtnDashJumpMutasi = document.getElementById('mobile-btn-dash-jump-mutasi');
    this.mobileDashAiInput = document.getElementById('mobile-dash-ai-input');
    this.mobileDashBtnRecord = document.getElementById('mobile-dash-btn-record');
    this.mobileDashBtnParse = document.getElementById('mobile-dash-btn-parse');
    this.mobileKpiIncome = document.getElementById('mobile-kpi-income');
    this.mobileKpiExpense = document.getElementById('mobile-kpi-expense');
    this.mobileKpiSurplus = document.getElementById('mobile-kpi-surplus');
    this.mobileSummaryCardMonth = document.getElementById('mobile-summary-card-month');
    this.mobileDashTxContainer = document.getElementById('mobile-dash-tx-container');
    this.mobileBtnDashJumpLedger = document.getElementById('mobile-btn-dash-jump-ledger');
    this.mobileBtnGotoReports = document.getElementById('mobile-btn-goto-reports');
    this.mobileBtnSettingsGotoReports = document.getElementById('mobile-btn-settings-goto-reports');
    this.btnNotifOpenSettings = document.getElementById('btn-notif-open-settings');

    this.applyBalanceVisibility();
  }

  attachEventListeners() {
    // Authentication
    if (this.loginForm) {
      this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }
    if (this.btnRetrySessionCheck) {
      this.btnRetrySessionCheck.addEventListener('click', async () => {
        this.btnRetrySessionCheck.disabled = true;
        this.btnRetrySessionCheck.textContent = 'Memeriksa sesi…';
        await this.checkSession();
        if (this.btnRetrySessionCheck.isConnected) {
          this.btnRetrySessionCheck.disabled = false;
          this.btnRetrySessionCheck.textContent = 'Coba lagi';
        }
      });
    }
    
    const handleLogoutAction = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      this.handleLogout();
    };

    // One delegated listener handles all logout buttons. Binding each button too
    // creates two concurrent logout requests; a late cookie-deletion response
    // can otherwise erase the cookie from a login that just followed logout.
    document.addEventListener('click', (e) => {
      const logoutBtn = e.target.closest('#btn-logout, #btn-sidebar-logout, #btn-settings-logout, #btn-settings-security-logout');
      if (logoutBtn) {
        e.preventDefault();
        e.stopPropagation();
        this.handleLogout();
        return;
      }

      // Bind the primary AI actions before optional page controls. A missing
      // control elsewhere in a future layout must not silently disable AI.
      const aiParseButton = e.target.closest('#btn-parse');
      if (aiParseButton) {
        e.preventDefault();
        this.handleAIParse();
        return;
      }
      const mobileAiParseButton = e.target.closest('#mobile-dash-btn-parse');
      if (mobileAiParseButton) {
        e.preventDefault();
        this.submitDashboardAI(this.mobileDashAiInput);
        return;
      }
      const dashboardAiParseButton = e.target.closest('#dashboard-ai-process');
      if (dashboardAiParseButton) {
        e.preventDefault();
        this.submitDashboardAI(this.dashboardAiInput);
        return;
      }
      const monthlyBudgetButton = e.target.closest('#btn-set-budget-month-pill, #btn-edit-budget-pagu');
      if (monthlyBudgetButton) {
        e.preventDefault();
        this.openMonthlyBudgetModal();
        return;
      }
      const aiExampleButton = e.target.closest('[data-ai-example][data-ai-target]');
      if (aiExampleButton) {
        e.preventDefault();
        const input = document.getElementById(aiExampleButton.dataset.aiTarget);
        if (input) {
          input.value = aiExampleButton.dataset.aiExample || '';
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
        return;
      }

      // Navigasi cepat ke Pengaturan saat klik badge profil user
      const profileBadge = e.target.closest('.user-profile-badge');
      if (profileBadge && !e.target.closest('#btn-logout')) {
        this.switchTab('tab-settings');
      }
    });

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
        this.startVoiceRecording();
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
        this.dashboardPeriodMode = 'DAY';
        this.btnDashPeriodDay.classList.add('active');
        this.btnDashPeriodMonth.classList.remove('active');
        this.renderSummaryCards();
        this.showAlert('Menampilkan ringkasan keuangan hari ini (real-time).', 'info');
      });
      this.btnDashPeriodMonth.addEventListener('click', () => {
        this.dashboardPeriodMode = 'MONTH';
        this.btnDashPeriodMonth.classList.add('active');
        this.btnDashPeriodDay.classList.remove('active');
        this.renderSummaryCards();
        this.showAlert('Menampilkan ringkasan keuangan bulan ini.', 'info');
      });
    }

    if (this.btnDashCashflowPeriod) {
      this.btnDashCashflowPeriod.addEventListener('click', () => {
        this.switchTab('tab-reports');
        this.showAlert('Membuka laporan analitik arus kas lengkap.', 'info');
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
    if (this.btnRefreshAiAccounts) {
      this.btnRefreshAiAccounts.addEventListener('click', () => this.loadAccounts());
    }
    if (this.btnAddAccountAi) {
      bindOpenModal(this.btnAddAccountAi, this.modalAddAccount);
    }
    if (this.btnToggleAiBalances) {
      this.btnToggleAiBalances.addEventListener('click', () => {
        this.isBalanceHidden = !this.isBalanceHidden;
        try {
          localStorage.setItem('hide_net_worth', this.isBalanceHidden ? 'true' : 'false');
        } catch (_) {}
        this.applyBalanceVisibility();
      });
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
    if (this.ledgerCategorySelect) {
      this.ledgerCategorySelect.addEventListener('change', () => this.applyLedgerFilters());
    }

    // Tab 1 Events (AI Parse & Voice)
    if (this.btnRetryAi) this.btnRetryAi.addEventListener('click', () => {
      if (this.retryMode === 'speech' && this.lastAudioBlob) this.submitSpeechTranscription(this.lastAudioBlob);
      else this.handleAIParse(this.lastAIInput);
    });
    this.btnRecord.addEventListener('click', () => this.toggleRecording());
    this.btnConfirmBatch.addEventListener('click', () => this.handleConfirmBatch());

    this.aiInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        this.handleAIParse();
      }
    });

    if (this.btnCloseAiResponse) {
      this.btnCloseAiResponse.addEventListener('click', () => {
        if (this.aiResponseBox) this.aiResponseBox.style.display = 'none';
      });
    }
    if (this.mobileBtnCloseAiResponse) {
      this.mobileBtnCloseAiResponse.addEventListener('click', () => {
        if (this.mobileAiResponseBox) this.mobileAiResponseBox.style.display = 'none';
      });
    }

    // Modal Triggers
    const bindOpenModal = (btn, modal, onOpen = null) => {
      if (btn) {
        btn.addEventListener('click', () => {
          if (onOpen) onOpen();
          this.openModal(modal);
        });
      }
    };

    bindOpenModal(this.btnAddCategoryBudget, this.modalSetCatBudget, () => this.populateCatSelect());
    bindOpenModal(this.btnAddSavingsGoal, this.modalCreateGoal, () => this.populateGoalAccSelect());
    bindOpenModal(this.btnOpenCreateGoalMini, this.modalCreateGoal, () => this.populateGoalAccSelect());
    bindOpenModal(this.btnOpenAbout, this.modalAbout);
    bindOpenModal(this.btnOpenHelp, this.modalAbout);

    // Direct event handlers for Planning page actions (robustness guarantee)
    if (this.btnEditBudgetPagu) {
      this.btnEditBudgetPagu.addEventListener('click', (e) => {
        e.preventDefault();
        this.openMonthlyBudgetModal();
      });
    }

    if (this.btnSetBudgetMonthPill) {
      this.btnSetBudgetMonthPill.addEventListener('click', (e) => {
        e.preventDefault();
        this.openMonthlyBudgetModal();
      });
    }

    if (this.btnAddCategoryBudget) {
      this.btnAddCategoryBudget.addEventListener('click', async () => {
        await this.populateCatSelect();
        this.openModal(this.modalSetCatBudget);
      });
    }

    if (this.btnAddSavingsGoal) {
      this.btnAddSavingsGoal.addEventListener('click', async () => {
        await this.populateGoalAccSelect();
        this.openModal(this.modalCreateGoal);
      });
    }

    // Explicit fallback click handler for + Tambah on Tujuan Tabungan mini card
    if (this.btnOpenCreateGoalMini) {
      this.btnOpenCreateGoalMini.addEventListener('click', async () => {
        await this.populateGoalAccSelect();
        this.openModal(this.modalCreateGoal);
      });
    }

    if (this.btnPlanContribution) {
      this.btnPlanContribution.addEventListener('click', async () => {
        if (this.savingsGoals && this.savingsGoals.length > 0) {
          const firstGoal = this.savingsGoals[0];
          this.openCreateTxModal();
          this.setCreateTxType('TRANSFER');
          if (this.selectCreateTxDestAcc && firstGoal.dedicated_account_id) {
            this.selectCreateTxDestAcc.value = firstGoal.dedicated_account_id;
          }
          if (this.inputCreateTxDesc) {
            this.inputCreateTxDesc.value = `Setoran Tabungan: ${firstGoal.name}`;
          }
          this.showAlert(`Menyiapkan mutasi setor dana ke target '${firstGoal.name}'`, 'info');
        } else {
          await this.populateGoalAccSelect();
          this.openModal(this.modalCreateGoal);
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
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModals();
      }
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
    if (this.btnMobileOpenCreateTx) {
      this.btnMobileOpenCreateTx.addEventListener('click', () => this.openCreateTxModal());
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
    const formEditDraft = document.getElementById('form-edit-draft');
    if (formEditDraft) {
      formEditDraft.addEventListener('submit', (e) => this.handleSaveEditDraft(e));
    }
    const editDraftType = document.getElementById('edit-draft-type');
    if (editDraftType) {
      editDraftType.addEventListener('change', () => this.updateEditDraftFields());
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
        if ((e.key === 'Enter' && !e.shiftKey) || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
          e.preventDefault();
          this.handleConsultCopilot();
        }
      });
    }
    if (this.copilotChatFeed) {
      this.copilotChatFeed.addEventListener('click', (event) => {
        const button = event.target.closest('[data-copilot-prompt]');
        if (!button) return;
        if (!this.copilotInput) return;
        this.copilotInput.value = button.getAttribute('data-copilot-prompt') || '';
        this.copilotInput.focus();
      });
    }
    if (this.copilotNewChatButton) {
      this.copilotNewChatButton.addEventListener('click', () => this.resetCopilotConversation());
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
    const mobileBtnReportViewAll = document.getElementById('mobile-btn-report-view-all');
    if (mobileBtnReportViewAll) {
      mobileBtnReportViewAll.addEventListener('click', () => this.openMonthPicker('reports'));
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
      btnViewAllBudgetHistory.addEventListener('click', () => {
        this.openMonthPicker('planning');
        this.showAlert('Pilih periode bulan untuk melihat rincian anggaran historis.', 'info');
      });
    }

    const btnChartPeriod = document.getElementById('btn-chart-period');
    if (btnChartPeriod) {
      btnChartPeriod.addEventListener('click', () => {
        this.reportsChartPeriodMonths = (this.reportsChartPeriodMonths === 6) ? 12 : 6;
        btnChartPeriod.textContent = `${this.reportsChartPeriodMonths} bulan`;
        if (this.reportData) {
          this.renderReports(this.reportData);
        }
        this.showAlert(`Rentang grafik diubah: ${this.reportsChartPeriodMonths} Bulan`, 'info');
      });
    }

    // Interactive Series Filter (Semua, Pemasukan, Pengeluaran)
    document.querySelectorAll('.chart-series-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const series = btn.getAttribute('data-series');
        this.setChartSeriesFilter(series);
      });
    });

    document.querySelectorAll('.btn-view-period').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const period = e.currentTarget.getAttribute('data-period');
        if (period && period.includes('-')) {
          const [yStr, mStr] = period.split('-');
          this.openPeriodDetail(parseInt(yStr, 10), parseInt(mStr, 10));
        } else {
          const y = parseInt(e.currentTarget.getAttribute('data-year'), 10) || new Date().getFullYear();
          const m = parseInt(e.currentTarget.getAttribute('data-month'), 10) || (new Date().getMonth() + 1);
          this.openPeriodDetail(y, m);
        }
      });
    });

    if (this.periodDetailBtnGotoMutasi) {
      this.periodDetailBtnGotoMutasi.addEventListener('click', () => {
        const yr = this.modalPeriodActiveYear;
        const mo = this.modalPeriodActiveMonth;
        this.closeModals();
        if (yr && mo && this.ledgerMonthSelect) {
          const periodKey = `${yr}-${String(mo).padStart(2, '0')}`;
          this.ledgerMonthSelect.value = periodKey;
          this.applyLedgerFilters();
        }
        this.switchTab('tab-mutasi');
      });
    }

    if (this.periodDetailBtnViewReport) {
      this.periodDetailBtnViewReport.addEventListener('click', () => {
        const yr = this.modalPeriodActiveYear;
        const mo = this.modalPeriodActiveMonth;
        this.closeModals();
        this.loadReportsData(yr, mo);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.showAlert(`Menampilkan laporan analitik periode ${yr}-${mo}`, 'success');
      });
    }

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
      this.btnToggle2fa.addEventListener('click', () => this.openTwoFactorModal());
    }
    if (this.btnEnableTwoFactor) this.btnEnableTwoFactor.addEventListener('click', () => this.enableTwoFactor());
    if (this.btnDisableTwoFactor) this.btnDisableTwoFactor.addEventListener('click', () => this.disableTwoFactor());
    if (this.btnCopyTwoFactorSecret) this.btnCopyTwoFactorSecret.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(this.twoFactorSecret?.value || '');
        this.showAlert('Secret authenticator disalin.', 'success');
      } catch (_) {
        this.twoFactorSecret?.select();
        this.showAlert('Pilih lalu salin secret secara manual.', 'info');
      }
    });

    if (this.btnViewSessions) {
      this.btnViewSessions.addEventListener('click', () => {
        this.openModal(this.modalActiveSessions);
        this.loadSessions();
      });
    }

    // Toggle Switches (Screen 06 Preferences)
    this.preferenceToggles.forEach((toggle) => {
      toggle.addEventListener('click', async () => {
        const key = toggle.getAttribute('data-pref');
        const previous = toggle.classList.contains('active');
        toggle.disabled = true;
        toggle.classList.toggle('active', !previous);
        toggle.setAttribute('aria-pressed', String(!previous));
        try {
          const result = await api.auth.updatePreferences({ [key]: !previous });
          this.applyPreferences(result.data || {});
          this.showAlert('Preferensi berhasil disimpan.', 'success');
        } catch (err) {
          toggle.classList.toggle('active', previous);
          toggle.setAttribute('aria-pressed', String(previous));
          this.showAlert(`Preferensi belum tersimpan: ${err.message}`, 'error');
        } finally {
          toggle.disabled = false;
        }
      });
    });

    if (this.btnImportCsv && this.inputImportCsv) {
      this.btnImportCsv.addEventListener('click', () => this.inputImportCsv.click());
      this.inputImportCsv.addEventListener('change', () => this.handleCsvImport());
      document.querySelectorAll('[data-open-csv-import]').forEach((button) => {
        button.addEventListener('click', () => this.inputImportCsv.click());
      });
    }

    // Form Edit Profile
    if (this.formEditProfile) {
      this.formEditProfile.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = this.inputProfileFullname.value.trim();
        if (!newName) return;
        try {
          const response = await api.auth.updateProfile(newName);
          this.currentUser = response.data || this.currentUser;
          const profileName = this.currentUser?.full_name || newName;
          if (this.settingsProfileName) this.settingsProfileName.textContent = profileName;
          if (this.usernameDisplay) this.usernameDisplay.textContent = profileName.split(' ')[0];
          if (this.desktopGreetingName) this.desktopGreetingName.textContent = profileName.split(' ')[0];
          if (this.mobileGreetingName) this.mobileGreetingName.textContent = profileName.split(' ')[0];
          if (this.settingsAvatarInitial) this.settingsAvatarInitial.textContent = profileName[0].toUpperCase();
          if (this.userAvatarInitial) this.userAvatarInitial.textContent = profileName[0].toUpperCase();
          this.closeModals();
          this.showAlert('Nama profil berhasil diperbarui.', 'success');
        } catch (err) {
          this.showAlert(`Nama profil belum tersimpan: ${err.message}`, 'error');
        }
      });
    }

    // Form Change Password
    if (this.formChangePassword) {
      this.formChangePassword.addEventListener('submit', async (e) => {
        e.preventDefault();
        const oldP = this.inputOldPassword?.value || '';
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

        try {
          await api.auth.changePassword(oldP, newP);
          this.closeModals();
          this.formChangePassword.reset();
          this.showAlert('Kata sandi diperbarui. Sesi di perangkat lain telah dicabut.', 'success');
        } catch (err) {
          this.showAlert(`Kata sandi belum berubah: ${err.message}`, 'error');
        }
      });
    }

    // Tab 7 Events (Screen 07: Buat Akun & Reset Kata Sandi & Login Desktop)
    if (this.btnToggleLoginPassword && this.loginPassword) {
      this.btnToggleLoginPassword.addEventListener('click', (e) => {
        e.preventDefault();
        const isPassword = this.loginPassword.type === 'password';
        this.loginPassword.type = isPassword ? 'text' : 'password';
        this.btnToggleLoginPassword.innerHTML = isPassword ? Icons.eyeOff : Icons.eye;
        this.btnToggleLoginPassword.setAttribute('aria-pressed', String(isPassword));
        this.btnToggleLoginPassword.setAttribute('aria-label', isPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
        this.btnToggleLoginPassword.title = isPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi';
      });
    }
    if (this.authFeedbackClose) {
      this.authFeedbackClose.addEventListener('click', () => this.hideAuthFeedback());
    }

    if (this.btnGoogleLogin) {
      this.btnGoogleLogin.addEventListener('click', async () => {
        try {
          if (window.supabase && window.supabase.auth && typeof window.supabase.auth.signInWithOAuth === 'function') {
            const { error } = await window.supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: window.location.origin + window.location.pathname
              }
            });
            if (error) throw error;
          } else {
            this.showAlert('Login Google belum tersedia. Silakan masuk dengan email dan kata sandi.', 'warning');
          }
        } catch (err) {
          this.showAlert(`Google OAuth: ${err.message || err}`, 'error');
        }
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
        this.showAuthView('reset');
        setTimeout(() => document.getElementById('mobile-reset-email')?.focus(), 0);
      });
    }
    if (this.linkOverlayRegister) {
      this.linkOverlayRegister.addEventListener('click', (e) => {
        e.preventDefault();
        this.showAuthView('signup');
        setTimeout(() => document.getElementById('mobile-signup-name')?.focus(), 0);
      });
    }
    if (this.btnSignupToLogin) {
      this.btnSignupToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        this.showAuthView('login');
      });
    }
    if (this.btnResetToLoginLink) {
      this.btnResetToLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.showAuthView('login');
      });
    }
    if (this.formMobileSignup) {
      this.formMobileSignup.addEventListener('submit', (e) => {
        e.preventDefault();
        const pwd = document.getElementById('mobile-signup-password')?.value || '';
        const confirm = document.getElementById('mobile-signup-confirm')?.value;
        if (pwd !== confirm) {
          this.showAlert('Konfirmasi kata sandi tidak cocok.', 'error');
          return;
        }
        if (pwd.length < 8) {
          this.showAlert('Kata sandi minimal 8 karakter.', 'error');
          return;
        }
        this.showAlert('Pendaftaran mandiri belum diaktifkan. Hubungi administrator untuk membuat akun.', 'warning');
      });
    }
    if (this.formMobileReset) {
      this.formMobileReset.addEventListener('submit', (e) => {
        e.preventDefault();
        this.showAlert('Pemulihan kata sandi belum terhubung ke layanan email. Hubungi administrator untuk mengatur ulang akses.', 'warning');
      });
    }

    if (this.formTabSignup) {
      this.formTabSignup.addEventListener('submit', (e) => {
        e.preventDefault();
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

        this.showAlert('Pendaftaran mandiri belum diaktifkan. Hubungi administrator untuk membuat akun.', 'warning');
      });
    }

    if (this.formTabReset) {
      this.formTabReset.addEventListener('submit', (e) => {
        e.preventDefault();
        this.showAlert('Pemulihan kata sandi belum terhubung ke layanan email. Hubungi administrator untuk mengatur ulang akses.', 'warning');
      });
    }

    // ==========================================
    // MOBILE INTERACTIONS (<= 768px Figma 1:1)
    // ==========================================
    if (this.mobileNavBtns) {
      this.mobileNavBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetTab = btn.getAttribute('data-tab');
          if (targetTab) {
            this.switchTab(targetTab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
      });
    }

    // Unified Notification Center Triggers (Desktop Bell & Mobile Bell)
    if (this.btnTransaksiNotif) {
      this.btnTransaksiNotif.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleNotificationCenter();
      });
    }
    if (this.btnMobileNotif) {
      this.btnMobileNotif.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleNotificationCenter();
      });
    }
    if (this.btnCloseNotifPopover) {
      this.btnCloseNotifPopover.addEventListener('click', () => this.closeNotificationCenter());
    }
    if (this.btnNotifFooterClose) {
      this.btnNotifFooterClose.addEventListener('click', () => this.closeNotificationCenter());
    }
    if (this.notifBackdrop) {
      this.notifBackdrop.addEventListener('click', () => this.closeNotificationCenter());
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.transaksiNotifPopover && this.transaksiNotifPopover.classList.contains('active')) {
        this.closeNotificationCenter();
      }
    });
    if (this.btnMarkNotifRead) {
      this.btnMarkNotifRead.addEventListener('click', () => this.markAllNotificationsRead());
    }
    if (this.btnNotifGoSettings) {
      this.btnNotifGoSettings.addEventListener('click', () => {
        this.closeNotificationCenter();
        this.switchTab('tab-settings');
      });
    }

    if (this.btnNotifOpenSettings) {
      this.btnNotifOpenSettings.addEventListener('click', () => {
        if (this.modalMobileNotif) {
          this.modalMobileNotif.style.display = 'none';
        }
        this.switchTab('tab-settings');
      });
    }

    if (this.mobileBtnToggleNetWorth) {
      this.mobileBtnToggleNetWorth.addEventListener('click', () => {
        this.toggleBalanceVisibility();
      });
    }

    if (this.mobileBtnSeeAccounts) {
      this.mobileBtnSeeAccounts.addEventListener('click', () => {
        this.switchTab('tab-settings');
      });
    }

    if (this.mobileBtnDashJumpMutasi) {
      this.mobileBtnDashJumpMutasi.addEventListener('click', () => {
        this.switchTab('tab-mutasi');
      });
    }

    if (this.mobileBtnDashJumpLedger) {
      this.mobileBtnDashJumpLedger.addEventListener('click', () => {
        this.switchTab('tab-mutasi');
      });
    }

    if (this.mobileDashBtnRecord) {
      this.mobileDashBtnRecord.addEventListener('click', () => {
        this.switchTab('tab-mutasi');
        if (!this.recorder.isRecording) {
          this.startVoiceRecording();
        }
      });
    }

    const bindAiShortcut = (input) => {
      input?.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          this.submitDashboardAI(input);
        }
      });
    };
    bindAiShortcut(this.dashboardAiInput);
    bindAiShortcut(this.mobileDashAiInput);

    if (this.mobileBtnGotoReports) {
      this.mobileBtnGotoReports.addEventListener('click', () => {
        this.switchTab('tab-reports');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    if (this.mobileBtnSettingsGotoReports) {
      this.mobileBtnSettingsGotoReports.addEventListener('click', () => {
        this.switchTab('tab-reports');
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
      'tab-dashboard': null, // Dihapus sesuai permintaan pengguna agar tidak duplikasi dengan judul Dashboard di bawahnya
      'tab-mutasi': { title: 'Mutasi & Suara AI', intro: 'Catat transaksi lewat teks atau suara, periksa draft, lalu konfirmasi ke buku besar.' },
      'tab-planning': { title: 'Anggaran & Tabungan', intro: 'Atur batas pengeluaran bulanan dan pantau progres tujuan tabungan.' },
      'tab-copilot': { title: 'Penasihat Finansial AI', intro: 'Ngobrol soal rencana belanja, anggaran, dan tabungan dengan konteks keuangan terbarumu.' },
      'tab-reports': { title: 'Laporan Keuangan', intro: (window.innerWidth <= 768 ? 'Pantau arus kas dari bulan ke bulan.' : 'Tinjau arus kas, komposisi pengeluaran, dan perubahan dari bulan ke bulan.') },
      'tab-settings': { title: (window.innerWidth <= 768 ? 'Pengaturan' : 'Pengaturan & Profil'), intro: (window.innerWidth <= 768 ? 'Kelola akun dan preferensi aplikasi.' : 'Kelola profil, rekening, keamanan, dan preferensi aplikasi.') },
      'tab-auth': { title: 'Akun pengguna', intro: 'Rancangan layar daftar akun dan reset kata sandi.' }
    };

    if (this.pageTitlesContainer) {
      if (tabId === 'tab-dashboard' || !titles[tabId]) {
        this.pageTitlesContainer.style.display = 'none';
        if (this.pageTitle) this.pageTitle.textContent = '';
        if (this.pageIntro) this.pageIntro.textContent = '';
      } else {
        this.pageTitlesContainer.style.display = 'flex';
        if (this.pageTitle) this.pageTitle.textContent = titles[tabId].title;
        if (this.pageIntro) this.pageIntro.textContent = titles[tabId].intro;
      }
    }

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

    // Synchronize Mobile Bottom Nav
    if (this.mobileNavBtns) {
      this.mobileNavBtns.forEach((b) => {
        if (b.getAttribute('data-tab') === tabId) b.classList.add('active');
        else b.classList.remove('active');
      });
    }

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
      this.loadSettingsData();}
  }

  openModal(modal) {
    if (modal) modal.style.display = 'flex';
  }

  openMonthlyBudgetModal() {
    const currentLimit = Number(this.budgetData?.total_limit) || 0;
    if (this.inputBudgetLimit) {
      this.inputBudgetLimit.value = currentLimit > 0 ? String(currentLimit) : '';
    }
    this.openModal(this.modalSetBudget);
    this.inputBudgetLimit?.focus();
  }

  closeModals() {
    document.querySelectorAll('.modal-overlay').forEach((m) => {
      if (m.id !== 'auth-overlay') m.style.display = 'none';
    });
  }

  showAlert(message, type = 'success') {
    if (document.body.classList.contains('auth-pending') || document.body.classList.contains('user-logged-out')) {
      this.showAuthFeedback(message, type);
      return;
    }
    this.alertBox.className = `alert-box alert-${type}`;
    this.alertBox.innerHTML = `<span>${message}</span>`;
    this.alertBox.style.display = 'flex';
    setTimeout(() => {
      this.alertBox.style.display = 'none';
    }, 5000);
  }

  showAuthFeedback(message, type = 'warning') {
    if (!this.authFeedback) return;
    if (this.authFeedbackMessage) this.authFeedbackMessage.textContent = message;
    this.authFeedback.className = `auth-feedback is-${type}`;
    this.authFeedback.hidden = false;
    clearTimeout(this.authFeedbackTimer);
    this.authFeedbackTimer = setTimeout(() => {
      this.hideAuthFeedback();
    }, 4500);
  }

  hideAuthFeedback() {
    clearTimeout(this.authFeedbackTimer);
    if (this.authFeedback) this.authFeedback.hidden = true;
  }

  formatIDR(num) {
    const val = parseFloat(num) || 0;
    const hasDecimals = (val % 1 !== 0);
    return new Intl.NumberFormat('id-ID', {
      style: this.userPreferences?.['currency-format'] === false ? 'decimal' : 'currency',
      ...(this.userPreferences?.['currency-format'] === false ? {} : { currency: 'IDR' }),
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(val);
  }

  formatCompactIDR(num, includeRp = true) {
    const val = parseFloat(num) || 0;
    includeRp = includeRp && this.userPreferences?.['currency-format'] !== false;
    const isNegative = val < 0;
    const abs = Math.abs(val);
    let str = '';
    if (abs >= 1000000000) {
      const v = (abs / 1000000000).toLocaleString('id-ID', { maximumFractionDigits: 2 });
      str = `${v} M`;
    } else if (abs >= 1000000) {
      const v = (abs / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 2 });
      str = `${v} jt`;
    } else if (abs >= 1000) {
      const v = (abs / 1000).toLocaleString('id-ID', { maximumFractionDigits: 0 });
      str = `${v} rb`;
    } else {
      str = abs.toLocaleString('id-ID');
    }
    const prefix = includeRp ? 'Rp ' : '';
    return isNegative ? `-${prefix}${str}` : `${prefix}${str}`;
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
    const checkRun = ++this.sessionCheckRun;
    // Jika ada penanda logout aktif di storage, jangan auto-login
    let explicitlyLoggedOut = false;
    try {
      explicitlyLoggedOut = sessionStorage.getItem('pf_logged_out') === '1' || localStorage.getItem('pf_logged_out') === '1';
    } catch (_) {}
    if (explicitlyLoggedOut) {
      this.showLogin();
      return;
    }

    // Fail closed while the session is being checked so private screens never flash on refresh.
    document.body.classList.add('auth-pending');
    document.body.classList.remove('user-logged-out');
    if (this.appShell) this.appShell.style.setProperty('display', 'none', 'important');
    if (this.authOverlay) this.authOverlay.style.setProperty('display', 'flex', 'important');
    this.showAuthView('login');
    if (this.loginForm) this.loginForm.style.removeProperty('display');
    // Keep the login view uncluttered while validation runs in the background.
    if (this.sessionCheckPanel) this.sessionCheckPanel.style.display = 'none';
    try {
      const res = await api.auth.getMe({ timeout: 8000 });
      if (checkRun !== this.sessionCheckRun) return;
      if (res && res.data && res.data.id) {
        this.currentUser = res.data;
        this.showDashboard();
      } else {
        this.showLogin();
      }
    } catch (err) {
      if (checkRun !== this.sessionCheckRun) return;
      if (err.status === 401 || err.status === 403) {
        // Only discard legacy client tokens when the server explicitly rejects the session.
        try {
          localStorage.removeItem('pf_token');
          localStorage.removeItem('pf_csrf');
          sessionStorage.removeItem('pf_csrf');
        } catch (_) {}
        this.showLogin();
        return;
      }
      this.showSessionCheckError();
    }
  }

  showSessionCheckError() {
    this.showAuthView('login');
    document.body.classList.remove('auth-pending');
    document.body.classList.add('user-logged-out');
    if (this.appShell) this.appShell.style.setProperty('display', 'none', 'important');
    if (this.authOverlay) {
      this.authOverlay.style.setProperty('display', 'flex', 'important');
      this.authOverlay.style.setProperty('visibility', 'visible', 'important');
      this.authOverlay.style.opacity = '1';
      this.authOverlay.style.setProperty('z-index', '999999', 'important');
    }
    if (this.loginForm) this.loginForm.style.removeProperty('display');
    if (this.loginError) this.loginError.style.display = 'none';
    if (this.sessionCheckMessage) {
      this.sessionCheckMessage.textContent = 'Server belum dapat memverifikasi sesi. Coba lagi; status login dan data akun tidak dihapus.';
    }
    if (this.sessionCheckPanel) this.sessionCheckPanel.style.display = 'block';
    if (this.btnRetrySessionCheck) this.btnRetrySessionCheck.style.removeProperty('display');
  }

  showAuthView(viewName) {
    this.hideAuthFeedback();
    if (this.authViewLogin) this.authViewLogin.style.display = (viewName === 'login') ? 'block' : 'none';
    if (this.authViewSignup) this.authViewSignup.style.display = (viewName === 'signup') ? 'block' : 'none';
    if (this.authViewReset) this.authViewReset.style.display = (viewName === 'reset') ? 'block' : 'none';
  }

  showLogin() {
    this.sessionCheckRun += 1;
    this.showAuthView('login');
    document.body.classList.remove('auth-pending');
    if (this.loginForm) this.loginForm.style.removeProperty('display');
    if (this.sessionCheckPanel) this.sessionCheckPanel.style.display = 'none';
    document.body.classList.add('user-logged-out');
    if (this.appShell) {
      this.appShell.style.setProperty('display', 'none', 'important');
    }
    if (this.authOverlay) {
      this.authOverlay.style.setProperty('display', 'flex', 'important');
      this.authOverlay.style.setProperty('visibility', 'visible', 'important');
      this.authOverlay.style.opacity = '1';
      this.authOverlay.style.setProperty('z-index', '999999', 'important');
    }
    if (this.loginUsername) {
      this.loginUsername.value = '';
      setTimeout(() => {
        try { this.loginUsername.focus(); } catch (_) {}
      }, 50);
    }
    if (this.loginPassword) {
      this.loginPassword.value = '';
    }
    if (this.loginError) {
      this.loginError.style.display = 'none';
      this.loginError.textContent = '';
    }
  }

  showDashboard() {
    // Bersihkan penanda logout saat dashboard berhasil ditampilkan
    this.sessionCheckRun += 1;
    document.body.classList.remove('auth-pending');
    document.body.classList.remove('user-logged-out');
    try {
      sessionStorage.removeItem('pf_logged_out');
      localStorage.removeItem('pf_logged_out');
    } catch (_) {}
    if (this.loginForm) this.loginForm.style.removeProperty('display');
    if (this.sessionCheckPanel) this.sessionCheckPanel.style.display = 'none';

    if (this.appShell) {
      this.appShell.style.removeProperty('display');
    }
    if (this.authOverlay) {
      this.authOverlay.style.setProperty('display', 'none', 'important');
    }
    let storedDisplayName = '';
    try { storedDisplayName = localStorage.getItem('user_fullname') || ''; } catch (_) {}
    const displayName = (this.currentUser && (this.currentUser.full_name || this.currentUser.username))
      || storedDisplayName
      || 'Pengguna';
    if (this.usernameDisplay) this.usernameDisplay.textContent = displayName.split(' ')[0];
    if (this.desktopGreetingName) this.desktopGreetingName.textContent = displayName.split(' ')[0];
    if (this.mobileGreetingName) this.mobileGreetingName.textContent = displayName.split(' ')[0];
    if (this.userAvatarInitial) this.userAvatarInitial.textContent = displayName.charAt(0).toUpperCase();

    // Default ke Dashboard sesuai permintaan pengguna
    this.switchTab('tab-dashboard');

    this.loadInitialData();
  }

  async handleLogin(e) {
    e.preventDefault();
    // Ignore a delayed startup session check once the user begins a fresh login.
    this.sessionCheckRun += 1;
    if (this.sessionCheckPanel) this.sessionCheckPanel.style.display = 'none';
    this.loginError.style.display = 'none';
    const user = this.loginUsername.value.trim();
    const pass = this.loginPassword.value;

    if (!user || !pass) return;

    try {
      const totpCode = this.loginTotpCode?.value.trim() || null;
      const res = await api.auth.login(user, pass, totpCode);
      const userProfile = res?.user || (res?.data && res.data.id ? res.data : null);

      // Verify the session if possible, but fallback gracefully to the login response profile
      let verifiedProfile = userProfile;
      try {
        const verified = await api.auth.getMe();
        if (verified?.data?.id) {
          verifiedProfile = verified.data;
        }
      } catch (verifyError) {
        console.warn('Session secondary check skipped, using login response profile:', verifyError);
        if ((verifyError.status === 401 || verifyError.status === 403) && !res?.token && !userProfile) {
          this.loginPassword.value = '';
          this.showLogin();
          this.loginError.textContent = 'Login diterima, tetapi server menolak sesi. Coba masuk sekali lagi.';
          this.loginError.style.display = 'block';
          return;
        }
      }

      sessionStorage.removeItem('pf_logged_out');
      localStorage.removeItem('pf_logged_out');
      this.currentUser = verifiedProfile || userProfile || { username: user };
      this.loginPassword.value = '';
      if (this.loginTotpCode) this.loginTotpCode.value = '';
      if (this.loginTotpGroup) this.loginTotpGroup.style.display = 'none';
      this.showDashboard();
    } catch (err) {
      const code = err.data?.detail?.code;
      if (code === 'TOTP_REQUIRED' || code === 'TOTP_INVALID') {
        if (this.loginTotpGroup) this.loginTotpGroup.style.display = 'block';
        if (this.loginTotpCode) {
          if (code === 'TOTP_INVALID') this.loginTotpCode.value = '';
          this.loginTotpCode.focus();
        }
      }
      this.loginError.textContent = err.message || 'Username atau password salah.';
      this.loginError.style.display = 'block';
    }
  }

  async handleLogout() {
    if (this.logoutInProgress) return;
    this.logoutInProgress = true;

    // Prevent an in-flight logout response from clearing a newly issued login cookie.
    sessionStorage.setItem('pf_logged_out', '1');
    localStorage.setItem('pf_logged_out', '1');

    const logoutButtons = [this.btnLogout, this.btnSidebarLogout, this.btnSettingsLogout, this.btnSettingsSecurityLogout].filter(Boolean);
    logoutButtons.forEach((button) => { button.disabled = true; });
    let logoutError = null;
    try {
      await api.auth.logout();
    } catch (err) {
      logoutError = err;
      console.warn('Logout notice:', err);
    }

    // Clear the UI only after the server has finished its cookie/session response.
    this.showLogin();

    // Clear all user state from the client.
    this.currentUser = null;
    if (this.usernameDisplay) this.usernameDisplay.textContent = '-';
    if (this.desktopGreetingName) this.desktopGreetingName.textContent = 'Pengguna';
    if (this.userAvatarInitial) this.userAvatarInitial.textContent = '?';
    if (this.settingsAvatarInitial) this.settingsAvatarInitial.textContent = '?';
    if (this.settingsProfileName) this.settingsProfileName.textContent = '-';
    if (this.settingsProfileEmail) this.settingsProfileEmail.textContent = '-';

    // Bersihkan seluruh token sesi dan storage profil klien
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('pf_csrf');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('user_fullname');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_2fa_enabled');
    }

    this.accounts = [];
    this.transactions = [];
    this.filteredTransactions = null;
    this.budgetData = null;
    this.savingsGoals = [];
    this.scenarios = [];
    if (this.accountsContainer) this.accountsContainer.innerHTML = '';
    if (this.txTableBody) this.txTableBody.innerHTML = '';
    this.closeModals();

    // Bersihkan cookie non-HttpOnly di browser jika ada
    try {
      document.cookie = 'pf_csrf=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'pf_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'pf_csrf=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/finance;';
      document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/finance;';
      document.cookie = 'pf_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/finance;';
    } catch (_) {}

    if (logoutError && this.loginError) {
      this.loginError.textContent = 'Server belum mengonfirmasi logout. Coba muat ulang halaman sebelum masuk kembali.';
      this.loginError.style.display = 'block';
    }
    logoutButtons.forEach((button) => { button.disabled = false; });
    this.logoutInProgress = false;
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
      this.populateLedgerCategoryFilter();
    } catch (err) {
      console.warn('Gagal memuat kategori:', err);
    }
  }

  populateLedgerCategoryFilter() {
    if (!this.ledgerCategorySelect) return;
    const currentVal = this.ledgerCategorySelect.value || 'ALL';
    this.ledgerCategorySelect.innerHTML = '<option value="ALL">Semua kategori</option>' +
      (this.categories || []).map((c) => `<option value="${c.name}">${c.name}</option>`).join('');
    this.ledgerCategorySelect.value = currentVal;
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
    const catFilter = this.ledgerCategorySelect ? this.ledgerCategorySelect.value : 'ALL';

    this.filteredTransactions = this.transactions.filter((tx) => {
      const descMatch = (tx.description || '').toLowerCase().includes(q);
      const catMatch = (tx.category_name || '').toLowerCase().includes(q);
      const accMatch = (tx.source_account_name || '').toLowerCase().includes(q) || (tx.destination_account_name || '').toLowerCase().includes(q);
      const textMatches = !q || descMatch || catMatch || accMatch;

      const typeMatches = typeFilter === 'ALL' || tx.type === typeFilter;
      const catMatches = catFilter === 'ALL' || (tx.category_name || '') === catFilter;

      let monthMatches = true;
      if (monthFilter && monthFilter !== 'ALL') {
        monthMatches = Boolean(tx.transaction_date && tx.transaction_date.startsWith(monthFilter));
      }

      return textMatches && typeMatches && monthMatches && catMatches;
    });

    this.renderHistory();
  }

  // Calculate Realized Summary (Day or Month) from Transactions in real time
  calculateMonthlySummary() {
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    const curKey = `${curY}-${String(curM).padStart(2, '0')}`;
    const todayKey = `${curY}-${String(curM).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let income = 0;
    let expense = 0;

    this.transactions.forEach((tx) => {
      if (tx.is_reversal) return;
      if (this.dashboardPeriodMode === 'DAY') {
        if (!tx.transaction_date || !tx.transaction_date.startsWith(todayKey)) return;
      } else {
        if (!tx.transaction_date || !tx.transaction_date.startsWith(curKey)) return;
      }
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

    // Synchronize Mobile Dashboard 3-KPI Grid (Figma Screen 02)
    if (this.mobileKpiIncome) this.mobileKpiIncome.textContent = this.formatCompactIDR(income);
    if (this.mobileKpiExpense) this.mobileKpiExpense.textContent = this.formatCompactIDR(expense);
    if (this.mobileKpiSurplus) {
      this.mobileKpiSurplus.textContent = this.formatCompactIDR(surplus);
      this.mobileKpiSurplus.style.color = surplus < 0 ? 'var(--accent-rose)' : 'var(--text-primary)';
    }
    if (this.mobileSummaryCardMonth) {
      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      this.mobileSummaryCardMonth.textContent = `${monthNames[now.getMonth()]} ${curY}`;
    }
  }

  renderSummaryCards() {
    this.calculateMonthlySummary();
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

    // Render Grid Kartu Uang di Bank pada Tab Mutasi AI
    if (this.aiAccountsGrid) {
      this.aiAccountsGrid.innerHTML = '';
      if (this.accounts.length === 0) {
        this.aiAccountsGrid.innerHTML = `
          <div style="color: var(--text-muted); font-size: 11px; padding: 10px 0; grid-column: 1 / -1;">Belum ada rekening aktif. Silakan klik <b>+ Tambah Akun</b>.</div>
        `;
      } else {
        this.accounts.forEach((acc) => {
          const bal = parseFloat(acc.current_balance) || 0;
          const nameLower = (acc.name || '').toLowerCase();
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
          const aiCard = document.createElement('div');
          aiCard.className = 'ai-account-card';
          aiCard.innerHTML = `
            <div class="ai-acc-card-top">
              <div class="ai-acc-brand-group">
                <div class="account-monogram ${monogramClass}">${monogramText}</div>
                <span class="ai-acc-name">${acc.name}</span>
              </div>
              <span class="ai-acc-type-pill">${acc.type}</span>
            </div>
            <div class="ai-acc-card-bottom">
              <span class="ai-acc-balance-sub">Saldo Tersedia</span>
              <div class="acc-balance-num ai-acc-balance-val ${isNegative ? 'negative' : ''} ${this.isBalanceHidden ? 'is-hidden-mask' : ''}" 
                   data-real-balance="${this.formatIDR(bal)}">
                ${this.isBalanceHidden ? 'Rp ••••••••' : this.formatIDR(bal)}
              </div>
            </div>
          `;
          this.aiAccountsGrid.appendChild(aiCard);
        });
      }
    }

    if (this.aiTotalLiquidBalance) {
      this.aiTotalLiquidBalance.setAttribute('data-real-balance', this.formatIDR(totalBal));
      this.aiTotalLiquidBalance.textContent = this.isBalanceHidden ? 'Rp ••••••••' : this.formatIDR(totalBal);
      if (this.isBalanceHidden) {
        this.aiTotalLiquidBalance.classList.add('is-hidden-mask');
      } else {
        this.aiTotalLiquidBalance.classList.remove('is-hidden-mask');
      }
    }

    this.currentNetWorthValue = totalBal;
    this.renderMobileAccounts();
    this.applyBalanceVisibility();
  }

  renderMobileAccounts() {
    if (!this.mobileAccountsList) return;
    if (!this.accounts || this.accounts.length === 0) {
      this.mobileAccountsList.innerHTML = `
        <div style="font-size: 11px; color: var(--text-secondary); padding: 8px 4px;">Belum ada rekening aktif.</div>
      `;
      return;
    }

    this.mobileAccountsList.innerHTML = this.accounts.map((acc) => {
      const bal = parseFloat(acc.current_balance) || 0;
      const name = acc.name || 'Akun';
      const nameLower = name.toLowerCase();
      let monogram = 'Rp';
      if (nameLower.includes('bca') || nameLower.includes('bank') || acc.type === 'BANK') {
        monogram = 'B';
      } else if (nameLower.includes('gopay') || nameLower.includes('ewallet') || acc.type === 'EWALLET') {
        monogram = 'G';
      } else if (nameLower.includes('tunai') || nameLower.includes('kas') || acc.type === 'CASH') {
        monogram = 'Rp';
      } else {
        monogram = name.charAt(0).toUpperCase();
      }

      const formattedBal = this.formatCompactIDR(bal);
      return `
        <div class="mobile-account-chip">
          <div class="mobile-account-avatar">${monogram}</div>
          <div class="mobile-account-info">
            <div class="mobile-account-balance" data-real-compact="${formattedBal}">${this.isBalanceHidden ? '••••••••' : formattedBal}</div>
            <div class="mobile-account-name">${name}</div>
          </div>
        </div>
      `;
    }).join('');
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

    if (this.mobileEyeOpen && this.mobileEyeClosed) {
      this.mobileEyeOpen.style.display = this.isBalanceHidden ? 'none' : 'block';
      this.mobileEyeClosed.style.display = this.isBalanceHidden ? 'block' : 'none';
      if (this.mobileBtnToggleNetWorth) {
        this.mobileBtnToggleNetWorth.setAttribute('title', this.isBalanceHidden ? 'Tampilkan Saldo' : 'Sembunyikan Saldo');
        this.mobileBtnToggleNetWorth.setAttribute('aria-label', this.isBalanceHidden ? 'Tampilkan Saldo' : 'Sembunyikan Saldo');
      }
    }

    if (this.totalNetWorth) {
      if (this.isBalanceHidden) {
        this.totalNetWorth.textContent = 'Rp ••••••••';
        this.totalNetWorth.style.color = 'rgba(255, 255, 255, 0.75)';
        this.totalNetWorth.classList.add('is-hidden-mask');
      } else {
        this.totalNetWorth.textContent = this.formatIDR(this.currentNetWorthValue);
        this.totalNetWorth.style.color = this.currentNetWorthValue < 0 ? '#FF9B9B' : '#FFFFFF';
        this.totalNetWorth.classList.remove('is-hidden-mask');
      }
    }

    if (this.mobileTotalNetWorth) {
      if (this.isBalanceHidden) {
        this.mobileTotalNetWorth.textContent = 'Rp ••••••••';
        this.mobileTotalNetWorth.style.color = 'rgba(255, 255, 255, 0.75)';
      } else {
        this.mobileTotalNetWorth.textContent = this.formatIDR(this.currentNetWorthValue);
        this.mobileTotalNetWorth.style.color = this.currentNetWorthValue < 0 ? '#FF9B9B' : '#FFFFFF';
      }
    }

    if (this.aiTotalLiquidBalance) {
      if (this.isBalanceHidden) {
        this.aiTotalLiquidBalance.textContent = 'Rp ••••••••';
        this.aiTotalLiquidBalance.classList.add('is-hidden-mask');
      } else {
        const real = this.aiTotalLiquidBalance.getAttribute('data-real-balance') || this.formatIDR(this.currentNetWorthValue);
        this.aiTotalLiquidBalance.textContent = real;
        this.aiTotalLiquidBalance.classList.remove('is-hidden-mask');
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

    const mobileBalEls = document.querySelectorAll('.mobile-account-balance');
    mobileBalEls.forEach((el) => {
      const real = el.getAttribute('data-real-compact');
      if (this.isBalanceHidden) {
        el.textContent = '••••••••';
      } else if (real) {
        el.textContent = real;
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

  // Render Ledger History in Figma Screen 02 Table Style (4 Columns matching Mockup)
  renderHistory() {
    const list = this.filteredTransactions || this.transactions;
    this.historyTableBody.innerHTML = '';

    const monthFilter = this.ledgerMonthSelect ? this.ledgerMonthSelect.value : '';
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    let mLabel = `${monthNames[curM] || 'Oktober'} ${curY}`;
    if (monthFilter && monthFilter !== 'ALL') {
      const [y, mStr] = monthFilter.split('-');
      const m = parseInt(mStr, 10);
      mLabel = `${monthNames[m] || mStr} ${y}`;
    }

    if (this.ledgerAktivitasSubtitle) {
      this.ledgerAktivitasSubtitle.textContent = `${mLabel} · ${list.length} transaksi`;
    }
    if (this.transaksiPeriodText) {
      this.transaksiPeriodText.textContent = mLabel;
    }

    if (list.length === 0) {
      let emptyTitle = 'Tidak ada transaksi yang cocok.';
      let emptyDesc = '';

      if (monthFilter && monthFilter !== 'ALL') {
        emptyTitle = `Buku besar periode ${mLabel} masih kosong`;
        emptyDesc = `Belum ada mutasi yang dicatat di bulan ${mLabel}. Jika memasuki bulan baru, transaksi akan dimulai dari nol. Anda dapat memilih bulan sebelumnya pada menu di atas untuk melihat data lampau.`;
      }

      this.historyTableBody.innerHTML = `
        <tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 28px 16px;">
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
      const isIncome = tx.type === 'INCOME';

      let shortDate = '-';
      if (tx.transaction_date) {
        try {
          const parts = tx.transaction_date.split('-');
          if (parts.length === 3) {
            const shortMonths = ['', 'Okt', 'Okt', 'Okt', 'Okt', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            const indMonths = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            const m = parseInt(parts[1], 10);
            shortDate = `${parseInt(parts[2], 10)} ${indMonths[m] || parts[1]}`;
          } else {
            shortDate = tx.transaction_date;
          }
        } catch {
          shortDate = tx.transaction_date;
        }
      }

      const sign = isIncome ? '+ ' : '- ';
      const amountColor = isIncome ? '#166534' : '#111827';

      tr.innerHTML = `
        <td class="td-transaksi">
          <div class="aktivitas-row-desc">
            ${this.formatTxDescription(tx.description, isRev)}
          </div>
        </td>
        <td class="td-tanggal">${shortDate}</td>
        <td class="td-kategori">
          <span class="aktivitas-cat-text">${tx.category_name || '-'}</span>
        </td>
        <td class="td-jumlah" style="text-align: right;">
          <div class="aktivitas-amount-wrap">
            <span class="aktivitas-amount-val" style="color: ${amountColor};">
              ${sign}${this.formatIDR(tx.amount)}
            </span>
            <div class="aktivitas-hover-actions">
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
            </div>
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

    this.renderMobileDashboardTransactions();
  }

  renderMobileDashboardTransactions() {
    if (!this.mobileDashTxContainer) return;
    const recent = (this.transactions || []).slice(0, 4);
    if (recent.length === 0) {
      this.mobileDashTxContainer.innerHTML = `
        <div style="font-size: 11px; color: var(--text-secondary); padding: 12px 4px; text-align: center;">
          Belum ada transaksi di bulan ini.
        </div>
      `;
      return;
    }

    this.mobileDashTxContainer.innerHTML = recent.map((tx) => {
      const isIncome = tx.type === 'INCOME';
      const isTransfer = tx.type === 'TRANSFER';
      const isRev = tx.is_reversal;
      const iconClass = isIncome ? 'income' : (isTransfer ? 'transfer' : 'expense');
      const amountClass = isIncome ? 'income' : 'expense';
      const sign = isIncome ? '+' : '-';
      const compactAmt = this.formatCompactIDR(tx.amount, false);

      let iconSvg = '';
      if (isIncome) {
        iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`;
      } else if (isTransfer) {
        iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10h14l-4-4"/><path d="M17 14H3l4 4"/></svg>`;
      } else {
        iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
      }

      const descText = this.formatTxDescription(tx.description, isRev);
      const catText = tx.category_name || (isTransfer ? 'Transfer Rekening' : 'Pengeluaran');

      return `
        <div class="mobile-tx-item">
          <div class="mobile-tx-left">
            <div class="mobile-tx-icon-circle ${iconClass}">
              ${iconSvg}
            </div>
            <div>
              <div class="mobile-tx-title">${descText}</div>
              <div class="mobile-tx-category">${catText}</div>
            </div>
          </div>
          <div class="mobile-tx-amount ${amountClass}">
            ${sign}${compactAmt}
          </div>
        </div>
      `;
    }).join('');
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
    let reason = 'Koreksi pencatatan';
    try {
      const inputReason = prompt('Masukkan alasan jurnal pembalik (reversal):', 'Koreksi pencatatan');
      if (inputReason === null) return; // User explicitly cancelled
      if (inputReason && inputReason.trim()) reason = inputReason.trim();
    } catch {
      reason = 'Koreksi pencatatan';
    }

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
  formatAiMarkdown(text) {
    if (!text) return '';
    let escaped = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold Markdown
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Bullet lists & paragraphs
    const rawLines = escaped.split('\n');
    let inList = false;
    const output = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (line.startsWith('* ') || line.startsWith('- ') || line.startsWith('• ')) {
        if (!inList) {
          output.push('<ul>');
          inList = true;
        }
        output.push(`<li>${line.substring(2)}</li>`);
      } else {
        if (inList) {
          output.push('</ul>');
          inList = false;
        }
        if (line.length > 0) {
          output.push(`<p>${line}</p>`);
        }
      }
    }
    if (inList) {
      output.push('</ul>');
    }
    return output.join('');
  }

  setAIProcessState(title, detail, state = 'loading') {
    if (!this.aiProcessStatus) return;
    this.aiProcessStatus.dataset.state = state;
    this.aiProcessStatus.style.display = 'flex';
    if (this.aiProcessTitle) this.aiProcessTitle.textContent = title;
    if (this.aiProcessDetail) this.aiProcessDetail.textContent = detail;
    if (this.btnRetryAi) {
      this.btnRetryAi.style.display = state === 'error' ? 'inline-flex' : 'none';
      this.btnRetryAi.textContent = this.retryMode === 'speech' ? 'Coba transkripsi lagi' : 'Coba lagi';
    }
  }

  escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  formatAiMarkdown(value) {
    if (!value) return '';
    let escaped = this.escapeHtml(value);
    // Convert markdown list markers starting with * or - into bullet points
    escaped = escaped.replace(/^[\*\-]\s+/gm, '• ');
    // Convert markdown bold **text** or __text__ to strong
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/__(.*?)__/g, '<strong>$1</strong>');
    // Convert markdown italic *text* or _text_ to em
    escaped = escaped.replace(/(^|[^\*])\*([^\*\n]+)\*([^\*]|$)/g, '$1<em>$2</em>$3');
    // Strip any remaining/unpaired asterisks so no raw '*' ever appears
    escaped = escaped.replace(/\*/g, '');
    return escaped;
  }

  findPossibleDuplicate(draft) {
    const date = String(draft.transaction_date || '').slice(0, 10);
    const amount = Number(draft.amount || 0);
    const description = String(draft.description || '').trim().toLocaleLowerCase('id');
    const sameTransaction = (tx) =>
      !tx.is_reversal && String(tx.transaction_date || '').slice(0, 10) === date &&
      tx.type === draft.type && Number(tx.amount || 0) === amount &&
      (tx.source_account_id || null) === (draft.source_account_id || null) &&
      (tx.destination_account_id || null) === (draft.destination_account_id || null) &&
      String(tx.description || '').trim().toLocaleLowerCase('id') === description;
    const ledgerMatch = (this.transactions || []).find(sameTransaction);
    if (ledgerMatch) return ledgerMatch;
    return (this.currentBatch?.drafts || []).find((other) => other !== draft && sameTransaction(other)) || null;
  }

  async handleAIParse(inputText = null) {
    const text = String(inputText ?? (this.aiInput ? this.aiInput.value : '')).trim();
    if (!text) {
      this.showAlert('Masukkan kalimat mutasi atau pertanyaan terlebih dahulu.', 'warning');
      return;
    }
    if (this.aiRequestBusy) return;
    this.aiRequestBusy = true;
    this.lastAIInput = text;
    const originalButton = this.btnParse?.innerHTML;
    const originalMobileButton = this.mobileDashBtnParse?.innerHTML;
    const originalDashboardButton = this.dashboardAiButton?.innerHTML;
    this.setAIProcessState('Menyiapkan analisis…', 'Mengirim teks ke asisten keuangan.', 'loading');
    if (this.btnParse) {
      this.btnParse.disabled = true;
      this.btnParse.innerHTML = `<span class="loading-spinner"></span> Memproses…`;
    }
    if (this.mobileDashBtnParse) {
      this.mobileDashBtnParse.disabled = true;
      this.mobileDashBtnParse.innerHTML = `<span class="loading-spinner"></span> Memproses…`;
    }
    if (this.dashboardAiButton) {
      this.dashboardAiButton.disabled = true;
      this.dashboardAiButton.innerHTML = `<span class="loading-spinner"></span> Memproses…`;
    }
    const stageTimer = setTimeout(() => this.setAIProcessState(
      'AI sedang membaca transaksi…', 'Memeriksa jenis, nominal, tanggal, rekening, dan kategori.', 'loading'
    ), 900);

    try {
      const res = await api.ai.parse(text);
      const data = res.data || {};
      const aiResponse = data.ai_response;
      const drafts = data.drafts || [];
      const intent = data.intent || 'TRANSACTION_DRAFT';
      if (!aiResponse && drafts.length === 0) {
        throw new Error('Asisten tidak mengembalikan jawaban atau draft. Coba lagi sebentar.');
      }

      if (aiResponse) {
        const formatted = this.formatAiMarkdown(aiResponse);
        if (this.aiResponseBody) this.aiResponseBody.innerHTML = formatted;
        if (this.aiResponseBox) this.aiResponseBox.style.display = 'block';
        if (this.mobileAiResponseBody) this.mobileAiResponseBody.innerHTML = formatted;
        if (this.mobileAiResponseBox) this.mobileAiResponseBox.style.display = 'block';
      }

      if (drafts.length > 0) {
        this.retryMode = null;
        this.currentBatch = { batch_id: data.batch_id, drafts };
        this.renderDrafts();
        if (this.draftSection) this.draftSection.style.display = 'block';
        this.setAIProcessState('Draft siap diperiksa', `${drafts.length} transaksi dibuat sebagai draft. Periksa penanda kuning sebelum konfirmasi.`, 'success');
        this.showAlert(`AI menyiapkan ${drafts.length} draft transaksi untuk ditinjau.`, 'success');
      } else {
        this.retryMode = null;
        this.currentBatch = null;
        this.renderDrafts();
        this.setAIProcessState('Analisis selesai', aiResponse ? 'Baca jawaban AI di bawah ini.' : 'Tidak ada transaksi yang perlu ditambahkan.', 'success');
        if (intent === 'FINANCIAL_INQUIRY') {
          this.loadAccounts();
          this.showAlert('Informasi saldo & keuangan berhasil diperbarui.', 'info');
        } else if (intent === 'PURCHASE_ADVISORY') {
          this.showAlert('Rekomendasi keputusan belanja siap dibaca.', 'info');
        } else {
          this.showAlert(res.message || 'Tanggapan AI siap dibaca.', 'info');
        }
      }
      setTimeout(() => {
        if (this.aiProcessStatus?.dataset.state === 'success') this.aiProcessStatus.style.display = 'none';
      }, 7000);
    } catch (err) {
      this.retryMode = 'ai';
      this.setAIProcessState('Analisis belum berhasil', `${err.message || 'Koneksi ke AI terputus.'} Teks kamu tetap tersimpan; coba lagi.`, 'error');
      this.showAlert('Analisis gagal. Teks tetap tersimpan dan bisa dicoba lagi.', 'error');
    } finally {
      clearTimeout(stageTimer);
      this.aiRequestBusy = false;
      if (this.btnParse) {
        this.btnParse.disabled = false;
        this.btnParse.innerHTML = originalButton || `<span>Proses Mutasi AI</span>`;
      }
      if (this.mobileDashBtnParse) {
        this.mobileDashBtnParse.disabled = false;
        this.mobileDashBtnParse.innerHTML = originalMobileButton || `<span>Proses AI</span>`;
      }
      if (this.dashboardAiButton) {
        this.dashboardAiButton.disabled = false;
        this.dashboardAiButton.innerHTML = originalDashboardButton || `<span aria-hidden="true">✦</span> Buat draft`;
      }
    }
  }

  submitDashboardAI(input) {
    const text = String(input?.value || '').trim();
    if (!text) {
      this.showAlert('Tulis transaksi atau pertanyaan dulu, misalnya “Baru beli nasgor 25rb hari ini”.', 'warning');
      input?.focus();
      return;
    }
    if (this.aiInput) this.aiInput.value = text;
    this.switchTab('tab-mutasi');
    this.handleAIParse(text);
  }

  async handleCsvImport() {
    const file = this.inputImportCsv?.files?.[0];
    if (!file) return;
    const importButton = this.btnImportCsv;
    const original = importButton?.innerHTML;
    if (importButton) {
      importButton.disabled = true;
      importButton.textContent = 'Membaca CSV…';
    }
    try {
      const response = await api.transactions.importCsv(file);
      const result = response.data || {};
      if (result.drafts?.length) {
        this.currentBatch = { batch_id: result.batch_id, drafts: result.drafts };
        this.renderDrafts();
        if (this.draftSection) this.draftSection.style.display = 'block';
        this.showAlert(`${result.drafts.length} transaksi diimpor sebagai draft. Tinjau rekening, kategori, dan duplikat sebelum konfirmasi.`, 'success');
        this.switchTab('tab-mutasi');
        this.draftSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        this.showAlert('Tidak ada baris CSV yang bisa dijadikan draft.', 'warning');
      }
      if (result.errors?.length) {
        const firstErrors = result.errors.slice(0, 3).map((e) => `Baris ${e.row}: ${e.message}`).join(' · ');
        this.showAlert(`Sebagian baris dilewati. ${firstErrors}`, 'warning');
      }
    } catch (err) {
      this.showAlert(`Impor CSV gagal: ${err.message}`, 'error');
    } finally {
      if (importButton) {
        importButton.disabled = false;
        importButton.innerHTML = original || 'Impor CSV';
      }
      if (this.inputImportCsv) this.inputImportCsv.value = '';
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
    let totalIncome = 0;

    pendingDrafts.forEach((d, idx) => {
      const tr = document.createElement('tr');
      const pillCatClass = d.category_name && d.category_name.toLowerCase().includes('makan') ? 'cat-amber' : 'cat-blue';
      const typeClass = d.type === 'INCOME' ? 'cat-green' : (d.type === 'TRANSFER' ? 'cat-blue' : 'cat-rose');
      const duplicate = Boolean(d.possible_duplicate || this.findPossibleDuplicate(d));

      let accText = '-';
      if (d.type === 'EXPENSE') accText = this.escapeHtml(d.source_account_name || 'Pilih rekening');
      else if (d.type === 'INCOME') accText = this.escapeHtml(d.destination_account_name || 'Pilih rekening');
      else if (d.type === 'TRANSFER') accText = `${this.escapeHtml(d.source_account_name || 'Pilih sumber')} <span aria-hidden="true">→</span> ${this.escapeHtml(d.destination_account_name || 'Pilih tujuan')}`;

      const reviewReasons = [];
      if (['EXPENSE', 'TRANSFER'].includes(d.type) && !d.source_account_id) reviewReasons.push('Rekening sumber belum cocok');
      if (['INCOME', 'TRANSFER'].includes(d.type) && !d.destination_account_id) reviewReasons.push('Rekening tujuan belum cocok');
      if (d.type !== 'TRANSFER' && !d.category_id) reviewReasons.push('Kategori belum cocok');
      if (duplicate) reviewReasons.push('Mirip transaksi yang sudah ada');
      const needsReview = reviewReasons.length > 0;
      tr.classList.toggle('draft-review-needed', needsReview);

      if (d.type === 'EXPENSE') totalExpense += parseFloat(d.amount) || 0;
      if (d.type === 'INCOME') totalIncome += parseFloat(d.amount) || 0;

      tr.innerHTML = `
        <td data-label="No." class="draft-index">${idx + 1}</td>
        <td data-label="Deskripsi" class="draft-description"><strong>${this.escapeHtml(d.description || d.type)}</strong>${needsReview ? `<small class="draft-review-note">${reviewReasons.map((r) => this.escapeHtml(r)).join(' · ')}</small>` : ''}</td>
        <td data-label="Kategori"><span class="badge-cat-pill ${pillCatClass}">${this.escapeHtml(d.category_name || (d.type === 'TRANSFER' ? 'Transfer' : 'Pilih kategori'))}</span></td>
        <td data-label="Jumlah" class="draft-amount"><strong>${this.formatIDR(d.amount)}</strong></td>
        <td data-label="Rekening" class="draft-account">${accText}</td>
        <td data-label="Tipe"><span class="badge-cat-pill ${typeClass}">${this.escapeHtml(d.type)}</span></td>
        <td data-label="Pemeriksaan"><span class="draft-status ${needsReview ? 'needs-review' : 'ready'}"><span class="draft-status-dot"></span>${needsReview ? 'Perlu dicek' : 'Siap'}</span></td>
        <td data-label="Aksi" class="draft-actions">
          <div style="display: flex; gap: 6px; justify-content: flex-end;">
            <button type="button" class="btn-draft-edit btn-edit-draft" data-id="${d.id}" style="height: 26px; padding: 0 10px; font-size: 10.5px; font-weight: 600; border-radius: 7px; border: 1px solid var(--border-main); background: #FFFFFF; color: var(--text-primary); cursor: pointer;">Edit</button>
            <button type="button" class="btn-draft-remove btn-cancel-draft" data-id="${d.id}" style="height: 26px; padding: 0 10px; font-size: 10.5px; font-weight: 500; border-radius: 7px; border: 1px solid var(--border-main); background: #FFFFFF; color: var(--accent-rose); cursor: pointer;">Batal</button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-cancel-draft').addEventListener('click', () => this.handleCancelDraft(d.id));
      tr.querySelector('.btn-edit-draft').addEventListener('click', () => this.openEditDraftModal(d));
      this.draftTableBody.appendChild(tr);
    });

    if (this.draftTotalSummary) {
      if (totalExpense > 0 && totalIncome > 0) {
        this.draftTotalSummary.textContent = `Total draft: ${this.formatIDR(totalIncome)} (Masuk) · ${this.formatIDR(totalExpense)} (Keluar)`;
      } else if (totalIncome > 0) {
        this.draftTotalSummary.textContent = `Total pemasukan draft: ${this.formatIDR(totalIncome)}`;
      } else {
        this.draftTotalSummary.textContent = `Total pengeluaran draft: ${this.formatIDR(totalExpense)}`;
      }
    }
    if (this.draftFooterRow) {
      this.draftFooterRow.style.display = 'flex';
    }
  }

  openEditDraftModal(draft) {
    this.activeEditingDraft = draft;
    const modal = document.getElementById('modal-edit-draft');
    if (!modal) return;

    document.getElementById('edit-draft-id').value = draft.id;
    document.getElementById('edit-draft-amount').value = parseFloat(draft.amount) || 0;
    document.getElementById('edit-draft-description').value = draft.description || '';
    document.getElementById('edit-draft-date').value = draft.transaction_date ? draft.transaction_date.slice(0, 10) : new Date().toISOString().slice(0, 10);

    const typeSelect = document.getElementById('edit-draft-type');
    if (typeSelect) typeSelect.value = draft.type || 'EXPENSE';

    const errBox = document.getElementById('edit-draft-error');
    if (errBox) errBox.style.display = 'none';

    this.updateEditDraftFields(draft);
    modal.style.display = 'flex';
  }

  updateEditDraftFields(draft = null) {
    const currentDraft = draft || this.activeEditingDraft;
    const typeSelect = document.getElementById('edit-draft-type');
    const type = typeSelect ? typeSelect.value : 'EXPENSE';

    const srcGroup = document.getElementById('edit-draft-src-group');
    const destGroup = document.getElementById('edit-draft-dest-group');
    const catGroup = document.getElementById('edit-draft-category-group');
    const srcSelect = document.getElementById('edit-draft-source-account');
    const destSelect = document.getElementById('edit-draft-dest-account');
    const catSelect = document.getElementById('edit-draft-category');
    const srcLabel = document.getElementById('edit-draft-src-label');
    const destLabel = document.getElementById('edit-draft-dest-label');

    // Populate Accounts
    if (srcSelect && destSelect) {
      const activeAccounts = (this.accounts || []).filter(a => a.is_active);
      const accOptions = activeAccounts.map(a => `<option value="${a.id}">${a.name} (${this.formatIDR(a.balance || 0)})</option>`).join('');
      srcSelect.innerHTML = accOptions;
      destSelect.innerHTML = accOptions;

      if (currentDraft) {
        if (currentDraft.source_account_id) srcSelect.value = currentDraft.source_account_id;
        if (currentDraft.destination_account_id) destSelect.value = currentDraft.destination_account_id;
      }
    }

    // Populate Categories filtered by type
    if (catSelect) {
      const activeCats = (this.categories || []).filter(c => c.is_active && c.type === type);
      catSelect.innerHTML = activeCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      if (currentDraft && currentDraft.category_id && currentDraft.type === type) {
        catSelect.value = currentDraft.category_id;
      }
    }

    // Dynamic UI visibility based on type
    if (type === 'EXPENSE') {
      if (srcGroup) srcGroup.style.display = 'block';
      if (destGroup) destGroup.style.display = 'none';
      if (catGroup) catGroup.style.display = 'block';
      if (srcLabel) srcLabel.textContent = 'Rekening Sumber (Keluar Dari) *';
    } else if (type === 'INCOME') {
      if (srcGroup) srcGroup.style.display = 'none';
      if (destGroup) destGroup.style.display = 'block';
      if (catGroup) catGroup.style.display = 'block';
      if (destLabel) destLabel.textContent = 'Rekening Tujuan (Masuk Ke) *';
    } else if (type === 'TRANSFER') {
      if (srcGroup) srcGroup.style.display = 'block';
      if (destGroup) destGroup.style.display = 'block';
      if (catGroup) catGroup.style.display = 'none';
      if (srcLabel) srcLabel.textContent = 'Dari Rekening Sumber *';
      if (destLabel) destLabel.textContent = 'Ke Rekening Tujuan *';
    }
  }

  async handleSaveEditDraft(e) {
    if (e) e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit-edit-draft');
    const errBox = document.getElementById('edit-draft-error');
    if (errBox) {
      errBox.style.display = 'none';
      errBox.textContent = '';
    }

    const draftId = parseInt(document.getElementById('edit-draft-id').value, 10);
    const type = document.getElementById('edit-draft-type').value;
    const amount = parseFloat(document.getElementById('edit-draft-amount').value);
    const txDate = document.getElementById('edit-draft-date').value;
    const srcAccId = parseInt(document.getElementById('edit-draft-source-account').value, 10) || null;
    const destAccId = parseInt(document.getElementById('edit-draft-dest-account').value, 10) || null;
    const catId = parseInt(document.getElementById('edit-draft-category').value, 10) || null;
    const description = document.getElementById('edit-draft-description').value.trim();

    if (!draftId) {
      if (errBox) {
        errBox.textContent = 'ID draft tidak valid. Silakan muat ulang halaman.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      if (errBox) {
        errBox.textContent = 'Nominal transaksi harus lebih dari 0.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (type === 'TRANSFER' && srcAccId === destAccId) {
      if (errBox) {
        errBox.textContent = 'Rekening sumber dan rekening tujuan transfer tidak boleh sama.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (type === 'EXPENSE' && !srcAccId) {
      if (errBox) {
        errBox.textContent = 'Rekening sumber (keluar dari) wajib dipilih untuk pengeluaran.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (type === 'INCOME' && !destAccId) {
      if (errBox) {
        errBox.textContent = 'Rekening tujuan (masuk ke) wajib dipilih untuk pemasukan.';
        errBox.style.display = 'block';
      }
      return;
    }

    if ((type === 'EXPENSE' || type === 'INCOME') && !catId) {
      if (errBox) {
        errBox.textContent = 'Kategori transaksi wajib dipilih.';
        errBox.style.display = 'block';
      }
      return;
    }

    const payload = {
      type,
      amount,
      transaction_date: txDate,
      description: description || null
    };

    if (type === 'EXPENSE') {
      payload.source_account_id = srcAccId;
      payload.destination_account_id = null;
      payload.category_id = catId;
    } else if (type === 'INCOME') {
      payload.source_account_id = null;
      payload.destination_account_id = destAccId;
      payload.category_id = catId;
    } else if (type === 'TRANSFER') {
      payload.source_account_id = srcAccId;
      payload.destination_account_id = destAccId;
      payload.category_id = null;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Menyimpan...';
    }

    try {
      console.log('[EditDraft] Mengirim pembaruan draft ID:', draftId, payload);
      await api.transactions.updateDraft(draftId, payload);

      if (this.currentBatch && this.currentBatch.drafts) {
        const targetDraft = this.currentBatch.drafts.find(d => d.id === draftId);
        if (targetDraft) {
          targetDraft.type = type;
          targetDraft.amount = amount;
          targetDraft.transaction_date = txDate;
          targetDraft.description = description;

          if (type === 'EXPENSE') {
            targetDraft.source_account_id = srcAccId;
            targetDraft.destination_account_id = null;
            targetDraft.category_id = catId;
            const sAcc = this.accounts.find(a => a.id === srcAccId);
            targetDraft.source_account_name = sAcc ? sAcc.name : 'Rekening';
            targetDraft.destination_account_name = null;
            const cat = this.categories.find(c => c.id === catId);
            targetDraft.category_name = cat ? cat.name : '-';
          } else if (type === 'INCOME') {
            targetDraft.source_account_id = null;
            targetDraft.destination_account_id = destAccId;
            targetDraft.category_id = catId;
            const dAcc = this.accounts.find(a => a.id === destAccId);
            targetDraft.destination_account_name = dAcc ? dAcc.name : 'Rekening';
            targetDraft.source_account_name = null;
            const cat = this.categories.find(c => c.id === catId);
            targetDraft.category_name = cat ? cat.name : '-';
          } else if (type === 'TRANSFER') {
            targetDraft.source_account_id = srcAccId;
            targetDraft.destination_account_id = destAccId;
            targetDraft.category_id = null;
            targetDraft.category_name = null;
            const sAcc = this.accounts.find(a => a.id === srcAccId);
            const dAcc = this.accounts.find(a => a.id === destAccId);
            targetDraft.source_account_name = sAcc ? sAcc.name : 'Sumber';
            targetDraft.destination_account_name = dAcc ? dAcc.name : 'Tujuan';
          }
        }
      }

      this.closeModals();
      this.renderDrafts();
      this.showAlert('Draft mutasi berhasil diperbarui.', 'success');
    } catch (err) {
      console.error('[EditDraft] Gagal menyimpan draft:', err);
      if (errBox) {
        errBox.textContent = `Gagal memperbarui draft: ${err.message}`;
        errBox.style.display = 'block';
      }
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Simpan Perubahan';
      }
    }
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
    this.lastAudioBlob = audioBlob;
    await this.submitSpeechTranscription(audioBlob);
  }

  async submitSpeechTranscription(audioBlob) {
    if (this.speechRequestBusy || !audioBlob) return;
    this.speechRequestBusy = true;
    this.retryMode = 'speech';
    if (this.recordStatus) this.recordStatus.innerHTML = `<span class="loading-spinner"></span> Mengunggah rekaman…`;
    if (this.btnRecord) this.btnRecord.disabled = true;
    this.setAIProcessState('Mengunggah rekaman…', 'Audio dikirim ke OCI Speech untuk ditranskripsikan.', 'loading');
    try {
      const jobRes = await api.speech.transcribe(audioBlob, 'recorded_speech.webm');
      await this.pollTranscription(jobRes.job_id);
    } catch (err) {
      this.retryMode = 'speech';
      this.setAIProcessState('Transkripsi belum berhasil', `${err.message || 'Koneksi ke OCI Speech terputus.'} Rekaman masih tersedia untuk dicoba lagi.`, 'error');
      this.showAlert('Transkripsi gagal dimulai. Rekaman tersimpan sementara; kamu bisa mencoba lagi.', 'error');
    } finally {
      this.speechRequestBusy = false;
      if (this.btnRecord) this.btnRecord.disabled = false;
      if (this.recordStatus && !this.recordStatus.textContent.includes('Transkripsi selesai')) {
        this.recordStatus.textContent = 'Bahasa Indonesia · hasil transkripsi ditinjau sebelum diproses';
      }
    }
  }

  async pollTranscription(jobId) {
    const startTime = Date.now();
    const maxPollTimeMs = 90 * 1000;
    if (this.recordStatus) this.recordStatus.innerHTML = `<span class="loading-spinner"></span> Menunggu transkripsi OCI Speech…`;
    this.setAIProcessState('Menunggu hasil transkripsi…', 'OCI Speech sedang mengenali bahasa Indonesia. Rekaman tidak akan masuk ke ledger tanpa konfirmasi.', 'loading');
    let pollErrors = 0;
    while (Date.now() - startTime <= maxPollTimeMs) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      try {
        const res = await api.speech.getStatus(jobId);
        pollErrors = 0;
        const data = res.data || {};
        if (data.status === 'SUCCEEDED') {
          const transcript = data.transcript || '';
          if (!transcript.trim()) {
            const emptyTranscript = new Error('Tidak ada suara yang dapat dikenali di rekaman.');
            emptyTranscript.permanent = true;
            throw emptyTranscript;
          }
          this.retryMode = null;
          if (this.aiInput) this.aiInput.value = transcript;
          if (this.recordStatus) this.recordStatus.textContent = 'Transkripsi selesai · tinjau teks sebelum diproses';
          this.setAIProcessState('Transkripsi selesai', 'Tinjau atau koreksi teks di kolom transaksi, lalu jalankan proses AI.', 'success');
          if (this.aiInput) this.aiInput.focus();
          this.showAlert('Suara berhasil ditranskrip. Tinjau teks sebelum diproses.', 'success');
          setTimeout(() => {
            if (this.aiProcessStatus?.dataset.state === 'success') this.aiProcessStatus.style.display = 'none';
          }, 8000);
          return;
        }
        if (data.status === 'FAILED' || data.status === 'TIMEOUT') {
          const failedJob = new Error(data.error_message || 'Layanan transkripsi gagal memproses rekaman.');
          failedJob.permanent = true;
          throw failedJob;
        }
      } catch (err) {
        if (err.permanent) throw err;
        pollErrors += 1;
        if (pollErrors >= 3 && Date.now() - startTime > 15000) {
          this.setAIProcessState('Koneksi transkripsi terganggu', 'Akan mencoba menyambung kembali otomatis.', 'loading');
        }
        console.warn('Polling transkripsi akan dicoba kembali:', err.message);
      }
    }
    throw new Error('Waktu tunggu transkripsi habis. Rekaman masih tersedia untuk dicoba lagi.');
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
  // PERIOD DETAIL MODAL (LIHAT PERIODE)
  // ==========================================
  openPeriodDetail(year, month) {
    const yr = parseInt(year, 10);
    const mo = parseInt(month, 10);
    if (!yr || !mo) return;

    this.modalPeriodActiveYear = yr;
    this.modalPeriodActiveMonth = mo;

    const monthNamesFull = [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthLabel = `${monthNamesFull[mo] || mo} ${yr}`;
    const periodKey = `${yr}-${String(mo).padStart(2, '0')}`;

    if (this.periodDetailModalTitle) {
      this.periodDetailModalTitle.textContent = `Rincian Periode: ${monthLabel}`;
    }

    // Filter transactions for this period
    let inc = 0;
    let exp = 0;
    const periodTxs = [];

    if (this.transactions && this.transactions.length > 0) {
      this.transactions.forEach((tx) => {
        if (tx.is_reversal) return;
        if (!tx.transaction_date || !tx.transaction_date.startsWith(periodKey)) return;
        const amt = parseFloat(tx.amount) || 0;
        if (tx.type === 'INCOME') inc += amt;
        else if (tx.type === 'EXPENSE') exp += amt;
        periodTxs.push(tx);
      });
    }

    const net = inc - exp;

    if (this.periodDetailIncome) this.periodDetailIncome.textContent = this.formatIDR(inc);
    if (this.periodDetailExpense) this.periodDetailExpense.textContent = this.formatIDR(exp);
    if (this.periodDetailNet) {
      this.periodDetailNet.textContent = this.formatIDR(net);
      this.periodDetailNet.style.color = net < 0 ? 'var(--accent-rose)' : 'var(--text-primary)';
    }

    // Render transactions table inside modal
    if (this.periodDetailTxBody) {
      this.periodDetailTxBody.innerHTML = '';
      if (periodTxs.length === 0) {
        this.periodDetailTxBody.innerHTML = `
          <tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px 16px;">
            Belum ada catatan transaksi di buku besar untuk periode ${monthLabel}.
          </td></tr>
        `;
      } else {
        periodTxs.forEach((tx) => {
          const tr = document.createElement('tr');
          const isIncome = tx.type === 'INCOME';
          const sign = isIncome ? '+' : '-';
          const amountClass = isIncome ? 'income' : 'expense';
          const accountsDisplay = tx.type === 'EXPENSE' 
            ? (tx.source_account_name || 'Rekening')
            : (tx.type === 'INCOME' ? (tx.destination_account_name || 'Rekening') : `${tx.source_account_name || '-'} → ${tx.destination_account_name || '-'}`);

          tr.innerHTML = `
            <td style="font-size: 10.5px; white-space: nowrap; color: var(--text-secondary);">${this.formatDateID(tx.transaction_date)}</td>
            <td style="font-size: 11px; font-weight: 500;">${tx.description || '-'}</td>
            <td style="font-size: 10.5px; color: var(--text-secondary);">${tx.category_name || '-'}</td>
            <td style="font-size: 10.5px; color: var(--text-secondary);">${accountsDisplay}</td>
            <td class="td-amount ${amountClass}" style="text-align: right; font-weight: 600; font-size: 11px;">${sign}${this.formatIDR(tx.amount)}</td>
          `;
          this.periodDetailTxBody.appendChild(tr);
        });
      }
    }

    // Load background data for reports
    this.loadReportsData(yr, mo);

    if (this.modalPeriodDetail) {
      this.modalPeriodDetail.style.display = 'flex';
    }
  }

  setChartSeriesFilter(series) {
    this.activeChartSeries = series;
    document.querySelectorAll('.chart-series-btn').forEach((btn) => {
      if (btn.getAttribute('data-series') === series) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const seriesLabels = {
      ALL: 'Semua (Pemasukan & Pengeluaran)',
      INCOME: 'Pemasukan',
      EXPENSE: 'Pengeluaran'
    };
    this.showAlert(`Grafik difilter: ${seriesLabels[series] || series}`, 'info');

    if (this.reportData) {
      this.renderReports(this.reportData);
    }
  }

  // ==========================================
  // TAB 3: ANGGARAN & TARGET TABUNGAN
  // ==========================================
  async loadPlanningData() {
    await Promise.all([
      this.loadBudgetOverview(this.selectedPlanningYear, this.selectedPlanningMonth),
      this.loadSavingsGoals(),
      (!this.categories || this.categories.length === 0) ? this.loadCategories() : Promise.resolve(),
      (!this.accounts || this.accounts.length === 0) ? this.loadAccounts() : Promise.resolve(),
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
        this.budgetRemainderVal.innerHTML = 'Batas pengeluaran belum ditetapkan untuk bulan ini';
        this.budgetRemainderVal.style.color = 'var(--text-muted)';
      } else if (b.is_over) {
        this.budgetRemainderVal.innerHTML = `${Icons.alert} Pengeluaran melebihi batas sebesar ${this.formatIDR(totSpent - totLimit)}`;
        this.budgetRemainderVal.style.color = 'var(--accent-rose)';
      } else {
        this.budgetRemainderVal.innerHTML = `Sisa batas pengeluaran: ${this.formatIDR(totRem)}`;
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
        this.statPengeluaranStatus.textContent = `${pct}% dari batas`;
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
        this.statSisaStatus.textContent = b.is_over ? 'Batas terlampaui' : `${100 - pct}% masih tersedia`;
        this.statSisaStatus.className = b.is_over ? 'stat-card-badge rose' : 'stat-card-badge green';
      } else {
        this.statSisaStatus.textContent = 'Atur batas bulanan';
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
              <div style="display: flex; align-items: center; gap: 8px;">
                <div class="cat-progress-track" style="flex: 1;">
                  <div class="cat-progress-fill ${fillClass}" style="width: ${catPct}%;"></div>
                </div>
                <button type="button" class="btn-quick-cat-limit card-action-link" style="font-size: 10px; white-space: nowrap; padding: 2px 6px; border: 1px solid var(--border-main); border-radius: 5px; background: #fff;">Atur</button>
              </div>
            </td>
          `;

          const btnQuick = tr.querySelector('.btn-quick-cat-limit');
          if (btnQuick) {
            btnQuick.addEventListener('click', () => {
              this.populateCatSelect();
              if (this.selectCatBudget) {
                Array.from(this.selectCatBudget.options).forEach((opt) => {
                  if (opt.textContent.trim().toLowerCase() === cat.category_name.toLowerCase()) {
                    this.selectCatBudget.value = opt.value;
                  }
                });
              }
              if (this.inputCatBudgetLimit && limit > 0) {
                this.inputCatBudgetLimit.value = limit;
              }
              this.openModal(this.modalSetCatBudget);
            });
          }

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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <div class="goal-due-text" style="margin-top: 0;">
            ${g.target_date ? `Target ${g.target_date}` : 'Tanpa batas waktu'}
          </div>
          <div style="display: flex; gap: 4px;">
            <button type="button" class="btn-goal-contribute card-action-link" style="font-size: 10px; padding: 2px 7px; border: 1px solid var(--border-main); border-radius: 6px; background: #fff;">+ Setor</button>
            <button type="button" class="btn-goal-complete card-action-link" style="font-size: 10px; padding: 2px 7px; border: 1px solid var(--border-main); border-radius: 6px; background: #fff;">Selesai</button>
          </div>
        </div>
      `;

      const btnContribute = card.querySelector('.btn-goal-contribute');
      if (btnContribute) {
        btnContribute.addEventListener('click', () => {
          this.openCreateTxModal();
          this.setCreateTxType('TRANSFER');
          if (this.selectCreateTxDestAcc && g.dedicated_account_id) {
            this.selectCreateTxDestAcc.value = g.dedicated_account_id;
          }
          if (this.inputCreateTxDesc) {
            this.inputCreateTxDesc.value = `Setoran Tabungan: ${g.name}`;
          }
          this.showAlert(`Menyiapkan mutasi setor dana ke target '${g.name}'`, 'info');
        });
      }

      const btnComplete = card.querySelector('.btn-goal-complete');
      if (btnComplete) {
        btnComplete.addEventListener('click', () => {
          this.handleUpdateGoalStatus(g.id, 'COMPLETED');
        });
      }

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

  async populateCatSelect() {
    if (!this.selectCatBudget) return;
    if (!this.categories || this.categories.length === 0) {
      await this.loadCategories();
    }
    this.selectCatBudget.innerHTML = '';
    const expenseCats = (this.categories || []).filter((c) => c.type === 'EXPENSE' || !c.type);
    const list = expenseCats.length > 0 ? expenseCats : (this.categories || []);

    list.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      this.selectCatBudget.appendChild(opt);
    });
  }

  async populateGoalAccSelect() {
    if (!this.selectGoalAccount) return;
    if (!this.accounts || this.accounts.length === 0) {
      await this.loadAccounts();
    }
    this.selectGoalAccount.innerHTML = '';
    (this.accounts || []).forEach((a) => {
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
      this.showAlert('Batas pengeluaran bulanan berhasil disimpan!', 'success');
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
    if (!this.accounts || this.accounts.length === 0) {
      await this.loadAccounts();
    }
    this.populateCopilotAccSelect();
    await this.handleAnalyzePatterns();
  }

  populateCopilotAccSelect() {
    if (!this.copilotAccountSelect) return;
    this.copilotAccountSelect.innerHTML = '';
    if (!this.accounts || this.accounts.length === 0) {
      this.copilotAccountSelect.innerHTML = '<option value="">Pilih Rekening (Otomatis)</option>';
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
    const query = this.copilotInput?.value?.trim() || '';
    if (!query) {
      if (this.copilotAiStatus) {
        this.copilotAiStatus.className = 'copilot-ai-status is-error';
        this.copilotAiStatus.textContent = 'Tulis pertanyaan dulu sebelum mengirim.';
      }
      this.copilotInput?.focus();
      return;
    }

    const rawAccVal = this.copilotAccountSelect?.value;
    const parsedAccId = rawAccVal ? parseInt(rawAccVal, 10) : null;
    const targetAccId = (!isNaN(parsedAccId) && parsedAccId > 0) ? parsedAccId : null;
    this.appendCopilotUserMessage(query);
    const answerMessage = this.appendCopilotPendingMessage();

    if (this.btnConsultCopilot) {
      this.btnConsultCopilot.disabled = true;
      this.btnConsultCopilot.innerHTML = '<span class="loading-spinner" aria-hidden="true"></span>';
    }
    if (this.copilotInput) this.copilotInput.disabled = true;
    if (this.copilotAccountSelect) this.copilotAccountSelect.disabled = true;
    if (this.copilotNewChatButton) this.copilotNewChatButton.disabled = true;
    if (this.copilotAiStatus) {
      this.copilotAiStatus.className = 'copilot-ai-status is-pending';
      this.copilotAiStatus.textContent = 'Sedang membaca pertanyaan dan ringkasan keuanganmu…';
    }
    const promptList = this.copilotChatFeed?.querySelector('.copilot-prompt-list');
    if (promptList) promptList.hidden = true;

    try {
      const history = this.copilotConversation.slice(-6).map((turn) => ({
        role: turn.role,
        content: String(turn.content || '').slice(0, 1200),
      }));
      const res = await api.planning.consultPurchase(query, targetAccId, history);
      const d = res.data;
      this.renderCopilotAdvice(d, answerMessage);
      this.copilotConversation.push(
        { role: 'user', content: query },
        { role: 'assistant', content: String(d?.advice || '') },
      );
      this.copilotConversation = this.copilotConversation.slice(-6);
      if (this.copilotInput) {
        this.copilotInput.value = '';
        this.copilotInput.style.height = '';
      }
    } catch (err) {
      if (this.copilotAiStatus) {
        this.copilotAiStatus.className = 'copilot-ai-status is-error';
        this.copilotAiStatus.textContent = 'Analisis gagal. Pertanyaan masih ada di kolom tulis; kamu bisa mencoba lagi.';
      }
      this.renderCopilotChatError(answerMessage);
    } finally {
      if (this.btnConsultCopilot) {
        this.btnConsultCopilot.disabled = false;
        this.btnConsultCopilot.innerHTML = '<svg class="ui-icon" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>';
      }
      if (this.copilotInput) this.copilotInput.disabled = false;
      if (this.copilotAccountSelect) this.copilotAccountSelect.disabled = false;
      if (this.copilotNewChatButton) this.copilotNewChatButton.disabled = false;
    }
  }

  appendCopilotUserMessage(query) {
    if (!this.copilotChatFeed) return null;
    const message = document.createElement('article');
    message.className = 'copilot-message copilot-message-user';
    const bubble = document.createElement('div');
    bubble.className = 'copilot-user-bubble';
    const label = document.createElement('span');
    label.className = 'copilot-user-label';
    label.textContent = 'Kamu';
    const text = document.createElement('p');
    text.textContent = query;
    bubble.append(label, text);
    message.appendChild(bubble);
    this.copilotChatFeed.appendChild(message);
    this.scrollCopilotFeedToBottom();
    return message;
  }

  appendCopilotPendingMessage() {
    if (!this.copilotChatFeed) return null;
    const message = document.createElement('article');
    message.className = 'copilot-message copilot-message-assistant is-pending';
    message.setAttribute('aria-label', 'Finance AI sedang menyusun jawaban');
    const avatar = document.createElement('span');
    avatar.className = 'copilot-message-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.innerHTML = '<svg class="ui-icon ui-icon-spark" width="15" height="15" viewBox="0 0 24 24"><path d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C16.5 22 22 16.5 22 12C16.5 12 12 7.5 12 2Z" /></svg>';
    const bubble = document.createElement('div');
    bubble.className = 'copilot-message-bubble';
    const meta = document.createElement('div');
    meta.className = 'copilot-message-meta';
    const name = document.createElement('strong');
    name.textContent = 'Finance AI';
    const state = document.createElement('span');
    state.textContent = 'Sedang berpikir';
    meta.append(name, state);
    const typing = document.createElement('div');
    typing.className = 'copilot-typing-indicator';
    typing.setAttribute('aria-label', 'Sedang menyusun jawaban');
    typing.innerHTML = '<span></span><span></span><span></span>';
    bubble.append(meta, typing);
    message.append(avatar, bubble);
    this.copilotChatFeed.appendChild(message);
    this.scrollCopilotFeedToBottom();
    return message;
  }

  renderCopilotChatError(message) {
    if (!message) return;
    message.classList.remove('is-pending');
    message.classList.add('is-error');
    const bubble = message.querySelector('.copilot-message-bubble');
    if (!bubble) return;
    bubble.replaceChildren();
    const meta = document.createElement('div');
    meta.className = 'copilot-message-meta';
    const name = document.createElement('strong');
    name.textContent = 'Finance AI';
    const state = document.createElement('span');
    state.textContent = 'Belum terkirim';
    meta.append(name, state);
    const copy = document.createElement('p');
    copy.textContent = 'Aku belum bisa menganalisis pertanyaan ini. Coba kirim lagi; teks pertanyaanmu masih ada di kolom tulis.';
    bubble.append(meta, copy);
    message.removeAttribute('aria-label');
    this.scrollCopilotFeedToBottom();
  }

  renderCopilotChatAnswer(message, data) {
    if (!message) return;
    message.classList.remove('is-pending', 'is-error');
    message.removeAttribute('aria-label');
    const bubble = message.querySelector('.copilot-message-bubble');
    if (!bubble) return;
    bubble.replaceChildren();

    const meta = document.createElement('div');
    meta.className = 'copilot-message-meta';
    const name = document.createElement('strong');
    name.textContent = 'Finance AI';
    const state = document.createElement('span');
    const isGenAi = data?.advisor_mode === 'OCI_GENAI';
    state.textContent = isGenAi ? 'OCI GenAI' : 'Perhitungan sistem';
    meta.append(name, state);

    const verdict = document.createElement('span');
    const verdictClass = data?.verdict === 'BERISIKO'
      ? 'is-risk'
      : (data?.verdict === 'PERLU_PERTIMBANGAN' ? 'is-caution' : 'is-safe');
    verdict.className = `copilot-verdict-chip ${verdictClass}`;
    verdict.textContent = String(data?.verdict_badge || 'Panduan keuangan')
      .replace(/^[🟢🟡🔴⚠️💡]\s*/, '').trim();

    const answer = document.createElement('div');
    answer.className = 'copilot-answer-copy';
    const paragraphs = String(data?.advice || 'Belum ada saran yang tersedia.')
      .split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
    paragraphs.forEach((paragraph) => {
      const text = document.createElement('p');
      text.innerHTML = this.formatAiMarkdown(paragraph);
      answer.appendChild(text);
    });

    bubble.append(meta, verdict, answer);
    if (data?.is_purchase && Number(data?.estimated_cost) > 0) {
      const snapshot = data.financial_snapshot || {};
      const impact = document.createElement('div');
      impact.className = 'copilot-impact-row';
      [
        ['Estimasi belanja', this.formatIDR(data.estimated_cost)],
        ['Saldo setelahnya', this.formatIDR(snapshot.saldo_setelah_beli ?? 0)],
        ['Sisa batas', this.formatIDR(snapshot.sisa_anggaran_setelah_beli ?? 0)],
      ].forEach(([label, value]) => {
        const item = document.createElement('div');
        item.className = 'copilot-impact-item';
        const itemLabel = document.createElement('span');
        itemLabel.textContent = label;
        const itemValue = document.createElement('strong');
        itemValue.textContent = value;
        item.append(itemLabel, itemValue);
        impact.appendChild(item);
      });
      bubble.appendChild(impact);
    }

    if (!isGenAi && data?.advisor_notice) {
      const notice = document.createElement('p');
      notice.className = 'copilot-answer-notice';
      notice.innerHTML = this.formatAiMarkdown(data.advisor_notice);
      bubble.appendChild(notice);
    }
    this.scrollCopilotFeedToBottom();
  }

  scrollCopilotFeedToBottom() {
    if (!this.copilotChatFeed) return;
    requestAnimationFrame(() => {
      this.copilotChatFeed.scrollTop = this.copilotChatFeed.scrollHeight;
    });
  }

  resetCopilotConversation() {
    if (!this.copilotChatFeed || !this.copilotWelcomeMarkup) return;
    this.copilotConversation = [];
    this.copilotChatFeed.innerHTML = this.copilotWelcomeMarkup;
    if (this.copilotInput) this.copilotInput.value = '';
    [this.snapAccName, this.snapAccBal, this.snapAccAfter, this.snapBudgetRem, this.snapBudgetAfter, this.snapGoalsStatus]
      .filter(Boolean)
      .forEach((element) => {
        element.textContent = '—';
        element.style.color = '';
      });
    if (this.copilotAiStatus) {
      this.copilotAiStatus.className = 'copilot-ai-status';
      this.copilotAiStatus.textContent = 'Jawaban akan memakai data keuangan terbaru yang tersedia.';
    }
    this.copilotChatFeed.scrollTop = 0;
    this.copilotInput?.focus();
  }

  renderCopilotAdvice(data, chatMessage = null) {
    if (!data) return;

    if (this.copilotAiStatus) {
      const isGenAi = data.advisor_mode === 'OCI_GENAI';
      this.copilotAiStatus.className = `copilot-ai-status ${isGenAi ? 'is-live' : 'is-fallback'}`;
      this.copilotAiStatus.textContent = isGenAi
        ? 'Dianalisis OCI GenAI dengan snapshot keuangan terbaru.'
        : (data.advisor_notice || 'Menggunakan perhitungan sistem; OCI GenAI belum terkonfirmasi tersedia.');
    }

    // Snapshot Breakdown (6 Metrics)
    const snap = data.financial_snapshot || {};
    if (this.snapAccName) this.snapAccName.textContent = snap.rekening_terpilih || '—';
    if (this.snapAccBal) this.snapAccBal.textContent = snap.saldo_saat_ini !== undefined ? this.formatIDR(snap.saldo_saat_ini) : '—';
    if (this.snapAccAfter) {
      this.snapAccAfter.textContent = snap.saldo_setelah_beli !== undefined ? this.formatIDR(snap.saldo_setelah_beli) : '—';
      this.snapAccAfter.style.color = (snap.saldo_setelah_beli || 0) < 0 ? 'var(--accent-rose)' : 'var(--text-primary)';
    }
    if (this.snapBudgetRem) this.snapBudgetRem.textContent = snap.sisa_anggaran_bulan_ini !== undefined ? this.formatIDR(snap.sisa_anggaran_bulan_ini) : '—';
    if (this.snapBudgetAfter) {
      this.snapBudgetAfter.textContent = snap.sisa_anggaran_setelah_beli !== undefined ? this.formatIDR(snap.sisa_anggaran_setelah_beli) : '—';
      this.snapBudgetAfter.style.color = (snap.sisa_anggaran_setelah_beli || 0) < 0 ? 'var(--accent-rose)' : 'var(--text-primary)';
    }
    if (this.snapGoalsStatus) {
      this.snapGoalsStatus.textContent = snap.target_tabungan_aktif !== undefined ? `${snap.target_tabungan_aktif} sasaran aktif` : '—';
    }
    this.renderCopilotChatAnswer(chatMessage, data);
  }

  async handleAnalyzePatterns() {
    if (this.btnAnalyzePatterns) {
      this.btnAnalyzePatterns.disabled = true;
      this.btnAnalyzePatterns.innerHTML = `<span class="loading-spinner"></span> Menganalisis...`;
    }

    try {
      const res = await api.planning.getSpendingPatterns();
      const d = res.data;
      if (this.patternTableBody) {
        this.patternTableBody.innerHTML = '';
        const comps = Array.isArray(d.category_comparisons) ? d.category_comparisons : [];

        if (!comps.length) {
          const row = document.createElement('tr');
          row.innerHTML = '<td colspan="4" class="pattern-empty-state">Belum ada cukup transaksi untuk dibandingkan.</td>';
          this.patternTableBody.appendChild(row);
        }

        comps.forEach((c) => {
          const tr = document.createElement('tr');
          const categoryName = this.escapeHtml(c.category_name || 'Kategori');
          const isPositive = (c.percentage_change || 0) > 0;
          const isNeutral = (c.percentage_change || 0) === 0;
          const badgeClass = isNeutral ? '' : (isPositive ? 'trend-badge-rose' : 'trend-badge-green');
          const prefix = isPositive ? '+' : '';
          const trendText = `${prefix}${c.percentage_change}%`;

          tr.innerHTML = `
            <td><strong>${categoryName}</strong></td>
            <td style="color: var(--text-secondary);">${this.formatIDR(c.prev_spent)}</td>
            <td style="color: var(--text-secondary);">${this.formatIDR(c.curr_spent)}</td>
            <td><span class="${badgeClass}">${trendText}</span></td>
          `;
          this.patternTableBody.appendChild(tr);
        });
      }
    } catch (err) {
      console.warn('Gagal memuat pola pengeluaran:', err);
      if (this.patternTableBody) {
        this.patternTableBody.innerHTML = '<tr><td colspan="4" class="pattern-empty-state">Pola pengeluaran gagal dimuat. Coba analisis ulang.</td></tr>';
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
    const isMobile = window.innerWidth <= 768;
    if (this.reportStatIncome) this.reportStatIncome.textContent = isMobile ? this.formatCompactIDR(data.current_income) : this.formatIDR(data.current_income);
    if (this.reportStatIncomeSub) this.reportStatIncomeSub.textContent = `Dari ${data.income_count} transaksi tercatat`;
    if (this.reportStatExpense) this.reportStatExpense.textContent = isMobile ? this.formatCompactIDR(data.current_expense) : this.formatIDR(data.current_expense);
    if (this.reportStatExpenseSub) {
      if (data.prev_month_expense > 0) {
        const sign = data.expense_change_percent >= 0 ? '+' : '';
        this.reportStatExpenseSub.textContent = `${sign}${data.expense_change_percent}% dari bulan lalu`;
      } else {
        this.reportStatExpenseSub.textContent = `Dari ${data.expense_count} transaksi pengeluaran`;
      }
    }
    if (this.reportStatNet) this.reportStatNet.textContent = isMobile ? this.formatCompactIDR(data.current_net) : this.formatIDR(data.current_net);
    if (this.reportStatNetSub) this.reportStatNetSub.textContent = 'Pemasukan - pengeluaran riil';
    if (this.reportStatRate) this.reportStatRate.textContent = `${(data.savings_rate || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
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

    // 3. 12-Month / 6-Month Grouped Bar Chart
    if (this.reportsBarsContainer && data.monthly_cashflow) {
      this.reportsBarsContainer.innerHTML = '';
      const filterSeries = this.activeChartSeries || 'ALL'; // 'ALL' | 'INCOME' | 'EXPENSE'
      const rangeLimit = this.reportsChartPeriodMonths || 12;
      const cashflowItems = (rangeLimit === 6) ? data.monthly_cashflow.slice(-6) : data.monthly_cashflow;

      let maxVal = 0;
      cashflowItems.forEach((item) => {
        const inc = parseFloat(item.income) || 0;
        const exp = parseFloat(item.expense) || 0;
        if (filterSeries === 'ALL' || filterSeries === 'INCOME') {
          if (inc > maxVal) maxVal = inc;
        }
        if (filterSeries === 'ALL' || filterSeries === 'EXPENSE') {
          if (exp > maxVal) maxVal = exp;
        }
      });
      if (maxVal === 0) maxVal = 1000000;

      const maxChartHeight = 135; // px

      cashflowItems.forEach((item) => {
        const inc = parseFloat(item.income) || 0;
        const exp = parseFloat(item.expense) || 0;
        const incH = Math.min(Math.round((inc / maxVal) * maxChartHeight), maxChartHeight);
        const expH = Math.min(Math.round((exp / maxVal) * maxChartHeight), maxChartHeight);
        const isActive = item.month === data.period_month;

        const showIncome = (filterSeries === 'ALL' || filterSeries === 'INCOME');
        const showExpense = (filterSeries === 'ALL' || filterSeries === 'EXPENSE');
        const singleBarWidth = (!showIncome || !showExpense) ? 'width: 24px;' : '';

        const col = document.createElement('div');
        col.className = 'grouped-month-col';
        col.style.cursor = 'pointer';
        col.title = `${item.month_label} ${item.year}: Masuk ${this.formatIDR(inc)} | Keluar ${this.formatIDR(exp)} (Klik untuk pilih)`;

        col.innerHTML = `
          <div class="grouped-bars-wrapper">
            ${showIncome ? `<div class="bar-income ${isActive ? 'active' : ''}" style="height: ${incH}px; ${singleBarWidth}" title="${item.month_label} Masuk: ${this.formatIDR(inc)}"></div>` : ''}
            ${showExpense ? `<div class="bar-expense ${isActive ? 'active' : ''}" style="height: ${expH}px; ${singleBarWidth}" title="${item.month_label} Keluar: ${this.formatIDR(exp)}"></div>` : ''}
          </div>
          <div class="grouped-month-label ${isActive ? 'active' : ''}">
            <span class="desktop-only-inline">${item.month_label}</span>
            <span class="mobile-only-inline">${(item.month_label || '').charAt(0)}</span>
          </div>
        `;

        col.addEventListener('click', () => {
          this.loadReportsData(item.year, item.month);
        });

        this.reportsBarsContainer.appendChild(col);
      });
    }

    if (this.reportsChartNote) {
      const seriesText = this.activeChartSeries === 'EXPENSE' ? 'pengeluaran' : (this.activeChartSeries === 'INCOME' ? 'pemasukan' : 'arus kas riil');
      const rangeText = (this.reportsChartPeriodMonths === 6) ? '6 bulan terakhir' : `sepanjang tahun ${data.period_year}`;
      this.reportsChartNote.textContent = `Menampilkan data ${seriesText} ${rangeText}.`;
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
          this.openPeriodDetail(y, m);
        });

        this.reportsMonthlyTableBody.appendChild(tr);
      });
    }

    // 4b. Mobile Monthly History List (Matching Figma Screenshot 1)
    if (this.mobileReportsMonthlyList && data.monthly_history && data.monthly_history.length > 0) {
      this.mobileReportsMonthlyList.innerHTML = '';
      data.monthly_history.slice(0, 5).forEach((row) => {
        const div = document.createElement('div');
        div.className = 'mobile-month-history-row';
        const incText = this.formatCompactIDR(row.income).replace('Rp ', 'Masuk ');
        const expText = this.formatCompactIDR(row.expense).replace('Rp ', 'Keluar ');
        div.innerHTML = `
          <span class="mobile-month-name">${row.period_str}</span>
          <span class="mobile-month-inc">${incText}</span>
          <span class="mobile-month-exp">${expText}</span>
        `;
        this.mobileReportsMonthlyList.appendChild(div);
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
  async loadPreferences() {
    try {
      const response = await api.auth.getPreferences();
      this.applyPreferences(response.data || {});
    } catch (err) {
      this.showAlert(`Preferensi tidak dapat dimuat: ${err.message}`, 'error');
    }
  }

  applyPreferences(preferences) {
    this.userPreferences = { ...this.userPreferences, ...preferences };
    this.preferenceToggles?.forEach((toggle) => {
      const key = toggle.getAttribute('data-pref');
      const enabled = Boolean(this.userPreferences[key]);
      toggle.classList.toggle('active', enabled);
      toggle.setAttribute('aria-pressed', String(enabled));
      const status = toggle.closest('.preference-row')?.querySelector('.mobile-pref-tag');
      if (status) {
        status.textContent = key === 'currency-format' ? (enabled ? 'Rp tampil' : 'Rp disembunyikan') : (enabled ? 'Aktif' : 'Nonaktif');
        status.classList.toggle('muted', !enabled);
        status.classList.toggle('green', enabled);
      }
    });
  }

  async loadSessions() {
    if (!this.sessionsList) return;
    this.sessionsList.innerHTML = '<div class="session-loading">Memuat daftar sesi…</div>';
    try {
      const response = await api.auth.getSessions();
      const sessions = response.data || [];
      if (!sessions.length) {
        this.sessionsList.innerHTML = '<div class="session-loading">Tidak ada sesi aktif lain.</div>';
        return;
      }
      this.sessionsList.innerHTML = sessions.map((session) => {
        const ua = this.escapeHtml(session.user_agent || 'Browser tidak diketahui');
        const expiresAt = session.expires_at ? this.formatDateTime(session.expires_at) : 'Waktu tidak tersedia';
        return `<article class="session-card">
          <div class="session-card-head"><strong>${session.is_current ? 'Perangkat ini' : ua}</strong><span class="session-state ${session.is_current ? 'current' : ''}">${session.is_current ? 'Sesi ini' : 'Aktif'}</span></div>
          <p>${session.is_current ? ua : ''}</p>
          <small>Masuk ${this.escapeHtml(this.formatDateTime(session.created_at))} · Berakhir ${this.escapeHtml(expiresAt)} · IP ${this.escapeHtml(session.ip_address || 'tidak tersedia')}</small>
          ${session.is_current ? '' : `<button type="button" class="session-revoke-btn" data-session-id="${Number(session.id)}">Cabut sesi</button>`}
        </article>`;
      }).join('');
      this.sessionsList.querySelectorAll('.session-revoke-btn').forEach((button) => {
        button.addEventListener('click', async () => {
          const id = Number(button.dataset.sessionId);
          if (!id || !window.confirm('Cabut akses perangkat ini?')) return;
          button.disabled = true;
          try {
            await api.auth.revokeSession(id);
            this.showAlert('Sesi perangkat berhasil dicabut.', 'success');
            this.loadSessions();
          } catch (err) {
            button.disabled = false;
            this.showAlert(`Sesi belum bisa dicabut: ${err.message}`, 'error');
          }
        });
      });
    } catch (err) {
      this.sessionsList.innerHTML = `<div class="session-loading session-error">Gagal memuat sesi: ${this.escapeHtml(err.message)} <button type="button" class="session-refresh-btn">Coba lagi</button></div>`;
      this.sessionsList.querySelector('.session-refresh-btn')?.addEventListener('click', () => this.loadSessions());
    }
  }

  formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  async openTwoFactorModal() {
    if (!this.modalTwoFactor) return;
    const button = this.btnToggle2fa;
    if (button) button.disabled = true;
    try {
      const status = await api.auth.getTwoFactorStatus();
      this.twoFactorEnabled = Boolean(status.data?.enabled);
      this.update2faButton(this.twoFactorEnabled);
      if (this.twoFactorSetupFields) this.twoFactorSetupFields.style.display = this.twoFactorEnabled ? 'none' : 'block';
      if (this.twoFactorPasswordField) this.twoFactorPasswordField.style.display = this.twoFactorEnabled ? 'block' : 'none';
      if (this.btnEnableTwoFactor) this.btnEnableTwoFactor.style.display = this.twoFactorEnabled ? 'none' : 'inline-flex';
      if (this.btnDisableTwoFactor) this.btnDisableTwoFactor.style.display = this.twoFactorEnabled ? 'inline-flex' : 'none';
      if (this.twoFactorCode) this.twoFactorCode.value = '';
      if (this.twoFactorPassword) this.twoFactorPassword.value = '';
      if (!this.twoFactorEnabled) {
        const setup = await api.auth.setupTwoFactor();
        if (this.twoFactorSecret) this.twoFactorSecret.value = setup.data?.secret || '';
      }
      this.openModal(this.modalTwoFactor);
    } catch (err) {
      this.showAlert(`Pengaturan 2FA belum dapat dimuat: ${err.message}`, 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  async enableTwoFactor() {
    const secret = this.twoFactorSecret?.value || '';
    const code = this.twoFactorCode?.value.trim() || '';
    if (!secret || !/^\d{6}$/.test(code)) {
      this.showAlert('Masukkan kode 6 digit dari aplikasi authenticator.', 'warning');
      return;
    }
    this.btnEnableTwoFactor.disabled = true;
    try {
      await api.auth.enableTwoFactor(secret, code);
      this.twoFactorEnabled = true;
      this.update2faButton(true);
      this.closeModals();
      this.showAlert('2FA aktif. Login berikutnya akan meminta kode authenticator.', 'success');
    } catch (err) {
      this.showAlert(`2FA belum aktif: ${err.message}`, 'error');
    } finally {
      this.btnEnableTwoFactor.disabled = false;
    }
  }

  async disableTwoFactor() {
    const password = this.twoFactorPassword?.value || '';
    const code = this.twoFactorCode?.value.trim() || '';
    if (!password || !/^\d{6}$/.test(code)) {
      this.showAlert('Masukkan kata sandi dan kode authenticator terbaru.', 'warning');
      return;
    }
    this.btnDisableTwoFactor.disabled = true;
    try {
      await api.auth.disableTwoFactor(password, code);
      this.twoFactorEnabled = false;
      this.update2faButton(false);
      this.closeModals();
      this.showAlert('2FA dinonaktifkan.', 'success');
    } catch (err) {
      this.showAlert(`2FA belum dinonaktifkan: ${err.message}`, 'error');
    } finally {
      this.btnDisableTwoFactor.disabled = false;
    }
  }

  update2faButton(isActive) {
    if (!this.btnToggle2fa) return;
    if (isActive) {
      this.btnToggle2fa.textContent = 'Aktif (TOTP)';
      this.btnToggle2fa.style.color = '#2D7653';
      this.btnToggle2fa.style.background = '#EAF4EE';
      this.btnToggle2fa.style.border = '1px solid #5A9976';
      this.btnToggle2fa.style.padding = '3px 8px';
      this.btnToggle2fa.style.borderRadius = '6px';
    } else {
      this.btnToggle2fa.textContent = 'Belum aktif';
      this.btnToggle2fa.style.color = '';
      this.btnToggle2fa.style.background = '';
      this.btnToggle2fa.style.border = '';
      this.btnToggle2fa.style.padding = '';
      this.btnToggle2fa.style.borderRadius = '';
    }
  }

  loadSettingsData() {
    this.loadPreferences();
    const displayName = (this.currentUser && (this.currentUser.full_name || this.currentUser.username))
      || localStorage.getItem('user_fullname')
      || 'Pengguna';
    const displayEmail = this.currentUser?.username ? `@${this.currentUser.username}` : 'Username akun';

    if (this.settingsProfileName) this.settingsProfileName.textContent = displayName;
    if (this.settingsAvatarInitial) this.settingsAvatarInitial.textContent = displayName[0].toUpperCase();
    if (this.usernameDisplay) this.usernameDisplay.textContent = displayName.split(' ')[0];
    if (this.desktopGreetingName) this.desktopGreetingName.textContent = displayName.split(' ')[0];
    if (this.userAvatarInitial) this.userAvatarInitial.textContent = displayName[0].toUpperCase();
    if (this.inputProfileFullname) this.inputProfileFullname.value = displayName;

    if (this.settingsProfileEmail) this.settingsProfileEmail.textContent = displayEmail;
    if (this.inputProfileEmail) this.inputProfileEmail.value = displayEmail;

    api.auth.getTwoFactorStatus().then((response) => {
      this.twoFactorEnabled = Boolean(response.data?.enabled);
      this.update2faButton(this.twoFactorEnabled);
    }).catch((err) => {
      if (this.btnToggle2fa) {
        this.btnToggle2fa.textContent = 'Status tidak tersedia';
        this.btnToggle2fa.disabled = true;
      }
      console.warn('Status 2FA tidak dapat dimuat:', err.message);
    });

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

        let subText = `${acc.type || 'Rekening aktif'} · ${this.formatIDR(acc.balance || 0)}`;
        if (window.innerWidth <= 768) {
          if (nameLower.includes('bca') || acc.type === 'CHECKING') subText = 'Rekening utama';
          else if (nameLower.includes('gopay') || acc.type === 'EWALLET') subText = 'E-wallet harian';
          else if (nameLower.includes('kas') || nameLower.includes('tunai') || acc.type === 'CASH') subText = 'Uang tunai';
        }

        const row = document.createElement('div');
        row.className = 'connected-acc-row';
        row.innerHTML = `
          <div class="connected-acc-left">
            <div class="connected-acc-icon ${iconClass}">${iconSvg}</div>
            <div>
              <div class="connected-acc-type">${acc.name}</div>
              <div class="connected-acc-nickname">${subText}</div>
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

  // ================================================================
  // NOTIFICATION CENTER SYSTEM (Real-time dynamic financial alerts)
  // ================================================================
  toggleNotificationCenter() {
    if (!this.transaksiNotifPopover) return;
    const isOpen = this.transaksiNotifPopover.classList.contains('active');
    if (isOpen) {
      this.closeNotificationCenter();
    } else {
      this.openNotificationCenter();
    }
  }

  openNotificationCenter() {
    if (!this.transaksiNotifPopover) return;
    this.renderNotifications();
    this.transaksiNotifPopover.classList.add('active');
    if (this.notifBackdrop) this.notifBackdrop.style.display = 'block';
  }

  closeNotificationCenter() {
    if (this.transaksiNotifPopover) {
      this.transaksiNotifPopover.classList.remove('active');
    }
    if (this.notifBackdrop) {
      this.notifBackdrop.style.display = 'none';
    }
  }

  markAllNotificationsRead() {
    this.notificationsRead = true;
    try {
      localStorage.setItem('pf_notifications_read', '1');
    } catch (_) {}
    if (this.transaksiBellDot) this.transaksiBellDot.style.display = 'none';
    const mobileDot = document.querySelector('.notif-badge-dot');
    if (mobileDot) mobileDot.style.display = 'none';
    if (this.notifUnreadBadge) this.notifUnreadBadge.textContent = 'Semua dibaca';
    if (this.notifItemsList) {
      this.notifItemsList.querySelectorAll('.notif-item').forEach((item) => {
        item.classList.remove('unread');
      });
    }
  }

  renderNotifications() {
    if (!this.notifItemsList) return;

    const draftCount = (this.currentBatch && this.currentBatch.drafts) ? this.currentBatch.drafts.length : 0;
    const netWorthStr = this.formatIDR(this.currentNetWorthValue || 0);
    const accCount = (this.accounts || []).length;
    const txCount = (this.transactions || []).length;
    const isRead = this.notificationsRead;

    const unreadCount = isRead ? 0 : (draftCount > 0 ? 4 : 3);
    if (this.notifUnreadBadge) {
      this.notifUnreadBadge.textContent = unreadCount > 0 ? `${unreadCount} baru` : 'Semua dibaca';
    }
    if (this.transaksiBellDot) {
      this.transaksiBellDot.style.display = unreadCount > 0 ? 'block' : 'none';
    }
    const mobileDot = document.querySelector('.notif-badge-dot');
    if (mobileDot) {
      mobileDot.style.display = unreadCount > 0 ? 'block' : 'none';
    }

    const items = [];

    // 1. AI Draft Activity
    if (draftCount > 0) {
      items.push({
        action: 'drafts',
        iconClass: 'green',
        iconSvg: Icons.check,
        title: `Draft Transaksi AI (${draftCount} menunggu)`,
        time: 'Baru saja',
        desc: `Ada ${draftCount} draft mutasi yang siap kamu tinjau dan simpan ke buku besar.`,
        unread: !isRead,
      });
    } else {
      items.push({
        action: 'mutasi',
        iconClass: 'green',
        iconSvg: Icons.brand,
        title: 'Pencatatan AI Siap',
        time: 'Aktif',
        desc: 'Tulis atau rekam suara transaksi kamu di formulir Ceritakan Transaksimu.',
        unread: false,
      });
    }

    // 2. Liquid Net Worth & Accounts
    items.push({
      action: 'dashboard',
      iconClass: 'blue',
      iconSvg: Icons.bank,
      title: 'Posisi Kas Likuid Real-Time',
      time: 'Hari ini',
      desc: `Total kas likuid kamu saat ini ${netWorthStr} terhubung ke ${accCount} rekening aktif.`,
      unread: !isRead,
    });

    // 3. Transactions Activity
    items.push({
      action: 'mutasi',
      iconClass: 'amber',
      iconSvg: Icons.arrowRight,
      title: 'Aktivitas Transaksi Buku Besar',
      time: 'Oktober 2026',
      desc: `${txCount} transaksi tercatat dan tersinkronisasi di sistem buku besar.`,
      unread: !isRead,
    });

    // 4. AI Advisory Copilot
    items.push({
      action: 'copilot',
      iconClass: 'purple',
      iconSvg: Icons.target,
      title: 'Penasehat Finansial AI',
      time: 'Rekomendasi',
      desc: 'Konsultasikan anggaran belanja atau simulasi keuangan kamu ke AI Advisor.',
      unread: !isRead,
    });

    // 5. Security & Session
    items.push({
      action: 'settings',
      iconClass: 'green',
      iconSvg: Icons.shield,
      title: 'Sistem Terproteksi OCI',
      time: 'Terverifikasi',
      desc: 'Server aktif terhubung dengan proteksi sesi Argon2id & CSRF Bearer token.',
      unread: false,
    });

    this.notifItemsList.innerHTML = items.map((item) => `
      <div class="notif-item ${item.unread ? 'unread' : ''}" data-notif-action="${item.action}">
        <div class="notif-item-icon ${item.iconClass}">
          ${item.iconSvg}
        </div>
        <div class="notif-item-content">
          <div class="notif-item-top">
            <span class="notif-item-title">${item.title}</span>
            <span class="notif-item-time">${item.time}</span>
          </div>
          <p class="notif-item-desc">${item.desc}</p>
        </div>
        <span class="notif-item-dot"></span>
      </div>
    `).join('');

    this.notifItemsList.querySelectorAll('.notif-item').forEach((el) => {
      el.addEventListener('click', () => {
        const action = el.getAttribute('data-notif-action');
        this.handleNotificationAction(action);
      });
    });
  }

  handleNotificationAction(action) {
    this.closeNotificationCenter();
    if (action === 'drafts') {
      this.switchTab('tab-mutasi');
      const draftEl = document.getElementById('draft-section');
      if (draftEl) {
        draftEl.style.display = 'block';
        draftEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (action === 'mutasi') {
      this.switchTab('tab-mutasi');
    } else if (action === 'copilot') {
      this.switchTab('tab-copilot');
    } else if (action === 'dashboard') {
      this.switchTab('tab-dashboard');
    } else if (action === 'settings') {
      this.switchTab('tab-settings');
    }
  }
}

// Bootstrapping
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

