-- UI/UX feature data used by persistent user preferences.
-- Apply after sql/01_schema_v2.sql and before sql/03_runtime_grants.sql, then deploy matching app code.
SET @migration_sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'personal_finance' AND TABLE_NAME = 'app_users' AND COLUMN_NAME = 'totp_secret_ciphertext') = 0,
    'ALTER TABLE personal_finance.app_users ADD COLUMN totp_secret_ciphertext VARCHAR(255) NULL',
    'SELECT 1'
);
PREPARE uiux_migration FROM @migration_sql; EXECUTE uiux_migration; DEALLOCATE PREPARE uiux_migration;

SET @migration_sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'personal_finance' AND TABLE_NAME = 'app_users' AND COLUMN_NAME = 'totp_enabled') = 0,
    'ALTER TABLE personal_finance.app_users ADD COLUMN totp_enabled BOOLEAN NOT NULL DEFAULT FALSE',
    'SELECT 1'
);
PREPARE uiux_migration FROM @migration_sql; EXECUTE uiux_migration; DEALLOCATE PREPARE uiux_migration;

SET @migration_sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'personal_finance' AND TABLE_NAME = 'app_users' AND COLUMN_NAME = 'totp_last_counter') = 0,
    'ALTER TABLE personal_finance.app_users ADD COLUMN totp_last_counter BIGINT NULL',
    'SELECT 1'
);
PREPARE uiux_migration FROM @migration_sql; EXECUTE uiux_migration; DEALLOCATE PREPARE uiux_migration;

CREATE TABLE IF NOT EXISTS personal_finance.user_preferences (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    preferences_json JSON NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_preferences_user FOREIGN KEY (user_id) REFERENCES personal_finance.app_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

