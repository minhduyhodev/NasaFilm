export const normalizeAvatarUrl = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const resolveAvatarUrl = (payload = {}) => {
  return normalizeAvatarUrl(payload.avatarUrl ?? payload.avatar ?? payload.picture ?? null);
};
