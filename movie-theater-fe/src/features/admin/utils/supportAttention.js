export const SUPPORT_ATTENTION_EVENT = 'admin-support-attention-changed';

/** Báo sidebar làm mới badge/chấm đỏ Hỗ trợ khách hàng. */
export const notifySupportAttentionChanged = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SUPPORT_ATTENTION_EVENT));
};
