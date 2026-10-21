-- ==============================================================================
-- Migration 09: Password Reset Tokens Table and Grants
-- ==============================================================================

USE personal_finance;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE COMMENT 'SHA-256 hash token pemulihan kata sandi',
    expires_at DATETIME NOT NULL COMMENT 'Batas waktu kedaluwarsa token (15 menit)',
    used_at DATETIME NULL DEFAULT NULL COMMENT 'Waktu token digunakan',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reset_token_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE,
    INDEX idx_reset_token_hash (token_hash),
    INDEX idx_reset_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Berikan izin akses penuh pada tabel token kepada user aplikasi
GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance.password_reset_tokens TO 'fin_bot_app'@'10.10.2.%';
GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance.password_reset_tokens TO 'fin_bot_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance.password_reset_tokens TO 'fin_bot_app'@'%';

FLUSH PRIVILEGES;
