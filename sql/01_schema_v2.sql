-- ============================================================================
-- PEMBUATAN DATABASE BARU
-- ============================================================================
CREATE DATABASE IF NOT EXISTS personal_finance 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE personal_finance;

-- ============================================================================
-- 1. IDENTITAS PENGGUNA TEROTORISASI
-- ============================================================================
CREATE TABLE app_users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta',
    failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0,
    locked_until DATETIME NULL,
    totp_secret_ciphertext VARCHAR(255) NULL,
    totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    totp_last_counter BIGINT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_app_users_username UNIQUE (username)
) ENGINE=InnoDB;

-- ============================================================================
-- 2. SESI SERVER-SIDE (REVOKASI SESI WEB)
-- ============================================================================
CREATE TABLE web_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    session_token_hash CHAR(64) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent VARCHAR(255) NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE,
    CONSTRAINT uq_sessions_token UNIQUE (session_token_hash),
    INDEX idx_sessions_expiry (expires_at)
) ENGINE=InnoDB;

-- Preferensi antarmuka per pengguna (notifikasi dan tampilan).
CREATE TABLE user_preferences (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    preferences_json JSON NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_preferences_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 3. KANTONG DANA (AKUN)
-- ============================================================================
CREATE TABLE accounts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(50) NOT NULL,
    type ENUM('CASH', 'BANK', 'EWALLET') NOT NULL,
    opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    opening_balance_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_accounts_user_name UNIQUE (user_id, name),
    CONSTRAINT uq_accounts_id_user UNIQUE (id, user_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 4. KATEGORI MUTASI
-- ============================================================================
CREATE TABLE categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(50) NOT NULL,
    type ENUM('INCOME', 'EXPENSE') NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_categories_user_type_name UNIQUE (user_id, type, name),
    CONSTRAINT uq_categories_id_user UNIQUE (id, user_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 5. DRAFT TRANSAKSI SEMENTARA (DENGAN BATCH_ID)
-- ============================================================================
CREATE TABLE transaction_drafts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    batch_id VARCHAR(64) NOT NULL,
    type ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    admin_fee DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    source_account_id INT UNSIGNED NULL,
    destination_account_id INT UNSIGNED NULL,
    category_id INT UNSIGNED NULL,
    description VARCHAR(255) NULL,
    transaction_date DATE NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME NULL,
    cancelled_at DATETIME NULL,
    expires_at DATETIME NOT NULL,
    
    CONSTRAINT uq_drafts_id_user UNIQUE (id, user_id),
    CONSTRAINT fk_drafts_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_drafts_source_acc FOREIGN KEY (source_account_id, user_id) REFERENCES accounts(id, user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_drafts_dest_acc FOREIGN KEY (destination_account_id, user_id) REFERENCES accounts(id, user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_drafts_category FOREIGN KEY (category_id, user_id) REFERENCES categories(id, user_id) ON DELETE RESTRICT,
    
    CONSTRAINT chk_drafts_amount CHECK (amount > 0),
    CONSTRAINT chk_drafts_admin_fee CHECK (admin_fee >= 0),
    CONSTRAINT chk_drafts_consistency CHECK (
        (type = 'EXPENSE' AND source_account_id IS NOT NULL AND destination_account_id IS NULL AND category_id IS NOT NULL AND admin_fee = 0) OR
        (type = 'INCOME' AND destination_account_id IS NOT NULL AND source_account_id IS NULL AND category_id IS NOT NULL AND admin_fee = 0) OR
        (type = 'TRANSFER' AND source_account_id IS NOT NULL AND destination_account_id IS NOT NULL AND source_account_id <> destination_account_id AND category_id IS NULL)
    ),
    INDEX idx_drafts_batch_user (batch_id, user_id),
    INDEX idx_drafts_user_status (user_id, status)
) ENGINE=InnoDB;

-- ============================================================================
-- 6. BUKU BESAR RESMI (IMMUTABLE LEDGER)
-- ============================================================================
CREATE TABLE transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    draft_id BIGINT UNSIGNED NULL,
    ledger_role ENUM('PRIMARY', 'ADMIN_FEE', 'REVERSAL') NOT NULL DEFAULT 'PRIMARY',
    parent_transaction_id BIGINT UNSIGNED NULL,
    reverses_transaction_id BIGINT UNSIGNED NULL,
    type ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    source_account_id INT UNSIGNED NULL,
    destination_account_id INT UNSIGNED NULL,
    category_id INT UNSIGNED NULL,
    description VARCHAR(255) NULL,
    transaction_date DATE NOT NULL,
    is_reversal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_transactions_id_user UNIQUE (id, user_id),
    CONSTRAINT uq_tx_reverses UNIQUE (reverses_transaction_id),
    CONSTRAINT uq_tx_draft_role UNIQUE (draft_id, ledger_role),

    CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_tx_draft FOREIGN KEY (draft_id, user_id) REFERENCES transaction_drafts(id, user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_tx_parent FOREIGN KEY (parent_transaction_id, user_id) REFERENCES transactions(id, user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_tx_reverses FOREIGN KEY (reverses_transaction_id, user_id) REFERENCES transactions(id, user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_tx_source_acc FOREIGN KEY (source_account_id, user_id) REFERENCES accounts(id, user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_tx_dest_acc FOREIGN KEY (destination_account_id, user_id) REFERENCES accounts(id, user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_tx_category FOREIGN KEY (category_id, user_id) REFERENCES categories(id, user_id) ON DELETE RESTRICT,
    
    CONSTRAINT chk_tx_amount CHECK (amount > 0),
    CONSTRAINT chk_tx_consistency CHECK (
        (type = 'EXPENSE' AND source_account_id IS NOT NULL AND destination_account_id IS NULL AND category_id IS NOT NULL) OR
        (type = 'INCOME' AND destination_account_id IS NOT NULL AND source_account_id IS NULL AND category_id IS NOT NULL) OR
        (type = 'TRANSFER' AND source_account_id IS NOT NULL AND destination_account_id IS NOT NULL AND source_account_id <> destination_account_id AND category_id IS NULL)
    ),
    CONSTRAINT chk_tx_reversal_state CHECK (
        (is_reversal = FALSE AND reverses_transaction_id IS NULL AND ledger_role IN ('PRIMARY', 'ADMIN_FEE') AND draft_id IS NOT NULL) OR
        (is_reversal = TRUE AND reverses_transaction_id IS NOT NULL AND ledger_role = 'REVERSAL' AND draft_id IS NULL)
    ),
    CONSTRAINT chk_tx_admin_fee CHECK (
        ledger_role <> 'ADMIN_FEE' OR parent_transaction_id IS NOT NULL
    ),
    INDEX idx_tx_user_date (user_id, transaction_date),
    INDEX idx_tx_parent (parent_transaction_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 7. ANGGARAN TOTAL BULANAN (FITUR FASE 7)
-- ============================================================================
CREATE TABLE monthly_budgets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    period_year SMALLINT UNSIGNED NOT NULL,
    period_month TINYINT UNSIGNED NOT NULL,
    limit_amount DECIMAL(15, 2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mbudgets_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_mbudgets_limit CHECK (limit_amount > 0),
    CONSTRAINT chk_mbudgets_month CHECK (period_month BETWEEN 1 AND 12),
    CONSTRAINT uq_mbudgets_user_period UNIQUE (user_id, period_year, period_month)
) ENGINE=InnoDB;

-- ============================================================================
-- 8. ANGGARAN SPESIFIK KATEGORI BULANAN (FITUR FASE 7)
-- ============================================================================
CREATE TABLE category_budgets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    period_year SMALLINT UNSIGNED NOT NULL,
    period_month TINYINT UNSIGNED NOT NULL,
    limit_amount DECIMAL(15, 2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cbudgets_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_cbudgets_category FOREIGN KEY (category_id, user_id) REFERENCES categories(id, user_id) ON DELETE RESTRICT,
    CONSTRAINT chk_cbudgets_limit CHECK (limit_amount > 0),
    CONSTRAINT chk_cbudgets_month CHECK (period_month BETWEEN 1 AND 12),
    CONSTRAINT uq_cbudgets_user_cat_period UNIQUE (user_id, category_id, period_year, period_month)
) ENGINE=InnoDB;

-- ============================================================================
-- 9. TARGET TABUNGAN (FITUR FASE 7)
-- ============================================================================
CREATE TABLE savings_goals (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    dedicated_account_id INT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(15, 2) NOT NULL,
    target_date DATE NULL,
    status ENUM('ACTIVE', 'ACHIEVED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    active_account_id INT UNSIGNED GENERATED ALWAYS AS (
        CASE WHEN status = 'ACTIVE' THEN dedicated_account_id ELSE NULL END
    ) STORED,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_goals_account FOREIGN KEY (dedicated_account_id, user_id) REFERENCES accounts(id, user_id) ON DELETE RESTRICT,
    CONSTRAINT chk_goals_target CHECK (target_amount > 0),
    CONSTRAINT uq_goals_active_account UNIQUE (active_account_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 10. RIWAYAT SKENARIO PEMBELIAN (FITUR FASE 7)
-- ============================================================================
CREATE TABLE purchase_scenarios (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    item_name VARCHAR(150) NOT NULL,
    estimated_cost DECIMAL(15, 2) NOT NULL,
    target_account_id INT UNSIGNED NULL,
    ai_summary_advice TEXT NOT NULL,
    financial_snapshot JSON NOT NULL,
    user_decision ENUM('CONSIDERING', 'PURCHASED', 'POSTPONED', 'CANCELLED') NOT NULL DEFAULT 'CONSIDERING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_scenarios_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_scenarios_account FOREIGN KEY (target_account_id, user_id) REFERENCES accounts(id, user_id) ON DELETE RESTRICT,
    CONSTRAINT chk_scenarios_cost CHECK (estimated_cost > 0)
) ENGINE=InnoDB;

-- ============================================================================
-- 11. AUDIT LOG KEAMANAN SISTEM
-- ============================================================================
CREATE TABLE system_audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    event_type ENUM(
        'UNAUTHORIZED_ACCESS', 
        'FAILED_LOGIN', 
        'LOGIN_SUCCESS', 
        'LOGOUT', 
        'RATE_LIMITED', 
        'CSRF_VIOLATION', 
        'REVERSAL_CREATED', 
        'BATCH_CONFIRMED', 
        'DB_DEADLOCK', 
        'CRITICAL_ERROR'
    ) NOT NULL,
    details VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
