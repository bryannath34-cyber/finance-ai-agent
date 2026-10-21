USE personal_finance;

-- ============================================================================
-- 1. TAMBAH KOLOM EMAIL PADA APP_USERS (JIKA BELUM ADA)
-- ============================================================================
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS email VARCHAR(100) NULL UNIQUE AFTER full_name;

-- ============================================================================
-- 2. HAK AKSES INSERT & UPDATE UNTUK PENDAFTARAN AKUN MANDIRI
-- Pengguna baru dapat mendaftar mandiri dari antarmuka Web.
-- Dibutuhkan hak INSERT pada app_users, accounts, categories, dan user_preferences.
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON personal_finance.app_users TO 'fin_bot_app'@'10.10.2.%';
GRANT SELECT, INSERT, UPDATE ON personal_finance.accounts TO 'fin_bot_app'@'10.10.2.%';
GRANT SELECT, INSERT, UPDATE ON personal_finance.categories TO 'fin_bot_app'@'10.10.2.%';
GRANT SELECT, INSERT, UPDATE ON personal_finance.user_preferences TO 'fin_bot_app'@'10.10.2.%';

-- Dukungan koneksi lokal / fallback
GRANT SELECT, INSERT, UPDATE ON personal_finance.app_users TO 'fin_bot_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON personal_finance.accounts TO 'fin_bot_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON personal_finance.categories TO 'fin_bot_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON personal_finance.user_preferences TO 'fin_bot_app'@'localhost';

FLUSH PRIVILEGES;
