import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, CreditCard, Crown, Gift, Headset, HelpCircle, MessageCircle, Send, Sparkles, Star, Ticket, User, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuthContext } from '../../features/auth/hooks/useAuthContext';
import tokenService from '../../features/auth/utils/tokenService';
import { REALTIME_TOPICS } from '../constants/realtimeTopics';
import nasaAssistantFabAvatar from '../assets/nasa-assistant-avatar-head.jpg';
import nasaLogo from '../assets/NASAFILM.jpg';
import { useRealtimeTopic } from '../hooks/useRealtimeTopic';
import { notificationService } from '../services/notificationService';
import { supportService } from '../services/supportService';
import { systemConfigService } from '../services/systemConfigService';
import { DEFAULT_NASA_BOT_SUPPORT_FAQS } from '../constants/systemConfig';
import { getSupportMessageSenderLabel } from '../utils/supportMessageUtils';
import { parseSupportStickerMessage } from '../constants/supportStickers';
import SupportStickerBubble from './SupportStickerBubble';
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

const CATEGORY_GUIDED_KEYS = new Set(['account', 'promo', 'membership']);

const CATEGORY_GUIDED_SEEDS = {
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
  if (status === 429 || code === 429 || `${code || ''}`.includes('RATE_LIMIT') || msgNorm.includes('qua nhanh')) {
    return 'Bạn gửi tin nhắn quá nhanh. Vui lòng đợi vài giây rồi thử lại.';
  }
  if (code === 409 || msgNorm.includes('da danh gia') || `${code || ''}`.includes('ALREADY_RATED')) {
    return 'Bạn đã đánh giá ticket này rồi.';
  }
  if (msgNorm.includes('hoan tat') || msgNorm.includes('chi danh gia') || `${code || ''}`.includes('SATISFACTION_NOT_ALLOWED')) {
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

const resolveShortcutCategoryKey = (shortcut = {}) => {
  const name = `${shortcut.shortcutName || ''}`.toLowerCase();
  if (name.includes('ticket')) return 'ticket';
  if (name.includes('payment')) return 'payment';
  if (name.includes('account')) return 'account';
  if (name.includes('promo')) return 'promo';
  if (name.includes('membership')) return 'membership';
  return 'other';
};

const isAgentMessage = (senderRole = '') => `${senderRole}`.toUpperCase() !== 'USER';

const initialMessages = (intent = BOT_INTENT.SUPPORT) => {
  if (intent === BOT_INTENT.ANSWER) {
    return [
      {
        id: 'welcome',
        role: 'bot',
        type: 'text',
        text: 'Chào bạn! Mình đang ở chế độ Giải đáp AI — hỏi gì về NASAFilm cũng được (phim, rạp, đặt vé, hội viên, chính sách...).',
        time: formatTime(),
      },
    ];
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

const NasaAiAssistantWidget = () => {
  const location = useLocation();
  const { user } = useAuthContext();

  const botScrollRef = useRef(null);
  const staffScrollRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [chatView, setChatView] = useState(CHAT_VIEW.BOT);
  const [botIntent, setBotIntent] = useState(BOT_INTENT.PICK);
  const [messages, setMessages] = useState([]);
  const [aiStatus, setAiStatus] = useState({ configured: false, mode: 'FALLBACK' });
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [ticketDraft, setTicketDraft] = useState('');
  const [ticket, setTicket] = useState(null);
  const [myTickets, setMyTickets] = useState([]);
  const [activeTicketCode, setActiveTicketCode] = useState('');
  const [ticketMessages, setTicketMessages] = useState([]);
  const [liveAvailability, setLiveAvailability] = useState({ anyOnline: false, agents: [] });
  const [nasaBotRuntime, setNasaBotRuntime] = useState(DEFAULT_NASA_BOT_RUNTIME);
  const [chatFlow, setChatFlow] = useState(null);
  const [guidedChatActive, setGuidedChatActive] = useState(false);
  const [wizardCategory, setWizardCategory] = useState(null);
  const [wizardDescription, setWizardDescription] = useState('');
  const [showTicketDrawer, setShowTicketDrawer] = useState(false);
  const [liveWaitStartedAt, setLiveWaitStartedAt] = useState(null);
  const [liveWaitTick, setLiveWaitTick] = useState(Date.now());
  const lastSendAtRef = useRef(0);

  const currentUser = user || tokenService.getUser();
  const ownerLabel = useMemo(() => getOwnerLabel(currentUser), [currentUser]);
  const isAdminUser = useMemo(() => hasAdminAccess(currentUser), [currentUser]);

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

    const loadMySupportTickets = async () => {
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

    loadRuntimeConfig();
    loadLiveAvailability();
    loadAiStatus();
    loadMySupportTickets();

    return () => {
      activeFlag = false;
    };
  }, [open]);

  useRealtimeTopic(
    hasAdminAccess(user) ? REALTIME_TOPICS.SUPPORT_AGENTS : null,
    () => {
      supportService.getLiveSupportAvailability()
        .then((data) => setLiveAvailability(data || { anyOnline: false, agents: [] }))
        .catch(() => setLiveAvailability({ anyOnline: false, agents: [] }));
    },
  );

  useRealtimeTopic(
    activeTicketCode ? REALTIME_TOPICS.supportTicket(activeTicketCode) : null,
    async () => {
      if (!activeTicketCode) return;
      try {
        const [detail, list, tickets] = await Promise.all([
          supportService.getSupportRequest(activeTicketCode),
          supportService.getSupportMessages(activeTicketCode),
          supportService.getMySupportRequests(),
        ]);
        setTicket(detail || null);
        setTicketMessages(Array.isArray(list) ? list : []);
        setMyTickets(Array.isArray(tickets) ? tickets : []);
      } catch {
        // Ignore realtime refresh errors.
      }
    },
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
      if (cancelled || !ticketCode) return;

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

    pollLiveStatus();
    const intervalId = window.setInterval(pollLiveStatus, 5000);
    return () => {
      cancelled = true;
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
    setShowTicketDrawer(false);
    setActiveTicketCode(ticketCode);
    setChatView(CHAT_VIEW.STAFF);
    setChatFlow(null);
    setWizardCategory(null);
    setWizardDescription('');
    try {
      await refreshTicketThread(ticketCode);
      await loadMyTickets();
    } catch {
      notificationService.error('Không tải được cuộc trò chuyện ticket lúc này.');
      setTicketMessages([]);
    }
  };

  const enterBotIntent = (intent) => {
    setChatView(CHAT_VIEW.BOT);
    setBotIntent(intent);
    setMessages(initialMessages(intent));
    setDraft('');
    setChatFlow(null);
    setGuidedChatActive(false);
    setWizardCategory(null);
    setWizardDescription('');
    setSelectedCategory(null);
    setShowTicketDrawer(false);
  };

  const backToBotIntentPick = () => {
    setChatView(CHAT_VIEW.BOT);
    setBotIntent(BOT_INTENT.PICK);
    setMessages([]);
    setDraft('');
    setChatFlow(null);
    setGuidedChatActive(false);
    setWizardCategory(null);
    setWizardDescription('');
    setSelectedCategory(null);
    setTyping(false);
  };

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

  const pushFaqGuide = (categoryKey) => {
    const group = DEFAULT_NASA_BOT_SUPPORT_FAQS.find((item) => item.key === categoryKey);
    if (!group) return;
    pushMessage({
      role: 'bot',
      type: 'faq',
      categoryKey,
      group,
    });
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
      });

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
        await loadMyTickets();
        await refreshTicketThread(ai.autoTicketCode);
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
      pushFaqGuide(category.key);
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
      if (seededDescription.trim()) {
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

  const requestLiveSupport = async (options = {}) => {
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

  const sendTicketReply = async (rawValue = draft) => {
    const value = rawValue.trim();
    if (!value || !activeTicketCode || !canReplyToTicket) return;
    if (!assertSendGap()) return;

    setDraft('');
    setTicketMessages((prev) => [
      ...prev,
      {
        uuid: `temp-${Date.now()}`,
        senderRole: 'USER',
        senderName: ownerLabel,
        message: value,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      await supportService.sendSupportMessage(activeTicketCode, { message: value });
      await refreshTicketThread(activeTicketCode);
      await loadMyTickets();
    } catch (error) {
      notificationService.error(resolveSupportErrorMessage(error, 'Không gửi được tin nhắn support.'));
      await refreshTicketThread(activeTicketCode).catch(() => {});
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
    try {
      const ai = await supportService.chatSupport({
        message: value,
        history: buildHistory(value),
        mode: answerMode ? 'ANSWER' : 'SUPPORT',
      });

      if (ai?.reply) {
        pushBot(ai.reply, { choices: answerMode ? null : normalizeAiChoices(ai.choices) });
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

      // Handle auto-created ticket from backend
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
    } catch (error) {
      const message = resolveSupportErrorMessage(error, '');
      if (message) {
        pushBot(message);
        hasAiReply = true;
      }
    } finally {
      setTyping(false);
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
    if (!value || typing) return;

    // Staff chatbox: always send to ticket / nhân viên
    if (isStaffView) {
      if (!canReplyToTicket) {
        notificationService.info('Ticket đã đóng. Chuyển sang Chat bot nếu bạn cần hỏi thêm.');
        return;
      }
      await sendTicketReply(value);
      return;
    }

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

  const renderBotIntentPicker = () => (
    <div className="nasa-mode-picker">
      <p className="nasa-mode-picker__lead">Chọn 1 trong 2 để bắt đầu</p>
      <button
        type="button"
        className="nasa-mode-picker__option nasa-mode-picker__option--support"
        onClick={() => enterBotIntent(BOT_INTENT.SUPPORT)}
      >
        <span className="nasa-mode-picker__icon">
          <Headset className="h-5 w-5" />
        </span>
        <span className="nasa-mode-picker__copy">
          <strong>1. Hỗ trợ</strong>
          <span>Wizard · chọn danh mục → mô tả → gửi nhân viên / ticket</span>
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
          <strong>2. Giải đáp</strong>
          <span>
            AI chat · hỏi tự do về NASAFilm
          </span>
        </span>
      </button>
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
                {message.text}
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
              <button
                key={item.ticketCode}
                type="button"
                className={`nasa-assistant-ticket-card nasa-assistant-ticket-card--compact ${item.ticketCode === activeTicketCode ? 'nasa-assistant-ticket-card--active' : ''}`}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderTicketThreadSection = () => {
    if (!activeTicket?.ticketCode) return null;
    const statusMeta = getTicketStatusMeta(activeTicket.status);
    const needsRating = isClosedSupportStatus(activeTicket.status) && !activeTicket.satisfactionRating;

    return (
      <>
        <div className="nasa-timeline-divider">
          <span>{activeTicket.ticketCode}</span>
          <span className={statusMeta.className}>{statusMeta.label}</span>
          <span>{getCategoryLabel(activeTicket.category)}</span>
        </div>
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
                  item.message
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
          className="nasa-assistant-fab"
          aria-label="Mở NASA BOT"
          onClick={() => {
            setOpen(true);
            setChatView(CHAT_VIEW.BOT);
            setBotIntent(BOT_INTENT.PICK);
            setMessages([]);
            setDraft('');
            setChatFlow(null);
            setGuidedChatActive(false);
            setWizardCategory(null);
            setWizardDescription('');
            setSelectedCategory(null);
            setShowTicketDrawer(false);
            setTyping(false);
          }}
        >
          <span className="nasa-assistant-fab-glow" />
          <img src={nasaAssistantFabAvatar} alt="NASA BOT" className="nasa-assistant-fab-avatar" />
        </button>
        <span className="nasa-assistant-fab-label">NASA Bot</span>
      </div>

      {open && (
        <div className="nasa-assistant-overlay">
          <button type="button" className="nasa-assistant-backdrop" aria-label="Đóng" onClick={() => setOpen(false)} />
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
                <button type="button" className="nasa-assistant-icon-btn" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="nasa-assistant-body nasa-assistant-body--chat-only">
              <section className="nasa-assistant-bot-stage">
                {isBotView ? (
                  <div className="nasa-assistant-thread nasa-assistant-thread--bot" ref={botScrollRef}>
                    {isBotPickIntent ? renderBotIntentPicker() : (
                      <>
                        {messages.map(renderTimelineMessage)}
                        {typing && (
                          <div className="nasa-assistant-msg nasa-assistant-msg--bot">
                            <div className="nasa-assistant-msg__row">
                              <div className="nasa-assistant-avatar nasa-assistant-avatar--bot">
                                <img src={nasaLogo} alt="bot" />
                              </div>
                              <div className="nasa-assistant-bubble nasa-assistant-bubble--bot nasa-assistant-bubble--typing">
                                <span />
                                <span />
                                <span />
                              </div>
                            </div>
                          </div>
                        )}
                      </>
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
              {isBotView && botIntent !== BOT_INTENT.PICK ? (
                <div className="nasa-staff-composer-meta">
                  {isAnswerIntent ? <Sparkles className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                  <span>{isAnswerIntent ? 'Đang ở Giải đáp AI' : 'Đang ở Hỗ trợ (wizard)'}</span>
                  <button
                    type="button"
                    className="nasa-staff-composer-meta__link"
                    onClick={backToBotIntentPick}
                  >
                    Đổi chế độ
                  </button>
                </div>
              ) : null}
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
              <div className="nasa-assistant-inputbar">
                <div className="nasa-assistant-inputshell">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={composerPlaceholder}
                    disabled={
                      typing
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
                      !draft.trim()
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
