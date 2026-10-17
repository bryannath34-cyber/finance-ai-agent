USE personal_finance;

-- ============================================================================
-- 1. REKENING BAWAAN (Asumsi user_id = 1 telah dibuat via create_user.py)
-- Kolom opening_balance_date (NOT NULL) diisi CURDATE()
-- Tipe EWALLET menggunakan nilai ENUM DDL yang benar ('CASH', 'BANK', 'EWALLET')
-- ============================================================================
INSERT INTO accounts (id, user_id, name, type, opening_balance, opening_balance_date, is_active) VALUES
(1, 1, 'Kas Tunai', 'CASH', 0.00, CURDATE(), TRUE),
(2, 1, 'BCA', 'BANK', 0.00, CURDATE(), TRUE),
(3, 1, 'GoPay', 'EWALLET', 0.00, CURDATE(), TRUE)
ON DUPLICATE KEY UPDATE name=name;

-- ============================================================================
-- 2. KATEGORI STANDAR PENGELUARAN & PEMASUKAN
-- ============================================================================
INSERT INTO categories (id, user_id, name, type, is_system, is_active) VALUES
(1, 1, 'Gaji & Pendapatan', 'INCOME', FALSE, TRUE),
(2, 1, 'Bonus & Freelance', 'INCOME', FALSE, TRUE),
(3, 1, 'Investasi & Bunga', 'INCOME', FALSE, TRUE),
(4, 1, 'Makanan & Minuman', 'EXPENSE', FALSE, TRUE),
(5, 1, 'Transportasi', 'EXPENSE', FALSE, TRUE),
(6, 1, 'Tagihan & Utilitas', 'EXPENSE', FALSE, TRUE),
(7, 1, 'Belanja Kebutuhan', 'EXPENSE', FALSE, TRUE),
(8, 1, 'Hiburan & Liburan', 'EXPENSE', FALSE, TRUE),

-- ============================================================================
-- 3. KATEGORI SISTEM WAJIB UNTUK BIAYA ADMIN TRANSFER
-- Kategori ini bertipe EXPENSE, berbendera is_system = TRUE, dan dirujuk oleh ledger_role = 'ADMIN_FEE'
-- ============================================================================
(9, 1, 'Biaya Admin', 'EXPENSE', TRUE, TRUE)
ON DUPLICATE KEY UPDATE name=name;
