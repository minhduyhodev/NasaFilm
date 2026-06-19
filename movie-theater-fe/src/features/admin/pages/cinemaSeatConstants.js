export const FALLBACK_SEAT_TYPES = {
  STANDARD: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  VIP: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  COUPLE: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
};

export const SEAT_TYPE_CONFIGS = {
  SELECT: {
    label: 'Công cụ Chọn',
    color: 'bg-[#1E293B] hover:bg-[#334155]',
    border: 'border-slate-500',
    text: 'text-white',
    glow: '',
    accentBg: 'bg-slate-800/25',
    accentBorder: 'border-slate-600',
  },
  STANDARD: {
    label: 'Ghế Thường',
    color: 'bg-emerald-950/60 hover:bg-emerald-900/80',
    border: 'border-emerald-500',
    text: 'text-emerald-400 font-bold',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.25)]',
    accentBg: 'bg-emerald-950/20',
    accentBorder: 'border-emerald-500/40',
  },
  VIP: {
    label: 'Ghế VIP',
    color: 'bg-red-950/60 hover:bg-red-900/80',
    border: 'border-red-500',
    text: 'text-red-400 font-bold',
    glow: 'shadow-[0_0_12px_rgba(239,68,68,0.25)]',
    accentBg: 'bg-red-950/20',
    accentBorder: 'border-red-500/40',
  },
  COUPLE: {
    label: 'Sofa Đôi',
    color: 'bg-fuchsia-950/60 hover:bg-fuchsia-900/80',
    border: 'border-fuchsia-500',
    text: 'text-fuchsia-400 font-bold',
    glow: 'shadow-[0_0_12px_rgba(217,70,239,0.25)]',
    accentBg: 'bg-fuchsia-950/20',
    accentBorder: 'border-fuchsia-500/40',
  },
  BROKEN: {
    label: 'Bảo Trì / Hỏng',
    color: 'bg-zinc-900/60 hover:bg-zinc-850',
    border: 'border-zinc-700',
    text: 'text-zinc-500 line-through',
    glow: '',
    accentBg: 'bg-zinc-900/20',
    accentBorder: 'border-zinc-700/40',
  },
};

export const TEMPLATE_PRESETS = [
  { id: 'small', name: 'Phòng Nhỏ (Standard)', desc: 'Sơ đồ cơ bản 6 hàng x 8 ghế thường.', rows: 6, cols: 8 },
  { id: 'standard', name: 'Phòng Phổ Thông (Mix)', desc: '10 hàng x 12 ghế. VIP ở giữa, Couple ở hàng cuối.', rows: 10, cols: 12 },
  { id: 'vip', name: 'Phòng VIP Premium', desc: 'Sơ đồ sang trọng 6 hàng x 8 ghế (Toàn bộ VIP & Recliner).', rows: 6, cols: 8 },
  { id: 'imax', name: 'Phòng IMAX Hạng Khủng', desc: '14 hàng x 18 ghế. Layout chuẩn rạp IMAX lớn.', rows: 14, cols: 18 },
];

export const ROOM_TYPES = [
  { value: 'STANDARD', label: 'Standard 2D/3D', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  { value: 'IMAX', label: 'IMAX Laser', color: 'text-[#e2c19b] bg-[#e2c19b]/10 border-[#e2c19b]/20 shadow-[0_0_10px_rgba(226,193,155,0.15)]' },
  { value: 'VIP', label: 'VIP Gold Class', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]' },
  { value: 'DOLBY_ATMOS', label: 'Dolby Atmos', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.15)]' },
  { value: 'FOUR_DX', label: '4DX Motion Cinema', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20 shadow-[0_0_10px_rgba(236,72,153,0.15)]' },
];
