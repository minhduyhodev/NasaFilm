import {
  MISSION_CAMPAIGN_STATUSES,
  MISSION_CONDITION_TYPES,
  MISSION_PRESETS,
  MISSION_RECURRENCE_TYPES,
} from '../api/adminMissionService';
import posterExplorer from '../../../shared/assets/missions/mission-explorer-wide.png';
import posterPremiere from '../../../shared/assets/missions/mission-premiere-wide.png';
import posterHybrid from '../../../shared/assets/missions/mission-hybrid.png';
import posterOrbit from '../../../shared/assets/missions/mission-orbit-wide.png';
import posterReviewer from '../../../shared/assets/missions/mission-reviewer-wide.png';
import posterMatchmaker from '../../../shared/assets/missions/mission-matchmaker-wide.png';
import posterCampaign from '../../../shared/assets/missions/mission-premiere-wide.png';
import posterFallback from '../../../shared/assets/missions/mission-explorer-wide.png';

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

/** Poster theo mã nhiệm vụ hệ thống. */
const POSTER_BY_CODE = {
  EXPLORER: posterExplorer,
  PREMIERE: posterPremiere,
  HYBRID_PILOT: posterHybrid,
  SOCIAL_ORBIT: posterOrbit,
  REVIEWER: posterReviewer,
  MATCHMAKER: posterMatchmaker,
  MATCHMAKER_QUIZ: posterMatchmaker,
};

/** Poster dự phòng theo loại điều kiện (nhiệm vụ tùy chỉnh). */
const POSTER_BY_CONDITION = {
  GENRE_WINDOW: posterExplorer,
  PREMIERE_BOOKING: posterPremiere,
  HYBRID_THEATER_VOD: posterHybrid,
  ORBIT_ROOM_JOIN: posterOrbit,
  REVIEW_WITH_VIBE_TAG: posterReviewer,
  MATCHMAKER_QUIZ: posterMatchmaker,
};

export const getMissionDisplayTitle = (item) =>
  presetTitleMap[item?.code] || item?.title || 'Nhiệm vụ';

export const getMissionPosterSrc = (item) =>
  POSTER_BY_CODE[item?.code]
  || POSTER_BY_CONDITION[item?.conditionType]
  || posterFallback;

export const getCampaignPosterSrc = () => posterCampaign;

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
