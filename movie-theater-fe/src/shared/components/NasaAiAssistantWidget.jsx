import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Bot, Check, ChevronDown, ChevronRight, Clock, CreditCard, Crown, Gift, Headset, HelpCircle, ImagePlus, Minus, Send, ShieldCheck, Sparkles, Star, Ticket, User, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../features/auth/hooks/useAuthContext';
import tokenService from '../../features/auth/utils/tokenService';
import { REALTIME_TOPICS } from '../constants/realtimeTopics';
import nasaAssistantFabAvatar from '../assets/nasa-assistant-avatar-head.webp';
import nasaLogo from '../assets/NASAFILM.jpg';
import { useRealtimeTopic } from '../hooks/useRealtimeTopic';
import { useRealtimeTopics } from '../hooks/useRealtimeTopics';
import { notificationService } from '../services/notificationService';
import { supportService } from '../services/supportService';
import { systemConfigService } from '../services/systemConfigService';
import { useConfirm } from '../context/ConfirmDialogContext';
import { getSupportMessageSenderLabel } from '../utils/supportMessageUtils';
import { AI_SESSION_STORAGE_KEY, AI_UI_STATE_KEY, clearNasaBotStorage } from '../utils/nasaBotStorage';
import { parseSupportStickerMessage } from '../constants/supportStickers';
import SupportStickerBubble from './SupportStickerBubble';
import SupportMessageImages from './SupportMessageImages';
import NasaBotMovieCards from './NasaBotMovieCards';
import './NasaAiAssistantWidget.css';
import './NasaAiAssistantWidget.theme.css';

const CHAT_FLOW = {
  AWAIT_DESCRIPTION: 'await_description',
  AWAIT_CONFIRM: 'await_confirm',
};

/** Two separate chatboxes: bot FAQ/wizard vs staff/ticket thread */
const CHAT_VIEW = {
  BOT: 'bot',
  STAFF: 'staff',
};

/** Within Chat bot: pick Hỗ trợ (wizard) or Giải đáp (AI) */
const BOT_INTENT = {
  PICK: 'pick',
  SUPPORT: 'support',
  ANSWER: 'answer',
};

const LIVE_WAIT_TIMEOUT_MS = 3 * 60 * 1000;
const MIN_DESCRIPTION_LENGTH = 15;
const MIN_SEND_GAP_MS = 1200;
const MAX_SUPPORT_IMAGES = 3;
const MAX_SUPPORT_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORT_IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,image/gif';

const AI_SUGGESTED_PROMPTS = [
  'Gợi ý phim đang chiếu hay',
  'Suất chiếu tối nay còn ghế không?',
  'Cách nạp Ví NASA',
  'Ưu đãi hội viên hiện có',
  'Xem phim online như thế nào?',
];

const CATEGORY_GUIDED_KEYS = new Set(['ticket', 'payment', 'account', 'promo', 'membership']);

const CATEGORY_GUIDED_SEEDS = {
  ticket: 'Tôi cần hỗ trợ về vé hoặc suất chiếu.',
  payment: 'Tôi cần hỗ trợ về thanh toán.',
  account: 'Tôi không đăng nhập được và cần hỗ trợ tài khoản.',
  promo: 'Tôi cần hỗ trợ về voucher hoặc khuyến mãi.',
  membership: 'Tôi cần hỗ trợ về hội viên và điểm thưởng.',
};

const normalizeAiChoices = (choices) => {
  if (!Array.isArray(choices) || choices.length === 0) return null;
  return choices
    .map((item) => ({
      text: item?.text || item?.label || item?.value || '',
      value: item?.value || item?.text || item?.label || '',
    }))
    .filter((item) => item.text && item.value);
};

const CATEGORIES = [
  {
    key: 'ticket',
    label: 'Vé / suất chiếu',
    shortLabel: 'Vé',
    hint: 'Mã vé, ghế, suất chiếu, đổi hoặc hoàn',
    question: 'Mô tả vấn đề về vé hoặc suất chiếu',
    icon: Ticket,
    tone: 'ticket',
  },
  {
    key: 'payment',
    label: 'Thanh toán',
    shortLabel: 'Thanh toán',
    hint: 'Giao dịch lỗi, trừ tiền, hoàn tiền',
    question: 'Mô tả lỗi thanh toán',
    icon: CreditCard,
    tone: 'payment',
  },
  {
    key: 'account',
    label: 'Tài khoản',
    shortLabel: 'Tài khoản',
    hint: 'Đăng nhập, OTP email, quên MK, Google, khóa TK',
    question: 'Mô tả lỗi tài khoản (đăng nhập, OTP, mật khẩu). Ghi email đăng ký và thông báo lỗi nếu có.',
    icon: User,
    tone: 'account',
  },
  {
    key: 'promo',
    label: 'Khuyến mãi',
    shortLabel: 'Khuyến mãi',
    hint: 'Voucher, combo bắp nước, mã giảm giá, Offers',
    question: 'Mô tả vấn đề khuyến mãi. Ghi mã voucher/combo, mã đơn và thông báo lỗi nếu có.',
    icon: Gift,
    tone: 'promo',
  },
  {
    key: 'membership',
    label: 'Hội viên',
    shortLabel: 'Hội viên',
    hint: 'Điểm thưởng, hạng Member/Friend/VIP, quyền lợi',
    question: 'Mô tả vấn đề hội viên. Ghi mã đơn, số điểm hiện tại và thời điểm phát sinh.',
    icon: Crown,
    tone: 'membership',
  },
  {
    key: 'other',
    label: 'Khác',
    shortLabel: 'Khác',
    hint: 'Vấn đề chưa nằm trong nhóm trên',
    question: 'Mô tả vấn đề của bạn',
    icon: HelpCircle,
    tone: 'other',
  },
];

const DEFAULT_NASA_BOT_RUNTIME = {
  openingQuestions: [
    'Thanh toán bị lỗi thì làm sao?',
    'Tôi muốn tạo ticket hỗ trợ',
    'Làm sao xem ticket của tôi?',
    'Tôi cần gặp staff online',
  ],
  shortcuts: [
    {
      buttonName: 'Vé / suất chiếu',
      description: 'Mã vé, mã đơn, suất chiếu, ghế, đổi hoặc hoàn vé',
      queryContent: 'Tôi cần hỗ trợ về vé hoặc suất chiếu.',
      shortcutName: 'ticket_support',
    },
    {
      buttonName: 'Thanh toán',
      description: 'Giao dịch lỗi, trừ tiền, chưa nhận vé, hoàn tiền',
      queryContent: 'Tôi cần hỗ trợ về thanh toán.',
      shortcutName: 'payment_support',
    },
    {
      buttonName: 'Tài khoản',
      description: 'Đăng nhập, OTP email, quên mật khẩu, Google OAuth, khóa tài khoản',
      queryContent: 'Tôi không đăng nhập được và cần hỗ trợ tài khoản.',
      shortcutName: 'account_support',
    },
    {
      buttonName: 'Khuyến mãi',
      description: 'Voucher, combo bắp nước, mã giảm giá, trang Offers',
      queryContent: 'Tôi cần hỗ trợ về voucher hoặc khuyến mãi.',
      shortcutName: 'promo_support',
    },
    {
      buttonName: 'Hội viên',
      description: 'Điểm thưởng, hạng NASA Member/Friend/VIP, quyền lợi combo',
      queryContent: 'Tôi cần hỗ trợ về hội viên và điểm thưởng.',
      shortcutName: 'membership_support',
    },
    {
      buttonName: 'Khác',
      description: 'Vấn đề chưa thuộc nhóm có sẵn',
      queryContent: 'Tôi có vấn đề khác cần được hỗ trợ.',
      shortcutName: 'other_support',
    },
  ],
};

const SATISFACTION_OPTIONS = [
  { value: 1, label: 'Rất tệ' },
  { value: 2, label: 'Chưa hài lòng' },
  { value: 3, label: 'Bình thường' },
  { value: 4, label: 'Hài lòng' },
  { value: 5, label: 'Rất hài lòng' },
];

const isClosedSupportStatus = (status = '') => {
  const value = `${status || ''}`.toUpperCase();
  return value === 'DONE' || value === 'RESOLVED' || value === 'CLOSED';
};

const formatCountdown = (ms = 0) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${`${seconds}`.padStart(2, '0')}`;
};

const formatTime = (value = new Date()) =>
  new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(value);

const formatTicketStamp = (value) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const normalise = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const detectCategory = (text = '') => {
  const value = normalise(text);
  if (/(ve|ticket|suat chieu|ghe|dat cho|booking)/.test(value)) return 'ticket';
  if (/(thanh toan|payment|giao dich|tra tien|tru tien|hoan tien)/.test(value)) return 'payment';
  if (/(tai khoan|account|dang nhap|login|otp|mat khau|username)/.test(value)) return 'account';
  if (/(voucher|khuyen mai|promo|uu dai|combo)/.test(value)) return 'promo';
  if (/(hoi vien|membership|diem|vip)/.test(value)) return 'membership';
  return 'other';
};

const shouldStartTicketFlowFromText = (text = '') => {
  const value = normalise(text);
  return /(tao ticket|tao yeu cau|gui ticket|gui yeu cau|mo ticket|can tao ticket|ho tro truc tiep|gap admin|gap staff|gap nguoi that)/.test(value);
};

const shouldOpenTicketListFromText = (text = '') => {
  const value = normalise(text);
  return /(xem ticket|ticket cua toi|danh sach ticket|tinh trang ticket)/.test(value);
};

const resolveSupportErrorMessage = (error, fallback) => {
  const status = error?.response?.status;
  const code = error?.response?.data?.code || error?.response?.data?.errorCode;
  const apiMessage = error?.response?.data?.message || error?.message;
  const msgNorm = normalise(`${apiMessage || ''}`);
  const codeText = `${code || ''}`;
  if (status === 429 || code === 429 || codeText.includes('RATE_LIMIT') || msgNorm.includes('qua nhanh')) {
    return 'Bạn gửi tin nhắn quá nhanh. Vui lòng đợi vài giây rồi thử lại.';
  }
  if (status === 403 && (msgNorm.includes('khoa chat') || msgNorm.includes('tieu chuan cong dong'))) {
    return apiMessage || 'Tài khoản đang bị tạm khóa chat hỗ trợ do vi phạm tiêu chuẩn cộng đồng.';
  }
  if (codeText.includes('SUPPORT_BANNED_WORD') || msgNorm.includes('tu ngu khong phu hop') || msgNorm.includes('noi dung khong phu hop')) {
    return apiMessage || 'Tin nhắn chứa từ ngữ không phù hợp. Vui lòng chỉnh sửa và gửi lại.';
  }
  if (codeText.includes('SUPPORT_IMAGE_INAPPROPRIATE') || msgNorm.includes('anh nhay cam') || msgNorm.includes('18+') || msgNorm.includes('quay roi')) {
    return apiMessage || 'Ảnh nhạy cảm đã bị ẩn và không được gửi.';
  }
  if (codeText.includes('SUPPORT_IMAGE_UNRELATED') || msgNorm.includes('lien quan toi loi') || msgNorm.includes('lien quan toi nasafilm')) {
    return apiMessage || 'Vui lòng gửi ảnh liên quan tới lỗi trên NASAFilm (màn hình lỗi thanh toán, mã vé, voucher, tài khoản…).';
  }
  if (msgNorm.includes('anh chua the') || msgNorm.includes('xac nhan anh an toan') || msgNorm.includes('kiem duyet anh') || codeText.includes('SUPPORT_IMAGE_MODERATION_PENDING')) {
    return apiMessage || 'Ảnh chưa được xác nhận an toàn nên đã bị ẩn và không được gửi.';
  }
  if (code === 409 || msgNorm.includes('da danh gia') || codeText.includes('ALREADY_RATED')) {
    return 'Bạn đã đánh giá ticket này rồi.';
  }
  if (msgNorm.includes('hoan tat') || msgNorm.includes('chi danh gia') || codeText.includes('SATISFACTION_NOT_ALLOWED')) {
    return 'Chỉ đánh giá được khi ticket đã hoàn tất.';
  }
  return apiMessage || fallback;
};

const getTicketPreviewText = (value = '') => {
  const parsed = parseSupportStickerMessage(value);
  if (parsed.type === 'sticker') {
    return parsed.text || 'Nhãn cảm ơn từ staff';
  }
  return value;
};

const getOwnerLabel = (user) => user?.fullName || user?.email || 'Tài khoản của bạn';

const hasAdminAccess = (user) => {
  const roles = (user?.roles || []).map((role) => `${role}`.toLowerCase());
  return roles.includes('admin') || roles.includes('staff');
};

const getTicketStatusMeta = (status = '') => {
  const value = `${status || ''}`.toUpperCase();
  switch (value) {
    case 'DONE':
      return { label: 'Đã xong', className: 'nasa-assistant-status nasa-assistant-status--done' };
    case 'CLOSED':
    case 'RESOLVED':
      return { label: 'Đã hủy/đóng', className: 'nasa-assistant-status nasa-assistant-status--done' };
    case 'IN_PROGRESS':
      return { label: 'Đang xử lý', className: 'nasa-assistant-status nasa-assistant-status--progress' };
    case 'LIVE_REQUESTED':
      return { label: 'Chờ chat', className: 'nasa-assistant-status nasa-assistant-status--pending' };
    default:
      return { label: 'Đang chờ', className: 'nasa-assistant-status nasa-assistant-status--pending' };
  }
};

const getCategoryByKey = (key = '') => CATEGORIES.find((item) => item.key === key) || null;

const getCategoryLabel = (key = '') => getCategoryByKey(key)?.label || key || 'Hỗ trợ chung';

const _resolveShortcutCategoryKey = (shortcut = {}) => {
  const name = `${shortcut.shortcutName || ''}`.toLowerCase();
  if (name.includes('ticket')) return 'ticket';
  if (name.includes('payment')) return 'payment';
  if (name.includes('account')) return 'account';
  if (name.includes('promo')) return 'promo';
  if (name.includes('membership')) return 'membership';
  return 'other';
};

const isAgentMessage = (senderRole = '') => `${senderRole}`.toUpperCase() !== 'USER';

const readStoredAiSession = () => {
  try {
    return localStorage.getItem(AI_SESSION_STORAGE_KEY) || null;
  } catch {
    return null;
  }
};

const readStoredUiState = () => {
  try {
    const raw = localStorage.getItem(AI_UI_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initialMessages = (intent = BOT_INTENT.SUPPORT) => {
  if (intent === BOT_INTENT.ANSWER) {
    return [];
  }

  return [
    {
      id: 'welcome',
      role: 'bot',
      type: 'text',
      text: 'Chào bạn! Chọn danh mục hỗ trợ bên dưới, mô tả vấn đề, rồi mình sẽ gửi yêu cầu tới nhân viên / tạo ticket.',
      time: formatTime(),
    },
    {
      id: 'categories',
      role: 'bot',
      type: 'categories',
      time: formatTime(),
    },
  ];
};

/**
 * Rebuild the initial bot chat state (mode + wizard step) from a lightweight
 * localStorage snapshot. This lets an in-progress wizard (choosing a category,
 * typing a description, confirming) survive a reload even before any AI exchange
 * is persisted server-side. Wizard messages are deterministic from the snapshot,
 * so we regenerate them instead of storing the whole (non-serializable) thread.
 */
const buildInitialBotState = (snapshot) => {
  const empty = { intent: BOT_INTENT.PICK, messages: [], category: null, chatFlow: null, description: '' };
  if (!snapshot || !snapshot.intent || snapshot.intent === BOT_INTENT.PICK) {
    return empty;
  }
  if (snapshot.intent === BOT_INTENT.ANSWER) {
    return { ...empty, intent: BOT_INTENT.ANSWER, messages: initialMessages(BOT_INTENT.ANSWER) };
  }

  // SUPPORT mode.
  const category = snapshot.categoryKey ? getCategoryByKey(snapshot.categoryKey) : null;
  if (!snapshot.chatFlow || !category) {
    return { ...empty, intent: BOT_INTENT.SUPPORT, messages: initialMessages(BOT_INTENT.SUPPORT) };
  }

  const messages = [initialMessages(BOT_INTENT.SUPPORT)[0]]; // keep only the welcome bubble
  messages.push({ id: 'restore-cat', role: 'user', type: 'text', text: category.label, time: formatTime() });
  messages.push({
    id: 'restore-question',
    role: 'bot',
    type: 'text',
    text: `${category.question}. Mô tả tối thiểu ${MIN_DESCRIPTION_LENGTH} ký tự.`,
    time: formatTime(),
  });

  if (snapshot.chatFlow === CHAT_FLOW.AWAIT_CONFIRM && snapshot.description) {
    messages.push({ id: 'restore-desc', role: 'user', type: 'text', text: snapshot.description, time: formatTime() });
    messages.push({ id: 'restore-confirm', role: 'bot', type: 'confirm', category, description: snapshot.description, time: formatTime() });
    return { intent: BOT_INTENT.SUPPORT, messages, category, chatFlow: CHAT_FLOW.AWAIT_CONFIRM, description: snapshot.description };
  }

  return { intent: BOT_INTENT.SUPPORT, messages, category, chatFlow: CHAT_FLOW.AWAIT_DESCRIPTION, description: '' };
};

// Inline markdown the bot may emit: [label](url) links and **bold**.
const INLINE_TOKEN_RE = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;

const renderInlineTokens = (line, keyPrefix, onLinkClick) => {
  const nodes = [];
  const re = new RegExp(INLINE_TOKEN_RE);
  let lastIndex = 0;
  let idx = 0;
  let match;
  while ((match = re.exec(line)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      const label = match[1];
      const url = match[2];
      const isInternal = url.startsWith('/');
      const linkKey = `${keyPrefix}-l-${idx++}`;
      nodes.push(
        <a
          key={linkKey}
          href={url}
          className="nasa-assistant-link"
          {...(isInternal
            ? { onClick: (event) => { event.preventDefault(); onLinkClick?.(url); } }
            : { target: '_blank', rel: 'noopener noreferrer' })}
        >
          {renderInlineTokens(label, linkKey, onLinkClick)}
        </a>,
      );
    } else if (match[3] !== undefined) {
      const boldKey = `${keyPrefix}-b-${idx++}`;
      nodes.push(<strong key={boldKey}>{renderInlineTokens(match[3], boldKey, onLinkClick)}</strong>);
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }
  return nodes;
};

/** Render bot text with clickable movie links, **bold**, and real line breaks. */
const renderRichText = (text, onLinkClick) => {
  if (text === null || text === undefined) return null;
  const lines = String(text).split('\n');
  return lines.map((line, i) => (
    <React.Fragment key={`rt-${i}`}>
      {renderInlineTokens(line, `rt-${i}`, onLinkClick)}
      {i < lines.length - 1 ? <br /> : null}
    </React.Fragment>
  ));
};

/**
 * When poster cards are shown, hide redundant bullet/numbered movie catalog lines
 * (title · genre · rating · duration) that duplicate the cards.
 */
const stripMovieCatalogLines = (text) => {
  if (!text || !/\/movie\/[0-9a-fA-F-]{36}/.test(text)) return text;
  const cleaned = String(text)
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      const listItem = /^([•\-*]|\d+[.)])\s+/.test(trimmed);
      const movieLine = /\/movie\/[0-9a-fA-F-]{36}/.test(trimmed);
      return !(listItem && movieLine);
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return cleaned || text;
};

const NasaAiAssistantWidget = () => {
  const confirm = useConfirm();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const botScrollRef = useRef(null);
  const staffScrollRef = useRef(null);

  // Restore the mode + wizard step synchronously so a reload never drops the
  // user back on the "Chọn 1 trong 2" screen mid-flow.
  const [bootBotState] = useState(() => buildInitialBotState(readStoredUiState()));

  const [open, setOpen] = useState(false);
  const [fabHeadWiggle, setFabHeadWiggle] = useState(false);
  const [fabAttentionPing, setFabAttentionPing] = useState(false);
  const [chatView, setChatView] = useState(CHAT_VIEW.BOT);
  const [botIntent, setBotIntent] = useState(bootBotState.intent);
  const [messages, setMessages] = useState(bootBotState.messages);
  const [botSessionId, setBotSessionId] = useState(() => readStoredAiSession());
  const [aiStatus, setAiStatus] = useState({ configured: false, mode: 'FALLBACK' });
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(bootBotState.category);
  const [ticketDraft, setTicketDraft] = useState('');
  const [ticket, setTicket] = useState(null);
  const [myTickets, setMyTickets] = useState([]);
  const [activeTicketCode, setActiveTicketCode] = useState('');
  const [ticketMessages, setTicketMessages] = useState([]);
  const [liveAvailability, setLiveAvailability] = useState({ anyOnline: false, agents: [] });
  const [_nasaBotRuntime, setNasaBotRuntime] = useState(DEFAULT_NASA_BOT_RUNTIME);
  const [chatFlow, setChatFlow] = useState(bootBotState.chatFlow);
  const [guidedChatActive, setGuidedChatActive] = useState(false);
  const [wizardCategory, setWizardCategory] = useState(bootBotState.category);
  const [wizardDescription, setWizardDescription] = useState(bootBotState.description);
  const [showTicketDrawer, setShowTicketDrawer] = useState(false);
  const [liveWaitStartedAt, setLiveWaitStartedAt] = useState(null);
  const [liveWaitTick, setLiveWaitTick] = useState(Date.now());
  const [unreadStaffTicketCodes, setUnreadStaffTicketCodes] = useState([]);
  const [pendingImages, setPendingImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  // Bot reply movie links → navigate in-app and tuck the widget away so the
  // customer lands on the movie page.
  const handleBotLinkClick = (url) => {
    if (!url) return;
    setOpen(false);
    navigate(url);
  };

  const lastSendAtRef = useRef(0);
  const openRef = useRef(false);
  const fabAttentionBusyRef = useRef(false);
  const fabWiggleTimerRef = useRef(null);
  const activeTicketCodeRef = useRef('');
  const chatViewRef = useRef(CHAT_VIEW.BOT);
  const botRestoredRef = useRef(false);
  const prevUserKeyRef = useRef(undefined);
  const imageInputRef = useRef(null);
  const categoryPickerRef = useRef(null);

  const currentUser = user || tokenService.getUser();
  const ownerLabel = useMemo(() => getOwnerLabel(currentUser), [currentUser]);
  const isAdminUser = useMemo(() => hasAdminAccess(currentUser), [currentUser]);
  const isLoggedInCustomer = Boolean(currentUser?.email) && !isAdminUser;

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // FAB attention mỗi 5s (khi widget đóng): xoay đầu → báo đỏ.
  useEffect(() => {
    if (open) {
      setFabHeadWiggle(false);
      setFabAttentionPing(false);
      fabAttentionBusyRef.current = false;
      if (fabWiggleTimerRef.current) {
        window.clearTimeout(fabWiggleTimerRef.current);
        fabWiggleTimerRef.current = null;
      }
      return undefined;
    }

    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const runAttention = () => {
      if (openRef.current || fabAttentionBusyRef.current) return;
      fabAttentionBusyRef.current = true;

      if (reducedMotion) {
        setFabAttentionPing(true);
        fabWiggleTimerRef.current = window.setTimeout(() => {
          setFabAttentionPing(false);
          fabAttentionBusyRef.current = false;
        }, 900);
        return;
      }

      setFabHeadWiggle(true);
    };

    const firstId = window.setTimeout(runAttention, 1800);
    const intervalId = window.setInterval(runAttention, 5000);

    return () => {
      window.clearTimeout(firstId);
      window.clearInterval(intervalId);
      if (fabWiggleTimerRef.current) {
        window.clearTimeout(fabWiggleTimerRef.current);
        fabWiggleTimerRef.current = null;
      }
    };
  }, [open]);

  const handleFabHeadAnimationEnd = (event) => {
    if (event.animationName !== 'nasaFabHeadWiggle') return;
    setFabHeadWiggle(false);
    if (openRef.current) {
      fabAttentionBusyRef.current = false;
      return;
    }
    setFabAttentionPing(true);
    if (fabWiggleTimerRef.current) window.clearTimeout(fabWiggleTimerRef.current);
    fabWiggleTimerRef.current = window.setTimeout(() => {
      setFabAttentionPing(false);
      fabAttentionBusyRef.current = false;
      fabWiggleTimerRef.current = null;
    }, 1000);
  };
  useEffect(() => {
    if (!categoryMenuOpen) return undefined;
    const onPointerDown = (event) => {
      if (categoryPickerRef.current && !categoryPickerRef.current.contains(event.target)) {
        setCategoryMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [categoryMenuOpen]);

  // Keep the active AI session id in localStorage so the chat survives a reload.
  useEffect(() => {
    try {
      if (botSessionId) {
        localStorage.setItem(AI_SESSION_STORAGE_KEY, botSessionId);
      } else {
        localStorage.removeItem(AI_SESSION_STORAGE_KEY);
      }
    } catch {
      // localStorage unavailable — ignore.
    }
  }, [botSessionId]);

  // Persist the lightweight wizard snapshot (mode + current step) so an
  // in-progress support flow survives a reload before any AI reply is saved.
  useEffect(() => {
    try {
      if (botIntent === BOT_INTENT.PICK) {
        localStorage.removeItem(AI_UI_STATE_KEY);
        return;
      }
      const category = wizardCategory || selectedCategory;
      localStorage.setItem(AI_UI_STATE_KEY, JSON.stringify({
        intent: botIntent,
        chatFlow: chatFlow || null,
        categoryKey: category?.key || null,
        description: wizardDescription || '',
      }));
    } catch {
      // localStorage unavailable — ignore.
    }
  }, [botIntent, chatFlow, selectedCategory, wizardCategory, wizardDescription]);

  // On first load, restore the previous NASA BOT conversation from the server.
  useEffect(() => {
    if (botRestoredRef.current) return undefined;
    if (!isLoggedInCustomer) return undefined;
    const stored = readStoredAiSession();
    if (!stored) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const [msgs, sessions] = await Promise.all([
          supportService.getAiSessionMessages(stored),
          supportService.getAiSessions(),
        ]);
        if (cancelled) return;
        if (!Array.isArray(msgs) || msgs.length === 0) {
          botRestoredRef.current = true;
          return;
        }

        const meta = Array.isArray(sessions)
          ? sessions.find((item) => item.sessionCode === stored)
          : null;
        const isSupport = `${meta?.mode || ''}`.toUpperCase() === 'SUPPORT';
        const mode = isSupport ? BOT_INTENT.SUPPORT : BOT_INTENT.ANSWER;

        const lastIndex = msgs.length - 1;
        const restored = msgs.map((item, index) => {
          const isBot = `${item.role || ''}`.toUpperCase() !== 'USER';
          // Only the latest bot message keeps its choice buttons active.
          const choices = isBot && index === lastIndex ? normalizeAiChoices(item.choices) : null;
          return {
            id: `restored-${index}`,
            role: isBot ? 'bot' : 'user',
            type: 'text',
            text: item.content,
            ...(choices?.length ? { choices } : {}),
            time: item.createdAt ? formatTime(new Date(item.createdAt)) : formatTime(),
          };
        });

        // Mark restored only on success so React StrictMode's double-invoke
        // (which cancels the first run) doesn't skip the real restore.
        botRestoredRef.current = true;
        setBotIntent(mode);
        setChatView(CHAT_VIEW.BOT);
        setMessages(restored);
        setBotSessionId(stored);
        // Re-enable the guided wizard so the composer keeps driving the flow.
        if (isSupport) {
          setGuidedChatActive(true);
        }
      } catch {
        // Stale or forbidden session — drop it so a fresh one starts.
        if (!cancelled) setBotSessionId(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoggedInCustomer]);

  useEffect(() => {
    activeTicketCodeRef.current = activeTicketCode;
  }, [activeTicketCode]);

  useEffect(() => {
    chatViewRef.current = chatView;
  }, [chatView]);

  const activeTicket = useMemo(() => {
    const fromList = activeTicketCode
      ? myTickets.find((item) => item.ticketCode === activeTicketCode)
      : null;
    if (ticket?.ticketCode && (!activeTicketCode || ticket.ticketCode === activeTicketCode)) {
      // Prefer live detail (websocket/refresh) over possibly stale list row
      return fromList ? { ...fromList, ...ticket } : ticket;
    }
    return fromList || ticket || null;
  }, [activeTicketCode, myTickets, ticket]);

  const shouldHideOnRoute = useMemo(() => {
    const pathname = location.pathname || '';
    return (
      pathname.startsWith('/login')
      || pathname.startsWith('/register')
      || pathname.startsWith('/forgot-password')
      || pathname.startsWith('/reset-password')
      || pathname.startsWith('/activate-account')
      || pathname.startsWith('/unauthorized')
      || pathname.startsWith('/admin')
    );
  }, [location.pathname]);

  const supportStatus = useMemo(() => {
    if (typing) return 'NASA BOT đang xử lý';
    if (botIntent === BOT_INTENT.PICK && chatView === CHAT_VIEW.BOT) return 'Chọn Hỗ trợ hoặc Giải đáp';
    if (botIntent === BOT_INTENT.ANSWER) {
      if (aiStatus?.configured) return 'Giải đáp AI';
      return 'Giải đáp AI · chưa cấu hình';
    }
    if (chatFlow === CHAT_FLOW.AWAIT_DESCRIPTION) {
      return `Bước 2/3 · ${wizardCategory?.label || 'Mô tả'}`;
    }
    if (chatFlow === CHAT_FLOW.AWAIT_CONFIRM) return 'Bước 3/3 · Xác nhận';
    if (liveAvailability?.anyOnline) {
      const onlineCount = Array.isArray(liveAvailability.agents) ? liveAvailability.agents.length : 0;
      return onlineCount > 0 ? `${onlineCount} staff đang online · dùng tab Nhắn staff` : 'Có staff đang online';
    }
    return 'Hỗ trợ · wizard tạo ticket';
  }, [
    aiStatus?.configured,
    aiStatus?.mode,
    botIntent,
    chatFlow,
    chatView,
    liveAvailability?.agents,
    liveAvailability?.anyOnline,
    typing,
    wizardCategory,
  ]);

  const canReplyToTicket = Boolean(
    activeTicket?.ticketCode
    && !isClosedSupportStatus(activeTicket?.status),
  );

  const isStaffView = chatView === CHAT_VIEW.STAFF;
  const isBotView = chatView === CHAT_VIEW.BOT;
  const isSupportIntent = botIntent === BOT_INTENT.SUPPORT;
  const isAnswerIntent = botIntent === BOT_INTENT.ANSWER;
  const isBotPickIntent = isBotView && botIntent === BOT_INTENT.PICK;

  const composerPlaceholder = useMemo(() => {
    if (isStaffView) {
      if (!activeTicket?.ticketCode) {
        return 'Chọn ticket hỗ trợ để nhắn nhân viên...';
      }
      if (!canReplyToTicket) {
        return 'Ticket đã đóng — bạn có thể đánh giá hỗ trợ phía trên';
      }
      if (activeTicket.liveConnected) {
        return `Nhắn ${activeTicket.assignedStaffName || activeTicket.assignedStaffEmail || 'nhân viên'}...`;
      }
      if (activeTicket.liveRequested) {
        return 'Để lại tin nhắn, nhân viên sẽ thấy khi nhận hỗ trợ...';
      }
      return 'Nhắn nhân viên / admin xử lý ticket...';
    }
    if (isBotPickIntent) return 'Chọn Hỗ trợ hoặc Giải đáp phía trên...';
    if (isAnswerIntent) return 'Hỏi AI về NASAFilm...';
    if (chatFlow === CHAT_FLOW.AWAIT_DESCRIPTION) {
      return wizardCategory?.question || 'Mô tả vấn đề của bạn...';
    }
    if (chatFlow === CHAT_FLOW.AWAIT_CONFIRM) {
      return 'Chọn Gửi yêu cầu hoặc Sửa trên card phía trên...';
    }
    return 'Nhập để chat với NASA BOT...';
  }, [activeTicket, canReplyToTicket, chatFlow, isAnswerIntent, isBotPickIntent, isStaffView, wizardCategory]);

  const liveWaitRemainingMs = useMemo(() => {
    if (!liveWaitStartedAt || activeTicket?.liveConnected) return 0;
    return Math.max(0, LIVE_WAIT_TIMEOUT_MS - (liveWaitTick - liveWaitStartedAt));
  }, [activeTicket?.liveConnected, liveWaitStartedAt, liveWaitTick]);

  const isWaitingLive = Boolean(
    activeTicket?.ticketCode
    && (activeTicket.liveRequested || `${activeTicket.status || ''}`.toUpperCase() === 'LIVE_REQUESTED')
    && !activeTicket.liveConnected,
  );

  const headerSubtitle = useMemo(() => {
    if (isStaffView) {
      if (!activeTicket?.ticketCode) return 'Hỗ trợ · chọn ticket để nhắn nhân viên';
      if (isWaitingLive) return `Chờ nhân viên · ${formatCountdown(liveWaitRemainingMs)}`;
      if (activeTicket.liveConnected) return `Nhắn với ${activeTicket.assignedStaffName || 'nhân viên'}`;
      if (isClosedSupportStatus(activeTicket.status)) return `Ticket ${activeTicket.ticketCode} đã hoàn tất`;
      return `Ticket ${activeTicket.ticketCode}`;
    }
    if (chatFlow === CHAT_FLOW.AWAIT_DESCRIPTION) return `Bước 2/3 · ${wizardCategory?.label || 'Mô tả'}`;
    if (chatFlow === CHAT_FLOW.AWAIT_CONFIRM) return 'Bước 3/3 · Xác nhận';
    return supportStatus;
  }, [
    activeTicket?.assignedStaffName,
    activeTicket?.liveConnected,
    activeTicket?.status,
    activeTicket?.ticketCode,
    chatFlow,
    isStaffView,
    isWaitingLive,
    liveWaitRemainingMs,
    supportStatus,
    wizardCategory,
  ]);

  useEffect(() => {
    if (!liveWaitStartedAt || activeTicket?.liveConnected) return undefined;
    const intervalId = window.setInterval(() => setLiveWaitTick(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [activeTicket?.liveConnected, liveWaitStartedAt]);

  useEffect(() => {
    const node = isStaffView ? staffScrollRef.current : botScrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages, ticketMessages, typing, open, isWaitingLive, isStaffView, chatView]);

  /* Chặn scroll chaining: lăn trong bot không kéo trang web phía sau */
  useEffect(() => {
    if (!open) return undefined;

    const nodes = [botScrollRef.current, staffScrollRef.current].filter(Boolean);

    const lockWheel = (event) => {
      const el = event.currentTarget;
      event.preventDefault();
      event.stopPropagation();
      el.scrollTop += event.deltaY;
    };

    nodes.forEach((node) => {
      node.addEventListener('wheel', lockWheel, { passive: false });
    });

    return () => {
      nodes.forEach((node) => {
        node.removeEventListener('wheel', lockWheel);
      });
    };
  }, [open, isStaffView, chatView, isBotPickIntent, isSupportIntent]);

  useEffect(() => {
    const needsRating = Boolean(
      activeTicket?.ticketCode
      && isClosedSupportStatus(activeTicket?.status)
      && !activeTicket?.satisfactionRating,
    );

    if (needsRating) {
      // Đưa user sang tab staff để thấy sao đánh giá (ticket đóng thì không còn canReply).
      setChatView(CHAT_VIEW.STAFF);
      setMessages((prev) => prev.filter((item) => item.type !== 'satisfaction'));
    }
  }, [activeTicket?.satisfactionRating, activeTicket?.status, activeTicket?.ticketCode]);

  useEffect(() => {
    // Keep views independent: opening a ticket always jumps to Staff chatbox
    if (activeTicketCode && canReplyToTicket) {
      setChatView(CHAT_VIEW.STAFF);
    }
  }, [activeTicketCode, canReplyToTicket]);

  useEffect(() => {
    if (!open) return;

    let activeFlag = true;

    const loadRuntimeConfig = async () => {
      try {
        const data = await systemConfigService.getConfig();
        if (!activeFlag) return;
        const nasaBot = data?.nasaBot || {};
        setNasaBotRuntime({
          openingQuestions: Array.isArray(nasaBot.openingQuestions) && nasaBot.openingQuestions.length > 0
            ? nasaBot.openingQuestions
            : DEFAULT_NASA_BOT_RUNTIME.openingQuestions,
          shortcuts: Array.isArray(nasaBot.shortcuts) && nasaBot.shortcuts.length > 0
            ? nasaBot.shortcuts
            : DEFAULT_NASA_BOT_RUNTIME.shortcuts,
        });
      } catch {
        if (activeFlag) {
          setNasaBotRuntime(DEFAULT_NASA_BOT_RUNTIME);
        }
      }
    };

    const loadLiveAvailability = async () => {
      try {
        const data = await supportService.getLiveSupportAvailability();
        if (activeFlag) setLiveAvailability(data || { anyOnline: false, agents: [] });
      } catch {
        if (activeFlag) setLiveAvailability({ anyOnline: false, agents: [] });
      }
    };

    const loadAiStatus = async () => {
      try {
        const data = await supportService.getSupportAiStatus();
        if (activeFlag) {
          setAiStatus({
            configured: Boolean(data?.configured),
            mode: data?.mode || 'FALLBACK',
          });
        }
      } catch {
        if (activeFlag) setAiStatus({ configured: false, mode: 'FALLBACK' });
      }
    };

    loadRuntimeConfig();
    loadLiveAvailability();
    loadAiStatus();

    return () => {
      activeFlag = false;
    };
  }, [open]);

  // Keep ticket list warm so we can subscribe to open threads even when widget is closed.
  useEffect(() => {
    if (!isLoggedInCustomer || shouldHideOnRoute) return undefined;

    let activeFlag = true;
    const loadMySupportTickets = async () => {
      if (document.hidden) return;
      try {
        const list = await supportService.getMySupportRequests();
        if (activeFlag) {
          setMyTickets(Array.isArray(list) ? list : []);
        }
      } catch {
        if (activeFlag) {
          setMyTickets([]);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) loadMySupportTickets();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    loadMySupportTickets();
    const intervalId = window.setInterval(loadMySupportTickets, 60000);
    return () => {
      activeFlag = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [isLoggedInCustomer, shouldHideOnRoute]);

  const openStaffAlertTopics = useMemo(() => {
    if (!isLoggedInCustomer || shouldHideOnRoute) return [];
    const codes = new Set(
      myTickets
        .filter((item) => item?.ticketCode && !isClosedSupportStatus(item.status))
        .map((item) => item.ticketCode),
    );
    // Always keep the ticket the user is currently viewing subscribed — even after it
    // flips to DONE/RESOLVED. The admin's closing "thank-you" sticker is sent together
    // with the status change in one broadcast; without this the topic would be dropped
    // as the status turns closed and the message would only appear after a manual reload.
    if (activeTicketCode) {
      codes.add(activeTicketCode);
    }
    return [...codes].map((code) => REALTIME_TOPICS.supportTicket(code));
  }, [isLoggedInCustomer, myTickets, shouldHideOnRoute, activeTicketCode]);

  const markStaffTicketUnread = (ticketCode) => {
    if (!ticketCode) return;
    setUnreadStaffTicketCodes((prev) => (
      prev.includes(ticketCode) ? prev : [...prev, ticketCode]
    ));
  };

  const clearStaffTicketUnread = (ticketCode) => {
    if (!ticketCode) {
      setUnreadStaffTicketCodes([]);
      return;
    }
    setUnreadStaffTicketCodes((prev) => prev.filter((code) => code !== ticketCode));
  };

  const openTicketThreadRef = useRef(async () => { });

  useRealtimeTopic(
    hasAdminAccess(user) ? REALTIME_TOPICS.SUPPORT_AGENTS : null,
    () => {
      supportService.getLiveSupportAvailability()
        .then((data) => setLiveAvailability(data || { anyOnline: false, agents: [] }))
        .catch(() => setLiveAvailability({ anyOnline: false, agents: [] }));
    },
  );

  useRealtimeTopics(
    openStaffAlertTopics,
    async (payload, topic) => {
      const ticketCode = payload?.ticketCode
        || `${topic || ''}`.replace(/^\/topic\/support\//, '');
      const senderRole = `${payload?.senderRole || ''}`.toUpperCase();
      if (!ticketCode) return;

      const viewingThisThread = openRef.current
        && activeTicketCodeRef.current === ticketCode
        && chatViewRef.current === CHAT_VIEW.STAFF;

      if (senderRole === 'ADMIN' || senderRole === 'STAFF') {
        if (!viewingThisThread) {
          markStaffTicketUnread(ticketCode);
          notificationService.info(`Nhân viên vừa nhắn trong ticket ${ticketCode}`, {
            title: 'Tin nhắn từ hỗ trợ',
            variant: 'message',
            actionLabel: 'Mở chat',
            onAction: () => {
              setOpen(true);
              clearStaffTicketUnread(ticketCode);
              openTicketThreadRef.current?.(ticketCode);
            },
            toastId: `customer-support-msg-${ticketCode}`,
            autoClose: 8000,
          });
          notificationService.addNotification(
            'Tin nhắn từ hỗ trợ',
            `Có tin nhắn mới trong ticket ${ticketCode}`,
            'info',
          );
        }
      }

      if (activeTicketCodeRef.current === ticketCode) {
        try {
          const [detail, list, tickets] = await Promise.all([
            supportService.getSupportRequest(ticketCode),
            supportService.getSupportMessages(ticketCode),
            supportService.getMySupportRequests(),
          ]);
          setTicket(detail || null);
          setTicketMessages(Array.isArray(list) ? list : []);
          setMyTickets(Array.isArray(tickets) ? tickets : []);
          if (viewingThisThread && (senderRole === 'ADMIN' || senderRole === 'STAFF')) {
            clearStaffTicketUnread(ticketCode);
          }
        } catch {
          // Ignore realtime refresh errors.
        }
      } else if (senderRole === 'ADMIN' || senderRole === 'STAFF') {
        try {
          const tickets = await supportService.getMySupportRequests();
          setMyTickets(Array.isArray(tickets) ? tickets : []);
        } catch {
          // Ignore list refresh errors.
        }
      }
    },
    250,
  );

  const pushMessage = (message) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, ...message, time: formatTime() }]);
  };

  const pushBot = (text, extra = {}) => pushMessage({ role: 'bot', type: 'text', text, ...extra });
  const pushUser = (text) => pushMessage({ role: 'user', type: 'text', text });

  useEffect(() => {
    const ticketCode = activeTicket?.ticketCode;
    const isWaitingLive = ticketCode
      && (activeTicket.liveRequested || `${activeTicket.status || ''}`.toUpperCase() === 'LIVE_REQUESTED')
      && !activeTicket.liveConnected;

    if (!isWaitingLive || !liveWaitStartedAt) return undefined;

    let cancelled = false;

    const pollLiveStatus = async () => {
      if (cancelled || !ticketCode || document.hidden) return;

      try {
        const detail = await supportService.getSupportRequest(ticketCode);
        if (cancelled) return;

        if (detail?.liveConnected) {
          setTicket(detail);
          setLiveWaitStartedAt(null);
          setChatView(CHAT_VIEW.STAFF);
          pushMessage({
            role: 'bot',
            type: 'card',
            title: 'Đã kết nối nhân viên',
            text: `${detail.assignedStaffName || detail.assignedStaffEmail || 'Nhân viên'} đã nhận yêu cầu. Chuyển sang tab Nhắn staff để chat trực tiếp.`,
          });
          await loadMyTickets();
          return;
        }

        const status = `${detail?.status || ''}`.toUpperCase();
        if (status === 'PENDING' && !detail?.liveRequested) {
          setTicket(detail);
          setLiveWaitStartedAt(null);
          pushMessage({
            role: 'bot',
            type: 'card',
            title: 'Đã chuyển sang ticket',
            text: `Yêu cầu chat không được nhận. Ticket ${ticketCode} đang chờ admin xử lý — bạn có thể nhắn tiếp ngay bên dưới.`,
          });
          await loadMyTickets();
          return;
        }

        if (Date.now() - liveWaitStartedAt >= LIVE_WAIT_TIMEOUT_MS) {
          const updated = await supportService.fallbackLiveSupport(ticketCode);
          if (cancelled) return;
          setTicket(updated || detail);
          setLiveWaitStartedAt(null);
          pushMessage({
            role: 'bot',
            type: 'card',
            title: 'Hết thời gian chờ chat',
            text: `Không có nhân viên nhận trong 3 phút. Ticket ${ticketCode} đã chuyển sang chờ admin xử lý.`,
          });
          await loadMyTickets();
        }
      } catch {
        // Ignore polling errors.
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) pollLiveStatus();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    pollLiveStatus();
    const intervalId = window.setInterval(pollLiveStatus, 5000);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [
    activeTicket?.liveConnected,
    activeTicket?.liveRequested,
    activeTicket?.status,
    activeTicket?.ticketCode,
    liveWaitStartedAt,
  ]);

  const buildHistory = (nextUserText = '') => {
    const nextItems = nextUserText
      ? [...messages, { role: 'user', type: 'text', text: nextUserText }]
      : messages;

    return nextItems
      .filter((item) => item.type === 'text')
      .slice(-10)
      .map((item) => ({
        role: item.role === 'bot' ? 'assistant' : 'user',
        content: item.text,
      }));
  };

  const loadMyTickets = async () => {
    try {
      const list = await supportService.getMySupportRequests();
      const next = Array.isArray(list) ? list : [];
      setMyTickets(next);
      if (activeTicketCode && !next.some((item) => item.ticketCode === activeTicketCode)) {
        setActiveTicketCode('');
      }
      return next;
    } catch {
      setMyTickets([]);
      return [];
    }
  };

  const refreshTicketThread = async (ticketCode = activeTicketCode) => {
    if (!ticketCode) return null;
    const [detail, list] = await Promise.all([
      supportService.getSupportRequest(ticketCode),
      supportService.getSupportMessages(ticketCode),
    ]);
    setTicket(detail || null);
    setTicketMessages(Array.isArray(list) ? list : []);
    return detail || null;
  };

  const openTicketThread = async (ticketCode) => {
    if (!ticketCode) return;
    clearPendingImages();
    setShowTicketDrawer(false);
    setActiveTicketCode(ticketCode);
    setChatView(CHAT_VIEW.STAFF);
    setChatFlow(null);
    setWizardCategory(null);
    setWizardDescription('');
    clearStaffTicketUnread(ticketCode);
    try {
      await refreshTicketThread(ticketCode);
      await loadMyTickets();
    } catch {
      notificationService.error('Không tải được cuộc trò chuyện ticket lúc này.');
      setTicketMessages([]);
    }
  };

  const cancelActiveTicket = async (ticketCode = activeTicketCode) => {
    if (!ticketCode) return;
    const ok = await confirm({
      title: 'Hủy yêu cầu hỗ trợ',
      message: 'Bạn có thể tạo ticket mới sau khi hủy.',
      highlight: ticketCode,
      confirmLabel: 'Hủy yêu cầu',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await supportService.cancelSupportRequest(ticketCode);
      clearStaffTicketUnread(ticketCode);
      await loadMyTickets();
      if (activeTicketCode === ticketCode) {
        await refreshTicketThread(ticketCode);
      }
      notificationService.success(`Đã hủy ticket ${ticketCode}.`);
    } catch (error) {
      notificationService.error(resolveSupportErrorMessage(error, 'Không hủy được ticket lúc này.'));
    }
  };

  useEffect(() => {
    openTicketThreadRef.current = openTicketThread;
  });

  const enterBotIntent = (intent) => {
    setChatView(CHAT_VIEW.BOT);
    setBotIntent(intent);
    setMessages(initialMessages(intent));
    setBotSessionId(null);
    setDraft('');
    setChatFlow(null);
    setGuidedChatActive(false);
    setWizardCategory(null);
    setWizardDescription('');
    setSelectedCategory(null);
    setShowTicketDrawer(false);
    setCategoryMenuOpen(false);
  };

  const backToBotIntentPick = () => {
    setChatView(CHAT_VIEW.BOT);
    setBotIntent(BOT_INTENT.PICK);
    setMessages([]);
    setBotSessionId(null);
    setDraft('');
    setChatFlow(null);
    setGuidedChatActive(false);
    setWizardCategory(null);
    setWizardDescription('');
    setSelectedCategory(null);
    setTyping(false);
    setCategoryMenuOpen(false);
  };

  // When the signed-in account changes (logout, or switching users) reset the whole
  // NASA Bot chat back to the initial screen so one person's conversation, tickets
  // and wizard step never carry over to the next (or to an anonymous) visitor.
  useEffect(() => {
    const userKey = currentUser?.email ? String(currentUser.email).toLowerCase() : null;
    if (prevUserKeyRef.current === undefined) {
      // First render: remember who we started with; keep any restored session.
      prevUserKeyRef.current = userKey;
      return;
    }
    if (prevUserKeyRef.current === userKey) return;
    prevUserKeyRef.current = userKey;

    clearNasaBotStorage();
    botRestoredRef.current = false;
    backToBotIntentPick();
    setOpen(false);
    setTicket(null);
    setMyTickets([]);
    setActiveTicketCode('');
    setTicketMessages([]);
    setUnreadStaffTicketCodes([]);
  }, [currentUser]);

  const ensureCategoryChips = () => {
    setMessages((prev) => {
      if (prev.some((item) => item.type === 'categories')) return prev;
      return [...prev, { id: `categories-${Date.now()}`, role: 'bot', type: 'categories', time: formatTime() }];
    });
  };

  useEffect(() => {
    if (!activeTicket?.ticketCode || chatFlow) return;
    if (`${activeTicket.status || ''}`.toUpperCase() !== 'DONE') return;
    // Chỉ bổ sung chip danh mục trên luồng bot; không kéo user khỏi tab staff (đánh giá sao).
    if (chatView !== CHAT_VIEW.BOT || botIntent !== BOT_INTENT.SUPPORT) return;
    ensureCategoryChips();
  }, [activeTicket?.status, activeTicket?.ticketCode, botIntent, chatFlow, chatView]);

  const cancelRequestFlow = () => {
    setChatFlow(null);
    setGuidedChatActive(false);
    setWizardCategory(null);
    setWizardDescription('');
    setMessages((prev) => prev.filter((item) => item.type !== 'confirm'));
    ensureCategoryChips();
  };

  const startGuidedSupportChat = async (category) => {
    const seed = CATEGORY_GUIDED_SEEDS[category?.key];
    if (!seed || !category) return;

    setGuidedChatActive(true);
    setWizardCategory(category);
    setSelectedCategory(category);
    setTyping(true);

    try {
      const ai = await supportService.chatSupport({
        message: seed,
        history: buildHistory(seed),
        mode: 'SUPPORT',
        sessionId: botSessionId,
      });

      if (ai?.sessionId) {
        setBotSessionId(ai.sessionId);
      }

      if (ai?.reply) {
        pushBot(ai.reply, { choices: normalizeAiChoices(ai.choices) });
      } else {
        pushBot(`${category.question}. Mô tả tối thiểu ${MIN_DESCRIPTION_LENGTH} ký tự.`);
        setChatFlow(CHAT_FLOW.AWAIT_DESCRIPTION);
        setGuidedChatActive(false);
      }

      if (ai?.autoTicketCode) {
        const ticketData = ai?.autoTicket || { ticketCode: ai.autoTicketCode, status: 'PENDING' };
        setTicket(ticketData);
        setActiveTicketCode(ai.autoTicketCode);
        setChatView(CHAT_VIEW.STAFF);
        setGuidedChatActive(false);
        // Clear typing before slower ticket fetches so UI never sticks on "đang xử lý".
        setTyping(false);
        await loadMyTickets();
        await refreshTicketThread(ai.autoTicketCode);
        return;
      }
    } catch {
      pushBot(`${category.question}. Mô tả tối thiểu ${MIN_DESCRIPTION_LENGTH} ký tự.`);
      setChatFlow(CHAT_FLOW.AWAIT_DESCRIPTION);
      setGuidedChatActive(false);
    } finally {
      setTyping(false);
    }
  };

  const selectSupportCategory = (category) => {
    if (chatFlow || canReplyToTicket || guidedChatActive) return;
    setWizardCategory(category);
    setSelectedCategory(category);
    pushUser(category.label);
    setMessages((prev) => prev.filter((item) => item.type !== 'categories'));

    if (CATEGORY_GUIDED_KEYS.has(category.key)) {
      // Guided categories collect info one question at a time (like "Vé"). We intentionally do
      // NOT push the quick-FAQ card here anymore: showing it alongside the first guided question
      // made the bot appear to ask two things at once, and clicking a FAQ chip pushed a local
      // Q&A into the history that derailed the step-by-step ticket flow.
      void startGuidedSupportChat(category);
      return;
    }

    pushBot(`${category.question}. Mô tả tối thiểu ${MIN_DESCRIPTION_LENGTH} ký tự.`);
    setChatFlow(CHAT_FLOW.AWAIT_DESCRIPTION);
  };

  const pushConfirmCard = (category = wizardCategory, description = wizardDescription) => {
    pushMessage({
      role: 'bot',
      type: 'confirm',
      category,
      description: `${description || ''}`.trim(),
    });
  };

  const handleDescriptionSubmit = (value) => {
    const trimmed = value.trim();
    if (trimmed.length < MIN_DESCRIPTION_LENGTH) {
      notificationService.info(`Mô tả cần ít nhất ${MIN_DESCRIPTION_LENGTH} ký tự.`);
      return;
    }
    setWizardDescription(trimmed);
    pushUser(trimmed);
    pushConfirmCard(wizardCategory, trimmed);
    setChatFlow(CHAT_FLOW.AWAIT_CONFIRM);
  };

  const editSupportRequest = () => {
    setChatFlow(CHAT_FLOW.AWAIT_DESCRIPTION);
    setMessages((prev) => prev.filter((item) => item.type !== 'confirm'));
    pushBot('Gửi lại mô tả cập nhật nhé.');
  };

  const startSupportWizard = (categoryKey = '', seededDescription = '') => {
    setChatView(CHAT_VIEW.BOT);
    setBotIntent(BOT_INTENT.SUPPORT);
    const category = getCategoryByKey(categoryKey);
    if (category) {
      selectSupportCategory(category);
      // Guided categories collect the description through their own step-by-step flow, so
      // don't also push a confirm card here (that would fork into two conflicting flows).
      if (!CATEGORY_GUIDED_KEYS.has(category.key) && seededDescription.trim()) {
        handleDescriptionSubmit(seededDescription);
      }
      return;
    }
    ensureCategoryChips();
  };

  const finalizeSupportRequest = async () => {
    const description = wizardDescription.trim();
    const categoryKey = wizardCategory?.key;

    if (!categoryKey) {
      notificationService.info('Bạn cần chọn một trong 6 danh mục hỗ trợ.');
      ensureCategoryChips();
      setChatFlow(null);
      return;
    }

    if (description.length < MIN_DESCRIPTION_LENGTH) {
      notificationService.info(`Mô tả cần ít nhất ${MIN_DESCRIPTION_LENGTH} ký tự.`);
      setChatFlow(CHAT_FLOW.AWAIT_DESCRIPTION);
      return;
    }

    if (!isLoggedInCustomer) {
      const loginHint = 'Bạn cần đăng nhập để tạo ticket hoặc chat với nhân viên. NASA BOT vẫn trả lời câu hỏi khi bạn chưa đăng nhập.';
      notificationService.info(loginHint);
      pushBot(loginHint);
      setChatFlow(null);
      return;
    }

    setTyping(true);
    try {
      let response = null;

      if (liveAvailability?.anyOnline) {
        response = await supportService.requestLiveSupport({ category: categoryKey, description });
        setLiveWaitStartedAt(Date.now());
        pushMessage({
          role: 'bot',
          type: 'card',
          title: 'Đã gửi yêu cầu chat',
          text: liveAvailability?.anyOnline
            ? 'Mình đã gửi yêu cầu chat tới nhân viên đang online. Vui lòng chờ tối đa 3 phút — nếu không ai nhận, ticket sẽ tự chuyển sang chờ admin xử lý.'
            : 'Mình đã tạo ticket cho bạn.',
        });
      } else {
        response = await supportService.createSupportRequest({ category: categoryKey, description });
        pushMessage({
          role: 'bot',
          type: 'card',
          title: 'Ticket đã được tạo',
          text: `Hiện chưa có nhân viên online. Ticket ${response?.ticketCode || ''} đã được ghi nhận, admin sẽ phản hồi sớm nhất.`,
        });
      }

      const ticketCode = response?.ticketCode || response?.code;
      setTicket(response || null);
      setSelectedCategory(wizardCategory);
      setTicketDraft('');
      setChatFlow(null);
      setWizardCategory(null);
      setWizardDescription('');
      setMessages((prev) => prev.filter((item) => item.type !== 'confirm'));

      notificationService.success(liveAvailability?.anyOnline ? 'Đã gửi yêu cầu chat.' : 'Đã tạo ticket.');
      await loadMyTickets();

      if (ticketCode) {
        setActiveTicketCode(ticketCode);
        setChatView(CHAT_VIEW.STAFF);
        await refreshTicketThread(ticketCode);
      } else {
        ensureCategoryChips();
      }
    } catch (error) {
      const message = resolveSupportErrorMessage(error, 'Không gửi được yêu cầu hỗ trợ.');
      notificationService.error(message);
      pushBot(message);
    } finally {
      setTyping(false);
    }
  };

  const _requestLiveSupport = async (options = {}) => {
    if (!isLoggedInCustomer) {
      notificationService.info('Vui lòng đăng nhập để chat trực tiếp với nhân viên.');
      return;
    }

    const description = `${options.description || ticketDraft || activeTicket?.description || ''}`.trim()
      || 'Khách hàng cần hỗ trợ trực tiếp với admin hoặc staff.';
    const category = options.category || selectedCategory?.key || activeTicket?.category || detectCategory(description);

    if (!liveAvailability?.anyOnline) {
      notificationService.info('Hiện chưa có admin hoặc staff online để hỗ trợ trực tiếp.');
      return;
    }

    setTyping(true);
    try {
      const response = await supportService.requestLiveSupport({ category, description });
      setTicket(response || null);
      setTicketDraft('');
      setLiveWaitStartedAt(Date.now());
      await loadMyTickets();

      pushMessage({
        role: 'bot',
        type: 'card',
        title: 'Đã gọi staff/admin online',
        text: 'Đã chuyển sang tab Nhắn staff. Tin nhắn bạn gửi ở đó sẽ tới nhân viên.',
      });

      if (response?.ticketCode) {
        setActiveTicketCode(response.ticketCode);
        setChatView(CHAT_VIEW.STAFF);
        await refreshTicketThread(response.ticketCode);
      }
    } catch (error) {
      const message = resolveSupportErrorMessage(error, 'Không thể gửi yêu cầu live support.');
      notificationService.error(message);
      pushBot(message);
    } finally {
      setTyping(false);
    }
  };

  const submitSatisfaction = async (rating) => {
    if (!activeTicketCode) return;
    try {
      const updated = await supportService.submitSatisfaction(activeTicketCode, { rating });
      setTicket(updated || null);
      setMessages((prev) => prev.filter((item) => item.type !== 'satisfaction'));
      pushBot(`Cảm ơn bạn đã đánh giá ${rating}/5 sao!`);
      await loadMyTickets();
      notificationService.success('Cảm ơn bạn đã đánh giá hỗ trợ.');
    } catch (error) {
      notificationService.error(resolveSupportErrorMessage(error, 'Không gửi được đánh giá lúc này.'));
    }
  };

  const renderSatisfactionStars = (ticketCode = activeTicketCode) => (
    <div className="nasa-satisfaction">
      <div className="nasa-satisfaction__title">Đánh giá hỗ trợ</div>
      <p className="nasa-satisfaction__text">Ticket đã hoàn tất. Bạn chấm giúp mình 1–5 sao nhé.</p>
      <div className="nasa-satisfaction__stars" role="group" aria-label="Đánh giá 1 đến 5 sao">
        {SATISFACTION_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className="nasa-satisfaction__star"
            title={`${option.value} sao · ${option.label}`}
            aria-label={`${option.value} sao, ${option.label}`}
            onClick={() => {
              if (ticketCode && ticketCode !== activeTicketCode) {
                setActiveTicketCode(ticketCode);
              }
              submitSatisfaction(option.value);
            }}
          >
            <Star className="nasa-satisfaction__star-icon" />
            <span>{option.value}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const assertSendGap = () => {
    const now = Date.now();
    if (now - lastSendAtRef.current < MIN_SEND_GAP_MS) {
      notificationService.info('Bạn gửi hơi nhanh. Đợi khoảng 1 giây rồi thử lại nhé.');
      return false;
    }
    lastSendAtRef.current = now;
    return true;
  };

  const clearPendingImages = () => {
    setPendingImages((prev) => {
      prev.forEach((item) => {
        if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
  };

  const removePendingImage = (id) => {
    setPendingImages((prev) => {
      const next = [];
      prev.forEach((item) => {
        if (item.id === id) {
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
          return;
        }
        next.push(item);
      });
      return next;
    });
  };

  const appendSupportImageFiles = (incomingFiles) => {
    const files = Array.from(incomingFiles || []).filter(Boolean);
    if (!files.length) return;

    setPendingImages((prev) => {
      const remaining = MAX_SUPPORT_IMAGES - prev.length;
      if (remaining <= 0) {
        notificationService.info('Mỗi tin nhắn chỉ gửi tối đa 3 ảnh.');
        return prev;
      }

      const accepted = [];
      for (const file of files) {
        if (accepted.length >= remaining) break;
        const type = `${file.type || ''}`.toLowerCase();
        if (!type.startsWith('image/')) {
          notificationService.error('Chỉ chọn file ảnh.');
          continue;
        }
        if (file.size > MAX_SUPPORT_IMAGE_BYTES) {
          notificationService.error(`Ảnh "${file.name || 'dán từ clipboard'}" vượt quá 5MB.`);
          continue;
        }
        const ext = (type.split('/')[1] || 'png').replace('jpeg', 'jpg');
        const named = file.name
          ? file
          : new File([file], `screenshot-${Date.now()}-${accepted.length}.${ext}`, { type: file.type || 'image/png' });
        accepted.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file: named,
          previewUrl: URL.createObjectURL(named),
        });
      }

      if (files.length > remaining) {
        notificationService.info('Mỗi tin nhắn chỉ gửi tối đa 3 ảnh.');
      }
      return accepted.length ? [...prev, ...accepted] : prev;
    });
  };

  const handlePickSupportImages = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    appendSupportImageFiles(files);
  };

  const handlePasteSupportImages = (event) => {
    if (!isStaffView || !canReplyToTicket || uploadingImages) return;
    const items = Array.from(event.clipboardData?.items || []);
    const files = items
      .filter((item) => item.kind === 'file' && `${item.type || ''}`.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (!files.length) return;
    event.preventDefault();
    appendSupportImageFiles(files);
  };

  const sendTicketReply = async (rawValue = draft) => {
    const value = rawValue.trim();
    const filesToSend = pendingImages.map((item) => item.file).filter(Boolean);
    if ((!value && filesToSend.length === 0) || !activeTicketCode || !canReplyToTicket) return;
    if (!assertSendGap()) return;

    setDraft('');
    const optimisticPreviews = pendingImages.map((item) => item.previewUrl).filter(Boolean);
    clearPendingImages();
    setTicketMessages((prev) => [
      ...prev,
      {
        uuid: `temp-${Date.now()}`,
        senderRole: 'USER',
        senderName: ownerLabel,
        message: value,
        imageUrls: optimisticPreviews,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      let imageUrls = [];
      if (filesToSend.length > 0) {
        setUploadingImages(true);
        imageUrls = await supportService.uploadSupportImages(filesToSend);
      }
      await supportService.sendSupportMessage(activeTicketCode, {
        message: value,
        imageUrls,
      });
      await refreshTicketThread(activeTicketCode);
      await loadMyTickets();
    } catch (error) {
      notificationService.error(resolveSupportErrorMessage(error, 'Không gửi được tin nhắn support.'));
      await refreshTicketThread(activeTicketCode).catch(() => { });
    } finally {
      setUploadingImages(false);
    }
  };

  const submitBotMessage = async (rawValue) => {
    const value = rawValue.trim();
    if (!value) return;
    if (botIntent === BOT_INTENT.PICK) {
      notificationService.info('Chọn Hỗ trợ hoặc Giải đáp trước khi chat.');
      return;
    }
    if (typing) {
      notificationService.info('NASA BOT đang trả lời. Vui lòng đợi xong rồi gửi tiếp.');
      return;
    }
    if (!assertSendGap()) return;

    setDraft('');
    pushUser(value);

    const answerMode = botIntent === BOT_INTENT.ANSWER;
    let matchedCategory = selectedCategory;
    let hasAiReply = false;

    setTyping(true);
    let ai = null;
    try {
      ai = await supportService.chatSupport({
        message: value,
        history: buildHistory(value),
        mode: answerMode ? 'ANSWER' : 'SUPPORT',
        sessionId: botSessionId,
      });
    } catch (error) {
      const message = resolveSupportErrorMessage(
        error,
        error?.code === 'ECONNABORTED'
          ? 'NASA BOT phản hồi quá lâu. Bạn thử gửi lại giúp mình nhé.'
          : '',
      );
      if (message) {
        pushBot(message);
        hasAiReply = true;
      }
    } finally {
      setTyping(false);
    }

    if (!ai) {
      if (!hasAiReply) {
        pushBot(answerMode
          ? 'Mình chưa nhận được phản hồi AI. Kiểm tra API key và khởi động lại backend giúp mình nhé.'
          : 'Mình đã nhận nội dung của bạn. Chọn danh mục hỗ trợ phía trên hoặc mở danh sách ticket.');
      }
      return;
    }

    try {
      if (ai?.sessionId) {
        setBotSessionId(ai.sessionId);
      }

      if (ai?.reply) {
        pushBot(ai.reply, {
          choices: answerMode ? null : normalizeAiChoices(ai.choices),
          movies: answerMode && Array.isArray(ai.movies) ? ai.movies : null,
        });
        hasAiReply = true;
        if (!answerMode && ai?.choices?.length) {
          setGuidedChatActive(true);
        }
      }

      if (!answerMode && ai?.suggestedCategory) {
        matchedCategory = CATEGORIES.find((item) => item.key === ai.suggestedCategory) || matchedCategory;
        if (matchedCategory) {
          setSelectedCategory(matchedCategory);
        }
      }

      if (!answerMode && ai?.autoTicketCode) {
        const ticketData = ai?.autoTicket || { ticketCode: ai.autoTicketCode, status: 'PENDING' };
        setTicket(ticketData);
        setActiveTicketCode(ai.autoTicketCode);
        setChatView(CHAT_VIEW.STAFF);
        setGuidedChatActive(false);
        await loadMyTickets();
        if (ai.autoTicketCode) {
          await refreshTicketThread(ai.autoTicketCode);
        }
        return;
      }
    } catch {
      // Post-reply UI updates must never leave the composer stuck.
    }

    if (!hasAiReply) {
      pushBot(answerMode
        ? 'Mình chưa nhận được phản hồi AI. Kiểm tra API key và khởi động lại backend giúp mình nhé.'
        : 'Mình đã nhận nội dung của bạn. Chọn danh mục hỗ trợ phía trên hoặc mở danh sách ticket.');
    }

    if (!answerMode) {
      if (shouldStartTicketFlowFromText(value)) {
        startSupportWizard(detectCategory(value), value);
      } else if (shouldOpenTicketListFromText(value)) {
        await loadMyTickets();
        setShowTicketDrawer(true);
      }
    }
  };

  const renderLiveWaitBar = () => {
    if (!isWaitingLive || !liveWaitStartedAt) return null;
    const progress = Math.min(100, ((LIVE_WAIT_TIMEOUT_MS - liveWaitRemainingMs) / LIVE_WAIT_TIMEOUT_MS) * 100);

    return (
      <div className="nasa-live-wait nasa-live-wait--inline">
        <div className="nasa-live-wait__row">
          <Headset className="h-3.5 w-3.5" />
          <span>Chờ nhân viên nhận chat</span>
          <strong>{formatCountdown(liveWaitRemainingMs)}</strong>
        </div>
        <div className="nasa-live-wait__track">
          <div className="nasa-live-wait__fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  };

  const handleComposerSend = async () => {
    const value = draft.trim();
    if (typing || uploadingImages) return;

    // Staff chatbox: always send to ticket / nhân viên
    if (isStaffView) {
      if (!canReplyToTicket) {
        notificationService.info('Ticket đã đóng. Chuyển sang Chat bot nếu bạn cần hỏi thêm.');
        return;
      }
      if (!value && pendingImages.length === 0) return;
      await sendTicketReply(value);
      return;
    }

    if (!value) return;

    if (isBotPickIntent) {
      notificationService.info('Chọn Hỗ trợ hoặc Giải đáp trước khi chat.');
      return;
    }

    // Bot chatbox: wizard / AI only
    if (chatFlow === CHAT_FLOW.AWAIT_DESCRIPTION) {
      setDraft('');
      handleDescriptionSubmit(value);
      return;
    }

    if (chatFlow === CHAT_FLOW.AWAIT_CONFIRM) {
      setDraft('');
      pushUser(value);
      pushBot('Bạn chọn Gửi yêu cầu hoặc Sửa trên card phía trên nhé.');
      return;
    }

    await submitBotMessage(value);
  };

  const selectSupportCategoryFromForm = (category) => {
    setWizardCategory(category || null);
    setSelectedCategory(category || null);
    setCategoryMenuOpen(false);
  };

  const handleSupportFormSubmit = async () => {
    if (typing) return;
    await finalizeSupportRequest();
  };

  const renderSupportCategoryPicker = () => (
    <div ref={categoryPickerRef} className={`nasa-cat-picker${categoryMenuOpen ? ' is-open' : ''}`}>
      <span className="nasa-support-form__label">Danh mục</span>
      <button
        type="button"
        className="nasa-cat-picker__trigger"
        aria-haspopup="listbox"
        aria-expanded={categoryMenuOpen}
        disabled={typing}
        onClick={() => setCategoryMenuOpen((open) => !open)}
      >
        <span className={wizardCategory ? 'nasa-cat-picker__value' : 'nasa-cat-picker__placeholder'}>
          {wizardCategory?.label || 'Chọn danh mục hỗ trợ'}
        </span>
        <ChevronDown className="nasa-cat-picker__chevron h-4 w-4" />
      </button>
      {categoryMenuOpen ? (
        <div className="nasa-cat-picker__menu" role="listbox" aria-label="Danh mục hỗ trợ">
          {CATEGORIES.map((item) => {
            const selected = wizardCategory?.key === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="option"
                aria-selected={selected}
                className={`nasa-cat-picker__option${selected ? ' is-selected' : ''}`}
                onClick={() => selectSupportCategoryFromForm(item)}
              >
                <span className="nasa-cat-picker__option-copy">
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
                {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );

  const renderAiSuggestedPrompts = () => {
    if (!isAnswerIntent || typing) return null;
    const hasUserMessage = messages.some((item) => item.role === 'user');
    if (hasUserMessage) return null;

    return (
      <div className="nasa-ai-suggestions" aria-label="Câu hỏi gợi ý">
        <span className="nasa-ai-suggestions__label">Gợi ý hỏi nhanh</span>
        <div className="nasa-ai-suggestions__list">
          {AI_SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="nasa-ai-suggestions__chip"
              onClick={() => { void submitBotMessage(prompt); }}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderSupportForm = () => {
    const descriptionLength = wizardDescription.trim().length;
    const canSubmit = Boolean(wizardCategory?.key) && descriptionLength >= MIN_DESCRIPTION_LENGTH && !typing;

    return (
      <div className="nasa-wizard nasa-support-form">
        <div className="nasa-wizard__body">
          <p className="nasa-wizard__lead">
            <strong>Gửi yêu cầu hỗ trợ</strong>
            Chọn danh mục, mô tả vấn đề rồi gửi. Nhân viên online sẽ được ưu tiên chat trước.
          </p>
          <span className={`nasa-wizard__badge ${liveAvailability?.anyOnline ? 'nasa-wizard__badge--online' : 'nasa-wizard__badge--offline'}`}>
            {liveAvailability?.anyOnline ? 'Staff online — ưu tiên chat' : 'Chưa có staff — tạo ticket ngay'}
          </span>
          {renderSupportCategoryPicker()}
          <label className="nasa-support-form__field">
            <span className="nasa-support-form__label">Mô tả vấn đề</span>
            <textarea
              className="nasa-wizard__textarea"
              value={wizardDescription}
              onChange={(event) => setWizardDescription(event.target.value)}
              placeholder={wizardCategory?.question || 'Mô tả chi tiết vấn đề của bạn...'}
              rows={5}
              disabled={typing}
            />
          </label>
          <div className="nasa-wizard__meta">
            Tối thiểu {MIN_DESCRIPTION_LENGTH} ký tự · {descriptionLength}/{MIN_DESCRIPTION_LENGTH}
          </div>
          <div className="nasa-wizard__foot">
            <button
              type="button"
              className="nasa-wizard-btn nasa-wizard-btn--primary nasa-wizard-btn--block"
              disabled={!canSubmit}
              onClick={() => { void handleSupportFormSubmit(); }}
            >
              {typing ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderBotIntentPicker = () => (
    <div className="nasa-mode-picker">
      <div className="nasa-mode-picker__hero">
        <div className="nasa-mode-picker__avatar">
          <span className="nasa-mode-picker__avatar-ring" aria-hidden="true" />
          <img src={nasaLogo} alt="NASA BOT" />
        </div>
        <h3 className="nasa-mode-picker__greeting">
          Xin chào{user?.fullName ? `, ${user.fullName.split(' ').slice(-1)[0]}` : ''}!
        </h3>
        <p className="nasa-mode-picker__lead">
          Mình là NASA BOT. Bạn cần gì hôm nay?
        </p>
      </div>

      <div className="nasa-mode-picker__options">
        <button
          type="button"
          className="nasa-mode-picker__option nasa-mode-picker__option--support"
          onClick={() => enterBotIntent(BOT_INTENT.SUPPORT)}
        >
          <span className="nasa-mode-picker__icon">
            <Headset className="h-5 w-5" />
          </span>
          <span className="nasa-mode-picker__copy">
            <strong>Hỗ trợ</strong>
            <span>Chọn danh mục, mô tả vấn đề rồi gửi nhân viên hoặc tạo ticket</span>
          </span>
          <span className="nasa-mode-picker__arrow" aria-hidden="true">
            <ChevronRight className="h-4 w-4" />
          </span>
        </button>
        <button
          type="button"
          className="nasa-mode-picker__option nasa-mode-picker__option--answer"
          onClick={() => enterBotIntent(BOT_INTENT.ANSWER)}
        >
          <span className="nasa-mode-picker__icon">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="nasa-mode-picker__copy">
            <strong>Giải đáp</strong>
            <span>Hỏi tự do với AI về phim, vé, thanh toán, ưu đãi của NASAFilm</span>
          </span>
          <span className="nasa-mode-picker__arrow" aria-hidden="true">
            <ChevronRight className="h-4 w-4" />
          </span>
        </button>
      </div>

      <div className="nasa-mode-picker__meta">
        <span className="nasa-mode-picker__meta-item">
          <span className={`nasa-status-dot ${liveAvailability?.anyOnline ? 'nasa-status-dot--online' : ''}`} />
          {liveAvailability?.anyOnline ? 'Nhân viên đang trực tuyến' : 'Nhân viên ngoại tuyến · để lại ticket'}
        </span>
        <span className="nasa-mode-picker__meta-item">
          <Clock className="h-3 w-3" />
          Phản hồi trong vài phút
        </span>
        <span className="nasa-mode-picker__meta-item">
          <ShieldCheck className="h-3 w-3" />
          Bảo mật hội thoại
        </span>
      </div>
    </div>
  );

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  if (isAdminUser || shouldHideOnRoute || !portalTarget) return null;

  const renderTimelineMessage = (message) => {
    if (message.type === 'card') {
      return (
        <div key={message.id} className="nasa-assistant-card">
          <div className="nasa-assistant-card__title">{message.title}</div>
          <div className="nasa-assistant-card__text">{message.text}</div>
          {message.actions?.length ? (
            <div className="nasa-assistant-card__actions">
              {message.actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className={`nasa-assistant-mini-btn ${action.primary ? 'nasa-assistant-mini-btn--primary' : ''}`}
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="nasa-assistant-time">{message.time}</div>
        </div>
      );
    }

    if (message.type === 'satisfaction') {
      return (
        <div key={message.id} className="nasa-assistant-msg nasa-assistant-msg--bot">
          <div className="nasa-assistant-msg__row">
            <div className="nasa-assistant-avatar nasa-assistant-avatar--bot">
              <img src={nasaLogo} alt="bot" />
            </div>
            <div className="nasa-assistant-msg__content">
              <div className="nasa-assistant-bubble nasa-assistant-bubble--bot nasa-assistant-bubble--satisfaction">
                {renderSatisfactionStars(message.ticketCode)}
              </div>
              <div className="nasa-assistant-time">{message.time}</div>
            </div>
          </div>
        </div>
      );
    }

    if (message.type === 'categories') {
      return (
        <div key={message.id} className="nasa-assistant-msg nasa-assistant-msg--bot">
          <div className="nasa-assistant-msg__row">
            <div className="nasa-assistant-avatar nasa-assistant-avatar--bot">
              <img src={nasaLogo} alt="bot" />
            </div>
            <div className="nasa-assistant-msg__content">
              <div className="nasa-assistant-bubble nasa-assistant-bubble--bot nasa-assistant-bubble--categories">
                <span className="nasa-timeline-categories__label">Chọn danh mục hỗ trợ</span>
                <div className="nasa-timeline-categories">
                  {CATEGORIES.map((item) => renderCategoryButton(item, () => selectSupportCategory(item), 'sm'))}
                </div>
                <span className={`nasa-timeline-live-badge ${liveAvailability?.anyOnline ? 'nasa-timeline-live-badge--online' : ''}`}>
                  {liveAvailability?.anyOnline ? '● Staff online — ưu tiên chat trước' : '○ Chưa có staff — tạo ticket ngay'}
                </span>
              </div>
              <div className="nasa-assistant-time">{message.time}</div>
            </div>
          </div>
        </div>
      );
    }

    if (message.type === 'faq') {
      return (
        <div key={message.id} className="nasa-assistant-msg nasa-assistant-msg--bot">
          <div className="nasa-assistant-msg__row">
            <div className="nasa-assistant-avatar nasa-assistant-avatar--bot">
              <img src={nasaLogo} alt="bot" />
            </div>
            <div className="nasa-assistant-msg__content">
              <div className="nasa-assistant-bubble nasa-assistant-bubble--bot nasa-assistant-bubble--faq">
                <div className="nasa-assistant-faq__title">Hướng dẫn nhanh — {message.group?.label}</div>
                <p className="nasa-assistant-faq__summary">{message.group?.summary}</p>
                <div className="nasa-assistant-faq__list">
                  {message.group?.items?.map((item) => (
                    <button
                      key={item.q}
                      type="button"
                      className="nasa-assistant-faq__item"
                      onClick={() => {
                        pushUser(item.q);
                        pushBot(item.a);
                      }}
                    >
                      {item.q}
                    </button>
                  ))}
                </div>
              </div>
              <div className="nasa-assistant-time">{message.time}</div>
            </div>
          </div>
        </div>
      );
    }

    if (message.type === 'confirm') {
      return (
        <div key={message.id} className="nasa-assistant-msg nasa-assistant-msg--bot">
          <div className="nasa-assistant-msg__row">
            <div className="nasa-assistant-avatar nasa-assistant-avatar--bot">
              <img src={nasaLogo} alt="bot" />
            </div>
            <div className="nasa-assistant-msg__content">
              <div className="nasa-assistant-bubble nasa-assistant-bubble--bot nasa-assistant-bubble--confirm">
                <div className="nasa-timeline-confirm">
                  <div className="nasa-timeline-confirm__tag">{message.category?.label || '—'}</div>
                  <p className="nasa-timeline-confirm__text">{message.description}</p>
                  <div className="nasa-timeline-confirm__actions">
                    <button type="button" className="nasa-wizard-btn nasa-wizard-btn--ghost" onClick={cancelRequestFlow}>
                      Hủy
                    </button>
                    <button type="button" className="nasa-wizard-btn nasa-wizard-btn--ghost" onClick={editSupportRequest}>
                      Sửa
                    </button>
                    <button type="button" className="nasa-wizard-btn nasa-wizard-btn--primary" onClick={finalizeSupportRequest}>
                      Gửi yêu cầu
                    </button>
                  </div>
                </div>
              </div>
              <div className="nasa-assistant-time">{message.time}</div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={message.id}
        className={`nasa-assistant-msg ${message.role === 'user' ? 'nasa-assistant-msg--user' : 'nasa-assistant-msg--bot'}`}
      >
        {message.role === 'bot' ? (
          <div className="nasa-assistant-msg__row">
            <div className="nasa-assistant-avatar nasa-assistant-avatar--bot">
              <img src={nasaLogo} alt="bot" />
            </div>
            <div className="nasa-assistant-msg__content">
              <div className="nasa-assistant-bubble nasa-assistant-bubble--bot">
                {(() => {
                  const showMovieCards = Boolean(
                    message.movies?.length || /\/movie\/[0-9a-fA-F-]{36}/.test(message.text || ''),
                  );
                  const bubbleText = showMovieCards
                    ? stripMovieCatalogLines(message.text)
                    : message.text;
                  return (
                    <>
                      {renderRichText(bubbleText, handleBotLinkClick)}
                      {showMovieCards ? (
                        <NasaBotMovieCards
                          movies={message.movies}
                          text={message.text}
                          onSelect={handleBotLinkClick}
                        />
                      ) : null}
                    </>
                  );
                })()}
                {message.actions?.length > 0 && (
                  <div className="nasa-assistant-card__actions nasa-assistant-card__actions--inline">
                    {message.actions.map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        className={`nasa-assistant-mini-btn ${action.primary ? 'nasa-assistant-mini-btn--primary' : ''}`}
                        onClick={action.onClick}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
                {message.choices?.length > 0 && (
                  <div className="nasa-assistant-choices">
                    {message.choices.map((choice, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="nasa-assistant-choice-btn"
                        onClick={() => submitBotMessage(choice.value)}
                      >
                        {choice.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="nasa-assistant-time">{message.time}</div>
            </div>
          </div>
        ) : (
          <>
            <div className="nasa-assistant-bubble nasa-assistant-bubble--user">{message.text}</div>
            <div className="nasa-assistant-time">{message.time}</div>
          </>
        )}
      </div>
    );
  };

  const renderCategoryButton = (item, onClick, size = 'md') => {
    const Icon = item.icon || HelpCircle;
    return (
      <button
        key={item.key}
        type="button"
        className={`nasa-wizard-cat nasa-wizard-cat--${item.tone || item.key} ${size === 'sm' ? 'nasa-wizard-cat--sm' : ''}`}
        title={item.hint}
        onClick={onClick}
      >
        <span className="nasa-wizard-cat__icon">
          <Icon className="h-4 w-4" />
        </span>
        <span className="nasa-wizard-cat__label">{item.shortLabel}</span>
      </button>
    );
  };

  const renderTicketDrawer = () => (
    <div className="nasa-ticket-drawer">
      <div className="nasa-ticket-drawer__head">
        <strong>Ticket của tôi</strong>
        <button type="button" className="nasa-assistant-icon-btn" aria-label="Đóng" onClick={() => setShowTicketDrawer(false)}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="nasa-ticket-drawer__body">
        {myTickets.length === 0 ? (
          <div className="nasa-assistant-empty-state nasa-assistant-empty-state--compact">
            <div className="nasa-assistant-empty-state__title">Chưa có ticket</div>
            <button type="button" className="nasa-wizard-btn nasa-wizard-btn--primary nasa-wizard-btn--block" onClick={() => { setShowTicketDrawer(false); ensureCategoryChips(); }}>
              Tạo yêu cầu
            </button>
          </div>
        ) : (
          <div className="nasa-assistant-ticket-list">
            {myTickets.map((item) => (
              <div
                key={item.ticketCode}
                className={`nasa-assistant-ticket-card nasa-assistant-ticket-card--compact ${item.ticketCode === activeTicketCode ? 'nasa-assistant-ticket-card--active' : ''}`}
              >
                <button
                  type="button"
                  className="nasa-assistant-ticket-card__open"
                  onClick={() => openTicketThread(item.ticketCode)}
                >
                  <div className="nasa-assistant-ticket-card__head">
                    <strong>{item.ticketCode}</strong>
                    <span className={getTicketStatusMeta(item.status).className}>
                      {getTicketStatusMeta(item.status).label}
                    </span>
                  </div>
                  <p className="nasa-assistant-ticket-card__text">{getTicketPreviewText(item.lastMessage) || item.description}</p>
                  <div className="nasa-assistant-ticket-card__foot">
                    <span>{getCategoryLabel(item.category)}</span>
                    <span>{formatTicketStamp(item.updatedAt || item.createdAt)}</span>
                  </div>
                </button>
                {!isClosedSupportStatus(item.status) ? (
                  <button
                    type="button"
                    className="nasa-assistant-ticket-card__cancel"
                    onClick={(event) => {
                      event.stopPropagation();
                      cancelActiveTicket(item.ticketCode);
                    }}
                  >
                    Hủy ticket
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderTicketThreadSection = () => {
    if (!activeTicket?.ticketCode) return null;
    const statusMeta = getTicketStatusMeta(activeTicket.status);
    const statusUpper = `${activeTicket.status || ''}`.toUpperCase();
    const needsRating = statusUpper === 'DONE' && !activeTicket.satisfactionRating;
    const canCancel = !isClosedSupportStatus(activeTicket.status);

    return (
      <>
        <div className="nasa-timeline-divider">
          <span>{activeTicket.ticketCode}</span>
          <span className={statusMeta.className}>{statusMeta.label}</span>
          <span>{getCategoryLabel(activeTicket.category)}</span>
          {canCancel ? (
            <button
              type="button"
              className="nasa-timeline-cancel"
              onClick={() => cancelActiveTicket(activeTicket.ticketCode)}
            >
              Hủy ticket
            </button>
          ) : null}
        </div>
        {statusUpper === 'CLOSED' ? (
          <div className="nasa-assistant-empty-state nasa-assistant-empty-state--compact">
            <div className="nasa-assistant-empty-state__title">Bạn đã hủy ticket này</div>
            <div className="nasa-assistant-empty-state__text">Có thể tạo yêu cầu mới ở Chat bot nếu vẫn cần hỗ trợ.</div>
          </div>
        ) : null}
        {renderLiveWaitBar()}
        {ticketMessages.map((item) => {
          const agentMessage = isAgentMessage(item.senderRole);
          return (
            <div
              key={item.uuid}
              className={`nasa-assistant-msg nasa-assistant-msg--compact ${agentMessage ? 'nasa-assistant-msg--bot' : 'nasa-assistant-msg--user'}`}
            >
              <div className={`nasa-assistant-bubble nasa-assistant-bubble--compact ${agentMessage ? 'nasa-assistant-bubble--bot' : 'nasa-assistant-bubble--user'}`}>
                {agentMessage ? <span className="nasa-assistant-bubble__tag">{getSupportMessageSenderLabel(item, activeTicket)}</span> : null}
                {parseSupportStickerMessage(item.message).type === 'sticker' ? (
                  <SupportStickerBubble message={item.message} compact showCaption />
                ) : (
                  <>
                    {item.message ? item.message : null}
                    <SupportMessageImages urls={item.imageUrls} compact />
                  </>
                )}
              </div>
            </div>
          );
        })}
        {needsRating ? (
          <div className="nasa-assistant-msg nasa-assistant-msg--bot">
            <div className="nasa-assistant-msg__row">
              <div className="nasa-assistant-avatar nasa-assistant-avatar--bot">
                <img src={nasaLogo} alt="bot" />
              </div>
              <div className="nasa-assistant-msg__content">
                <div className="nasa-assistant-bubble nasa-assistant-bubble--bot nasa-assistant-bubble--satisfaction">
                  {renderSatisfactionStars(activeTicket.ticketCode)}
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {activeTicket.satisfactionRating ? (
          <div className="nasa-satisfaction nasa-satisfaction--done">
            Đã đánh giá {activeTicket.satisfactionRating}/5 sao
            {activeTicket.satisfactionLabel ? ` · ${activeTicket.satisfactionLabel}` : ''}
          </div>
        ) : null}
      </>
    );
  };

  return createPortal(
    <>
      <div className={`nasa-assistant-fab-shell ${open ? 'nasa-assistant-fab-shell--hidden' : ''}`}>
        <button
          type="button"
          className={[
            'nasa-assistant-fab',
            unreadStaffTicketCodes.length > 0 ? 'nasa-assistant-fab--unread' : '',
            fabAttentionPing ? 'nasa-assistant-fab--attention' : '',
          ].filter(Boolean).join(' ')}
          aria-label={unreadStaffTicketCodes.length > 0
            ? `Mở NASA BOT, ${unreadStaffTicketCodes.length} tin nhắn mới`
            : 'Mở NASA BOT'}
          onClick={() => {
            const pendingTicket = unreadStaffTicketCodes[0];
            setOpen(true);
            setShowTicketDrawer(false);
            if (pendingTicket) {
              openTicketThread(pendingTicket);
            }
          }}
        >
          <span className="nasa-assistant-fab-glow" />
          <img
            src={nasaAssistantFabAvatar}
            alt="NASA BOT"
            className={`nasa-assistant-fab-avatar${fabHeadWiggle ? ' is-wiggling' : ''}`}
            onAnimationEnd={handleFabHeadAnimationEnd}
          />
          {unreadStaffTicketCodes.length > 0 ? (
            <span className="nasa-assistant-fab-badge" aria-hidden="true">
              {unreadStaffTicketCodes.length > 9 ? '9+' : unreadStaffTicketCodes.length}
            </span>
          ) : fabAttentionPing ? (
            <span className="nasa-assistant-fab-ping" aria-hidden="true" />
          ) : null}
        </button>
        <span className="nasa-assistant-fab-label">NASA Bot</span>
      </div>

      {open && (
        <div className="nasa-assistant-overlay">
          <button type="button" className="nasa-assistant-backdrop" aria-label="Thu gọn" onClick={() => setOpen(false)} />
          <section
            className="nasa-assistant-panel"
            role="dialog"
            aria-modal="true"
            aria-label="NASA BOT"
          >
            <header className="nasa-assistant-header">
              <div className="nasa-assistant-brand">
                <div className="nasa-assistant-brand-icon">
                  <img src={nasaLogo} alt="NASAFilm" />
                </div>
                <div>
                  <div className="nasa-assistant-title">NASA BOT</div>
                  <div className="nasa-assistant-subtitle">
                    <span className={`nasa-status-dot ${liveAvailability?.anyOnline ? 'nasa-status-dot--online' : ''}`} />
                    {headerSubtitle}
                  </div>
                </div>
              </div>
              <div className="nasa-assistant-header-actions">
                {isBotView && botIntent !== BOT_INTENT.PICK ? (
                  <button
                    type="button"
                    className="nasa-assistant-icon-btn"
                    aria-label="Quay lại"
                    title="Quay lại chọn chế độ"
                    onClick={backToBotIntentPick}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`nasa-assistant-icon-btn ${showTicketDrawer ? 'nasa-assistant-icon-btn--active' : ''}`}
                  aria-label="Danh sách ticket"
                  onClick={async () => {
                    await loadMyTickets();
                    setShowTicketDrawer((prev) => !prev);
                  }}
                >
                  <Ticket className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="nasa-assistant-icon-btn nasa-assistant-icon-btn--minimize"
                  aria-label="Thu gọn"
                  title="Thu gọn"
                  onClick={() => {
                    setShowTicketDrawer(false);
                    setOpen(false);
                  }}
                >
                  <Minus className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </header>

            <div className="nasa-assistant-body nasa-assistant-body--chat-only">
              <section className="nasa-assistant-bot-stage">
                {isBotView ? (
                  <div className="nasa-assistant-thread nasa-assistant-thread--bot" ref={botScrollRef}>
                    {isBotPickIntent ? renderBotIntentPicker() : (
                      isSupportIntent ? renderSupportForm() : (
                        <>
                          {messages.map(renderTimelineMessage)}
                          {renderAiSuggestedPrompts()}
                          {typing && (
                            <div className="nasa-assistant-msg nasa-assistant-msg--bot">
                              <div className="nasa-assistant-msg__row">
                                <div className="nasa-assistant-avatar nasa-assistant-avatar--bot">
                                  <img src={nasaLogo} alt="bot" />
                                </div>
                                <div className="nasa-assistant-msg__content">
                                  <div className="nasa-assistant-bubble nasa-assistant-bubble--bot nasa-assistant-bubble--typing">
                                    <span />
                                    <span />
                                    <span />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )
                    )}
                  </div>
                ) : (
                  <div className="nasa-assistant-thread nasa-assistant-thread--staff" ref={staffScrollRef}>
                    {!activeTicket?.ticketCode ? (
                      <div className="nasa-assistant-empty-state">
                        <div className="nasa-assistant-empty-state__title">Chưa mở hội thoại staff</div>
                        <div className="nasa-assistant-empty-state__text">
                          Tạo yêu cầu ở Chat bot, hoặc chọn ticket có sẵn để nhắn nhân viên.
                        </div>
                        <div className="nasa-assistant-empty-state__actions">
                          <button
                            type="button"
                            className="nasa-wizard-btn nasa-wizard-btn--primary"
                            onClick={() => enterBotIntent(BOT_INTENT.SUPPORT)}
                          >
                            Tạo hỗ trợ với bot
                          </button>
                          <button
                            type="button"
                            className="nasa-wizard-btn"
                            onClick={async () => {
                              await loadMyTickets();
                              setShowTicketDrawer(true);
                            }}
                          >
                            Xem ticket
                          </button>
                        </div>
                      </div>
                    ) : (
                      renderTicketThreadSection()
                    )}
                  </div>
                )}
              </section>

              {showTicketDrawer ? renderTicketDrawer() : null}
            </div>

            <footer className="nasa-assistant-footer">
              <div className="nasa-chat-tabs nasa-chat-tabs--footer" role="tablist" aria-label="Chế độ chat">
                <button
                  type="button"
                  role="tab"
                  aria-selected={isBotView}
                  className={`nasa-chat-tabs__btn ${isBotView ? 'nasa-chat-tabs__btn--active' : ''}`}
                  onClick={() => {
                    setChatView(CHAT_VIEW.BOT);
                    setShowTicketDrawer(false);
                    setDraft('');
                    if (botIntent === BOT_INTENT.PICK && messages.length === 0) {
                      // keep picker
                    }
                  }}
                >
                  <Bot className="h-3.5 w-3.5" />
                  Chat bot
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isStaffView}
                  className={`nasa-chat-tabs__btn ${isStaffView ? 'nasa-chat-tabs__btn--active' : ''}`}
                  onClick={() => {
                    setChatView(CHAT_VIEW.STAFF);
                    setDraft('');
                  }}
                >
                  <Headset className="h-3.5 w-3.5" />
                  Nhắn staff
                  {activeTicketCode ? <span className="nasa-chat-tabs__dot" /> : null}
                </button>
              </div>

              {isBotView && chatFlow ? (
                <div className="nasa-composer-toolbar">
                  <button type="button" className="nasa-composer-cancel" onClick={cancelRequestFlow}>
                    Hủy yêu cầu
                  </button>
                </div>
              ) : null}
              {isStaffView && activeTicket?.ticketCode ? (
                <div className="nasa-staff-composer-meta">
                  <Headset className="h-3.5 w-3.5" />
                  <span>
                    {canReplyToTicket
                      ? (activeTicket.liveConnected
                        ? `Đang chat với ${activeTicket.assignedStaffName || 'nhân viên'}`
                        : `Tin nhắn gửi vào ticket ${activeTicket.ticketCode}`)
                      : `Ticket ${activeTicket.ticketCode} đã đóng`}
                  </span>
                  <button
                    type="button"
                    className="nasa-staff-composer-meta__link"
                    onClick={() => setChatView(CHAT_VIEW.BOT)}
                  >
                    Về Chat bot
                  </button>
                </div>
              ) : null}
              {isStaffView && pendingImages.length > 0 ? (
                <div className="nasa-image-preview-row">
                  {pendingImages.map((item) => (
                    <div key={item.id} className="nasa-image-preview-item">
                      <img src={item.previewUrl} alt="Ảnh sẽ gửi" />
                      <button
                        type="button"
                        className="nasa-image-preview-remove"
                        onClick={() => removePendingImage(item.id)}
                        aria-label="Xóa ảnh"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <span className="nasa-image-preview-hint">{pendingImages.length}/3</span>
                </div>
              ) : null}
              <div className="nasa-assistant-inputbar">
                <div className="nasa-assistant-inputshell">
                  {isStaffView ? (
                    <>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept={SUPPORT_IMAGE_ACCEPT}
                        multiple
                        hidden
                        onChange={handlePickSupportImages}
                      />
                      <button
                        type="button"
                        className="nasa-assistant-attach"
                        disabled={
                          uploadingImages
                          || !activeTicket?.ticketCode
                          || !canReplyToTicket
                          || pendingImages.length >= MAX_SUPPORT_IMAGES
                        }
                        onClick={() => imageInputRef.current?.click()}
                        aria-label="Đính kèm ảnh"
                        title="Chọn ảnh hoặc Ctrl+V dán ảnh chụp màn hình (tối đa 3)"
                      >
                        <ImagePlus className="h-4 w-4" />
                      </button>
                    </>
                  ) : null}
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onPaste={handlePasteSupportImages}
                    placeholder={composerPlaceholder}
                    disabled={
                      typing
                      || uploadingImages
                      || isBotPickIntent
                      || (isBotView && chatFlow === CHAT_FLOW.AWAIT_CONFIRM)
                      || (isStaffView && (!activeTicket?.ticketCode || !canReplyToTicket))
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleComposerSend();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="nasa-assistant-send"
                    disabled={
                      uploadingImages
                      || (!draft.trim() && !(isStaffView && pendingImages.length > 0))
                      || typing
                      || isBotPickIntent
                      || (isBotView && chatFlow === CHAT_FLOW.AWAIT_CONFIRM)
                      || (isStaffView && (!activeTicket?.ticketCode || !canReplyToTicket))
                    }
                    onClick={handleComposerSend}
                    aria-label="Gửi tin nhắn"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </footer>
          </section>
        </div>
      )}
    </>,
    portalTarget,
  );
};

export default NasaAiAssistantWidget;
