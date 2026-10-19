-- ============================================================================
-- 1. PEMBUATAN USER RUNTIME
-- Host menggunakan subnet privat '10.10.2.%' [DEFAULT]
-- Catatan Keamanan: Ganti '<PASSWORD_DARI_OCI_VAULT>' dengan password kuat
-- JANGAN PERNAH menyimpan plaintext password di file script repository publik!
-- ============================================================================
CREATE USER IF NOT EXISTS 'fin_bot_app'@'10.10.2.%' 
IDENTIFIED BY '<PASSWORD_DARI_OCI_VAULT>' 
REQUIRE SSL;

-- ============================================================================
-- 2. HAK AKSES TABEL IDENTITAS & SESI
-- ============================================================================
-- app_users: Hanya SELECT profil dan UPDATE lockout login
GRANT SELECT, UPDATE (failed_login_attempts, locked_until, totp_secret_ciphertext, totp_enabled, totp_last_counter, password_hash, full_name)
ON personal_finance.app_users 
TO 'fin_bot_app'@'10.10.2.%';

-- web_sessions: Siklus hidup token sesi web (login, validasi, perpanjangan, logout)
GRANT SELECT, INSERT, UPDATE, DELETE 
ON personal_finance.web_sessions 
TO 'fin_bot_app'@'10.10.2.%';

GRANT SELECT, INSERT, UPDATE
ON personal_finance.user_preferences
TO 'fin_bot_app'@'10.10.2.%';

-- ============================================================================
-- 3. HAK AKSES MASTER DATA
-- Izinkan penambahan rekening dan kategori baru dari antarmuka Web [DEFAULT]
-- ============================================================================
GRANT SELECT, INSERT, UPDATE (name, is_active) 
ON personal_finance.accounts 
TO 'fin_bot_app'@'10.10.2.%';

GRANT SELECT, INSERT, UPDATE (name, is_active) 
ON personal_finance.categories 
TO 'fin_bot_app'@'10.10.2.%';

-- ============================================================================
-- 4. HAK AKSES DRAFT TRANSAKSI & BUKU BESAR (Mendukung CRUD Penuh)
-- ============================================================================
-- transaction_drafts: Diizinkan SELECT, INSERT, UPDATE (saat edit draft), dan DELETE (pembersihan)
GRANT SELECT, INSERT, UPDATE, DELETE 
ON personal_finance.transaction_drafts 
TO 'fin_bot_app'@'10.10.2.%';

-- transactions: Buku besar transaksi (Mendukung pencatatan, penyuntingan, dan penghapusan transaksi)
GRANT SELECT, INSERT, UPDATE, DELETE 
ON personal_finance.transactions 
TO 'fin_bot_app'@'10.10.2.%';

-- ============================================================================
-- 5. HAK AKSES MODUL ANGGARAN & TARGET (FITUR FASE 7)
-- ============================================================================
GRANT SELECT, INSERT, UPDATE 
ON personal_finance.monthly_budgets 
TO 'fin_bot_app'@'10.10.2.%';

GRANT SELECT, INSERT, UPDATE 
ON personal_finance.category_budgets 
TO 'fin_bot_app'@'10.10.2.%';

GRANT SELECT, INSERT, UPDATE 
ON personal_finance.savings_goals 
TO 'fin_bot_app'@'10.10.2.%';

GRANT SELECT, INSERT, UPDATE 
ON personal_finance.purchase_scenarios 
TO 'fin_bot_app'@'10.10.2.%';

-- ============================================================================
-- 6. HAK AKSES AUDIT LOG
-- ============================================================================
GRANT SELECT, INSERT 
ON personal_finance.system_audit_logs 
TO 'fin_bot_app'@'10.10.2.%';

FLUSH PRIVILEGES;
