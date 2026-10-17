USE personal_finance;

-- Catatan Penting: DELIMITER hanya dikenali oleh klien CLI `mysql` atau MySQL Shell mode SQL.
-- Driver PyMySQL / SQLAlchemy TIDAK mendukung perintah DELIMITER.
DELIMITER $$

-- ============================================================================
-- 1. TRIGGER VALIDASI STATUS DRAFT PADA TRANSAKSI (BEFORE INSERT)
-- ============================================================================
CREATE TRIGGER trg_tx_validate_draft_status
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    DECLARE v_draft_status VARCHAR(20);
    DECLARE v_draft_user_id BIGINT UNSIGNED;

    -- Validasi hanya berlaku untuk transaksi normal (bukan jurnal pembalik / reversal)
    IF NEW.is_reversal = FALSE AND NEW.draft_id IS NOT NULL THEN
        SELECT status, user_id INTO v_draft_status, v_draft_user_id
        FROM transaction_drafts
        WHERE id = NEW.draft_id;

        IF v_draft_status IS NULL THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Gagal Insert Ledger: draft_id tidak ditemukan.';
        END IF;

        IF v_draft_status <> 'CONFIRMED' THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Gagal Insert Ledger: Transaksi hanya boleh dibuat dari draft berstatus CONFIRMED.';
        END IF;

        IF v_draft_user_id <> NEW.user_id THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Gagal Insert Ledger: Pelanggaran kepemilikan tenant (draft user_id tidak cocok).';
        END IF;
    END IF;
END$$

-- ============================================================================
-- 2. TRIGGER VALIDASI IMMUTABILITY & TRANSISI STATUS DRAFT (BEFORE UPDATE)
-- ============================================================================
CREATE TRIGGER trg_drafts_validate_update
BEFORE UPDATE ON transaction_drafts
FOR EACH ROW
BEGIN
    -- A. Larang perubahan status jika status lama bukan PENDING
    IF OLD.status <> 'PENDING' AND NEW.status <> OLD.status THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Gagal Update Draft: Status draft yang telah final (CONFIRMED/CANCELLED/EXPIRED) tidak boleh diubah.';
    END IF;

    -- B. Larang modifikasi data finansial/bisnis jika status draft bukan PENDING
    IF OLD.status <> 'PENDING' THEN
        IF NOT (NEW.amount <=> OLD.amount 
                AND NEW.admin_fee <=> OLD.admin_fee 
                AND NEW.source_account_id <=> OLD.source_account_id 
                AND NEW.destination_account_id <=> OLD.destination_account_id 
                AND NEW.category_id <=> OLD.category_id 
                AND NEW.description <=> OLD.description 
                AND NEW.transaction_date <=> OLD.transaction_date) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Gagal Update Draft: Kolom bisnis draft tidak boleh diedit jika status bukan PENDING.';
        END IF;
    END IF;
END$$

DELIMITER ;
