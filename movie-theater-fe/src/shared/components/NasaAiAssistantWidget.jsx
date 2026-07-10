import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, ChevronRight, Headset, MessageCircle, Send, Sparkles, Star, Ticket, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../features/auth/hooks/useAuthContext';
import tokenService from '../../features/auth/utils/tokenService';
import { REALTIME_TOPICS } from '../constants/realtimeTopics';
import nasaAssistantFabAvatar from '../assets/nasa-assistant-avatar-head.jpg';
import nasaLogo from '../assets/NASAFILM.jpg';
import { useRealtimeTopic } from '../hooks/useRealtimeTopic';
import { notificationService } from '../services/notificationService';
import { supportService } from '../services/supportService';
import { systemConfigService } from '../services/systemConfigService';
import './NasaAiAssistantWidget.css';

const SUPPORT_VIEWS = {
  TICKETS: 'tickets',
  CREATE: 'create',
  THREAD: 'thread',
};

const INPUT_TARGETS = {
  BOT: 'bot',
  TICKET: 'ticket',
};

const CATEGORIES = [
  {
    key: 'ticket',
    label: 'Vé / suất chiếu',
    hint: 'Mã vé, ghế, suất chiếu, đổi hoặc hoàn',
    question: 'Bạn đang cần hỗ trợ gì về vé hoặc suất chiếu?',
  },
  {
    key: 'payment',
    label: 'Thanh toán',
    hint: 'Giao dịch lỗi, trừ tiền, hoàn tiền',
    question: 'Bạn gặp vấn đề gì ở thanh toán?',
  },
  {
    key: 'account',
    label: 'Tài khoản',
    hint: 'Đăng nhập, OTP, mật khẩu',
    question: 'Bạn gặp lỗi gì ở tài khoản?',
  },
  {
    key: 'promo',
    label: 'Khuyến mãi',
    hint: 'Voucher, combo, mã giảm giá',
    question: 'Bạn cần hỗ trợ chương trình khuyến mãi nào?',
  },
  {
    key: 'membership',
    label: 'Hội viên',
    hint: 'Điểm thưởng, hạng thành viên',
    question: 'Bạn đang gặp vấn đề gì ở hội viên?',
  },
  {
    key: 'other',
    label: 'Khác',
    hint: 'Vấn đề chưa nằm trong nhóm trên',
    question: 'Bạn mô tả ngắn gọn giúp mình nhé.',
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
      description: 'Đăng nhập, OTP, mật khẩu, lỗi tài khoản',
      queryContent: 'Tôi không đăng nhập được và cần hỗ trợ tài khoản.',
      shortcutName: 'account_support',
    },
    {
      buttonName: 'Khuyến mãi',
      description: 'Voucher, combo, ưu đãi, mã giảm giá',
      queryContent: 'Tôi cần hỗ trợ về voucher hoặc khuyến mãi.',
      shortcutName: 'promo_support',
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

const QUICK_ACTIONS = [
  { id: 'create', label: 'Tạo ticket', icon: Ticket },
  { id: 'tickets', label: 'Ticket của tôi', icon: MessageCircle },
  { id: 'live', label: 'Gọi staff online', icon: Headset },
];

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

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
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
    default:
      return { label: 'Đang chờ', className: 'nasa-assistant-status nasa-assistant-status--pending' };
  }
};

const isAgentMessage = (senderRole = '') => `${senderRole}`.toUpperCase() !== 'USER';

const initialMessages = () => ([
  {
    id: 'welcome',
    role: 'bot',
    type: 'text',
    text: `${getGreeting()}, mình là NASA BOT.`,
    time: formatTime(),
  },
]);

const NasaAiAssistantWidget = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();

  const botScrollRef = useRef(null);
  const supportScrollRef = useRef(null);

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
  const [panelView, setPanelView] = useState(null);
  const [inputTarget, setInputTarget] = useState(INPUT_TARGETS.BOT);
  const [liveAvailability, setLiveAvailability] = useState({ anyOnline: false, agents: [] });
  const [nasaBotRuntime, setNasaBotRuntime] = useState(DEFAULT_NASA_BOT_RUNTIME);
  const [showSatisfactionPrompt, setShowSatisfactionPrompt] = useState(false);

  const currentUser = user || tokenService.getUser();
  const ownerLabel = useMemo(() => getOwnerLabel(currentUser), [currentUser]);
  const isAdminUser = useMemo(() => hasAdminAccess(currentUser), [currentUser]);

  const activeTicket = useMemo(
    () => myTickets.find((item) => item.ticketCode === activeTicketCode) || ticket || null,
    [activeTicketCode, myTickets, ticket],
  );

  const recentTickets = useMemo(() => myTickets.slice(0, 3), [myTickets]);

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
    if (!panelView) return 'Bot trực 24/7';
    if (panelView === SUPPORT_VIEWS.CREATE) {
      return selectedCategory ? `Soạn ticket · ${selectedCategory.label}` : 'Chọn danh mục ticket';
    }
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
    return 'Mở trung tâm hỗ trợ khi cần';
  }, [
    activeTicket?.assignedStaffEmail,
    activeTicket?.assignedStaffName,
    activeTicket?.liveConnected,
    activeTicket?.liveRequested,
    activeTicket?.status,
    activeTicket?.ticketCode,
    liveAvailability?.agents,
    liveAvailability?.anyOnline,
    panelView,
    selectedCategory,
    typing,
  ]);

  const composerPlaceholder = useMemo(() => {
    if (inputTarget === INPUT_TARGETS.TICKET) {
      if (!activeTicket?.ticketCode) return 'Chọn một ticket để nhắn admin/staff...';
      if (`${activeTicket.status || ''}`.toUpperCase() === 'DONE') {
        return 'Ticket này đã hoàn tất, chuyển về bot để mở yêu cầu mới.';
      }
      if (activeTicket.liveConnected) {
        return `Nhắn ${activeTicket.assignedStaffName || activeTicket.assignedStaffEmail || 'staff/admin'}...`;
      }
      if (activeTicket.liveRequested) {
        return 'Để lại tin nhắn, staff/admin sẽ thấy ngay khi nhận hỗ trợ...';
      }
      return 'Nhắn admin xử lý ticket này...';
    }
    return 'Nhập để chat với NASA BOT...';
  }, [activeTicket, inputTarget]);

  const canReplyToTicket = Boolean(
    inputTarget === INPUT_TARGETS.TICKET
    && activeTicket?.ticketCode
    && `${activeTicket.status || ''}`.toUpperCase() !== 'DONE',
  );

  const isSupportFullView = Boolean(panelView);
  const isCreatePanelActive = panelView === SUPPORT_VIEWS.CREATE;

  useEffect(() => {
    if (botScrollRef.current) {
      botScrollRef.current.scrollTop = botScrollRef.current.scrollHeight;
    }
  }, [messages, typing, open]);

  useEffect(() => {
    if (supportScrollRef.current) {
      supportScrollRef.current.scrollTop = supportScrollRef.current.scrollHeight;
    }
  }, [ticketMessages, myTickets, panelView, open]);

  useEffect(() => {
    let timerId = null;
    if (
      panelView === SUPPORT_VIEWS.THREAD
      && activeTicket?.ticketCode
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
  }, [activeTicket?.satisfactionRating, activeTicket?.status, activeTicket?.ticketCode, panelView]);

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

  useEffect(() => {
    if (!activeTicketCode) {
      setInputTarget(INPUT_TARGETS.BOT);
    }
  }, [activeTicketCode]);

  useEffect(() => {
    if (!open || panelView !== SUPPORT_VIEWS.THREAD || activeTicketCode || myTickets.length === 0) return;
    openTicketThread(myTickets[0].ticketCode);
  }, [activeTicketCode, myTickets, open, panelView]);

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
        if (panelView === SUPPORT_VIEWS.THREAD) {
          setPanelView(SUPPORT_VIEWS.TICKETS);
        }
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
    setActiveTicketCode(ticketCode);
    setPanelView(SUPPORT_VIEWS.THREAD);
    setInputTarget(INPUT_TARGETS.TICKET);
    try {
      await refreshTicketThread(ticketCode);
      await loadMyTickets();
    } catch {
      notificationService.error('Không tải được cuộc trò chuyện ticket lúc này.');
      setTicketMessages([]);
    }
  };

  const openCreatePanel = (categoryKey = '', seededDescription = '') => {
    const category = CATEGORIES.find((item) => item.key === categoryKey) || null;
    setSelectedCategory(category);
    setTicketDraft(seededDescription);
    setPanelView(SUPPORT_VIEWS.CREATE);
    setInputTarget(INPUT_TARGETS.BOT);
  };

  const submitTicket = async () => {
    const description = ticketDraft.trim();
    const categoryKey = selectedCategory?.key || detectCategory(description);

    if (!description) {
      notificationService.info('Bạn cần nhập mô tả ngắn để tạo ticket.');
      return;
    }

    setTyping(true);
    try {
      const response = await supportService.createSupportRequest({
        category: categoryKey,
        description,
      });
      const ticketCode = response?.ticketCode || response?.code;
      const nextTicket = {
        ...(response || {}),
        ticketCode,
        status: response?.status || 'PENDING',
      };

      setTicket(nextTicket);
      setTicketDraft('');
      setSelectedCategory(CATEGORIES.find((item) => item.key === categoryKey) || selectedCategory);

      pushMessage({
        role: 'bot',
        type: 'card',
        title: 'Ticket đã được tạo',
        text: `Mình đã gửi ticket ${ticketCode} cho admin. Bạn có thể theo dõi hoặc nhắn tiếp trong trung tâm hỗ trợ.`,
      });

      notificationService.success('Đã tạo ticket.');
      await loadMyTickets();
      if (ticketCode) {
        await openTicketThread(ticketCode);
      } else {
        setPanelView(SUPPORT_VIEWS.TICKETS);
      }
    } catch (error) {
      const message = resolveSupportErrorMessage(error, 'Tạo ticket thất bại.');
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
      await loadMyTickets();

      pushMessage({
        role: 'bot',
        type: 'card',
        title: 'Đã gọi staff/admin online',
        text: 'Mình đã chuyển yêu cầu của bạn sang nhóm trực hỗ trợ. Bạn có thể nhắn tiếp trong thread ticket ngay trong trung tâm hỗ trợ.',
      });

      if (response?.ticketCode) {
        await openTicketThread(response.ticketCode);
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

  const sendTicketReply = async () => {
    const value = draft.trim();
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
        pushBot(ai.reply);
        hasAiReply = true;
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
        await loadMyTickets();
        setPanelView(SUPPORT_VIEWS.THREAD);
        if (ai.autoTicketCode) {
          await refreshTicketThread(ai.autoTicketCode);
        }
        return; // Ticket created, skip local routing
      }
    } catch {
      // Fall back to local routing below.
    } finally {
      setTyping(false);
    }

    if (shouldOpenTicketListFromText(value)) {
      await loadMyTickets();
      setPanelView(SUPPORT_VIEWS.TICKETS);
      if (!hasAiReply) {
        pushBot('Mình đã mở danh sách ticket của bạn trong trung tâm hỗ trợ.');
      }
      return;
    }

    if (shouldStartTicketFlowFromText(value)) {
      const detected = matchedCategory || CATEGORIES.find((item) => item.key === detectCategory(value)) || CATEGORIES.at(-1);
      setSelectedCategory(detected);
      setTicketDraft(value);
      setPanelView(SUPPORT_VIEWS.CREATE);
      pushBot(`Mình đã mở form ticket trong trung tâm hỗ trợ${detected?.label ? ` cho mục "${detected.label}"` : ''}. Bạn chỉ cần chỉnh lại mô tả rồi gửi.`);
      return;
    }

    if (matchedCategory && !hasAiReply) {
      pushMessage({
        role: 'bot',
        type: 'card',
        title: 'Nếu cần người xử lý trực tiếp',
        text: `Mình đoán vấn đề này thuộc nhóm "${matchedCategory.label}". Bạn có thể mở ticket ngay trong trung tâm hỗ trợ.`,
      });
      return;
    }

    if (!hasAiReply) {
      pushBot('Mình đã nhận nội dung của bạn. Bạn cứ chat tiếp với bot, hoặc mở trung tâm hỗ trợ nếu cần admin/staff xử lý.');
    }
  };

  const handleRuntimeShortcut = (shortcut) => {
    const categoryKey = CATEGORIES.find((item) => item.key === `${shortcut?.shortcutName || ''}`.replace('_support', '').trim())?.key
      || detectCategory(shortcut?.queryContent || shortcut?.buttonName || '');
    openCreatePanel(categoryKey, shortcut?.queryContent || '');
  };

  const handleQuickAction = async (actionId) => {
    if (actionId === 'create') {
      openCreatePanel(selectedCategory?.key || '', ticketDraft);
      if (!selectedCategory && !ticketDraft) {
        pushBot('Mình đã mở khu vực tạo ticket trong trung tâm hỗ trợ. Chọn đúng danh mục rồi gửi nhé.');
      }
      return;
    }

    if (actionId === 'tickets') {
      await loadMyTickets();
      setPanelView(SUPPORT_VIEWS.TICKETS);
      return;
    }

    if (actionId === 'live') {
      if (activeTicket?.ticketCode) {
        await requestLiveSupport({
          category: activeTicket.category,
          description: activeTicket.description,
        });
        return;
      }

      openCreatePanel(selectedCategory?.key || '', ticketDraft);
      pushBot('Mình đã mở trung tâm hỗ trợ. Bạn có thể gửi ticket hoặc gọi staff online ngay tại đó.');
    }
  };

  const handleComposerSend = async () => {
    if (inputTarget === INPUT_TARGETS.TICKET && activeTicket?.ticketCode) {
      await sendTicketReply();
      return;
    }
    await submitBotMessage(draft);
  };

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  if (isAdminUser || shouldHideOnRoute || !portalTarget) return null;

  const renderBotMessage = (message) => {
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

    return (
      <div
        key={message.id}
        className={`nasa-assistant-msg ${message.role === 'user' ? 'nasa-assistant-msg--user' : 'nasa-assistant-msg--bot'}`}
      >
        {message.role === 'bot' && (
          <div className="nasa-assistant-avatar nasa-assistant-avatar--bot">
            <img src={nasaLogo} alt="bot" />
          </div>
        )}
        <div className={`nasa-assistant-bubble ${message.role === 'user' ? 'nasa-assistant-bubble--user' : 'nasa-assistant-bubble--bot'}`}>
          {message.text}
        </div>
        <div className="nasa-assistant-time">{message.time}</div>
      </div>
    );
  };

  const renderTicketList = () => (
    <div className="nasa-assistant-support-stack">
      <div className="nasa-assistant-card">
        <div className="nasa-assistant-card__title">Ticket của tôi</div>
        <div className="nasa-assistant-card__text">
          Chọn một ticket để mở thread admin/staff ngay trong widget này.
        </div>
      </div>

      <div className="nasa-assistant-ticket-list">
        {myTickets.length === 0 ? (
          <div className="nasa-assistant-empty-state">
            <div className="nasa-assistant-empty-state__title">Chưa có ticket nào</div>
            <div className="nasa-assistant-empty-state__text">Nếu bot chưa giải quyết đủ, bạn có thể tạo ticket ngay ở đây.</div>
            <button type="button" className="nasa-assistant-mini-btn nasa-assistant-mini-btn--primary" onClick={() => openCreatePanel(selectedCategory?.key || '', ticketDraft)}>
              Tạo ticket
            </button>
          </div>
        ) : (
          myTickets.map((item) => (
            <button
              key={item.ticketCode}
              type="button"
              className={`nasa-assistant-ticket-card ${item.ticketCode === activeTicketCode ? 'nasa-assistant-ticket-card--active' : ''}`}
              onClick={() => openTicketThread(item.ticketCode)}
            >
              <div className="nasa-assistant-ticket-card__head">
                <strong>{item.ticketCode}</strong>
                <span className={getTicketStatusMeta(item.status).className}>
                  {getTicketStatusMeta(item.status).label}
                </span>
              </div>
              <p className="nasa-assistant-ticket-card__text">{item.lastMessage || item.description}</p>
              <div className="nasa-assistant-ticket-card__foot">
                <span>{item.category || 'Hỗ trợ chung'}</span>
                <span>{formatTicketStamp(item.updatedAt || item.createdAt)}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );

  const renderCreatePanel = () => (
    <div className="nasa-assistant-support-stack">
      <div className="nasa-assistant-card">
        <div className="nasa-assistant-card__title">Tạo ticket hỗ trợ</div>
        <div className="nasa-assistant-card__text">
          Chọn đúng nhóm hỗ trợ, nhập mô tả ngắn, sau đó gửi cho admin hoặc staff ngay tại đây.
        </div>
      </div>

      <div className="nasa-assistant-chip-grid">
        {CATEGORIES.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`nasa-assistant-chip ${selectedCategory?.key === item.key ? 'nasa-assistant-chip--active' : ''}`}
            onClick={() => setSelectedCategory(item)}
          >
            <div>
              <div className="nasa-assistant-chip__label">{item.label}</div>
              <div className="nasa-assistant-chip__hint">{item.hint}</div>
            </div>
            <ChevronRight className="h-4 w-4" />
          </button>
        ))}
      </div>

      <div className="nasa-assistant-card">
        <div className="nasa-assistant-card__title">{selectedCategory?.label || 'Mô tả vấn đề'}</div>
        <div className="nasa-assistant-card__text">
          {selectedCategory?.question || 'Bạn mô tả ngắn gọn vấn đề để mình chuyển đúng người xử lý nhé.'}
        </div>
        <textarea
          value={ticketDraft}
          onChange={(event) => setTicketDraft(event.target.value)}
          className="nasa-assistant-ticket-textarea"
          placeholder="Ví dụ: Thanh toán bị trừ tiền nhưng chưa thấy vé trong tài khoản..."
        />
        <div className="nasa-assistant-card__actions nasa-assistant-card__actions--left">
          <button
            type="button"
            className="nasa-assistant-mini-btn nasa-assistant-mini-btn--primary"
            onClick={submitTicket}
            disabled={!ticketDraft.trim()}
          >
            Gửi ticket
          </button>
          <button
            type="button"
            className="nasa-assistant-mini-btn"
            onClick={() => requestLiveSupport()}
            disabled={!liveAvailability?.anyOnline}
          >
            Gọi staff online
          </button>
          <button
            type="button"
            className="nasa-assistant-mini-btn"
            onClick={() => {
              setSelectedCategory(null);
              setTicketDraft('');
              setPanelView(null);
            }}
          >
            Quay lại bot
          </button>
        </div>
      </div>
    </div>
  );

  const renderThreadPanel = () => {
    if (!activeTicket?.ticketCode) {
      return (
        <div className="nasa-assistant-support-stack">
          <div className="nasa-assistant-card">
            <div className="nasa-assistant-card__title">Chat hỗ trợ</div>
            <div className="nasa-assistant-card__text">
              Khung này chỉ hiện cuộc trò chuyện hỗ trợ với admin/staff. Khi chưa có ticket, bạn có thể tạo mới hoặc mở ticket gần nhất.
            </div>
            <div className="nasa-assistant-live-badges">
              <span className={`nasa-assistant-live-badge ${liveAvailability?.anyOnline ? 'nasa-assistant-live-badge--online' : 'nasa-assistant-live-badge--offline'}`}>
                {liveAvailability?.anyOnline ? 'Staff/Admin online' : 'Chưa có staff online'}
              </span>
              {(liveAvailability?.agents || []).slice(0, 2).map((agent) => (
                <span key={agent.email || agent.name} className="nasa-assistant-live-badge">
                  {agent.name || agent.email}
                </span>
              ))}
            </div>
            <div className="nasa-assistant-card__actions nasa-assistant-card__actions--left">
              <button
                type="button"
                className="nasa-assistant-mini-btn nasa-assistant-mini-btn--primary"
                onClick={() => openCreatePanel(selectedCategory?.key || '', ticketDraft)}
              >
                Tạo ticket
              </button>
              {myTickets.length > 0 ? (
                <button
                        type="button"
                        className="nasa-assistant-mini-btn"
                        onClick={() => openTicketThread(myTickets[0].ticketCode)}
                      >
                        Mở ticket gần nhất
                </button>
              ) : null}
              <button
                type="button"
                className="nasa-assistant-mini-btn"
                onClick={async () => {
                  await loadMyTickets();
                  setPanelView(SUPPORT_VIEWS.TICKETS);
                }}
              >
                Danh sách ticket
              </button>
            </div>
          </div>

          {nasaBotRuntime.shortcuts.slice(0, 4).length > 0 ? (
            <div className="nasa-assistant-shortcut-grid">
              {nasaBotRuntime.shortcuts.slice(0, 4).map((shortcut) => (
                <button
                  key={shortcut.shortcutName || shortcut.buttonName}
                  type="button"
                  className="nasa-assistant-shortcut"
                  onClick={() => handleRuntimeShortcut(shortcut)}
                >
                  <span className="nasa-assistant-shortcut__icon">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <span className="nasa-assistant-shortcut__content">
                    <span className="nasa-assistant-shortcut__label">{shortcut.buttonName}</span>
                    <span className="nasa-assistant-shortcut__desc">{shortcut.description}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 nasa-assistant-shortcut__arrow" />
                </button>
              ))}
            </div>
          ) : null}

          {recentTickets.length > 0 ? (
            <div className="nasa-assistant-ticket-list">
              {recentTickets.map((item) => (
                <button
                  key={item.ticketCode}
                  type="button"
                  className="nasa-assistant-ticket-card"
                  onClick={() => openTicketThread(item.ticketCode)}
                >
                  <div className="nasa-assistant-ticket-card__head">
                    <strong>{item.ticketCode}</strong>
                    <span className={getTicketStatusMeta(item.status).className}>
                      {getTicketStatusMeta(item.status).label}
                    </span>
                  </div>
                  <p className="nasa-assistant-ticket-card__text">{item.lastMessage || item.description}</p>
                  <span className="nasa-assistant-ticket-card__meta">{formatTicketStamp(item.updatedAt || item.createdAt)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      );
    }

    const statusMeta = getTicketStatusMeta(activeTicket.status);

    return (
      <div className="nasa-assistant-support-stack">
        <div className="nasa-assistant-card">
          <div className="nasa-assistant-ticket-card__head">
            <strong>{activeTicket.ticketCode}</strong>
            <span className={statusMeta.className}>{statusMeta.label}</span>
          </div>
          <div className="nasa-assistant-card__text">
            {activeTicket.liveConnected
              ? `${activeTicket.assignedStaffName || activeTicket.assignedStaffEmail || 'Staff/Admin'} đang trao đổi trực tiếp với bạn.`
              : activeTicket.liveRequested
                ? 'Yêu cầu live support đã được gửi. Bạn vẫn có thể để lại tin nhắn trong lúc chờ nhận hỗ trợ.'
                : 'Đây là thread ticket với admin/staff, tách riêng khỏi phần chat bot bên trên.'}
          </div>
          <div className="nasa-assistant-card__actions nasa-assistant-card__actions--left">
            <button type="button" className="nasa-assistant-mini-btn" onClick={() => setPanelView(SUPPORT_VIEWS.TICKETS)}>
              Quay lại danh sách ticket
            </button>
            {!activeTicket.liveRequested && `${activeTicket.status || ''}`.toUpperCase() !== 'DONE' ? (
              <button
                type="button"
                className="nasa-assistant-mini-btn"
                onClick={() => requestLiveSupport({
                  category: activeTicket.category,
                  description: activeTicket.description,
                })}
                disabled={!liveAvailability?.anyOnline}
              >
                Gọi staff online
              </button>
            ) : null}
          </div>
        </div>

        {ticketMessages.length === 0 ? (
          <div className="nasa-assistant-empty-state">
            <div className="nasa-assistant-empty-state__title">Thread này chưa có tin nhắn</div>
            <div className="nasa-assistant-empty-state__text">
              Bạn có thể nhắn với admin/staff bằng cách chuyển ô nhập sang chế độ ticket.
            </div>
          </div>
        ) : (
          <div className="nasa-assistant-thread" ref={supportScrollRef}>
            {ticketMessages.map((item) => {
              const agentMessage = isAgentMessage(item.senderRole);
              return (
                <div
                  key={item.uuid}
                  className={`nasa-assistant-msg ${agentMessage ? 'nasa-assistant-msg--bot' : 'nasa-assistant-msg--user'}`}
                >
                  {agentMessage && (
                    <div className="nasa-assistant-avatar nasa-assistant-avatar--bot">
                      <img src={nasaLogo} alt="admin" />
                    </div>
                  )}
                  <div className={`nasa-assistant-bubble ${agentMessage ? 'nasa-assistant-bubble--bot' : 'nasa-assistant-bubble--user'}`}>
                    <div className="nasa-assistant-bubble__author">
                      {agentMessage ? (item.senderName || 'Admin/Staff') : (item.senderName || ownerLabel)}
                    </div>
                    {item.message}
                  </div>
                  <div className="nasa-assistant-time">{formatTime(item.createdAt ? new Date(item.createdAt) : new Date())}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderSupportPanel = () => {
    switch (panelView) {
      case SUPPORT_VIEWS.TICKETS:
        return renderTicketList();
      case SUPPORT_VIEWS.CREATE:
        return renderCreatePanel();
      default:
        return renderThreadPanel();
    }
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
                    <div className="nasa-assistant-subtitle">Chat với bot hoặc chuyển sang trung tâm hỗ trợ khi cần</div>
                  </div>
                </div>
              <div className="nasa-assistant-header-actions">
                <button
                  type="button"
                  className="nasa-assistant-icon-btn"
                  onClick={() => navigate('/profile', { state: { openSupportTab: true } })}
                >
                  <Ticket className="h-4 w-4" />
                </button>
                <button type="button" className="nasa-assistant-icon-btn" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className={`nasa-assistant-body ${isSupportFullView ? 'nasa-assistant-body--support-only' : 'nasa-assistant-body--chat-only'}`.trim()}>
              {isSupportFullView ? (
                <section className={`nasa-assistant-support-dock ${isCreatePanelActive ? 'nasa-assistant-support-dock--create' : ''}`.trim()}>
                  <div className="nasa-assistant-support-dock__head">
                    <div>
                      <div className="nasa-assistant-support-dock__title">Trung tâm hỗ trợ</div>
                      <div className="nasa-assistant-support-dock__status">{supportStatus}</div>
                    </div>
                    <div className="nasa-assistant-support-tabs">
                      <button
                        type="button"
                        className={`nasa-assistant-support-tab ${panelView === SUPPORT_VIEWS.TICKETS ? 'nasa-assistant-support-tab--active' : ''}`}
                        onClick={async () => {
                          await loadMyTickets();
                          setPanelView(SUPPORT_VIEWS.TICKETS);
                        }}
                      >
                        Ticket
                      </button>
                      <button
                        type="button"
                        className={`nasa-assistant-support-tab ${panelView !== SUPPORT_VIEWS.TICKETS && panelView !== SUPPORT_VIEWS.CREATE ? 'nasa-assistant-support-tab--active' : ''}`}
                        onClick={() => {
                          setPanelView(SUPPORT_VIEWS.THREAD);
                          if (activeTicket?.ticketCode) {
                            setInputTarget(INPUT_TARGETS.TICKET);
                          }
                        }}
                      >
                        Chat admin/staff
                      </button>
                    </div>
                  </div>

                  <div className="nasa-assistant-support-dock__body">
                    {renderSupportPanel()}
                  </div>
                </section>
              ) : (
                <section className="nasa-assistant-bot-stage">
                  <div className="nasa-assistant-thread nasa-assistant-thread--bot" ref={botScrollRef}>
                    {messages.map(renderBotMessage)}
                    {typing && (
                      <div className="nasa-assistant-msg nasa-assistant-msg--bot">
                        <div className="nasa-assistant-avatar nasa-assistant-avatar--bot">
                          <img src={nasaLogo} alt="bot" />
                        </div>
                        <div className="nasa-assistant-bubble nasa-assistant-bubble--bot nasa-assistant-bubble--typing">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>

            <footer className="nasa-assistant-footer">
              <div className="nasa-assistant-actions">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className="nasa-assistant-pill"
                      onClick={() => handleQuickAction(action.id)}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="nasa-assistant-composer-head">
                <button
                  type="button"
                  className={`nasa-assistant-composer-target ${inputTarget === INPUT_TARGETS.BOT ? 'nasa-assistant-composer-target--active' : ''}`}
                  onClick={() => {
                    setInputTarget(INPUT_TARGETS.BOT);
                    setPanelView(null);
                  }}
                >
                  <Bot className="h-4 w-4" />
                  <span>Bot</span>
                </button>
                <button
                  type="button"
                  className={`nasa-assistant-composer-target ${inputTarget === INPUT_TARGETS.TICKET ? 'nasa-assistant-composer-target--active' : ''}`}
                  onClick={() => {
                    if (activeTicket?.ticketCode) {
                      setInputTarget(INPUT_TARGETS.TICKET);
                      setPanelView(SUPPORT_VIEWS.THREAD);
                    } else {
                      setPanelView(SUPPORT_VIEWS.TICKETS);
                    }
                  }}
                >
                  <Headset className="h-4 w-4" />
                  <span>Admin/Staff</span>
                </button>
                <span className="nasa-assistant-composer-hint">{supportStatus}</span>
              </div>

              <div className="nasa-assistant-inputbar">
                <button
                  type="button"
                  className="nasa-assistant-input-icon"
                  aria-label={inputTarget === INPUT_TARGETS.TICKET ? 'Đang nhắn ticket' : 'Đang chat với bot'}
                  onClick={() => {
                    if (activeTicket?.ticketCode) {
                      setInputTarget((prev) => {
                        const next = prev === INPUT_TARGETS.BOT ? INPUT_TARGETS.TICKET : INPUT_TARGETS.BOT;
                        setPanelView(next === INPUT_TARGETS.BOT ? null : SUPPORT_VIEWS.THREAD);
                        return next;
                      });
                    } else {
                      setPanelView(null);
                    }
                  }}
                >
                  {inputTarget === INPUT_TARGETS.TICKET ? <Headset className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </button>
                <div className="nasa-assistant-inputshell">
                  <MessageCircle className="h-4 w-4 text-slate-400" />
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={composerPlaceholder}
                    disabled={inputTarget === INPUT_TARGETS.TICKET && !canReplyToTicket}
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
                    disabled={!draft.trim() || (inputTarget === INPUT_TARGETS.TICKET && !canReplyToTicket)}
                    onClick={handleComposerSend}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {panelView === SUPPORT_VIEWS.THREAD && showSatisfactionPrompt && (
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
