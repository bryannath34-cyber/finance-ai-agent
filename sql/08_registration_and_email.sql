USE personal_finance;

-- ============================================================================
-- 08_registration_and_email.sql
-- Personal Finance AI Agent v2.3
-- Skrip migrasi kolom email dan pemberian hak akses pendaftaran akun (fin_bot_app)
-- ============================================================================

-- 1. Tambahkan kolom email jika belum ada
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS email VARCHAR(100) NULL UNIQUE AFTER full_name;

-- 2. Berikan hak akses (SELECT, INSERT, UPDATE) untuk user fin_bot_app

-- Wildcard host (%) untuk runtime backend OCI VM / Compute
GRANT SELECT, INSERT, UPDATE ON personal_finance.app_users TO 'fin_bot_app'@'%';
GRANT SELECT, INSERT, UPDATE ON personal_finance.accounts TO 'fin_bot_app'@'%';
GRANT SELECT, INSERT, UPDATE ON personal_finance.categories TO 'fin_bot_app'@'%';
GRANT SELECT, INSERT, UPDATE ON personal_finance.user_preferences TO 'fin_bot_app'@'%';

-- Subnet privat OCI (10.10.2.%)
GRANT SELECT, INSERT, UPDATE ON personal_finance.app_users TO 'fin_bot_app'@'10.10.2.%';
GRANT SELECT, INSERT, UPDATE ON personal_finance.accounts TO 'fin_bot_app'@'10.10.2.%';
GRANT SELECT, INSERT, UPDATE ON personal_finance.categories TO 'fin_bot_app'@'10.10.2.%';
GRANT SELECT, INSERT, UPDATE ON personal_finance.user_preferences TO 'fin_bot_app'@'10.10.2.%';

-- FQDN Hostname OCI VM (app-01)
GRANT SELECT, INSERT, UPDATE ON personal_finance.app_users TO 'fin_bot_app'@'app-01.privatesubtrain.vcnocitraining.oraclevcn.com';
GRANT SELECT, INSERT, UPDATE ON personal_finance.accounts TO 'fin_bot_app'@'app-01.privatesubtrain.vcnocitraining.oraclevcn.com';
GRANT SELECT, INSERT, UPDATE ON personal_finance.categories TO 'fin_bot_app'@'app-01.privatesubtrain.vcnocitraining.oraclevcn.com';
GRANT SELECT, INSERT, UPDATE ON personal_finance.user_preferences TO 'fin_bot_app'@'app-01.privatesubtrain.vcnocitraining.oraclevcn.com';

-- Localhost
GRANT SELECT, INSERT, UPDATE ON personal_finance.app_users TO 'fin_bot_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON personal_finance.accounts TO 'fin_bot_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON personal_finance.categories TO 'fin_bot_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON personal_finance.user_preferences TO 'fin_bot_app'@'localhost';

-- 3. Terapkan pembaruan privileges
FLUSH PRIVILEGES;

SELECT 'Hak akses pendaftaran akun (INSERT app_users, accounts, categories) berhasil diperbarui untuk fin_bot_app!' AS status;
