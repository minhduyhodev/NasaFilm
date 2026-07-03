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

export const getMissionDisplayTitle = (item) =>
  presetTitleMap[item?.code] || item?.title || 'Nhiệm vụ';

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
