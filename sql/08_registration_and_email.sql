USE personal_finance;

-- ============================================================================
-- 08_registration_and_email.sql
-- Personal Finance AI Agent v2.3
-- Skrip migrasi kolom email dan pemberian hak akses pendaftaran akun (fin_bot_app)
-- ============================================================================

-- 1. Tambah kolom email pada app_users jika belum ada
SET @dbname = DATABASE();
SET @tablename = "app_users";
SET @columnname = "email";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE app_users ADD COLUMN email VARCHAR(100) NULL UNIQUE AFTER full_name"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Buat tabel user_preferences jika belum ada
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    preferences_json JSON NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_preferences_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Berikan hak akses pendaftaran akun ke 'fin_bot_app'@'10.10.2.%'
GRANT SELECT, INSERT, UPDATE ON personal_finance.app_users TO 'fin_bot_app'@'10.10.2.%';
GRANT SELECT, INSERT, UPDATE ON personal_finance.accounts TO 'fin_bot_app'@'10.10.2.%';
GRANT SELECT, INSERT, UPDATE ON personal_finance.categories TO 'fin_bot_app'@'10.10.2.%';
GRANT SELECT, INSERT, UPDATE ON personal_finance.user_preferences TO 'fin_bot_app'@'10.10.2.%';

-- 4. Terapkan pembaruan privileges
FLUSH PRIVILEGES;

SELECT 'Hak akses pendaftaran akun berhasil diperbarui untuk fin_bot_app!' AS status;
