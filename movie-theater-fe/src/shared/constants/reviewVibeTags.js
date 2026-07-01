export const REVIEW_VIBE_TAGS = [
  { code: 'cam_dong', label: 'Cảm động', hash: '#cảm_động' },
  { code: 'plot_twist', label: 'Plot twist', hash: '#plot_twist' },
  { code: 'dang_xem_rap', label: 'Đáng xem rạp', hash: '#đáng_xem_rạp' },
  { code: 'xem_o_nha_ok', label: 'Xem ở nhà OK', hash: '#xem_ở_nhà_ok' },
  { code: 'visual_dinh', label: 'Visual đỉnh', hash: '#visual_đỉnh' },
  { code: 'hai_long', label: 'Hài lòng', hash: '#hài_lòng' },
  { code: 'so', label: 'Sợ', hash: '#sợ' },
];

export const MAX_VIBE_TAGS_PER_REVIEW = 3;

export const getVibeTagLabel = (code) => {
  const tag = REVIEW_VIBE_TAGS.find((item) => item.code === code);
  return tag ? tag.hash : `#${code}`;
};

export const getVibeTagDisplay = (code) => {
  const tag = REVIEW_VIBE_TAGS.find((item) => item.code === code);
  return tag ? tag.label : code;
};
