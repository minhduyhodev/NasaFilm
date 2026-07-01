import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, ChevronRight, MessageCircle, Mic, Send, Sparkles, Ticket, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../features/auth/hooks/useAuthContext';
import { notificationService } from '../services/notificationService';
import { supportService } from '../services/supportService';
import tokenService from '../../features/auth/utils/tokenService';
import nasaLogo from '../assets/NASAFILM.jpg';
import nasaAssistantSide from '../assets/nasa-assistant-hero.png';
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

const QUICK_ACTIONS = [
  'Tạo ticket',
  'Xem ticket của tôi',
  'Thanh toán bị lỗi',
  'Không đăng nhập được',
];

const COMBO_PROMO_STORAGE_KEY = 'nasafilm.promo.combo';
const MOVIE_PROMO_STORAGE_KEY = 'nasafilm.promo.movie';

const HOME_SHORTCUTS = [
  { label: 'Combo bắp nước', icon: '🍿' },
  { label: 'Đặt vé nhanh', icon: '🎟️' },
  { label: 'Phim hot', icon: '🔥' },
  { label: 'Hỗ trợ kỹ thuật', icon: '🛠️' },
];

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
const RECENT_CINEMAS = [
  { label: 'Rạp Landmark 81', href: '/cinemas' },
  { label: 'Rạp City Center', href: '/cinemas' },
];

const getStoredPromo = (storageKey, fallback) => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed?.title && !parsed?.description) return fallback;
    return {
      title: parsed.title || fallback.title,
      description: parsed.description || fallback.description,
      ctaLabel: parsed.ctaLabel || fallback.ctaLabel,
      href: parsed.href || fallback.href,
      tone: parsed.tone || fallback.tone,
      badge: parsed.badge || fallback.badge,
    };
  } catch {
    return fallback;
  }
};

const COMBO_PROMO_DEFAULT = {
  title: 'Combo bắp nước hôm nay',
  description: 'Ưu đãi combo bắp nước, nước ngọt và snack đang mở bán trong khung giờ này.',
  ctaLabel: 'Xem combo',
  href: '/offers',
  tone: 'combo',
  badge: 'Bắp nước',
};

const MOVIE_PROMO_DEFAULT = {
  title: 'Phim hot sắp chiếu',
  description: 'Bài đăng từ admin về phim nổi bật, suất chiếu sớm và các tin đáng chú ý cho người xem.',
  ctaLabel: 'Xem phim hot',
  href: '/movies',
  tone: 'movie',
  badge: 'Phim hot',
};

const NasaAiAssistantWidget = () => {
  const navigate = useNavigate();
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
  const [mode, setMode] = useState('home');
  const [createStep, setCreateStep] = useState('category');
  const [comboPromo, setComboPromo] = useState(() => getStoredPromo(COMBO_PROMO_STORAGE_KEY, COMBO_PROMO_DEFAULT));
  const [moviePromo, setMoviePromo] = useState(() => getStoredPromo(MOVIE_PROMO_STORAGE_KEY, MOVIE_PROMO_DEFAULT));
  const closeHoverTimerRef = useRef(null);

  const ownerLabel = useMemo(() => getOwnerLabel(user || tokenService.getUser()), [user]);
  const isAdminUser = useMemo(() => hasAdminAccess(user || tokenService.getUser()), [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing, open]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const syncComboPromo = () => setComboPromo(getStoredPromo(COMBO_PROMO_STORAGE_KEY, COMBO_PROMO_DEFAULT));
    const syncMoviePromo = () => setMoviePromo(getStoredPromo(MOVIE_PROMO_STORAGE_KEY, MOVIE_PROMO_DEFAULT));
    const onStorage = (event) => {
      if (event.key === COMBO_PROMO_STORAGE_KEY) syncComboPromo();
      if (event.key === MOVIE_PROMO_STORAGE_KEY) syncMoviePromo();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('nasafilm-combo-promo', syncComboPromo);
    window.addEventListener('nasafilm-movie-promo', syncMoviePromo);
    syncComboPromo();
    syncMoviePromo();
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('nasafilm-combo-promo', syncComboPromo);
      window.removeEventListener('nasafilm-movie-promo', syncMoviePromo);
    };
  }, []);

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
    setMode('home');
    setCreateStep('category');
  };

  const openWidget = () => {
    if (closeHoverTimerRef.current) {
      window.clearTimeout(closeHoverTimerRef.current);
      closeHoverTimerRef.current = null;
    }
    setOpen(true);
    reset();
  };

  const closeWidget = () => {
    if (closeHoverTimerRef.current) {
      window.clearTimeout(closeHoverTimerRef.current);
      closeHoverTimerRef.current = null;
    }
    setOpen(false);
  };

  const scheduleCloseWidget = () => {
    if (closeHoverTimerRef.current) {
      window.clearTimeout(closeHoverTimerRef.current);
    }
    closeHoverTimerRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 60);
  };

  const startCategoryFlow = async (key) => {
    const category = CATEGORIES.find((item) => item.key === key) || CATEGORIES.at(-1);
    setSelectedCategory(category);
    pushUser(category.label);
    await botDelay(category.question);
    setStage('followup');
    await botDelay(category.followUps[0]);
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
      notificationService.error(error?.response?.data?.message || 'Tạo ticket thất bại.');
      pushBot('Mình chưa tạo được ticket lúc này, bạn thử lại giúp mình nhé.');
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
      const list = await supportService.getSupportMessages(ticketCode);
      setTicketMessages(Array.isArray(list) ? list : []);
    } catch {
      setTicketMessages([]);
    }
  };

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
      closeWidget();
      setMode('home');
      return;
    }
    if (action === 'Thanh toán bị lỗi') {
      closeWidget();
      setStage('category');
      await startCategoryFlow('payment');
      return;
    }
    if (action === 'Không đăng nhập được') {
      closeWidget();
      setStage('category');
      await startCategoryFlow('account');
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
  if (isAdminUser || !portalTarget) return null;

  return createPortal(
      <>
        <div
          className="nasa-assistant-fab-shell"
          onMouseEnter={openWidget}
          onMouseLeave={scheduleCloseWidget}
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
          <div
            className="nasa-assistant-overlay"
            onMouseEnter={() => {
              if (closeHoverTimerRef.current) {
                window.clearTimeout(closeHoverTimerRef.current);
                closeHoverTimerRef.current = null;
              }
            }}
            onMouseLeave={scheduleCloseWidget}
          >
            <button type="button" className="nasa-assistant-backdrop" aria-label="Đóng" onClick={closeWidget} />
            <section
              className="nasa-assistant-panel"
              role="dialog"
              aria-modal="true"
              aria-label="NASA BOT"
              onMouseEnter={() => {
                if (closeHoverTimerRef.current) {
                  window.clearTimeout(closeHoverTimerRef.current);
                  closeHoverTimerRef.current = null;
                }
              }}
              onMouseLeave={scheduleCloseWidget}
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
                {mode === 'home' ? (
                  <div className="nasa-assistant-home-grid">
                    <aside className="nasa-assistant-sidebar">
                      <div className="nasa-assistant-sidebar__hero">
                        <div className="nasa-assistant-sidebar__title">Trợ Lý Thông Minh</div>
                        <div className="nasa-assistant-sidebar__text">
                          Tôi có thể giúp bạn đặt vé, tìm kiếm phim hot nhất hoặc giải đáp các thắc mắc về rạp chiếu NASAFilm.
                        </div>
                      </div>

                      <div className="nasa-assistant-promo-stack">
                        <button
                          type="button"
                          className="nasa-assistant-card nasa-assistant-promo-card nasa-assistant-promo-card--combo"
                          onClick={() => {
                            closeWidget();
                            if (comboPromo?.href) {
                              navigate(comboPromo.href);
                            }
                          }}
                        >
                          <div className="nasa-assistant-promo-card__badge">{comboPromo?.badge || 'Bắp nước'}</div>
                          <div className="nasa-assistant-card__title nasa-assistant-promo-card__title">{comboPromo?.title}</div>
                          <div className="nasa-assistant-card__text nasa-assistant-promo-card__text">{comboPromo?.description}</div>
                          <div className="nasa-assistant-card__actions">
                            <span className="nasa-assistant-mini-btn nasa-assistant-mini-btn--primary">{comboPromo?.ctaLabel || 'Xem combo'}</span>
                          </div>
                        </button>

                        <div className="nasa-assistant-shortcut-grid">
                          {HOME_SHORTCUTS.map((item) => (
                            <button
                              key={item.label}
                              type="button"
                              className="nasa-assistant-shortcut"
                              onClick={() => {
                                if (item.label === 'Đặt vé nhanh') {
                                  navigate('/');
                                  return;
                                }
                                if (item.label === 'Phim hot') {
                                  navigate('/movies');
                                  return;
                                }
                                if (item.label === 'Combo bắp nước') {
                                  navigate('/offers');
                                  return;
                                }
                                handleQuickAction(item.label);
                              }}
                            >
                              <span className="nasa-assistant-shortcut__icon">{item.icon}</span>
                              <span className="nasa-assistant-shortcut__label">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </aside>

                    <section className="nasa-assistant-center-hero">
                      <div className="nasa-assistant-robot-frame nasa-assistant-robot-frame--hero">
                        <img src={nasaAssistantSide} alt="NASA BOT" />
                      </div>
                    </section>

                    <section className="nasa-assistant-chat-shell">
                      <div className="nasa-assistant-chat-head">
                        <div className="nasa-assistant-chat-head__brand">
                          <div className="nasa-assistant-chat-head__avatar">
                            <img src={nasaLogo} alt="NASA BOT" />
                          </div>
                          <div>
                            <div className="nasa-assistant-chat-head__title">NASA BOT</div>
                            <div className="nasa-assistant-chat-head__status">Sẵn sàng hỗ trợ bạn</div>
                          </div>
                        </div>
                      </div>

                      <div className="nasa-assistant-chat-preview">
                        <div className="nasa-assistant-summary nasa-assistant-summary--compact">
                          <Sparkles className="h-4 w-4" />
                          <span>Chọn nhanh để đặt vé hoặc tạo ticket. Nếu cần, mình sẽ hỏi tiếp từng bước.</span>
                        </div>
                        {moviePromo && (
                          <button
                            type="button"
                            className="nasa-assistant-card nasa-assistant-promo-card"
                            onClick={() => {
                              closeWidget();
                              if (moviePromo.href) {
                                navigate(moviePromo.href);
                              }
                            }}
                          >
                            <div className="nasa-assistant-promo-card__badge">{moviePromo?.badge || 'Phim hot'}</div>
                            <div className="nasa-assistant-card__title nasa-assistant-promo-card__title">{moviePromo.title}</div>
                            <div className="nasa-assistant-card__text nasa-assistant-promo-card__text">{moviePromo.description}</div>
                            <div className="nasa-assistant-card__actions">
                              <span className="nasa-assistant-mini-btn nasa-assistant-mini-btn--primary">{moviePromo.ctaLabel}</span>
                            </div>
                          </button>
                        )}
                        <div className="nasa-assistant-card">
                          <div className="nasa-assistant-card__actions">
                            <button type="button" className="nasa-assistant-mini-btn nasa-assistant-mini-btn--primary" onClick={() => handleQuickAction('Tạo ticket')}>
                              Tạo ticket
                            </button>
                            <button type="button" className="nasa-assistant-mini-btn" onClick={() => handleQuickAction('Xem ticket của tôi')}>
                              Xem ticket của tôi
                            </button>
                          </div>
                        </div>

                        <div className="nasa-assistant-recent-card">
                          <div className="nasa-assistant-recent-card__title">ĐỀ XUẤT RẠP GẦN ĐÂY</div>
                          <div className="nasa-assistant-recent">
                            {RECENT_CINEMAS.map((item) => (
                              <button
                                key={item.label}
                                type="button"
                                className="nasa-assistant-recent__item"
                                onClick={() => {
                                  closeWidget();
                                  navigate(item.href);
                                }}
                              >
                                <span className="nasa-assistant-recent__dot">◦</span>
                                <span>{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                ) : mode === 'tickets' ? (
                  <div className="nasa-assistant-thread">
                    <div className="nasa-assistant-card">
                      <div className="nasa-assistant-card__title">Ticket của tôi</div>
                      <div className="nasa-assistant-card__text">Chọn ticket để xem cuộc trò chuyện với admin ngay trong popup này.</div>
                      <div className="nasa-assistant-card__actions">
                        <button type="button" className="nasa-assistant-mini-btn" onClick={() => setMode('home')}>Quay lại</button>
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
                    {QUICK_ACTIONS.map((action) => (
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
                      placeholder={mode === 'ticket' ? 'Nhắn với admin...' : mode === 'create' ? 'Nhập mô tả ngắn...' : 'Nhập yêu cầu của bạn...'}
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
