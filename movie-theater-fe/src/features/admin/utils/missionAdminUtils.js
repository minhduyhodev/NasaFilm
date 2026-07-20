import {
  MISSION_CAMPAIGN_STATUSES,
  MISSION_CONDITION_TYPES,
  MISSION_PRESETS,
  MISSION_RECURRENCE_TYPES,
} from '../api/adminMissionService';

const conditionMap = Object.fromEntries(
  MISSION_CONDITION_TYPES.map((item) => [item.value, item.label]),
);

const recurrenceMap = Object.fromEntries(
  MISSION_RECURRENCE_TYPES.map((item) => [item.value, item.label]),
);

const campaignStatusMap = Object.fromEntries(
  MISSION_CAMPAIGN_STATUSES.map((item) => [item.value, item.label]),
);

const presetTitleMap = Object.fromEntries(
  MISSION_PRESETS.map((item) => [item.code, item.title]),
);

const FEATURE_LABELS = {
  ORBIT_SEAT: 'Phòng Orbit',
};

/** Visual theme theo loại điều kiện — không dùng ảnh PNG. */
const THEME_BY_CONDITION = {
  GENRE_WINDOW: { tone: 'rose', icon: 'compass' },
  PREMIERE_BOOKING: { tone: 'amber', icon: 'ticket' },
  HYBRID_THEATER_VOD: { tone: 'slate', icon: 'clapperboard' },
  ORBIT_ROOM_JOIN: { tone: 'teal', icon: 'users' },
  REVIEW_WITH_VIBE_TAG: { tone: 'orange', icon: 'pen' },
  MATCHMAKER_QUIZ: { tone: 'rose', icon: 'sparkles' },
};

const THEME_BY_CODE = {
  EXPLORER: THEME_BY_CONDITION.GENRE_WINDOW,
  PREMIERE: THEME_BY_CONDITION.PREMIERE_BOOKING,
  HYBRID_PILOT: THEME_BY_CONDITION.HYBRID_THEATER_VOD,
  SOCIAL_ORBIT: THEME_BY_CONDITION.ORBIT_ROOM_JOIN,
  REVIEWER: THEME_BY_CONDITION.REVIEW_WITH_VIBE_TAG,
  MATCHMAKER: THEME_BY_CONDITION.MATCHMAKER_QUIZ,
  MATCHMAKER_QUIZ: THEME_BY_CONDITION.MATCHMAKER_QUIZ,
};

const THEME_FALLBACK = { tone: 'slate', icon: 'target' };
const THEME_CAMPAIGN = { tone: 'amber', icon: 'rocket' };

export const getMissionDisplayTitle = (item) =>
  presetTitleMap[item?.code] || item?.title || 'Nhiệm vụ';

/** Theme card: cùng conditionType dùng chung tone/icon — không gen ảnh mới. */
export const getMissionCardTheme = (item) =>
  THEME_BY_CODE[item?.code]
  || THEME_BY_CONDITION[item?.conditionType]
  || THEME_FALLBACK;

export const getCampaignCardTheme = () => THEME_CAMPAIGN;

export const getFeatureLabel = (code) => FEATURE_LABELS[code] || code;

export const getConditionLabel = (value) => conditionMap[value] || value || '—';

export const getRecurrenceLabel = (value) => recurrenceMap[value] || value || 'Một lần';

export const getCampaignStatusLabel = (value) => campaignStatusMap[value] || value || '—';

export const resolveCampaignTitle = (campaignUuid, campaigns = []) => {
  if (!campaignUuid) return null;
  const id = String(campaignUuid);
  const found = campaigns.find((item) => String(item.uuid) === id);
  return found?.title ?? null;
};

export const formatAdminDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** ISO → giá trị datetime-local theo giờ máy local (tránh lệch UTC). */
export const formatMissionDateForInput = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

/** datetime-local → ISO có offset local cho BE OffsetDateTime. */
export const formatMissionDateForBackend = (localString) => {
  if (!localString) return null;
  const date = new Date(localString);
  if (Number.isNaN(date.getTime())) return null;

  const pad = (value) => String(value).padStart(2, '0');
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absOffset / 60));
  const offsetMins = pad(absOffset % 60);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${offsetHours}:${offsetMins}`;
};

export const MISSION_CODE_PATTERN = /^[A-Z0-9_]+$/;

export const formatAdminDateRange = (startsAt, endsAt) => {
  const fmt = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };
  const start = fmt(startsAt);
  const end = fmt(endsAt);
  if (!start && !end) return 'Chưa đặt thời gian';
  if (start && end) return `${start} – ${end}`;
  return start || end;
};

export const filterByQuery = (items, query, fields = ['code', 'title', 'description']) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) =>
    fields.some((field) => String(item?.[field] ?? '').toLowerCase().includes(needle)),
  );
};
