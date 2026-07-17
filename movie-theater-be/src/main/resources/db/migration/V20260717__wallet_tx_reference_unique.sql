-- Chống nạp/hoàn tiền nhân đôi ở tầng DB: mỗi reference_uuid (Stripe top-up, VietQR top-up, refund)
-- chỉ được sinh đúng một wallet_transaction. Đây là hàng rào cuối cùng bổ trợ cho idempotency ở tầng ứng dụng.

-- Bước 1: dọn dữ liệu trùng nếu có (giữ bản ghi sớm nhất theo created_at, rồi theo uuid), để tạo index thành công.
DELETE FROM wallet_transaction a
USING wallet_transaction b
WHERE a.reference_uuid IS NOT NULL
  AND a.reference_uuid = b.reference_uuid
  AND (a.created_at > b.created_at
       OR (a.created_at = b.created_at AND a.uuid > b.uuid));

-- Bước 2: partial unique index (bỏ qua các bản ghi reference_uuid = NULL như nạp mock / rút tiền).
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_tx_reference
    ON wallet_transaction (reference_uuid)
    WHERE reference_uuid IS NOT NULL;
