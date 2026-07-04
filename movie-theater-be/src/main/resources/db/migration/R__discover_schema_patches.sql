CREATE TABLE IF NOT EXISTS user_matchmaker_history (
    uuid uuid PRIMARY KEY,
    user_uuid uuid,
    mood varchar(32) NOT NULL,
    duration varchar(16) NOT NULL,
    viewing_location varchar(16) NOT NULL,
    genre_uuids text,
    use_history boolean NOT NULL DEFAULT false,
    flight_code varchar(32),
    match_count integer NOT NULL DEFAULT 0,
    matched_movie_uuids text,
    top_match_movie_uuid uuid,
    top_match_score integer,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_matchmaker_history_user
    ON user_matchmaker_history (user_uuid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_matchmaker_history_created
    ON user_matchmaker_history (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_matchmaker_history_mood
    ON user_matchmaker_history (mood);
