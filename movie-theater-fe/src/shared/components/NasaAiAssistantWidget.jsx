import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, CreditCard, Crown, Gift, Headset, HelpCircle, Send, Star, Ticket, User, X } from 'lucide-react';
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

const COMPOSER_TARGET = {
  STAFF: 'staff',
  BOT: 'bot',
};

const LIVE_WAIT_TIMEOUT_MS = 3 * 60 * 1000;
const MIN_DESCRIPTION_LENGTH = 15;

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
  { value: 1, label: 'Rat te' },
  { value: 2, label: 'Chua hai long' },
  { value: 3, label: 'Binh thuong' },
  { value: 4, label: 'Hai long' },
  { value: 5, label: 'Rat hai long' },
];

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

const resolveSupportErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

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

const initialMessages = () => ([
  {
    id: 'welcome',
    role: 'bot',
    type: 'text',
    text: 'Chào bạn! Mình có thể giúp gì cho bạn không?',
    time: formatTime(),
  },
  {
    id: 'categories',
    role: 'bot',
    type: 'categories',
    time: formatTime(),
  },
]);

const NasaAiAssistantWidget = () => {
  const location = useLocation();
  const { user } = useAuthContext();

  const botScrollRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
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
  const [showSatisfactionPrompt, setShowSatisfactionPrompt] = useState(false);
  const [chatFlow, setChatFlow] = useState(null);
  const [guidedChatActive, setGuidedChatActive] = useState(false);
  const [wizardCategory, setWizardCategory] = useState(null);
  const [wizardDescription, setWizardDescription] = useState('');
  const [showTicketDrawer, setShowTicketDrawer] = useState(false);
  const [composerTarget, setComposerTarget] = useState(COMPOSER_TARGET.BOT);
  const [liveWaitStartedAt, setLiveWaitStartedAt] = useState(null);
  const [liveWaitTick, setLiveWaitTick] = useState(Date.now());

  const currentUser = user || tokenService.getUser();
  const ownerLabel = useMemo(() => getOwnerLabel(currentUser), [currentUser]);
  const isAdminUser = useMemo(() => hasAdminAccess(currentUser), [currentUser]);

  const activeTicket = useMemo(
    () => myTickets.find((item) => item.ticketCode === activeTicketCode) || ticket || null,
    [activeTicketCode, myTickets, ticket],
  );

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
    if (chatFlow === CHAT_FLOW.AWAIT_DESCRIPTION) {
      return `Bước 2/3 · ${wizardCategory?.label || 'Mô tả'}`;
    }
    if (chatFlow === CHAT_FLOW.AWAIT_CONFIRM) return 'Bước 3/3 · Xác nhận';
    if (activeTicket?.ticketCode) {
      if (`${activeTicket.status || ''}`.toUpperCase() === 'DONE') return `Ticket ${activeTicket.ticketCode} đã hoàn tất`;
      if (activeTicket.liveConnected) {
        return `Đang nhắn với ${activeTicket.assignedStaffName || activeTicket.assignedStaffEmail || 'staff/admin'}`;
      }
      if (activeTicket.liveRequested) {
        return `Ticket ${activeTicket.ticketCode} đang chờ staff/admin`;
      }
      return `Đang theo dõi ticket ${activeTicket.ticketCode}`;
    }
    if (liveAvailability?.anyOnline) {
      const onlineCount = Array.isArray(liveAvailability.agents) ? liveAvailability.agents.length : 0;
      return onlineCount > 0 ? `${onlineCount} staff/admin đang online` : 'Có staff/admin đang online';
    }
    return 'Bot trực 24/7';
  }, [
    activeTicket?.assignedStaffEmail,
    activeTicket?.assignedStaffName,
    activeTicket?.liveConnected,
    activeTicket?.liveRequested,
    activeTicket?.status,
    activeTicket?.ticketCode,
    chatFlow,
    liveAvailability?.agents,
    liveAvailability?.anyOnline,
    typing,
    wizardCategory,
  ]);

  const canReplyToTicket = Boolean(
    activeTicket?.ticketCode
    && `${activeTicket.status || ''}`.toUpperCase() !== 'DONE',
  );

  const composerPlaceholder = useMemo(() => {
    if (canReplyToTicket && composerTarget === COMPOSER_TARGET.STAFF) {
      if (activeTicket.liveConnected) {
        return `Nhắn ${activeTicket.assignedStaffName || activeTicket.assignedStaffEmail || 'staff/admin'}...`;
      }
      if (activeTicket.liveRequested) {
        return 'Để lại tin nhắn, staff/admin sẽ thấy ngay khi nhận hỗ trợ...';
      }
      return 'Nhắn admin xử lý ticket này...';
    }
    if (chatFlow === CHAT_FLOW.AWAIT_DESCRIPTION) {
      return wizardCategory?.question || 'Mô tả vấn đề của bạn...';
    }
    if (chatFlow === CHAT_FLOW.AWAIT_CONFIRM) {
      return 'Chọn Gửi yêu cầu hoặc Sửa trên card phía trên...';
    }
    return 'Nhập để chat với NASA BOT...';
  }, [activeTicket, canReplyToTicket, chatFlow, composerTarget, wizardCategory]);

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
    if (chatFlow === CHAT_FLOW.AWAIT_DESCRIPTION) return `Bước 2/3 · ${wizardCategory?.label || 'Mô tả'}`;
    if (chatFlow === CHAT_FLOW.AWAIT_CONFIRM) return 'Bước 3/3 · Xác nhận';
    if (activeTicket?.ticketCode) {
      if (isWaitingLive) return `Chờ nhân viên · ${formatCountdown(liveWaitRemainingMs)}`;
      if (activeTicket.liveConnected) return `Chat với ${activeTicket.assignedStaffName || 'nhân viên'}`;
      return `Ticket ${activeTicket.ticketCode}`;
    }
    return supportStatus;
  }, [
    activeTicket?.assignedStaffName,
    activeTicket?.liveConnected,
    activeTicket?.ticketCode,
    chatFlow,
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
    if (botScrollRef.current) {
      botScrollRef.current.scrollTop = botScrollRef.current.scrollHeight;
    }
  }, [messages, ticketMessages, typing, open, isWaitingLive]);

  useEffect(() => {
    let timerId = null;
    if (
      activeTicket?.ticketCode
      && `${activeTicket.status || ''}`.toUpperCase() === 'DONE'
      && !activeTicket?.satisfactionRating
    ) {
      timerId = window.setTimeout(() => {
        setShowSatisfactionPrompt(true);
      }, 1200);
    } else {
      setShowSatisfactionPrompt(false);
    }

    return () => {
      if (timerId) {
        window.clearTimeout(timerId);
      }
    };
  }, [activeTicket?.satisfactionRating, activeTicket?.status, activeTicket?.ticketCode]);

  useEffect(() => {
    if (canReplyToTicket) {
      setComposerTarget(COMPOSER_TARGET.STAFF);
    } else {
      setComposerTarget(COMPOSER_TARGET.BOT);
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
    loadMySupportTickets();

    return () => {
      activeFlag = false;
    };
  }, [open]);

  useRealtimeTopic(REALTIME_TOPICS.SUPPORT_AGENTS, () => {
    supportService.getLiveSupportAvailability()
      .then((data) => setLiveAvailability(data || { anyOnline: false, agents: [] }))
      .catch(() => setLiveAvailability({ anyOnline: false, agents: [] }));
  });

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
          pushMessage({
            role: 'bot',
            type: 'card',
            title: 'Đã kết nối nhân viên',
            text: `${detail.assignedStaffName || detail.assignedStaffEmail || 'Nhân viên'} đã nhận yêu cầu chat. Bạn có thể nhắn trực tiếp trong khung chat.`,
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

  const ensureCategoryChips = () => {
    setMessages((prev) => {
      if (prev.some((item) => item.type === 'categories')) return prev;
      return [...prev, { id: `categories-${Date.now()}`, role: 'bot', type: 'categories', time: formatTime() }];
    });
  };

  useEffect(() => {
    if (!activeTicket?.ticketCode || chatFlow) return;
    if (`${activeTicket.status || ''}`.toUpperCase() === 'DONE') {
      ensureCategoryChips();
    }
  }, [activeTicket?.status, activeTicket?.ticketCode, chatFlow]);

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
        text: 'Mình đã chuyển yêu cầu của bạn sang nhóm trực hỗ trợ. Bạn có thể nhắn tiếp ngay trong khung chat.',
      });

      if (response?.ticketCode) {
        setActiveTicketCode(response.ticketCode);
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
      await loadMyTickets();
      notificationService.success('Cảm ơn bạn đã đánh giá hỗ trợ.');
    } catch (error) {
      notificationService.error(resolveSupportErrorMessage(error, 'Không gửi được đánh giá lúc này.'));
    }
  };

  const sendTicketReply = async (rawValue = draft) => {
    const value = rawValue.trim();
    if (!value || !activeTicketCode || !canReplyToTicket) return;

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

    setDraft('');
    pushUser(value);

    let matchedCategory = selectedCategory;
    let hasAiReply = false;

    setTyping(true);
    try {
      const ai = await supportService.chatSupport({
        message: value,
        history: buildHistory(value),
      });

      if (ai?.reply) {
        pushBot(ai.reply, { choices: normalizeAiChoices(ai.choices) });
        hasAiReply = true;
        if (ai?.choices?.length) {
          setGuidedChatActive(true);
        }
      }

      if (ai?.suggestedCategory) {
        matchedCategory = CATEGORIES.find((item) => item.key === ai.suggestedCategory) || matchedCategory;
        if (matchedCategory) {
          setSelectedCategory(matchedCategory);
        }
      }

      // Handle auto-created ticket from backend
      if (ai?.autoTicketCode) {
        const ticketData = ai?.autoTicket || { ticketCode: ai.autoTicketCode, status: 'PENDING' };
        setTicket(ticketData);
        setActiveTicketCode(ai.autoTicketCode);
        setGuidedChatActive(false);
        await loadMyTickets();
        if (ai.autoTicketCode) {
          await refreshTicketThread(ai.autoTicketCode);
        }
        return;
      }
    } catch {
      // Fall back to local routing below.
    } finally {
      setTyping(false);
    }

    if (!hasAiReply) {
      pushBot('Mình đã nhận nội dung của bạn. Chọn danh mục hỗ trợ phía trên hoặc mở danh sách ticket.');
    }

    if (shouldStartTicketFlowFromText(value)) {
      startSupportWizard(detectCategory(value), value);
    } else if (shouldOpenTicketListFromText(value)) {
      await loadMyTickets();
      setShowTicketDrawer(true);
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
    if (!value) return;

    if (canReplyToTicket && composerTarget === COMPOSER_TARGET.STAFF) {
      await sendTicketReply(value);
      return;
    }

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
          onClick={() => setOpen(true)}
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
                <div className="nasa-assistant-thread nasa-assistant-thread--bot" ref={botScrollRef}>
                  {messages.map(renderTimelineMessage)}
                  {renderTicketThreadSection()}
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
                </div>
              </section>

              {showTicketDrawer ? renderTicketDrawer() : null}
            </div>

            <footer className="nasa-assistant-footer">
              {chatFlow ? (
                <div className="nasa-composer-toolbar">
                  <button type="button" className="nasa-composer-cancel" onClick={cancelRequestFlow}>
                    Hủy yêu cầu
                  </button>
                </div>
              ) : null}
              {canReplyToTicket && !chatFlow ? (
                <div className="nasa-composer-segment nasa-composer-segment--compact">
                  <button
                    type="button"
                    className={`nasa-composer-segment__btn ${composerTarget === COMPOSER_TARGET.STAFF ? 'nasa-composer-segment__btn--active' : ''}`}
                    onClick={() => setComposerTarget(COMPOSER_TARGET.STAFF)}
                  >
                    <Headset className="h-3.5 w-3.5" />
                    Nhắn staff
                  </button>
                  <button
                    type="button"
                    className={`nasa-composer-segment__btn ${composerTarget === COMPOSER_TARGET.BOT ? 'nasa-composer-segment__btn--active' : ''}`}
                    onClick={() => setComposerTarget(COMPOSER_TARGET.BOT)}
                  >
                    <Bot className="h-3.5 w-3.5" />
                    Chat bot
                  </button>
                </div>
              ) : null}
              <div className="nasa-assistant-inputbar">
                <div className="nasa-assistant-inputshell">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={composerPlaceholder}
                    disabled={chatFlow === CHAT_FLOW.AWAIT_CONFIRM}
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
                    disabled={!draft.trim() || chatFlow === CHAT_FLOW.AWAIT_CONFIRM}
                    onClick={handleComposerSend}
                    aria-label="Gửi tin nhắn"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {showSatisfactionPrompt && (
                <div className="nasa-assistant-actions nasa-assistant-actions--rating-inline">
                  {SATISFACTION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className="nasa-assistant-pill nasa-assistant-pill--rating"
                      onClick={() => submitSatisfaction(option.value)}
                    >
                      <Star className="h-4 w-4" />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </footer>
          </section>
        </div>
      )}
    </>,
    portalTarget,
  );
};

export default NasaAiAssistantWidget;
