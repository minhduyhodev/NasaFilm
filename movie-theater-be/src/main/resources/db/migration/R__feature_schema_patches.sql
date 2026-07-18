-- Repeatable Flyway migration (idempotent).
-- Bổ sung schema cho feature không do Hibernate tự sinh đủ (mission, orbit, review…).
-- Các bảng lõi (movie, showtime, booking…) vẫn do JPA ddl-auto=update quản lý.

-- ── Mission ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mission_campaign (
    uuid uuid PRIMARY KEY,
    code varchar(64) NOT NULL,
    title varchar(255) NOT NULL,
    description text,
    status varchar(32) NOT NULL DEFAULT 'DRAFT',
    starts_at timestamptz,
    ends_at timestamptz,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uk_mission_campaign_code UNIQUE (code)
);

ALTER TABLE mission_template ADD COLUMN IF NOT EXISTS recurrence varchar(32);
UPDATE mission_template SET recurrence = 'ONCE' WHERE recurrence IS NULL;
ALTER TABLE mission_template ALTER COLUMN recurrence SET DEFAULT 'ONCE';
ALTER TABLE mission_template ADD COLUMN IF NOT EXISTS campaign_uuid uuid;
ALTER TABLE mission_template ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE mission_template ADD COLUMN IF NOT EXISTS ends_at timestamptz;

ALTER TABLE user_mission ADD COLUMN IF NOT EXISTS cycle_key varchar(32);
UPDATE user_mission SET cycle_key = 'ONCE' WHERE cycle_key IS NULL;
ALTER TABLE user_mission ALTER COLUMN cycle_key SET DEFAULT 'ONCE';
ALTER TABLE user_mission DROP CONSTRAINT IF EXISTS uk_user_mission_user_template;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_user_mission_user_template_cycle'
    ) THEN
        ALTER TABLE user_mission ADD CONSTRAINT uk_user_mission_user_template_cycle
            UNIQUE (user_uuid, mission_template_uuid, cycle_key);
    END IF;
END $$;

ALTER TABLE mission_progress_event ADD COLUMN IF NOT EXISTS cycle_key varchar(32);
UPDATE mission_progress_event SET cycle_key = 'ONCE' WHERE cycle_key IS NULL;
ALTER TABLE mission_progress_event ALTER COLUMN cycle_key SET DEFAULT 'ONCE';
ALTER TABLE mission_progress_event DROP CONSTRAINT IF EXISTS uk_mission_progress_event;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_mission_progress_event'
    ) THEN
        ALTER TABLE mission_progress_event ADD CONSTRAINT uk_mission_progress_event
            UNIQUE (user_uuid, mission_template_uuid, cycle_key, source_type, source_id);
    END IF;
END $$;

UPDATE mission_template SET recurrence = 'MONTHLY' WHERE code = 'EXPLORER' AND recurrence = 'ONCE';

ALTER TABLE mission_template ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE mission_progress_event ADD COLUMN IF NOT EXISTS movie_uuid uuid;

ALTER TABLE mission_template DROP CONSTRAINT IF EXISTS mission_template_condition_type_check;
ALTER TABLE mission_template ADD CONSTRAINT mission_template_condition_type_check
    CHECK (condition_type IN (
        'GENRE_WINDOW',
        'PREMIERE_BOOKING',
        'HYBRID_THEATER_VOD',
        'ORBIT_ROOM_JOIN',
        'REVIEW_WITH_VIBE_TAG',
        'MATCHMAKER_QUIZ'
    ));

-- ── Orbit Seat ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orbit_room (
    uuid uuid PRIMARY KEY,
    showtime_uuid uuid NOT NULL,
    host_user_uuid uuid NOT NULL,
    max_members integer NOT NULL,
    status varchar(32) NOT NULL,
    expires_at timestamptz NOT NULL,
    booking_uuid uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orbit_room_showtime
    ON orbit_room (showtime_uuid, status);

CREATE INDEX IF NOT EXISTS idx_orbit_room_host
    ON orbit_room (host_user_uuid, status);

CREATE INDEX IF NOT EXISTS idx_orbit_room_expires
    ON orbit_room (status, expires_at);

CREATE INDEX IF NOT EXISTS idx_orbit_room_booking
    ON orbit_room (booking_uuid)
    WHERE booking_uuid IS NOT NULL;

CREATE TABLE IF NOT EXISTS orbit_member (
    uuid uuid PRIMARY KEY,
    room_uuid uuid NOT NULL,
    user_uuid uuid NOT NULL,
    display_name varchar(120),
    seat_uuids_json text NOT NULL DEFAULT '[]',
    joined_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uk_orbit_member_room_user UNIQUE (room_uuid, user_uuid)
);

CREATE INDEX IF NOT EXISTS idx_orbit_member_room
    ON orbit_member (room_uuid, joined_at);

-- ── Review ───────────────────────────────────────────────────────────────────

ALTER TABLE movie_media ALTER COLUMN media_url TYPE VARCHAR(2048);
ALTER TABLE movie ALTER COLUMN streaming_url TYPE VARCHAR(2048);

DO $$
BEGIN
    IF to_regclass('public.movie_review_report') IS NOT NULL THEN
        EXECUTE $delete_reports$
            DELETE FROM movie_review_report
            WHERE review_uuid IN (
                SELECT uuid
                FROM (
                    SELECT uuid,
                           row_number() OVER (
                               PARTITION BY movie_uuid, user_uuid
                               ORDER BY updated_at DESC NULLS LAST,
                                        created_at DESC NULLS LAST,
                                        uuid DESC
                           ) AS duplicate_rank
                    FROM movie_review
                ) ranked_reviews
                WHERE duplicate_rank > 1
            )
        $delete_reports$;
    END IF;
END
$$;

DELETE FROM movie_review
WHERE uuid IN (
    SELECT uuid
    FROM (
        SELECT uuid,
               row_number() OVER (
                   PARTITION BY movie_uuid, user_uuid
                   ORDER BY updated_at DESC NULLS LAST,
                            created_at DESC NULLS LAST,
                            uuid DESC
               ) AS duplicate_rank
        FROM movie_review
    ) ranked_reviews
    WHERE duplicate_rank > 1
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uk_movie_review_movie_user'
    ) THEN
        ALTER TABLE movie_review
        ADD CONSTRAINT uk_movie_review_movie_user
        UNIQUE (movie_uuid, user_uuid);
    END IF;
END
$$;

-- ── Orbit Chat & Concessions ──────────────────────────────────────────────────

ALTER TABLE orbit_member ADD COLUMN IF NOT EXISTS combos_json text NOT NULL DEFAULT '[]';
ALTER TABLE orbit_member ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS orbit_room_message (
    uuid uuid PRIMARY KEY,
    room_uuid uuid NOT NULL,
    sender_user_uuid uuid,
    sender_display_name varchar(120) NOT NULL,
    message text NOT NULL,
    is_system boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orbit_room_message_room
    ON orbit_room_message (room_uuid, created_at);

-- ── Payment transaction purpose (BOOKING | WALLET_TOP_UP) ─────────────────────

ALTER TABLE payment_transaction ADD COLUMN IF NOT EXISTS purpose varchar(40);
UPDATE payment_transaction SET purpose = 'BOOKING' WHERE purpose IS NULL;

-- ── Movie slug (URL đẹp; API vẫn nhận UUID) ───────────────────────────────────

ALTER TABLE movie ADD COLUMN IF NOT EXISTS slug varchar(160);

CREATE UNIQUE INDEX IF NOT EXISTS uk_movie_slug
    ON movie (slug)
    WHERE slug IS NOT NULL;

-- ── Cinema image (ảnh đại diện rạp do admin upload) ───────────────────────────

ALTER TABLE cinema ADD COLUMN IF NOT EXISTS image_url varchar(1000);

-- ── Support ticket message attachments (tối đa 3 ảnh / tin) ───────────────────

ALTER TABLE support_ticket_message ADD COLUMN IF NOT EXISTS image_urls jsonb;

