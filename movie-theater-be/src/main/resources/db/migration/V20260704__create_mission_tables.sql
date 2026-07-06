-- Versioned migration: create mission tables before repeatable R__mission_schema_patches.sql runs.
-- Replaces the legacy JDBC bootstrap in FeatureSchemaMigrationConfig#migrate().
-- Mirrors the DDL that class applied at startup so a fresh database matches what a previously
-- bootstrapped database had by the time the repeatable patches assume the tables exist.

CREATE TABLE IF NOT EXISTS mission_template (
    uuid uuid PRIMARY KEY,
    code varchar(64) NOT NULL,
    version integer NOT NULL DEFAULT 1,
    title varchar(255) NOT NULL,
    description text,
    condition_type varchar(64) NOT NULL,
    condition_json jsonb,
    reward_points integer NOT NULL DEFAULT 0,
    reward_badge_code varchar(64),
    reward_badge_title varchar(120),
    requires_feature varchar(64),
    target_value integer NOT NULL DEFAULT 1,
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uk_mission_template_code UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS user_mission (
    uuid uuid PRIMARY KEY,
    user_uuid uuid NOT NULL,
    mission_template_uuid uuid NOT NULL,
    template_version integer NOT NULL DEFAULT 1,
    status varchar(32) NOT NULL,
    progress_current integer NOT NULL DEFAULT 0,
    progress_target integer NOT NULL DEFAULT 1,
    progress_json jsonb,
    completed_at timestamptz,
    enrolled_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uk_user_mission_user_template UNIQUE (user_uuid, mission_template_uuid)
);

CREATE INDEX IF NOT EXISTS idx_user_mission_user
    ON user_mission (user_uuid, updated_at DESC);

CREATE TABLE IF NOT EXISTS mission_progress_event (
    uuid uuid PRIMARY KEY,
    user_uuid uuid NOT NULL,
    mission_template_uuid uuid NOT NULL,
    source_type varchar(64) NOT NULL,
    source_id varchar(64) NOT NULL,
    event_at timestamptz NOT NULL,
    CONSTRAINT uk_mission_progress_event UNIQUE (
        user_uuid, mission_template_uuid, source_type, source_id
    )
);