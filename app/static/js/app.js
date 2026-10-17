/**
 * Personal Finance AI Agent - Main Application Logic v2.3
 * Single Page Application state management, UI rendering, OCI Speech polling,
 * Financial Planning & AI Advisory Copilot (Phase 7).
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
    // Auth & Navigation
    this.authOverlay = document.getElementById('auth-overlay');
    this.loginForm = document.getElementById('login-form');
    this.loginUsername = document.getElementById('login-username');
    this.loginPassword = document.getElementById('login-password');
    this.loginError = document.getElementById('login-error');

    this.userPill = document.getElementById('user-pill');
    this.usernameDisplay = document.getElementById('username-display');
    this.btnLogout = document.getElementById('btn-logout');

    this.tabBtns = document.querySelectorAll('.tab-btn');
    this.tabContents = document.querySelectorAll('.tab-content');

    // Tab 1: Dashboard Mutasi & Accounts
    this.accountsContainer = document.getElementById('accounts-container');
    this.totalNetWorth = document.getElementById('total-net-worth');

    this.aiInput = document.getElementById('ai-input');
    this.btnParse = document.getElementById('btn-parse');
    this.btnRecord = document.getElementById('btn-record');
    this.recordStatus = document.getElementById('record-status');

    this.draftSection = document.getElementById('draft-section');
    this.draftBatchId = document.getElementById('draft-batch-id');
    this.draftTableBody = document.getElementById('draft-table-body');
    this.btnConfirmBatch = document.getElementById('btn-confirm-batch');

    this.historyTableBody = document.getElementById('history-table-body');
    this.alertBox = document.getElementById('alert-box');

    // Tab 2: Planning & Budgets
    this.btnOpenSetBudget = document.getElementById('btn-open-set-budget');
    this.btnOpenCatBudget = document.getElementById('btn-open-cat-budget');
    this.btnOpenCreateGoal = document.getElementById('btn-open-create-goal');

    this.budgetPeriodLabel = document.getElementById('budget-period-label');
    this.budgetTotalLimit = document.getElementById('budget-total-limit');
    this.budgetTotalSpent = document.getElementById('budget-total-spent');
    this.budgetTotalRemaining = document.getElementById('budget-total-remaining');
    this.budgetPercentLabel = document.getElementById('budget-percent-label');
    this.budgetProgressBar = document.getElementById('budget-progress-bar');
    this.categoryBudgetsList = document.getElementById('category-budgets-list');
    this.savingsGoalsContainer = document.getElementById('savings-goals-container');

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
  }

  attachEventListeners() {
    this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    this.btnLogout.addEventListener('click', () => this.handleLogout());

    // Tab Navigation
    this.tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Tab 1 Events
    this.btnParse.addEventListener('click', () => this.handleAIParse());
    this.btnRecord.addEventListener('click', () => this.toggleRecording());
    this.btnConfirmBatch.addEventListener('click', () => this.handleConfirmBatch());

    this.aiInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        this.handleAIParse();
      }
    });

    // Tab 2 Events & Modals
    if (this.btnOpenSetBudget) {
      this.btnOpenSetBudget.addEventListener('click', () => this.openModal(this.modalSetBudget));
    }
    if (this.btnOpenCatBudget) {
      this.btnOpenCatBudget.addEventListener('click', () => {
        this.populateCatSelect();
        this.openModal(this.modalSetCatBudget);
      });
    }
    if (this.btnOpenCreateGoal) {
      this.btnOpenCreateGoal.addEventListener('click', () => {
        this.populateGoalAccSelect();
        this.openModal(this.modalCreateGoal);
      });
    }

    // Modal Close Triggers
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

    // Tab 3 Events
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
    this.tabBtns.forEach((b) => {
      if (b.getAttribute('data-tab') === tabId) b.classList.add('active');
      else b.classList.remove('active');
    });
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
    if (this.modalSetBudget) this.modalSetBudget.style.display = 'none';
    if (this.modalSetCatBudget) this.modalSetCatBudget.style.display = 'none';
    if (this.modalCreateGoal) this.modalCreateGoal.style.display = 'none';
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
    this.usernameDisplay.textContent = this.currentUser.username;
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
      const res = await api.transactions.list(30, 0);
      this.transactions = res.data || [];
      this.renderHistory();
    } catch (err) {
      console.warn('Gagal memuat riwayat:', err);
    }
  }

  renderAccounts() {
    this.accountsContainer.innerHTML = '';
    let totalBal = 0;

    this.accounts.forEach((acc) => {
      const bal = parseFloat(acc.current_balance);
      totalBal += bal;

      const isNegative = bal < 0;
      const card = document.createElement('div');
      card.className = 'account-card';

      card.innerHTML = `
        <div class="account-top">
          <span class="account-name">
            ${acc.name}
            <span class="account-type-tag">${acc.type}</span>
          </span>
        </div>
        <div class="account-balance ${isNegative ? 'negative' : ''}">
          ${this.formatIDR(bal)}
        </div>
        ${isNegative ? `
          <div class="warning-pill">
            ⚠️ Perhatian: Saldo Akun Negatif
          </div>
        ` : ''}
      `;
      this.accountsContainer.appendChild(card);
    });

    this.totalNetWorth.textContent = this.formatIDR(totalBal);
    this.totalNetWorth.className = totalBal < 0 ? 'account-balance negative' : 'account-balance';
  }

  renderHistory() {
    this.historyTableBody.innerHTML = '';
    if (this.transactions.length === 0) {
      this.historyTableBody.innerHTML = `
        <tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2rem;">
          Belum ada transaksi di buku besar.
        </td></tr>
      `;
      return;
    }

    this.transactions.forEach((tx) => {
      const tr = document.createElement('tr');
      const isRev = tx.is_reversal;
      const role = tx.ledger_role;

      let badgeClass = 'badge-expense';
      if (isRev) badgeClass = 'badge-reversal';
      else if (tx.type === 'INCOME') badgeClass = 'badge-income';
      else if (tx.type === 'TRANSFER') badgeClass = 'badge-transfer';

      let accountsDisplay = '-';
      if (tx.type === 'EXPENSE') accountsDisplay = `${tx.source_account_name || 'Rekening'}`;
      else if (tx.type === 'INCOME') accountsDisplay = `${tx.destination_account_name || 'Rekening'}`;
      else if (tx.type === 'TRANSFER') accountsDisplay = `${tx.source_account_name} ➔ ${tx.destination_account_name}`;

      tr.innerHTML = `
        <td><span class="badge ${badgeClass}">${isRev ? 'REVERSAL' : tx.type}</span></td>
        <td><strong>${this.formatIDR(tx.amount)}</strong></td>
        <td>${accountsDisplay}</td>
        <td>${tx.category_name || '-'}</td>
        <td>${tx.description || '-'}</td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${tx.transaction_date}</td>
        <td>
          ${!isRev && role !== 'ADMIN_FEE' ? `
            <button class="btn btn-danger btn-reverse" style="padding: 3px 8px; font-size: 0.75rem;" data-id="${tx.id}">
              Balikkan
            </button>
          ` : '-'}
        </td>
      `;

      const btnRev = tr.querySelector('.btn-reverse');
      if (btnRev) {
        btnRev.addEventListener('click', () => this.handleReverse(tx.id));
      }

      this.historyTableBody.appendChild(tr);
    });
  }

  async handleReverse(txId) {
    const reason = prompt('Masukkan alasan jurnal pembalik (reversal):', 'Koreksi pencatatan');
    if (!reason) return;

    try {
      const res = await api.transactions.reverse(txId, reason);
      this.showAlert(res.message || 'Jurnal pembalik berhasil diterbitkan.', 'success');
      await Promise.all([this.loadAccounts(), this.loadHistory()]);
      if (this.currentTab === 'tab-planning') this.loadPlanningData();
    } catch (err) {
      this.showAlert(`Gagal membalik transaksi: ${err.message}`, 'error');
    }
  }

  // ==========================================
  // AI & Voice Flow (Tab 1)
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
      this.btnParse.innerHTML = `✨ Proses Mutasi AI`;
    }
  }

  renderDrafts() {
    if (!this.currentBatch || this.currentBatch.drafts.length === 0) {
      this.draftSection.style.display = 'none';
      return;
    }

    this.draftSection.style.display = 'block';
    this.draftBatchId.textContent = `Batch ID: ${this.currentBatch.batch_id.slice(0, 8)}...`;
    this.draftTableBody.innerHTML = '';

    const pendingDrafts = this.currentBatch.drafts.filter((d) => d.status === 'PENDING');
    if (pendingDrafts.length === 0) {
      this.draftSection.style.display = 'none';
      return;
    }

    pendingDrafts.forEach((d) => {
      const tr = document.createElement('tr');
      const badgeClass = d.type === 'INCOME' ? 'badge-income' : (d.type === 'TRANSFER' ? 'badge-transfer' : 'badge-expense');

      let accText = '-';
      if (d.type === 'EXPENSE') accText = `Dari: ${d.source_account_name || 'Default'}`;
      else if (d.type === 'INCOME') accText = `Ke: ${d.destination_account_name || 'Default'}`;
      else if (d.type === 'TRANSFER') accText = `${d.source_account_name} ➔ ${d.destination_account_name} (Admin: ${this.formatIDR(d.admin_fee)})`;

      tr.innerHTML = `
        <td><span class="badge ${badgeClass}">${d.type}</span></td>
        <td><strong>${this.formatIDR(d.amount)}</strong></td>
        <td>${accText}</td>
        <td>${d.category_name || '-'}</td>
        <td>${d.description || '-'}</td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${d.transaction_date}</td>
        <td>
          <button class="btn btn-secondary btn-cancel-draft" style="padding: 2px 7px; font-size: 0.75rem;" data-id="${d.id}">
            Batal
          </button>
        </td>
      `;

      tr.querySelector('.btn-cancel-draft').addEventListener('click', () => this.handleCancelDraft(d.id));
      this.draftTableBody.appendChild(tr);
    });
  }

  async handleCancelDraft(draftId) {
    try {
      await api.transactions.cancelDraft(draftId);
      this.currentBatch.drafts = this.currentBatch.drafts.filter((d) => d.id !== draftId);
      this.renderDrafts();
      this.showAlert('Draft item dibatalkan.', 'info');
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
      this.draftSection.style.display = 'none';
      this.aiInput.value = '';

      await Promise.all([this.loadAccounts(), this.loadHistory()]);
      if (this.currentTab === 'tab-planning') this.loadPlanningData();
    } catch (err) {
      this.showAlert(`Gagal konfirmasi batch: ${err.message}`, 'error');
    } finally {
      this.btnConfirmBatch.disabled = false;
      this.btnConfirmBatch.innerHTML = `✅ Konfirmasi Seluruh Transaksi`;
    }
  }

  // Voice Recording Flow
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
      this.btnRecord.innerHTML = `⏹ Berhenti Merekam`;
      this.recordStatus.textContent = 'Merekam suara (Maksimal 30 detik)...';
    } else {
      this.btnRecord.classList.remove('recording');
      this.btnRecord.innerHTML = `🎤 Rekam Suara`;
      this.recordStatus.textContent = '';
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
      this.recordStatus.textContent = '';
      this.btnRecord.disabled = false;
    }
  }

  async pollTranscription(jobId) {
    const startTime = Date.now();
    const maxPollTimeMs = 90 * 1000;
    this.recordStatus.innerHTML = `<span class="loading-spinner"></span> Menerjemahkan suara (OCI Whisper Medium)...`;

    const pollInterval = setInterval(async () => {
      if (Date.now() - startTime > maxPollTimeMs) {
        clearInterval(pollInterval);
        this.recordStatus.textContent = '';
        this.btnRecord.disabled = false;
        this.showAlert('Transkripsi suara timeout (melebihi 90 detik). Silakan coba lagi.', 'error');
        return;
      }

      try {
        const res = await api.speech.getStatus(jobId);
        const data = res.data;

        if (data.status === 'SUCCEEDED') {
          clearInterval(pollInterval);
          this.recordStatus.textContent = '';
          this.btnRecord.disabled = false;

          const transcript = data.transcript || '';
          if (transcript) {
            this.aiInput.value = transcript;
            this.showAlert('Suara berhasil ditranskrip! Silakan tinjau sebelum menekan tombol Proses.', 'success');
            this.aiInput.focus();
          } else {
            this.showAlert('Tidak ada suara terdeteksi dalam rekaman.', 'warning');
          }
        } else if (data.status === 'FAILED') {
          clearInterval(pollInterval);
          this.recordStatus.textContent = '';
          this.btnRecord.disabled = false;
          this.showAlert(`Transkripsi gagal: ${data.error_message || 'Terjadi kesalahan sistem.'}`, 'error');
        }
      } catch (err) {
        console.warn('Polling error:', err);
      }
    }, 2500);
  }

  // ==========================================
  // TAB 2: ANGGARAN & TARGET TABUNGAN (FASE 7)
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
      this.showAlert(`Gagal memuat anggaran: ${err.message}`, 'error');
    }
  }

  renderBudgetOverview() {
    if (!this.budgetData) return;
    const b = this.budgetData;
    const monthNames = [
      '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    if (this.budgetPeriodLabel) {
      this.budgetPeriodLabel.textContent = `Periode: ${monthNames[b.period_month] || b.period_month} ${b.period_year}`;
    }

    if (this.budgetTotalLimit) this.budgetTotalLimit.textContent = this.formatIDR(b.total_limit);
    if (this.budgetTotalSpent) this.budgetTotalSpent.textContent = this.formatIDR(b.total_spent);
    if (this.budgetTotalRemaining) {
      this.budgetTotalRemaining.textContent = this.formatIDR(b.total_remaining);
      this.budgetTotalRemaining.style.color = b.is_over ? '#f43f5e' : '#10b981';
    }

    const pct = Math.min(Math.round(b.percentage_spent || 0), 100);
    if (this.budgetPercentLabel) this.budgetPercentLabel.textContent = `${b.percentage_spent}%`;

    if (this.budgetProgressBar) {
      this.budgetProgressBar.style.width = `${pct}%`;
      this.budgetProgressBar.className = 'progress-fill';
      if (b.percentage_spent > 100) {
        this.budgetProgressBar.classList.add('fill-danger');
      } else if (b.percentage_spent >= 80) {
        this.budgetProgressBar.classList.add('fill-warning');
      } else {
        this.budgetProgressBar.classList.add('fill-safe');
      }
    }

    // Breakdown Kategori
    if (this.categoryBudgetsList) {
      this.categoryBudgetsList.innerHTML = '';
      if (!b.categories || b.categories.length === 0) {
        this.categoryBudgetsList.innerHTML = `
          <div style="color: var(--text-dim); font-size: 0.85rem;">
            Belum ada batas per kategori. Klik tombol <strong>"➕ Limit Kategori"</strong> di atas untuk menambahkan pembatasan.
          </div>
        `;
      } else {
        b.categories.forEach((cat) => {
          const catPct = Math.min(Math.round(cat.percentage_spent || 0), 100);
          let catFillClass = 'fill-safe';
          if (cat.percentage_spent > 100) catFillClass = 'fill-danger';
          else if (cat.percentage_spent >= 80) catFillClass = 'fill-warning';

          const row = document.createElement('div');
          row.className = 'glass-panel';
          row.style.padding = '0.85rem 1.15rem';
          row.style.background = 'rgba(12, 17, 29, 0.5)';

          row.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <span style="font-weight: 600; font-size: 0.9rem;">${cat.category_name}</span>
              <span style="font-size: 0.82rem; color: var(--text-muted);">
                ${this.formatIDR(cat.spent_amount)} / <strong>${this.formatIDR(cat.limit_amount)}</strong>
                (${cat.percentage_spent}%)
              </span>
            </div>
            <div class="progress-container" style="height: 8px;">
              <div class="progress-fill ${catFillClass}" style="width: ${catPct}%;"></div>
            </div>
            ${cat.is_over ? `<div style="font-size: 0.75rem; color: #f43f5e; margin-top: 0.3rem;">⚠️ Melebihi batas anggaran sebesar ${this.formatIDR(cat.spent_amount - cat.limit_amount)}</div>` : ''}
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
        <div style="color: var(--text-dim); font-size: 0.85rem; grid-column: 1 / -1; padding: 1rem 0;">
          Belum ada target tabungan yang dibuat. Tekan tombol <strong>"➕ Target Baru"</strong> untuk memantau tabungan impian Anda secara otomatis!
        </div>
      `;
      return;
    }

    this.savingsGoals.forEach((g) => {
      const card = document.createElement('div');
      card.className = 'goal-card';
      const pct = Math.min(Math.round(g.progress_percent || 0), 100);

      let statusTag = '';
      if (g.status === 'ACHIEVED' || g.is_achieved) {
        statusTag = '<span class="goal-tag tag-achieved">🎉 TERCAPAI</span>';
      } else if (g.status === 'CANCELLED') {
        statusTag = '<span class="goal-tag" style="background: rgba(244, 63, 94, 0.2); color: #f43f5e;">DIBATALKAN</span>';
      } else {
        statusTag = '<span class="goal-tag tag-active">BERJALAN</span>';
      }

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <div>
            <h4 style="font-size: 1.05rem; margin-bottom: 0.2rem;">${g.name}</h4>
            <span style="font-size: 0.78rem; color: var(--text-dim);">Rekening: <strong>${g.account_name}</strong></span>
          </div>
          ${statusTag}
        </div>

        <div style="margin-top: 0.75rem; margin-bottom: 0.75rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.25rem;">
            <span style="color: var(--text-muted);">Terkumpul: <strong>${this.formatIDR(g.current_balance)}</strong></span>
            <span style="color: var(--text-dim);">Sasaran: <strong>${this.formatIDR(g.target_amount)}</strong></span>
          </div>
          <div class="progress-container" style="height: 10px;">
            <div class="progress-fill ${g.is_achieved ? 'fill-safe' : 'fill-warning'}" style="width: ${pct}%;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-dim); margin-top: 0.35rem;">
            <span>Progres: ${g.progress_percent}%</span>
            ${g.target_date ? `<span>Tenggat: ${g.target_date}</span>` : '<span>Tanpa batas waktu</span>'}
          </div>
        </div>

        ${g.status === 'ACTIVE' ? `
          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem;">
            <button class="btn btn-secondary btn-mark-achieved" data-id="${g.id}" style="padding: 3px 8px; font-size: 0.75rem;">
              Tandai Tercapai
            </button>
            <button class="btn btn-danger btn-cancel-goal" data-id="${g.id}" style="padding: 3px 8px; font-size: 0.75rem;">
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
      this.showAlert(`Gagal mengubah status target: ${err.message}`, 'error');
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
  // TAB 3: PENASIHAT KEUANGAN AI & ADVISORY
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
      console.warn('Gagal memuat riwayat skenario:', err);
    }
  }

  renderScenarios() {
    if (!this.scenariosList) return;
    this.scenariosList.innerHTML = '';

    if (this.scenarios.length === 0) {
      this.scenariosList.innerHTML = `
        <div style="color: var(--text-dim); font-size: 0.85rem; padding: 0.5rem 0;">
          Belum ada riwayat skenario pembelian yang tersimpan.
        </div>
      `;
      return;
    }

    this.scenarios.forEach((s) => {
      const row = document.createElement('div');
      row.className = 'glass-panel';
      row.style.padding = '0.85rem 1rem';
      row.style.background = 'rgba(12, 17, 29, 0.55)';

      const dateStr = s.created_at ? s.created_at.slice(0, 16).replace('T', ' ') : '-';
      row.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
          <strong style="font-size: 0.95rem;">${s.item_name}</strong>
          <span style="font-weight: 600; color: #f43f5e;">${this.formatIDR(s.estimated_cost)}</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-main); line-height: 1.5; margin-bottom: 0.4rem; white-space: pre-line;">
          ${s.ai_summary_advice}
        </p>
        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-dim);">
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
    this.btnConsultCopilot.innerHTML = `<span class="loading-spinner"></span> Menganalisis Dampak Finansial...`;

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
          <span class="snapshot-val" style="color: ${snap.saldo_setelah_beli < 0 ? '#f43f5e' : '#10b981'}">
            ${this.formatIDR(snap.saldo_setelah_beli)}
          </span>
        </div>
        <div class="snapshot-card">
          <span class="snapshot-label">Sisa Anggaran Bulan Ini</span>
          <span class="snapshot-val">${this.formatIDR(snap.sisa_anggaran_bulan_ini)}</span>
        </div>
        <div class="snapshot-card">
          <span class="snapshot-label">Sisa Anggaran Pasca Beli</span>
          <span class="snapshot-val" style="color: ${snap.sisa_anggaran_setelah_beli < 0 ? '#f43f5e' : '#10b981'}">
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
    this.btnAnalyzePatterns.innerHTML = `<span class="loading-spinner"></span> Mendeteksi Pola Pengeluaran...`;

    try {
      const res = await api.planning.getSpendingPatterns();
      const d = res.data;
      if (this.patternResult) this.patternResult.style.display = 'block';
      if (this.patternAiText) this.patternAiText.textContent = d.ai_summary;

      if (this.patternTableBody) {
        this.patternTableBody.innerHTML = '';
        if (!d.category_comparisons || d.category_comparisons.length === 0) {
          this.patternTableBody.innerHTML = `
            <tr><td colspan="5" style="text-align: center; color: var(--text-dim); padding: 1.5rem;">
              Belum cukup transaksi untuk perbandingan pola pengeluaran.
            </td></tr>
          `;
        } else {
          d.category_comparisons.forEach((c) => {
            const tr = document.createElement('tr');
            const diff = parseFloat(c.diff) || 0;
            const pct = c.percentage_change || 0;
            const isIncrease = diff > 0;
            const changeColor = diff === 0 ? 'var(--text-muted)' : (isIncrease ? '#f43f5e' : '#10b981');
            const arrow = diff === 0 ? '➖' : (isIncrease ? '📈 Naik' : '📉 Turun');

            tr.innerHTML = `
              <td><strong>${c.category_name}</strong></td>
              <td>${this.formatIDR(c.prev_spent)}</td>
              <td>${this.formatIDR(c.curr_spent)}</td>
              <td style="color: ${changeColor}">${diff > 0 ? '+' : ''}${this.formatIDR(diff)}</td>
              <td style="color: ${changeColor}; font-size: 0.82rem;">${arrow} ${pct}%</td>
            `;
            this.patternTableBody.appendChild(tr);
          });
        }
      }
      this.showAlert('Analisis perbandingan pengeluaran berhasil disusun!', 'success');
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
