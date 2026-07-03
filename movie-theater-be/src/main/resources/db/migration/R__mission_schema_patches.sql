-- Repeatable Flyway migration: idempotent mission schema patches.
-- Supersedes MissionSchemaMigrator JDBC patches.

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
