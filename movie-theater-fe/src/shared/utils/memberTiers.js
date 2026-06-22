export const MEMBER_TIERS = [
  { code: 'MEMBER', minScore: 0, label: 'NASA Member' },
  { code: 'FRIEND', minScore: 5000, label: "NASA'FRIEND" },
  { code: 'VIP', minScore: 10000, label: "NASA'VIP" },
];

export const TIER_FORM_OPTIONS = [
  { value: 0, label: 'Tất cả hạng (NASA Member)' },
  { value: 5000, label: "NASA'FRIEND" },
  { value: 10000, label: "NASA'VIP" },
];

export const resolveTierFromLifetime = (lifetimeScore = 0) => {
  if (lifetimeScore >= 10000) return MEMBER_TIERS[2];
  if (lifetimeScore >= 5000) return MEMBER_TIERS[1];
  return MEMBER_TIERS[0];
};

export const resolveTierLabelByMinScore = (minScore = 0) => {
  const tier = MEMBER_TIERS.find((item) => item.minScore === Number(minScore));
  if (tier) return tier.label;
  if (minScore >= 10000) return "NASA'VIP";
  if (minScore >= 5000) return "NASA'FRIEND";
  return 'Tất cả hạng';
};
