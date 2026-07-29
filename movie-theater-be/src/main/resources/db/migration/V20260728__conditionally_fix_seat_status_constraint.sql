-- Apply the seat status constraint only when the legacy schema bootstrap created the table.
DO $$
BEGIN
    IF to_regclass('public.seat') IS NOT NULL THEN
        ALTER TABLE seat DROP CONSTRAINT IF EXISTS seat_status_check;
        ALTER TABLE seat ADD CONSTRAINT seat_status_check
            CHECK (status IN ('ACTIVE', 'DISABLED', 'MAINTENANCE'));
    END IF;
END $$;
