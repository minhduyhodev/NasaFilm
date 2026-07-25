export const TIER_FRIEND_MIN = 5000;
export const TIER_VIP_MIN = 10000;

export const MEMBER_TIERS = [
  { code: 'MEMBER', minScore: 0, label: 'NASA Member' },
  { code: 'FRIEND', minScore: TIER_FRIEND_MIN, label: "NASA'FRIEND" },
  { code: 'VIP', minScore: TIER_VIP_MIN, label: "NASA'VIP" },
];

export const TIER_FORM_OPTIONS = [
  { value: 0, label: 'Tất cả hạng (NASA Member)' },
  { value: 5000, label: "NASA'FRIEND" },
  { value: 10000, label: "NASA'VIP" },
];

export const resolveTierFromLifetime = (lifetimeScore = 0) => {
  if (lifetimeScore >= TIER_VIP_MIN) return MEMBER_TIERS[2];
  if (lifetimeScore >= TIER_FRIEND_MIN) return MEMBER_TIERS[1];
  return MEMBER_TIERS[0];
};

/** Mốc điểm lifetime của hạng tiếp theo (khớp MissionService.buildTier). */
export const resolveNextTierAt = (lifetimeScore = 0) => {
  if (lifetimeScore >= TIER_VIP_MIN) return TIER_VIP_MIN;
  if (lifetimeScore >= TIER_FRIEND_MIN) return TIER_VIP_MIN;
  return TIER_FRIEND_MIN;
};

export const resolveTierProgress = (lifetimeScore = 0) => {
  const tier = resolveTierFromLifetime(lifetimeScore);
  const nextTierAt = resolveNextTierAt(lifetimeScore);
  const isMaxTier = lifetimeScore >= TIER_VIP_MIN;
  const span = Math.max(nextTierAt - tier.minScore, 1);
  const rawPercent = ((lifetimeScore - tier.minScore) / span) * 100;
  return {
    tier,
    nextTierAt,
    isMaxTier,
    percent: isMaxTier ? 100 : Math.min(Number.isFinite(rawPercent) ? rawPercent : 0, 100),
    pointsToNext: Math.max(nextTierAt - lifetimeScore, 0),
  };
};

export const resolveTierLabelByMinScore = (minScore = 0) => {
  const tier = MEMBER_TIERS.find((item) => item.minScore === Number(minScore));
  if (tier) return tier.label;
  if (minScore >= 10000) return "NASA'VIP";
  if (minScore >= 5000) return "NASA'FRIEND";
  return 'Tất cả hạng';
};
