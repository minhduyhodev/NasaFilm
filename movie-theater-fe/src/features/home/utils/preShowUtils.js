const MEMBER_VIP_SCORE = 10000;
const MEMBER_FRIEND_SCORE = 5000;

export const getMovieGlowClass = (title) => {
  const upper = (title || '').toUpperCase();
  if (upper.includes('STELLAR') || upper.includes('MORTAL')) return 'glow-gold';
  if (upper.includes('AETHERIA') || upper.includes('RED') || upper.includes('MƯA')) {
    return 'glow-purple';
  }
  return 'glow-cyan';
};

export const formatCountdown = (targetIso) => {
  if (!targetIso) return '00:00:00';
  const diffMs = new Date(targetIso).getTime() - Date.now();
  if (diffMs <= 0) return '00:00:00';
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

export const getMemberTierFromScore = (score = 0) => {
  if (score >= MEMBER_VIP_SCORE) {
    return { label: "NASA'VIP", badge: 'Phi hành đoàn ưu tiên' };
  }
  if (score >= MEMBER_FRIEND_SCORE) {
    return { label: "NASA'FRIEND", badge: 'Phi hành đoàn thân thiết' };
  }
  return { label: null, badge: null };
};
