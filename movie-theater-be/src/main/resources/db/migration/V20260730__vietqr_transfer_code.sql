-- Extracted VietQR transfer code for exact matching (avoids ambiguous LIKE %code%)
ALTER TABLE vietqr_webhook_transaction
    ADD COLUMN IF NOT EXISTS transfer_code VARCHAR(32);

CREATE INDEX IF NOT EXISTS idx_vietqr_tx_transfer_code
    ON vietqr_webhook_transaction (transfer_code)
    WHERE transfer_code IS NOT NULL;
