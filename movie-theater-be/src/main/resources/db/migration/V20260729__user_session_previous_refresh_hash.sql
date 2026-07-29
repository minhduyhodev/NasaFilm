-- Refresh-token reuse detection: keep the previous hash after rotation
ALTER TABLE user_sessions
    ADD COLUMN IF NOT EXISTS previous_refresh_token_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_user_sessions_prev_refresh_hash
    ON user_sessions (previous_refresh_token_hash)
    WHERE previous_refresh_token_hash IS NOT NULL;
