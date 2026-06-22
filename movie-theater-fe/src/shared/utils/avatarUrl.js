export const normalizeAvatarUrl = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  return trimmed;
};

export const resolveAvatarUrl = (payload = {}) => {
  return normalizeAvatarUrl(payload.avatarUrl ?? payload.avatar ?? payload.picture ?? null);
};
