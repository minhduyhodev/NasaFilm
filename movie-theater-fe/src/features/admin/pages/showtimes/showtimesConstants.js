import {
  Hash, CalendarClock, Ticket, CheckCircle, XCircle, Ban, LayoutGrid, AlignJustify,
} from 'lucide-react';

export const STATUS_ORDER = ['OPEN_FOR_BOOKING', 'SCHEDULED', 'SOLD_OUT', 'DRAFT', 'FINISHED', 'CANCELLED'];

export const STATUS_CONFIG = {
  DRAFT: {
    label: 'Nháp', icon: Hash, section: 'Nháp',
    dotClass: 'bg-zinc-400', pillBg: 'bg-zinc-500/10', pillBorder: 'border-zinc-500/20', pillText: 'text-zinc-400',
    accent: '#71717a', accentBg: 'rgba(113,113,122,0.1)',
  },
  SCHEDULED: {
    label: 'Sắp Chiếu', icon: CalendarClock, section: 'Sắp Chiếu',
    dotClass: 'bg-blue-400', pillBg: 'bg-blue-500/10', pillBorder: 'border-blue-500/20', pillText: 'text-blue-400',
    accent: '#3b82f6', accentBg: 'rgba(59,130,246,0.1)',
  },
  OPEN_FOR_BOOKING: {
    label: 'Đang Mở Bán', icon: Ticket, section: 'Đang Mở Bán',
    dotClass: 'bg-emerald-400 animate-pulse', pillBg: 'bg-emerald-500/10', pillBorder: 'border-emerald-500/20', pillText: 'text-emerald-400',
    accent: '#10b981', accentBg: 'rgba(16,185,129,0.1)',
  },
  SOLD_OUT: {
    label: 'Hết Ghế', icon: CheckCircle, section: 'Hết Ghế',
    dotClass: 'bg-amber-400', pillBg: 'bg-amber-500/10', pillBorder: 'border-amber-500/20', pillText: 'text-amber-400',
    accent: '#f59e0b', accentBg: 'rgba(245,158,11,0.1)',
  },
  CANCELLED: {
    label: 'Đã Hủy', icon: XCircle, section: 'Đã Hủy',
    dotClass: 'bg-rose-400', pillBg: 'bg-rose-500/10', pillBorder: 'border-rose-500/20', pillText: 'text-rose-400',
    accent: '#f43f5e', accentBg: 'rgba(244,63,94,0.1)',
  },
  FINISHED: {
    label: 'Đã Kết Thúc', icon: Ban, section: 'Đã Kết Thúc',
    dotClass: 'bg-gray-500', pillBg: 'bg-zinc-700/20', pillBorder: 'border-zinc-700/30', pillText: 'text-gray-500',
    accent: '#52525b', accentBg: 'rgba(82,82,91,0.1)',
  },
};

export const SORT_OPTIONS = [
  { value: 'startTime_asc', label: 'Giờ chiếu (sớm → muộn)' },
  { value: 'startTime_desc', label: 'Giờ chiếu (muộn → sớm)' },
  { value: 'movie_asc', label: 'Tên phim (A → Z)' },
  { value: 'revenue_desc', label: 'Giá vé (cao → thấp)' },
];

export const VIEW_MODES = [
  { key: 'grid', icon: LayoutGrid, label: 'Lưới' },
  { key: 'list', icon: AlignJustify, label: 'Danh sách' },
];

export const DEFAULT_COLLAPSED_SECTIONS = {
  FINISHED: true,
  CANCELLED: true,
};

export const KPI_STATUS_MAP = {
  'Tổng': '',
  'Đang Mở Bán': 'OPEN_FOR_BOOKING',
  'Sắp Chiếu': 'SCHEDULED',
  'Đang Chiếu': 'PLAYING_NOW',
  'Đã Kết Thúc': 'FINISHED',
  'Đã Hủy': 'CANCELLED',
};

/** Suất đang trong khung giờ chiếu (start ≤ now ≤ end). */
export const isShowtimePlayingNow = (st, now = new Date()) => {
  if (!st?.startTime || !st?.endTime) return false;
  const start = new Date(st.startTime);
  const end = new Date(st.endTime);
  return start <= now && end >= now
    && (st.status === 'OPEN_FOR_BOOKING' || st.status === 'SOLD_OUT' || st.status === 'SCHEDULED');
};

export const formatTimeOnly = (s) => {
  if (!s) return '--:--';
  return new Date(s).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

export const formatDateShort = (d) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

export const formatWeekday = (d) => {
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return days[d.getDay()];
};

export const isSameDay = (d1, d2) =>
  d1.getFullYear() === d2.getFullYear()
  && d1.getMonth() === d2.getMonth()
  && d1.getDate() === d2.getDate();

export const getValidTransitions = (status) => {
  switch (status) {
    case 'DRAFT': return [
      { target: 'SCHEDULED', label: 'Sắp Chiếu' },
      { target: 'CANCELLED', label: 'Hủy' },
    ];
    case 'SCHEDULED': return [
      { target: 'OPEN_FOR_BOOKING', label: 'Mở Bán Vé' },
      { target: 'CANCELLED', label: 'Hủy Suất' },
    ];
    case 'OPEN_FOR_BOOKING': return [
      { target: 'SOLD_OUT', label: 'Hết Vé' },
      { target: 'FINISHED', label: 'Kết Thúc' },
      { target: 'CANCELLED', label: 'Hủy Suất' },
    ];
    case 'SOLD_OUT': return [
      { target: 'OPEN_FOR_BOOKING', label: 'Mở Lại' },
      { target: 'FINISHED', label: 'Kết Thúc' },
      { target: 'CANCELLED', label: 'Hủy Suất' },
    ];
    default: return [];
  }
};

export const getTransitionBtnClass = (t) => {
  if (t === 'CANCELLED') return 'bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20';
  if (t === 'OPEN_FOR_BOOKING') return 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20';
  if (t === 'FINISHED') return 'bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 hover:bg-zinc-500/20';
  return 'bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20';
};

export const sortShowtimes = (arr, sortKey) => {
  const sorted = [...arr];
  switch (sortKey) {
    case 'startTime_asc': return sorted.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    case 'startTime_desc': return sorted.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    case 'movie_asc': return sorted.sort((a, b) => (a.movieTitle || '').localeCompare(b.movieTitle || ''));
    case 'revenue_desc': return sorted.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
    default: return sorted;
  }
};

export const normalizeActiveRooms = (data) => {
  const list = Array.isArray(data) ? data : (data?.content ?? []);
  return list.filter((room) => String(room?.status ?? '').toUpperCase() === 'ACTIVE');
};
