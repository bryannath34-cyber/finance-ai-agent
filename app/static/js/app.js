/**
 * Personal Finance AI Agent - Main Application Logic v2.3
 * Single Page Application state management, UI rendering, OCI Speech polling, & batch flows.
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

    this.recorder = new AudioRecorder({
      maxDurationSeconds: 30,
      onStateChange: (isRecording) => this.handleRecordingState(isRecording),
    });

    this.initElements();
    this.attachEventListeners();
    this.checkSession();
  }

  initElements() {
    this.authOverlay = document.getElementById('auth-overlay');
    this.loginForm = document.getElementById('login-form');
    this.loginUsername = document.getElementById('login-username');
    this.loginPassword = document.getElementById('login-password');
    this.loginError = document.getElementById('login-error');

    this.userPill = document.getElementById('user-pill');
    this.usernameDisplay = document.getElementById('username-display');
    this.btnLogout = document.getElementById('btn-logout');

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
  }

  attachEventListeners() {
    this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    this.btnLogout.addEventListener('click', () => this.handleLogout());

    this.btnParse.addEventListener('click', () => this.handleAIParse());
    this.btnRecord.addEventListener('click', () => this.toggleRecording());
    this.btnConfirmBatch.addEventListener('click', () => this.handleConfirmBatch());

    // Enter + Ctrl/Cmd to quickly parse text
    this.aiInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        this.handleAIParse();
      }
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
      this.currentUser = res.data.user;
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
      console.warn("Logout error:", e);
    }
    this.currentUser = null;
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
    } catch (err) {
      this.showAlert(`Gagal memuat rekening: ${err.message}`, 'error');
    }
  }

  async loadCategories() {
    try {
      const res = await api.categories.list();
      this.categories = res.data || [];
    } catch (err) {
      console.warn("Gagal memuat kategori:", err);
    }
  }

  async loadHistory() {
    try {
      const res = await api.transactions.list(30, 0);
      this.transactions = res.data || [];
      this.renderHistory();
    } catch (err) {
      console.warn("Gagal memuat riwayat:", err);
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
    } catch (err) {
      this.showAlert(`Gagal membalik transaksi: ${err.message}`, 'error');
    }
  }

  // AI & Voice Flow
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
    const maxPollTimeMs = 90 * 1000; // 90 seconds timeout
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
            // Voice Workflow Transparan: isi ke kotak input teks agar dapat disunting manual
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
        console.warn("Polling error:", err);
      }
    }, 2500);
  }
}

// Bootstrapping
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
