import { authService } from '../../features/auth/api/authService';

export const MAX_VIBE_TAGS_PER_REVIEW = 3;
export const VIBE_TAG_COLLAPSED_LIMIT = 6;
export const VIBE_TAG_SEARCH_MIN_CATALOG = 8;
export const VIBE_TAG_CLOUD_COLLAPSED_LIMIT = 8;

let cachedTags = null;
let inflightRequest = null;

export function clearReviewVibeTagsCache() {
  cachedTags = null;
  inflightRequest = null;
}

export async function loadReviewVibeTags() {
  if (cachedTags) {
    return cachedTags;
  }
  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = authService.api
    .get('/api/review-vibe-tags')
    .then((response) => {
      const tags = response.data?.data ?? response.data;
      cachedTags = Array.isArray(tags) ? tags : [];
      return cachedTags;
    })
    .catch((error) => {
      cachedTags = [];
      throw error;
    })
    .finally(() => {
      inflightRequest = null;
    });

  return inflightRequest;
}

export const getVibeTagLabel = (code, tags = cachedTags || []) => {
  const tag = tags.find((item) => item.code === code);
  return tag?.hash || `#${code}`;
};

export const getVibeTagDisplay = (code, tags = cachedTags || []) => {
  const tag = tags.find((item) => item.code === code);
  return tag?.label || code;
};

export function matchesVibeTagQuery(tag, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return (
    tag.code.toLowerCase().includes(normalized)
    || tag.label.toLowerCase().includes(normalized)
    || tag.hash.toLowerCase().includes(normalized)
  );
}

/** Giữ tag đã chọn + tag phổ biến đầu danh sách khi thu gọn. */
export function buildCollapsedVibeTagList(catalog, selectedCodes = [], limit = VIBE_TAG_COLLAPSED_LIMIT) {
  if (!catalog?.length) return [];
  const selectedSet = new Set(selectedCodes);
  const result = [];
  const seen = new Set();

  for (const tag of catalog) {
    if (selectedSet.has(tag.code)) {
      result.push(tag);
      seen.add(tag.code);
    }
  }
  for (const tag of catalog) {
    if (result.length >= limit) break;
    if (!seen.has(tag.code)) {
      result.push(tag);
      seen.add(tag.code);
    }
  }
  return result;
}
