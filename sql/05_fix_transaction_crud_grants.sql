-- ==============================================================================
-- 05_fix_transaction_crud_grants.sql
-- Personal Finance AI Agent v2.3
-- Skrip perbaikan hak akses MySQL untuk fitur Edit dan Hapus Transaksi (CRUD)
-- ==============================================================================

USE personal_finance;

-- 1. Berikan hak akses penuh (SELECT, INSERT, UPDATE, DELETE) untuk user fin_bot_app
-- Subnet privat OCI (10.10.2.%)
GRANT SELECT, INSERT, UPDATE, DELETE 
ON personal_finance.transactions 
TO 'fin_bot_app'@'10.10.2.%';

GRANT SELECT, INSERT, UPDATE, DELETE 
ON personal_finance.transaction_drafts 
TO 'fin_bot_app'@'10.10.2.%';

-- Wildcard host (%) untuk pengujian lokal / akses dari VM/Compute lain
GRANT SELECT, INSERT, UPDATE, DELETE 
ON personal_finance.transactions 
TO 'fin_bot_app'@'%';

GRANT SELECT, INSERT, UPDATE, DELETE 
ON personal_finance.transaction_drafts 
TO 'fin_bot_app'@'%';

-- 2. Terapkan pembaruan privileges
FLUSH PRIVILEGES;

SELECT 'Hak akses CRUD transaksi berhasil diperbarui untuk user fin_bot_app!' AS status;
