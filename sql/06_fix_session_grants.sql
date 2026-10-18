-- ==============================================================================
-- 06_fix_session_grants.sql
-- Personal Finance AI Agent v2.3
-- Skrip perbaikan hak akses MySQL untuk pengelolaan token web_sessions (Logout & Revocation)
-- ==============================================================================

USE personal_finance;

-- 1. Berikan hak akses penuh (SELECT, INSERT, UPDATE, DELETE) untuk tabel web_sessions
-- Subnet privat OCI (10.10.2.%)
GRANT SELECT, INSERT, UPDATE, DELETE 
ON personal_finance.web_sessions 
TO 'fin_bot_app'@'10.10.2.%';

-- Wildcard host (%) untuk runtime backend app
GRANT SELECT, INSERT, UPDATE, DELETE 
ON personal_finance.web_sessions 
TO 'fin_bot_app'@'%';

-- 2. Terapkan pembaruan privileges
FLUSH PRIVILEGES;
