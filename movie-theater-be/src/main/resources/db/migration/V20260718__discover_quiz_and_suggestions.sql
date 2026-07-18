CREATE TABLE IF NOT EXISTS discover_quiz_settings (
    id integer PRIMARY KEY DEFAULT 1,
    max_matches integer NOT NULL DEFAULT 3,
    max_genre_selections integer NOT NULL DEFAULT 2,
    authenticated_question_count integer NOT NULL DEFAULT 5,
    guest_question_count integer NOT NULL DEFAULT 4,
    CONSTRAINT discover_quiz_settings_singleton CHECK (id = 1)
);

INSERT INTO discover_quiz_settings (id, max_matches, max_genre_selections, authenticated_question_count, guest_question_count)
VALUES (1, 3, 2, 5, 4)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS discover_quiz_option (
    uuid uuid PRIMARY KEY,
    option_group varchar(16) NOT NULL,
    option_key varchar(32) NOT NULL,
    label varchar(64) NOT NULL,
    hint varchar(160),
    icon_key varchar(32),
    code varchar(16),
    sort_order integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    CONSTRAINT uq_discover_quiz_option_group_key UNIQUE (option_group, option_key)
);

CREATE INDEX IF NOT EXISTS idx_discover_quiz_option_group
    ON discover_quiz_option (option_group, sort_order);

INSERT INTO discover_quiz_option (uuid, option_group, option_key, label, hint, icon_key, code, sort_order, active)
VALUES
    ('a1000001-0001-4000-8000-000000000001', 'MOOD', 'RELAX', 'Thư giãn', 'Nhẹ nhàng · Giải trí êm', 'Moon', NULL, 1, true),
    ('a1000001-0001-4000-8000-000000000002', 'MOOD', 'EXCITING', 'Phấn khích', 'Sôi động · Cuốn hút', 'Flame', NULL, 2, true),
    ('a1000001-0001-4000-8000-000000000003', 'MOOD', 'EMOTIONAL', 'Cảm xúc', 'Sâu lắng · Chạm tim', 'Heart', NULL, 3, true),
    ('a1000001-0001-4000-8000-000000000004', 'MOOD', 'THRILLING', 'Hồi hộp', 'Kịch tính · Giật gân', 'Zap', NULL, 4, true),
    ('a1000001-0001-4000-8000-000000000011', 'DURATION', 'SHORT', 'Ngắn', 'Dưới 100 phút · Xem nhanh', NULL, '<100p', 1, true),
    ('a1000001-0001-4000-8000-000000000012', 'DURATION', 'MEDIUM', 'Vừa', '95–135 phút · Vừa đủ', NULL, '~2h', 2, true),
    ('a1000001-0001-4000-8000-000000000013', 'DURATION', 'LONG', 'Dài', 'Trên 120 phút · Xem trọn vẹn', NULL, '>2h', 3, true),
    ('a1000001-0001-4000-8000-000000000021', 'VIEWING', 'THEATER', 'Rạp chiếu', 'Màn ảnh lớn · Trải nghiệm rạp', 'Clapperboard', NULL, 1, true),
    ('a1000001-0001-4000-8000-000000000022', 'VIEWING', 'HOME', 'Xem tại nhà', 'Online · Thoải mái tại nhà', 'Tv', NULL, 2, true),
    ('a1000001-0001-4000-8000-000000000023', 'VIEWING', 'BOTH', 'Cả hai', 'Rạp hoặc nhà · Linh hoạt', 'Film', NULL, 3, true)
ON CONFLICT (option_group, option_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS discover_curated_suggestion (
    uuid uuid PRIMARY KEY,
    mood varchar(32) NOT NULL,
    movie_uuid uuid NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    note varchar(255),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_discover_curated_mood_movie UNIQUE (mood, movie_uuid)
);

CREATE INDEX IF NOT EXISTS idx_discover_curated_mood_active
    ON discover_curated_suggestion (mood, active, sort_order);
