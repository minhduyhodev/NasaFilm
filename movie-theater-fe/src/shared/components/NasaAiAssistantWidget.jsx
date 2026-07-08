import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, ChevronRight, Headset, MessageCircle, Mic, Send, Sparkles, Star, Ticket, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../features/auth/hooks/useAuthContext';
import { notificationService } from '../services/notificationService';
import { supportService } from '../services/supportService';
import { systemConfigService } from '../services/systemConfigService';
import { REALTIME_TOPICS } from '../constants/realtimeTopics';
import { useRealtimeTopic } from '../hooks/useRealtimeTopic';
import tokenService from '../../features/auth/utils/tokenService';
import nasaLogo from '../assets/NASAFILM.jpg';
import nasaAssistantFabAvatar from '../assets/nasa-assistant-avatar-head.jpg';
import './NasaAiAssistantWidget.css';

const CATEGORIES = [
  {
    key: 'ticket',
    label: 'Vé / suất chiếu',
    hint: 'Mã vé, suất chiếu, ghế, hoàn/đổi',
    question: 'Bạn đang cần hỗ trợ gì về vé hoặc suất chiếu?',
    followUps: ['Mã vé hoặc mã đơn', 'Suất chiếu / thời gian đặt', 'Rạp chiếu'],
  },
  {
    key: 'payment',
    label: 'Thanh toán',
    hint: 'Giao dịch lỗi, trừ tiền, hoàn tiền',
    question: 'Bạn gặp vấn đề gì ở thanh toán?',
    followUps: ['Mã giao dịch', 'Số tiền', 'Phương thức thanh toán'],
  },
  {
    key: 'account',
    label: 'Tài khoản',
    hint: 'Đăng nhập, OTP, mật khẩu',
    question: 'Bạn gặp lỗi gì ở tài khoản?',
    followUps: ['Username', 'Email đang dùng', 'Mô tả lỗi đăng nhập'],
  },
  {
    key: 'promo',
    label: 'Khuyến mãi',
    hint: 'Voucher, ưu đãi, combo',
    question: 'Bạn cần hỗ trợ chương trình khuyến mãi nào?',
    followUps: ['Mã voucher', 'Tên chương trình', 'Mô tả vấn đề'],
  },
  {
    key: 'membership',
    label: 'Hội viên',
    hint: 'Điểm thưởng, hạng thành viên',
    question: 'Bạn đang gặp vấn đề gì ở hội viên?',
    followUps: ['Mã hội viên', 'Vấn đề cần xử lý'],
  },
  {
    key: 'other',
    label: 'Khác',
    hint: 'Vấn đề chưa nằm trong nhóm trên',
    question: 'Bạn mô tả ngắn gọn giúp mình nhé.',
    followUps: ['Mô tả vấn đề'],
  },
];

const QUICK_ACTIONS = ['Tạo ticket', 'Xem ticket của tôi'];

const formatTime = (value = new Date()) =>
  new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(value);

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
  if (/(thanh toan|payment|giao dich|tra tien|trừ tiền|tru tien)/.test(value)) return 'payment';
  if (/(tai khoan|account|dang nhap|login|otp|mat khau|username)/.test(value)) return 'account';
  if (/(voucher|khuyen mai|promo|uu dai|combo)/.test(value)) return 'promo';
  if (/(hoi vien|membership|diem|vip)/.test(value)) return 'membership';
  return 'other';
};

const initialMessages = () => ([
  {
    id: 'welcome',
    role: 'bot',
    type: 'text',
    text: `${getGreeting()}, mình là NASA BOT.`,
    time: formatTime(),
  },
]);

const getOwnerLabel = (user) => user?.fullName || user?.email || 'Tài khoản của bạn';
const hasAdminAccess = (user) => {
  const roles = (user?.roles || []).map((role) => `${role}`.toLowerCase());
  return roles.includes('admin') || roles.includes('staff');
};

const DEFAULT_NASA_BOT_RUNTIME = {
  openingQuestions: [
    'Tạo ticket hỗ trợ',
    'Thanh toán bị lỗi',
    'Không đăng nhập được',
    'Xem tình trạng ticket',
  ],
  shortcuts: [
    { buttonName: 'Vé / suất chiếu', description: 'Hỗ trợ mã vé, mã đơn, suất chiếu, ghế, đổi hoặc hoàn vé', queryContent: 'Tôi cần hỗ trợ về vé hoặc suất chiếu.' },
    { buttonName: 'Thanh toán', description: 'Hỗ trợ giao dịch lỗi, bị trừ tiền, chưa nhận vé, hoàn tiền', queryContent: 'Tôi cần hỗ trợ về thanh toán.' },
    { buttonName: 'Tài khoản', description: 'Hỗ trợ đăng nhập, OTP, mật khẩu, lỗi tài khoản', queryContent: 'Tôi không đăng nhập được và cần hỗ trợ tài khoản.' },
    { buttonName: 'Khuyến mãi', description: 'Hỗ trợ voucher, combo, ưu đãi, mã giảm giá', queryContent: 'Tôi cần hỗ trợ về voucher hoặc khuyến mãi.' },
    { buttonName: 'Hội viên', description: 'Hỗ trợ điểm thưởng, hạng thành viên, quyền lợi hội viên', queryContent: 'Tôi cần hỗ trợ về hội viên và điểm thưởng.' },
    { buttonName: 'Mô tả vấn đề khác', description: 'Gửi mô tả ngắn cho các vấn đề chưa thuộc nhóm có sẵn', queryContent: 'Tôi có một vấn đề khác và cần được hỗ trợ.' },
  ],
};

const resolveSupportErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const SATISFACTION_OPTIONS = [
  { value: 1, label: 'Rat te' },
  { value: 2, label: 'Chua hai long' },
  { value: 3, label: 'Binh thuong' },
  { value: 4, label: 'Hai long' },
  { value: 5, label: 'Rat hai long' },
];

const NasaAiAssistantWidget = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const scrollRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [stage, setStage] = useState('category');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [answers, setAnswers] = useState({});
  const [ticket, setTicket] = useState(null);
  const [myTickets, setMyTickets] = useState([]);
  const [activeTicketCode, setActiveTicketCode] = useState('');
  const [ticketMessages, setTicketMessages] = useState([]);
  const [liveAvailability, setLiveAvailability] = useState({ anyOnline: false, agents: [] });
  const [mode, setMode] = useState('chat');
  const [createStep, setCreateStep] = useState('category');
  const [nasaBotRuntime, setNasaBotRuntime] = useState(DEFAULT_NASA_BOT_RUNTIME);
  const [showSatisfactionPrompt, setShowSatisfactionPrompt] = useState(false);
  const closeHoverTimerRef = useRef(null);

  const ownerLabel = useMemo(() => getOwnerLabel(user || tokenService.getUser()), [user]);
  const isAdminUser = useMemo(() => hasAdminAccess(user || tokenService.getUser()), [user]);
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
    if (typing) return 'Đang xử lý...';
    if (mode === 'create') {
      if (createStep === 'category') return 'Đang chọn danh mục';
      if (createStep === 'description') return 'Đang chờ mô tả';
      if (createStep === 'confirm') return 'Chốt ticket trước khi gửi';
      if (createStep === 'sending') return 'Đang gửi ticket';
    }
    if (mode === 'ticket') {
      if (activeTicket?.liveRequested && !activeTicket?.liveConnected) return 'Đang chờ staff nhận hỗ trợ';
      if (activeTicket?.liveConnected) return `Đang chat với ${activeTicket?.assignedStaffName || 'staff'}`;
      return 'Đang chat với admin';
    }
    if (mode === 'tickets') return 'Đang xem ticket của bạn';
    if (ticket?.status) return `Ticket ${ticket.status}`;
    return 'Sẵn sàng hỗ trợ';
  }, [activeTicket?.assignedStaffName, activeTicket?.liveConnected, activeTicket?.liveRequested, createStep, mode, ticket?.status, typing]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing, open]);

  useEffect(() => {
    let timerId = null;
    if (mode === 'ticket' && activeTicket?.status === 'DONE' && !activeTicket?.satisfactionRating) {
      timerId = window.setTimeout(() => {
        setShowSatisfactionPrompt(true);
      }, 1400);
    } else {
      setShowSatisfactionPrompt(false);
    }

    return () => {
      if (timerId) {
        window.clearTimeout(timerId);
      }
    };
  }, [activeTicket?.satisfactionRating, activeTicket?.status, mode]);

  useEffect(() => {
    if (!open) return;
    supportService.getLiveSupportAvailability()
      .then((data) => setLiveAvailability(data || { anyOnline: false, agents: [] }))
      .catch(() => setLiveAvailability({ anyOnline: false, agents: [] }));
  }, [open]);

  useEffect(() => {
    let active = true;

    const loadRuntimeConfig = async () => {
      try {
        const data = await systemConfigService.getConfig();
        if (!active) return;
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
        if (active) setNasaBotRuntime(DEFAULT_NASA_BOT_RUNTIME);
      }
    };

    loadRuntimeConfig();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    let active = true;
    systemConfigService.getConfig()
      .then((data) => {
        if (!active) return;
        const nasaBot = data?.nasaBot || {};
        setNasaBotRuntime({
          openingQuestions: Array.isArray(nasaBot.openingQuestions) && nasaBot.openingQuestions.length > 0
            ? nasaBot.openingQuestions
            : DEFAULT_NASA_BOT_RUNTIME.openingQuestions,
          shortcuts: Array.isArray(nasaBot.shortcuts) && nasaBot.shortcuts.length > 0
            ? nasaBot.shortcuts
            : DEFAULT_NASA_BOT_RUNTIME.shortcuts,
        });
      })
      .catch(() => {
        if (active) setNasaBotRuntime(DEFAULT_NASA_BOT_RUNTIME);
      });

    return () => {
      active = false;
    };
  }, [open]);

  useRealtimeTopic(REALTIME_TOPICS.SUPPORT_AGENTS, () => {
    supportService.getLiveSupportAvailability()
      .then((data) => setLiveAvailability(data || { anyOnline: false, agents: [] }))
      .catch(() => setLiveAvailability({ anyOnline: false, agents: [] }));
  });

  const pushMessage = (message) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, ...message, time: formatTime() }]);
  };

  const pushBot = (text, extra = {}) => pushMessage({ role: 'bot', type: 'text', text, ...extra });
  const pushUser = (text) => pushMessage({ role: 'user', type: 'text', text });

  const buildHistory = () => messages
    .filter((item) => item.type === 'text')
    .slice(-8)
    .map((item) => ({
      role: item.role === 'bot' ? 'assistant' : 'user',
      content: item.text,
    }));

  const botDelay = async (text, delay = 520, extra = {}) => {
    setTyping(true);
    await new Promise((resolve) => setTimeout(resolve, delay));
    pushBot(text, extra);
    setTyping(false);
  };

  const reset = () => {
    setMessages(initialMessages());
    setDraft('');
    setTyping(false);
    setStage('category');
    setSelectedCategory(null);
    setAnswers({});
    setTicket(null);
    setMyTickets([]);
    setActiveTicketCode('');
    setTicketMessages([]);
    setMode('chat');
    setCreateStep('category');
  };

  const clearHoverTimer = () => {
    if (closeHoverTimerRef.current) {
      window.clearTimeout(closeHoverTimerRef.current);
      closeHoverTimerRef.current = null;
    }
  };

  const openWidget = () => {
    clearHoverTimer();
    setOpen(true);
    reset();
  };

  const closeWidget = () => {
    clearHoverTimer();
    setOpen(false);
  };

  const startCategoryFlow = async (key) => {
    const category = CATEGORIES.find((item) => item.key === key) || CATEGORIES.at(-1);
    setSelectedCategory(category);
    setMode('create');
    setCreateStep('description');
    pushUser(category.label);
    await botDelay(category.question);
    setStage('describe');
  };

  const handleRuntimeShortcut = async (shortcut) => {
    const key = `${shortcut?.shortcutName || ''}`.replace('_support', '').trim();
    const mapped = CATEGORIES.find((item) => item.key === key)?.key || detectCategory(shortcut?.queryContent || shortcut?.buttonName || '');
    await startCategoryFlow(mapped);
  };

  const createFakeTicket = () => `SR-${Date.now().toString().slice(-7)}`;

  const submitTicket = async (categoryKey, descriptionText) => {
    setTyping(true);
    try {
      const response = await supportService.createSupportRequest({
        category: categoryKey || selectedCategory?.key || detectCategory(descriptionText),
        description: descriptionText || draft,
      });
      const code = response?.ticketCode || response?.code || createFakeTicket();
      setTicket({ code, status: response?.status || 'PENDING' });
      pushBot(
        `Ticket ${code} đã được tạo. Mình đã gửi hồ sơ này cho admin rồi.`,
        {
          type: 'card',
          title: 'Ticket đã tạo',
          text: `Người gửi: ${ownerLabel}. Trạng thái hiện tại: ${response?.status || 'Đang chờ xử lý'}.`,
          actions: [
            { label: 'Xem ticket của tôi', primary: true, onClick: () => navigate('/profile', { state: { openSupportTab: true } }) },
          ],
        },
      );
      notificationService.success('Đã tạo ticket.');
      setStage('done');
      setMode('tickets');
      await loadMyTickets();
    } catch (error) {
      const message = resolveSupportErrorMessage(error, 'Tạo ticket thất bại.');
      notificationService.error(message);
      pushBot(message);
    } finally {
      setTyping(false);
    }
  };

  const loadMyTickets = async () => {
    try {
      const list = await supportService.getMySupportRequests();
      setMyTickets(Array.isArray(list) ? list : []);
    } catch {
      setMyTickets([]);
    }
  };

  const openTicketThread = async (ticketCode) => {
    setActiveTicketCode(ticketCode);
    setMode('ticket');
    try {
      const [detail, list] = await Promise.all([
        supportService.getSupportRequest(ticketCode),
        supportService.getSupportMessages(ticketCode),
      ]);
      setTicket(detail || null);
      setTicketMessages(Array.isArray(list) ? list : []);
    } catch {
      setTicketMessages([]);
    }
  };

  useRealtimeTopic(
    activeTicketCode ? REALTIME_TOPICS.supportTicket(activeTicketCode) : null,
    async () => {
      if (!activeTicketCode) return;
      try {
        const [detail, list] = await Promise.all([
          supportService.getSupportRequest(activeTicketCode),
          supportService.getSupportMessages(activeTicketCode),
        ]);
        setTicket(detail || null);
        setTicketMessages(Array.isArray(list) ? list : []);
        await loadMyTickets();
      } catch {
        // ignore realtime refresh errors
      }
    },
  );

  const sendTicketReply = async () => {
    const value = draft.trim();
    if (!value || !activeTicketCode) return;
    setDraft('');
    pushUser(value);
    setTyping(true);
    try {
      await supportService.sendSupportMessage(activeTicketCode, { message: value });
      await openTicketThread(activeTicketCode);
    } finally {
      setTyping(false);
    }
  };

  const requestLiveSupport = async () => {
    const description = draft.trim() || 'Khách hàng cần hỗ trợ trực tiếp với admin hoặc staff.';
    const category = selectedCategory?.key || detectCategory(description);
    if (!liveAvailability?.anyOnline) {
      notificationService.info('Hiện chưa có admin hoặc staff online để hỗ trợ trực tiếp.');
      return;
    }
    setTyping(true);
    try {
      const response = await supportService.requestLiveSupport({ category, description });
      setDraft('');
      setTicket(response);
      setMyTickets((prev) => [response, ...prev.filter((item) => item.ticketCode !== response.ticketCode)]);
      setActiveTicketCode(response.ticketCode);
      setMode('ticket');
      pushMessage({
        role: 'bot',
        type: 'card',
        title: 'Đã gửi yêu cầu hỗ trợ trực tiếp',
        text: 'Yêu cầu của bạn đã được chuyển đến admin hoặc staff online. Cuộc trò chuyện realtime sẽ chỉ mở khi có người nhận hỗ trợ.',
      });
      await openTicketThread(response.ticketCode);
    } catch (error) {
      const message = resolveSupportErrorMessage(error, 'Không thể gửi yêu cầu hỗ trợ trực tiếp.');
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

  const handleSend = async () => {
    const value = draft.trim();
    if (!value) return;

    setDraft('');
    pushUser(value);

    try {
      const ai = await supportService.chatSupport({
        message: value,
        history: buildHistory(),
      });
      if (ai?.reply) {
        pushBot(ai.reply, ai?.suggestedCategory ? { type: 'text' } : {});
      }
      if (!selectedCategory && ai?.suggestedCategory) {
        const matched = CATEGORIES.find((item) => item.key === ai.suggestedCategory);
        if (matched) {
          setSelectedCategory(matched);
        }
      }
    } catch {
      // Fallback to local flow below
    }

    if (stage === 'category') {
      const detected = CATEGORIES.find((item) => item.key === detectCategory(value)) || CATEGORIES.at(-1);
      await startCategoryFlow(detected.key);
      return;
    }

    if (stage === 'followup') {
      const current = selectedCategory?.followUps?.length ? selectedCategory.followUps[Object.keys(answers).length] : null;
      if (current) {
        setAnswers((prev) => ({ ...prev, [current]: value }));
      }
      const nextIndex = Object.keys(answers).length + 1;
      const nextQuestion = selectedCategory?.followUps?.[nextIndex];
      if (nextQuestion) {
        await botDelay(nextQuestion);
        return;
      }
      setStage('describe');
      await botDelay('Mô tả ngắn gọn vấn đề của bạn giúp mình nhé.');
      return;
    }

    if (stage === 'describe') {
      await submitTicket(selectedCategory?.key || detectCategory(value), value);
      return;
    }

    if (stage === 'done') {
      await botDelay('Ticket đã tạo rồi. Nếu muốn mở ticket mới, bấm "Tạo ticket" nhé.');
      return;
    }
  };

  const handleQuickAction = async (action) => {
    if (action === 'Tạo ticket') {
      setOpen(true);
      setMode('create');
      setStage('category');
      setCreateStep('category');
      setSelectedCategory(null);
      setDraft('');
      await botDelay('Chọn nội dung hỗ trợ trước nhé.');
      return;
    }
    if (action === 'Xem ticket của tôi') {
      setOpen(true);
      await loadMyTickets();
      setMode('tickets');
      return;
    }
    if (action === 'Quay lại') {
      setMode('chat');
      return;
    }
    if (action === 'Thanh toán bị lỗi') {
      setOpen(true);
      setMode('create');
      setSelectedCategory(CATEGORIES.find((item) => item.key === 'payment'));
      setCreateStep('description');
      return;
    }
    if (action === 'Không đăng nhập được') {
      setOpen(true);
      setMode('create');
      setSelectedCategory(CATEGORIES.find((item) => item.key === 'account'));
      setCreateStep('description');
      return;
    }
    if (action === 'Hỗ trợ kỹ thuật') {
      setOpen(true);
      setMode('create');
      setStage('category');
      setCreateStep('category');
      setSelectedCategory(null);
      setDraft('');
      await botDelay('Chọn nội dung hỗ trợ trước nhé.');
      return;
    }
    if (action === 'Xem ưu đãi') {
      navigate('/offers');
      return;
    }
    if (action === 'Phim đang hot') {
      navigate('/movies');
      return;
    }
    if (action === 'Đặt vé nhanh') {
      navigate('/booking');
      return;
    }
  };

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  if (isAdminUser || shouldHideOnRoute || !portalTarget) return null;

  return createPortal(
      <>
        <div
          className={`nasa-assistant-fab-shell ${open ? 'nasa-assistant-fab-shell--hidden' : ''}`}
        >
          <button
            type="button"
            className="nasa-assistant-fab"
            aria-label="Mở NASA BOT"
            onClick={open ? closeWidget : openWidget}
          >
            <span className="nasa-assistant-fab-glow" />
            <img src={nasaAssistantFabAvatar} alt="NASA BOT" className="nasa-assistant-fab-avatar" />
          </button>
          <span className="nasa-assistant-fab-label">NASA Bot</span>
        </div>

        {open && (
          <div className="nasa-assistant-overlay">
            <button type="button" className="nasa-assistant-backdrop" aria-label="Đóng" onClick={closeWidget} />
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
                    <div className="nasa-assistant-subtitle">Trợ lý hỗ trợ tự động + ticket admin</div>
                  </div>
                </div>
                <div className="nasa-assistant-header-actions">
                  <button type="button" className="nasa-assistant-icon-btn" onClick={() => navigate('/profile', { state: { openSupportTab: true } })}>
                    <Ticket className="h-4 w-4" />
                  </button>
                  <button type="button" className="nasa-assistant-icon-btn" onClick={closeWidget}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <div className="nasa-assistant-body" ref={scrollRef}>
                {mode === 'tickets' ? (
                  <div className="nasa-assistant-thread">
                    <div className="nasa-assistant-card">
                      <div className="nasa-assistant-card__title">Ticket của tôi</div>
                      <div className="nasa-assistant-card__text">Chọn ticket để xem cuộc trò chuyện với admin ngay trong popup này.</div>
                      <div className="nasa-assistant-card__actions">
                        <button type="button" className="nasa-assistant-mini-btn" onClick={() => setMode('chat')}>Quay lại</button>
                      </div>
                    </div>
                    {myTickets.map((item) => (
                      <button
                        key={item.ticketCode}
                        type="button"
                        className="nasa-assistant-card text-left"
                        onClick={() => openTicketThread(item.ticketCode)}
                      >
                        <div className="nasa-assistant-card__title">{item.ticketCode}</div>
                        <div className="nasa-assistant-card__text">{item.category} · {item.status}</div>
                        <div className="nasa-assistant-card__text">{item.lastMessage || item.description}</div>
                      </button>
                    ))}
                  </div>
                ) : mode === 'chat' ? (
                  <div className="nasa-assistant-thread">
                    <div className="nasa-assistant-card">
                      <div className="nasa-assistant-card__title">NASA Bot hỗ trợ nhanh</div>
                      <div className="nasa-assistant-card__text">
                        {(nasaBotRuntime.openingQuestions || DEFAULT_NASA_BOT_RUNTIME.openingQuestions).join(' · ')}
                      </div>
                    </div>
                    <div className="nasa-assistant-chip-grid">
                      {(nasaBotRuntime.shortcuts || DEFAULT_NASA_BOT_RUNTIME.shortcuts).map((shortcut) => (
                        <button
                          key={shortcut.shortcutName}
                          type="button"
                          className="nasa-assistant-chip"
                          onClick={() => handleRuntimeShortcut(shortcut)}
                        >
                          <div>
                            <div className="nasa-assistant-chip__label">{shortcut.buttonName}</div>
                            <div className="nasa-assistant-chip__hint">{shortcut.description}</div>
                          </div>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                    <div className="nasa-assistant-card">
                      <div className="nasa-assistant-card__title">Chat trực tiếp với staff/admin</div>
                      <div className="nasa-assistant-card__text">
                        {liveAvailability?.anyOnline
                          ? `Hiện có ${liveAvailability.agents?.length || 0} staff/admin online. Bạn có thể gửi yêu cầu chat trực tiếp, nhưng khung chat realtime chỉ mở khi có người nhận hỗ trợ.`
                          : 'Hiện chưa có staff/admin online. Bạn vẫn có thể tạo ticket để được phản hồi sau.'}
                      </div>
                      <div className="nasa-assistant-live-badges">
                        <span className={`nasa-assistant-live-badge ${liveAvailability?.anyOnline ? 'nasa-assistant-live-badge--online' : 'nasa-assistant-live-badge--offline'}`}>
                          {liveAvailability?.anyOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      <div className="nasa-assistant-card__actions">
                        <button
                          type="button"
                          className="nasa-assistant-mini-btn nasa-assistant-mini-btn--primary"
                          onClick={requestLiveSupport}
                          disabled={!liveAvailability?.anyOnline}
                        >
                          <Headset className="h-4 w-4" />
                          Chat với staff/admin
                        </button>
                      </div>
                    </div>
                  </div>
                ) : mode === 'create' ? (
                  <div className="nasa-assistant-thread">
                    <div className="nasa-assistant-card">
                      <div className="nasa-assistant-card__title">Chọn nội dung hỗ trợ</div>
                      <div className="nasa-assistant-card__text">Chọn đúng hạng mục trước, sau đó mình mới hỏi mô tả và chốt ticket.</div>
                    </div>
                    {createStep === 'category' && (
                      <div className="nasa-assistant-chip-grid">
                        {CATEGORIES.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            className="nasa-assistant-chip"
                            onClick={() => {
                              setSelectedCategory(item);
                              setCreateStep('description');
                              setDraft('');
                              setMessages((prev) => [...prev, {
                                id: `${Date.now()}-${prev.length}`,
                                role: 'bot',
                                type: 'text',
                                text: `Vui lòng nhập mô tả cho mục "${item.label}".`,
                                time: formatTime(),
                              }]);
                            }}
                          >
                            <div>
                              <div className="nasa-assistant-chip__label">{item.label}</div>
                              <div className="nasa-assistant-chip__hint">{item.hint}</div>
                            </div>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        ))}
                      </div>
                    )}
                    {createStep === 'description' && (
                      <div className="nasa-assistant-card">
                        <div className="nasa-assistant-card__title">Vui lòng nhập mô tả</div>
                        <div className="nasa-assistant-card__text">{selectedCategory?.question || 'Mô tả ngắn gọn vấn đề của bạn nhé.'}</div>
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          className="w-full min-h-24 resize-none rounded-xl border border-white/10 bg-[#0a0d16] px-4 py-3 text-sm text-white outline-none"
                          placeholder="Ví dụ: Thanh toán bị trừ tiền nhưng chưa thấy vé..."
                        />
                        <div className="nasa-assistant-card__actions">
                          <button type="button" className="nasa-assistant-mini-btn" onClick={() => setCreateStep('category')}>Sửa danh mục</button>
                          <button
                            type="button"
                            className="nasa-assistant-mini-btn nasa-assistant-mini-btn--primary"
                            onClick={() => {
                              if (!draft.trim()) return;
                              setCreateStep('confirm');
                              setMessages((prev) => [...prev, {
                                id: `${Date.now()}-${prev.length}`,
                                role: 'bot',
                                type: 'card',
                                title: 'Xác nhận ticket',
                                text: `Mình sẽ gửi ticket với nội dung: "${draft.trim()}". Bạn xác nhận Yes hay No?`,
                                time: formatTime(),
                              }]);
                            }}
                            disabled={!draft.trim()}
                          >
                            Tiếp tục
                          </button>
                        </div>
                      </div>
                    )}
                    {createStep === 'confirm' && (
                      <div className="nasa-assistant-card">
                        <div className="nasa-assistant-card__title">Chốt lại thông tin</div>
                        <div className="nasa-assistant-card__text">
                          Danh mục: <strong>{selectedCategory?.label}</strong>
                          <br />
                          Mô tả: {draft}
                        </div>
                        <div className="nasa-assistant-card__actions">
                          <button type="button" className="nasa-assistant-mini-btn" onClick={() => setCreateStep('description')}>
                            No, sửa lại
                          </button>
                          <button
                            type="button"
                            className="nasa-assistant-mini-btn nasa-assistant-mini-btn--primary"
                            onClick={async () => {
                              setCreateStep('sending');
                              await submitTicket(selectedCategory?.key, draft);
                            }}
                            disabled={!selectedCategory || !draft.trim()}
                          >
                            Yes, gửi cho admin
                          </button>
                        </div>
                      </div>
                    )}
                    {createStep === 'sending' && (
                      <div className="nasa-assistant-card">
                        <div className="nasa-assistant-card__title">Đang gửi ticket</div>
                        <div className="nasa-assistant-card__text">Mình đang chuyển ticket sang admin, bạn chờ một chút nhé.</div>
                      </div>
                    )}
                  </div>
                ) : mode === 'ticket' ? (
                  <div className="nasa-assistant-thread">
                    <button type="button" className="nasa-assistant-pill w-fit" onClick={() => setMode('tickets')}>
                      ← Quay lại danh sách ticket
                    </button>
                    {activeTicket?.liveConnected && (
                      <div className="nasa-assistant-card">
                        <div className="nasa-assistant-card__title">Đang hỗ trợ bởi staff/admin</div>
                        <div className="nasa-assistant-card__text">
                          {activeTicket.assignedStaffName || activeTicket.assignedStaffEmail || 'Nhân viên hỗ trợ'} đang trao đổi trực tiếp với bạn.
                        </div>
                      </div>
                    )}
                    {activeTicket?.liveRequested && !activeTicket?.liveConnected && (
                      <div className="nasa-assistant-card">
                        <div className="nasa-assistant-card__title">Đang chờ staff/admin nhận hỗ trợ</div>
                        <div className="nasa-assistant-card__text">
                          Bạn đã gửi yêu cầu chat trực tiếp. Khi một staff/admin online bấm nhận hỗ trợ, cuộc trò chuyện realtime sẽ mở tại đây.
                        </div>
                      </div>
                    )}
                    {ticketMessages.map((item) => (
                      <div
                        key={item.uuid}
                        className={`nasa-assistant-msg ${item.senderRole === 'ADMIN' ? 'nasa-assistant-msg--bot' : 'nasa-assistant-msg--user'}`}
                      >
                        {item.senderRole === 'ADMIN' && (
                          <div className="nasa-assistant-avatar nasa-assistant-avatar--bot">
                            <img src={nasaLogo} alt="admin" />
                          </div>
                        )}
                        <div className={`nasa-assistant-bubble ${item.senderRole === 'ADMIN' ? 'nasa-assistant-bubble--bot' : 'nasa-assistant-bubble--user'}`}>
                          {item.message}
                        </div>
                        <div className="nasa-assistant-time">{formatTime(item.createdAt ? new Date(item.createdAt) : new Date())}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                <div className="nasa-assistant-thread">
                  {messages.map((message) => (
                    message.type === 'card' ? (
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
                    ) : (
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
                    )
                  ))}
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
                )}

                {mode === 'chat' && stage === 'category' && (
                  <div className="nasa-assistant-chip-grid">
                    {CATEGORIES.map((item) => (
                      <button key={item.key} type="button" className="nasa-assistant-chip" onClick={() => startCategoryFlow(item.key)}>
                        <div>
                          <div className="nasa-assistant-chip__label">{item.label}</div>
                          <div className="nasa-assistant-chip__hint">{item.hint}</div>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                  ))}
                </div>
                )}
              </div>
              <footer className="nasa-assistant-footer">
                {mode === 'chat' && (
                  <div className="nasa-assistant-actions">
                    {(supportStatus.includes('Ticket') ? ['Xem ticket của tôi', 'Tạo ticket', 'Không đăng nhập được'] : QUICK_ACTIONS).map((action) => (
                      <button
                        key={action}
                        type="button"
                        className="nasa-assistant-pill"
                        onClick={() => handleQuickAction(action)}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}

                <div className="nasa-assistant-inputbar">
                  <button type="button" className="nasa-assistant-input-icon" aria-label="voice">
                    <Mic className="h-4 w-4" />
                  </button>
                  <div className="nasa-assistant-inputshell">
                    <MessageCircle className="h-4 w-4 text-slate-400" />
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={
                        mode === 'ticket'
                          ? (activeTicket?.liveRequested && !activeTicket?.liveConnected
                            ? 'Đang chờ staff/admin nhận hỗ trợ...'
                            : 'Nhắn với admin...')
                          : mode === 'create'
                            ? 'Nhập mô tả ngắn...'
                            : 'Nhập yêu cầu của bạn...'
                      }
                      disabled={mode === 'ticket' && activeTicket?.liveRequested && !activeTicket?.liveConnected}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (mode === 'ticket') sendTicketReply();
                          else if (mode === 'create' && createStep === 'description') {
                            if (!draft.trim()) return;
                            setCreateStep('confirm');
                            setMessages((prev) => [...prev, {
                              id: `${Date.now()}-${prev.length}`,
                              role: 'bot',
                              type: 'card',
                              title: 'Xác nhận ticket',
                              text: `Mình sẽ gửi ticket với nội dung: "${draft.trim()}". Bạn xác nhận Yes hay No?`,
                              time: formatTime(),
                            }]);
                          }
                          else handleSend();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="nasa-assistant-send"
                      disabled={mode === 'ticket' && activeTicket?.liveRequested && !activeTicket?.liveConnected}
                      onClick={
                        mode === 'ticket'
                          ? sendTicketReply
                          : mode === 'create' && createStep === 'description'
                            ? () => {
                              if (!draft.trim()) return;
                              setCreateStep('confirm');
                              setMessages((prev) => [...prev, {
                                id: `${Date.now()}-${prev.length}`,
                                role: 'bot',
                                type: 'card',
                                title: 'Xác nhận ticket',
                                text: `Mình sẽ gửi ticket với nội dung: "${draft.trim()}". Bạn xác nhận Yes hay No?`,
                                time: formatTime(),
                              }]);
                            }
                            : mode === 'create' && createStep === 'confirm'
                              ? async () => {
                                setCreateStep('sending');
                                await submitTicket(selectedCategory?.key, draft);
                              }
                              : handleSend
                      }
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                  {mode === 'ticket' && showSatisfactionPrompt && (
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
