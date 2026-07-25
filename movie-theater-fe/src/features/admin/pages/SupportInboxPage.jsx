import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CheckCheck,
  Clock3,
  Headphones,
  ImagePlus,
  Inbox,
  Loader2,
  MessageSquare,
  Paperclip,
  RefreshCcw,
  Search,
  Send,
  SlidersHorizontal,
} from 'lucide-react';
import SupportStickerBubble from '../../../shared/components/SupportStickerBubble';
import SupportMessageImages from '../../../shared/components/SupportMessageImages';
import Pagination from '../../../shared/components/Pagination';
import {
  DEFAULT_THANK_YOU_STICKER_ID,
  encodeSupportStickerMessage,
  parseSupportStickerMessage,
} from '../../../shared/constants/supportStickers';
import { supportService } from '../../../shared/services/supportService';
import { notificationService } from '../../../shared/services/notificationService';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { getSupportMessageSenderLabel } from '../../../shared/utils/supportMessageUtils';
import {
  AdminPage,
  PageHeader,
  PrimaryButton,
  FilterPills,
  StatusBadge,
  AdminKpiGrid,
} from '../components';
import AdminSelectDropdown from '../components/AdminSelectDropdown';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import { notifySupportAttentionChanged } from '../utils/supportAttention';
import './SupportInboxPage.css';

const STATUS_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'open', label: 'Chờ nhận' },
  { id: 'progress', label: 'Đang xử lý' },
  { id: 'resolved', label: 'Đã đóng' },
];

const MAX_SUPPORT_IMAGES = 3;
const MAX_SUPPORT_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORT_IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,image/gif';

const CATEGORY_META = {
  ticket: { label: 'Vé', tone: 'rose' },
  payment: { label: 'Thanh toán', tone: 'amber' },
  account: { label: 'Tài khoản', tone: 'sky' },
  promo: { label: 'KM', tone: 'emerald' },
  membership: { label: 'Hội viên', tone: 'violet' },
  other: { label: 'Khác', tone: 'slate' },
};

const CATEGORY_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả danh mục' },
  ...Object.entries(CATEGORY_META).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'unread', label: 'Chưa đọc trước' },
];

function getCategoryMeta(category = '') {
  const key = `${category || ''}`.trim().toLowerCase();
  return CATEGORY_META[key] || { label: category || '—', tone: 'slate' };
}

function formatAbsoluteDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return formatAbsoluteDateTime(value);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return formatAbsoluteDateTime(value);
}

function formatMessageTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name = '', email = '') {
  const source = `${name || ''}`.trim() || `${email || ''}`.trim();
  if (!source) return '??';
  const parts = source.split(/[\s.@_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function getStatusMeta(status) {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'OPEN' || normalized === 'NEW' || normalized === 'PENDING' || normalized === 'LIVE_REQUESTED') {
    return { label: 'Mới', variant: 'muted', bucket: 'open' };
  }
  if (normalized === 'IN_PROGRESS') {
    return { label: 'Đang xử lý', variant: 'warning', bucket: 'progress' };
  }
  if (normalized === 'RESOLVED' || normalized === 'CLOSED' || normalized === 'DONE') {
    return { label: 'Đã đóng', variant: 'success', bucket: 'resolved' };
  }
  return { label: status || '—', variant: 'muted', bucket: 'all' };
}

function isIncomingTicket(ticket) {
  if (!ticket) return false;
  if (ticket.liveRequested && !ticket.liveConnected) return true;
  const status = `${ticket.status || ''}`.toUpperCase();
  return status === 'PENDING' || status === 'OPEN' || status === 'NEW' || status === 'LIVE_REQUESTED';
}

function isLivePending(ticket) {
  if (!ticket) return false;
  return Boolean(ticket.liveRequested && !ticket.liveConnected)
    || `${ticket.status || ''}`.toUpperCase() === 'LIVE_REQUESTED';
}

function isClosedTicket(ticket) {
  const status = `${ticket?.status || ''}`.toUpperCase();
  return status === 'DONE' || status === 'CLOSED' || status === 'RESOLVED';
}

function previewText(value = '', max = 72) {
  const text = `${value || ''}`.replace(/\s+/g, ' ').trim();
  if (!text) return '—';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function pct(part, total) {
  if (!total) return '0%';
  return `${((part / total) * 100).toFixed(1)}%`;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

function messageDayLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  if (sameDay(date, today)) return 'Hôm nay';
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, yesterday)) return 'Hôm qua';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const SupportInboxPage = () => {
  const confirm = useConfirm();
  const [tickets, setTickets] = useState([]);
  const [selectedTicketCode, setSelectedTicketCode] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [liveQueue, setLiveQueue] = useState([]);
  const [processingLiveTicket, setProcessingLiveTicket] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedTicketDetail, setSelectedTicketDetail] = useState(null);
  const [pendingImages, setPendingImages] = useState([]);
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);

  const allTickets = useMemo(() => {
    const byCode = new Map();
    tickets.forEach((ticket) => {
      if (ticket?.ticketCode) byCode.set(ticket.ticketCode, ticket);
    });
    liveQueue.forEach((ticket) => {
      if (ticket?.ticketCode && !byCode.has(ticket.ticketCode)) {
        byCode.set(ticket.ticketCode, ticket);
      }
    });
    return [...byCode.values()];
  }, [tickets, liveQueue]);

  const selectedTicket = useMemo(() => {
    const fromList = allTickets.find((item) => item.ticketCode === selectedTicketCode) || null;
    if (!selectedTicketDetail || selectedTicketDetail.ticketCode !== selectedTicketCode) {
      return fromList;
    }
    return { ...fromList, ...selectedTicketDetail };
  }, [selectedTicketDetail, allTickets, selectedTicketCode]);

  const ticketStats = useMemo(() => {
    let open = 0;
    let progress = 0;
    let resolved = 0;
    allTickets.forEach((ticket) => {
      if (isIncomingTicket(ticket)) {
        open += 1;
        return;
      }
      const bucket = getStatusMeta(ticket.status).bucket;
      if (bucket === 'progress') progress += 1;
      else if (bucket === 'resolved') resolved += 1;
      else open += 1;
    });
    return { total: allTickets.length, open, progress, resolved };
  }, [allTickets]);

  const statusFilterItems = useMemo(
    () => STATUS_FILTERS.map((item) => ({
      ...item,
      count:
        item.id === 'all'
          ? ticketStats.total
          : item.id === 'open'
            ? ticketStats.open
            : item.id === 'progress'
              ? ticketStats.progress
              : ticketStats.resolved,
    })),
    [ticketStats],
  );

  const filteredTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = allTickets.filter((ticket) => {
      const bucket = isIncomingTicket(ticket) ? 'open' : getStatusMeta(ticket.status).bucket;
      if (statusFilter !== 'all' && bucket !== statusFilter) return false;

      const categoryKey = `${ticket.category || ''}`.trim().toLowerCase();
      if (categoryFilter !== 'all' && categoryKey !== categoryFilter) return false;

      if (!query) return true;
      const haystack = [
        ticket.ticketCode,
        ticket.ownerEmail,
        ticket.ownerName,
        ticket.category,
        ticket.description,
        ticket.lastMessage,
        ticket.assignedStaffName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });

    list.sort((a, b) => {
      if (sortBy === 'unread') {
        const aUnread = a.readByAdmin ? 1 : 0;
        const bUnread = b.readByAdmin ? 1 : 0;
        if (aUnread !== bUnread) return aUnread - bUnread;
      }
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return sortBy === 'oldest' ? aTime - bTime : bTime - aTime;
    });

    return list;
  }, [allTickets, searchQuery, statusFilter, categoryFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize) || 1);
  const safePage = Math.min(page, totalPages);
  const pagedTickets = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, safePage, pageSize]);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const list = await supportService.getAdminSupportRequests({ unpaged: true });
      const next = Array.isArray(list) ? list : [];
      setTickets(next);
      if (!selectedTicketCode && next[0]?.ticketCode) {
        setSelectedTicketCode(next[0].ticketCode);
      } else if (selectedTicketCode && !next.some((t) => t.ticketCode === selectedTicketCode)) {
        setSelectedTicketCode(next[0]?.ticketCode || '');
      }
      notifySupportAttentionChanged();
    } catch (err) {
      notificationService.error(err?.response?.data?.message || 'Không tải được danh sách ticket hỗ trợ.');
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadLiveQueue = async () => {
    try {
      const list = await supportService.getPendingLiveSupportRequests();
      setLiveQueue(Array.isArray(list) ? list : []);
      notifySupportAttentionChanged();
    } catch {
      setLiveQueue([]);
    }
  };

  const loadMessages = async (ticketCode = selectedTicketCode) => {
    if (!ticketCode) {
      setMessages([]);
      return;
    }
    try {
      const list = await supportService.getAdminSupportMessages(ticketCode);
      setMessages(Array.isArray(list) ? list : []);
    } catch {
      setMessages([]);
    }
  };

  const loadTicketDetail = async (ticketCode = selectedTicketCode) => {
    if (!ticketCode) {
      setSelectedTicketDetail(null);
      return;
    }
    try {
      const detail = await supportService.getAdminSupportRequest(ticketCode);
      setSelectedTicketDetail(detail || null);
    } catch {
      setSelectedTicketDetail(null);
    }
  };

  const openTicketDetail = (ticketCode) => {
    if (!ticketCode) return;
    setSelectedTicketCode(ticketCode);
    setViewMode('detail');
  };

  const backToList = () => {
    setViewMode('list');
  };

  useEffect(() => {
    loadTickets();
    loadLiveQueue();
  }, []);

  useEffect(() => {
    if (viewMode !== 'detail' || !selectedTicketCode) return;
    loadMessages(selectedTicketCode);
    loadTicketDetail(selectedTicketCode);
  }, [selectedTicketCode, viewMode]);

  useEffect(() => {
    setPendingImages((prev) => {
      prev.forEach((item) => {
        if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
    setDraft('');
  }, [selectedTicketCode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedTicketCode, viewMode]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, categoryFilter, sortBy, pageSize]);

  useRealtimeTopic(REALTIME_TOPICS.ADMIN_SUPPORT, () => {
    loadTickets();
    loadLiveQueue();
    if (viewMode === 'detail' && selectedTicketCode) {
      loadTicketDetail(selectedTicketCode);
    }
  });
  useRealtimeTopic(REALTIME_TOPICS.ADMIN_SUPPORT_LIVE, () => {
    loadTickets();
    loadLiveQueue();
  });
  useRealtimeTopic(
    viewMode === 'detail' && selectedTicketCode
      ? REALTIME_TOPICS.supportTicket(selectedTicketCode)
      : null,
    () => {
      loadMessages(selectedTicketCode);
      loadTicketDetail(selectedTicketCode);
    },
  );

  const handleAcceptLiveSupport = async (ticketCode) => {
    const ok = await confirm({
      title: 'Nhận hỗ trợ trực tiếp',
      message: 'Xác nhận nhận yêu cầu hỗ trợ trực tiếp? Bạn sẽ kết nối chat với khách hàng ngay.',
      highlight: ticketCode,
      confirmLabel: 'Nhận hỗ trợ',
      variant: 'warning',
    });
    if (!ok) return;

    setProcessingLiveTicket(ticketCode);
    try {
      await supportService.acceptLiveSupport(ticketCode);
      await Promise.all([loadTickets(), loadLiveQueue(), loadMessages(ticketCode)]);
      openTicketDetail(ticketCode);
      notificationService.success('Đã nhận hỗ trợ trực tiếp cho khách hàng.');
    } catch (err) {
      notificationService.error(err?.response?.data?.message || 'Không thể nhận hỗ trợ.');
    } finally {
      setProcessingLiveTicket('');
    }
  };

  const handleAcceptTicket = async (ticket, { openAfter = true } = {}) => {
    const ticketCode = ticket?.ticketCode;
    if (!ticketCode) return;
    if (isLivePending(ticket)) {
      await handleAcceptLiveSupport(ticketCode);
      return;
    }
    const ok = await confirm({
      title: 'Nhận ticket hỗ trợ',
      message: 'Xác nhận nhận ticket này? Trạng thái sẽ chuyển sang đang xử lý.',
      highlight: ticketCode,
      confirmLabel: 'Nhận ticket',
      variant: 'warning',
    });
    if (!ok) return;

    setProcessingLiveTicket(ticketCode);
    try {
      await supportService.updateAdminSupportStatus(ticketCode, { status: 'IN_PROGRESS' });
      await Promise.all([loadTickets(), loadLiveQueue(), loadMessages(ticketCode)]);
      if (openAfter) openTicketDetail(ticketCode);
      notificationService.success(`Đã nhận ticket ${ticketCode}.`);
    } catch (err) {
      notificationService.error(err?.response?.data?.message || 'Không thể nhận ticket.');
    } finally {
      setProcessingLiveTicket('');
    }
  };

  const handleRejectLiveSupport = async (ticketCode) => {
    const ok = await confirm({
      title: 'Từ chối yêu cầu hỗ trợ',
      message: 'Xác nhận từ chối yêu cầu hỗ trợ trực tiếp này? Khách hàng sẽ được thông báo.',
      highlight: ticketCode,
      confirmLabel: 'Từ chối',
      variant: 'danger',
    });
    if (!ok) return;

    setProcessingLiveTicket(ticketCode);
    try {
      await supportService.rejectLiveSupport(ticketCode);
      await Promise.all([loadTickets(), loadLiveQueue()]);
      notificationService.info('Đã từ chối yêu cầu hỗ trợ này.');
    } catch (err) {
      notificationService.error(err?.response?.data?.message || 'Không thể từ chối yêu cầu.');
    } finally {
      setProcessingLiveTicket('');
    }
  };

  const handleSendSticker = async (stickerId, options = {}) => {
    if (!selectedTicketCode || !stickerId) return;
    const { markDone = false } = options;
    setLoading(true);
    try {
      await supportService.sendAdminSupportMessage(selectedTicketCode, {
        message: encodeSupportStickerMessage(stickerId),
        status: markDone ? 'DONE' : 'IN_PROGRESS',
      });
      await Promise.all([loadMessages(selectedTicketCode), loadTickets(), loadTicketDetail(selectedTicketCode)]);
      notificationService.success(markDone ? 'Đã gửi lời cảm ơn và kết thúc hỗ trợ.' : 'Đã gửi nhãn cảm ơn cho khách.');
    } catch (err) {
      notificationService.error(err?.response?.data?.message || 'Không gửi được nhãn dán.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSupport = async () => {
    if (!selectedTicketCode) return;
    const ok = await confirm({
      title: 'Đóng ticket',
      message: 'Gửi lời cảm ơn và đóng ticket? Khách sẽ không thể tiếp tục chat trên ticket này.',
      highlight: selectedTicketCode,
      confirmLabel: 'Đóng ticket',
      variant: 'warning',
    });
    if (!ok) return;
    await handleSendSticker(DEFAULT_THANK_YOU_STICKER_ID, { markDone: true });
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
    if (loading || !selectedTicket || isIncomingTicket(selectedTicket) || isClosedTicket(selectedTicket)) {
      return;
    }
    const items = Array.from(event.clipboardData?.items || []);
    const files = items
      .filter((item) => item.kind === 'file' && `${item.type || ''}`.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (!files.length) return;
    event.preventDefault();
    appendSupportImageFiles(files);
  };

  const handleReply = async () => {
    const value = draft.trim();
    const filesToSend = pendingImages.map((item) => item.file).filter(Boolean);
    if ((!value && filesToSend.length === 0) || !selectedTicketCode) return;
    setLoading(true);
    try {
      let imageUrls = [];
      if (filesToSend.length > 0) {
        imageUrls = await supportService.uploadAdminSupportImages(filesToSend);
      }
      await supportService.sendAdminSupportMessage(selectedTicketCode, {
        message: value,
        imageUrls,
        status: 'IN_PROGRESS',
      });
      setDraft('');
      clearPendingImages();
      await loadMessages(selectedTicketCode);
      await loadTickets();
      await loadTicketDetail(selectedTicketCode);
    } catch (err) {
      notificationService.error(err?.response?.data?.message || 'Không gửi được phản hồi.');
    } finally {
      setLoading(false);
    }
  };

  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && (draft.trim() || pendingImages.length > 0)) handleReply();
    }
  };

  const renderAssignee = (ticket) => {
    if (!ticket.assignedStaffName && !ticket.assignedStaffEmail) {
      return <span className="support-dash">—</span>;
    }
    const initials = getInitials(ticket.assignedStaffName, ticket.assignedStaffEmail);
    const load = allTickets.filter(
      (item) => item.assignedStaffEmail
        && ticket.assignedStaffEmail
        && item.assignedStaffEmail.toLowerCase() === ticket.assignedStaffEmail.toLowerCase()
        && !isClosedTicket(item),
    ).length;
    return (
      <div className="support-assignee">
        <span className="support-avatar support-avatar--sm" aria-hidden="true">{initials}</span>
        <span className="support-assignee__text">
          <strong>{ticket.assignedStaffName || ticket.assignedStaffEmail}</strong>
          <small>{load} ticket</small>
        </span>
      </div>
    );
  };

  const renderMessageTimeline = () => {
    let lastDay = '';
    return messages.map((message) => {
      const day = messageDayLabel(message.createdAt);
      const showDay = day && day !== lastDay;
      if (showDay) lastDay = day;
      const isAdmin = message.senderRole === 'ADMIN';
      const isSystem = message.senderRole === 'SYSTEM';
      const sticker = parseSupportStickerMessage(message.message);

      return (
        <div key={message.uuid} className="support-msg-block">
          {showDay ? (
            <div className="support-day-sep">
              <span>{day}</span>
            </div>
          ) : null}
          <div
            className={`support-message-row ${isAdmin
                ? 'support-message-row--admin'
                : isSystem
                  ? 'support-message-row--system'
                  : 'support-message-row--user'
              }`}
          >
            {!isAdmin && !isSystem ? (
              <span className="support-avatar" aria-hidden="true">
                {getInitials(selectedTicket?.ownerName, selectedTicket?.ownerEmail)}
              </span>
            ) : null}
            <div
              className={`support-bubble ${isAdmin
                  ? 'support-bubble--admin'
                  : isSystem
                    ? 'support-bubble--system'
                    : 'support-bubble--user'
                }`}
            >
              <div className="support-bubble-head">
                <span className="support-bubble-sender">
                  {getSupportMessageSenderLabel(message, selectedTicket)}
                </span>
                {message.createdAt && (
                  <span className="support-bubble-time">{formatMessageTime(message.createdAt)}</span>
                )}
              </div>
              <div className="support-bubble-text">
                {sticker.type === 'sticker' ? (
                  <SupportStickerBubble message={message.message} showCaption />
                ) : (
                  <>
                    {message.message ? <div>{message.message}</div> : null}
                    <SupportMessageImages urls={message.imageUrls} />
                  </>
                )}
              </div>
              {isAdmin ? (
                <div className="support-bubble-receipt" aria-hidden="true">
                  <CheckCheck size={14} />
                </div>
              ) : null}
            </div>
            {isAdmin ? (
              <span className="support-avatar support-avatar--staff" aria-hidden="true">
                {getInitials(selectedTicket?.assignedStaffName || 'NV', selectedTicket?.assignedStaffEmail)}
              </span>
            ) : null}
          </div>
        </div>
      );
    });
  };

  if (viewMode === 'detail' && selectedTicket) {
    const incoming = isIncomingTicket(selectedTicket);
    const closed = isClosedTicket(selectedTicket);
    const livePending = isLivePending(selectedTicket);
    const canCompose = !incoming && !closed;

    return (
      <AdminPage className="support-page support-page--detail">
        <div className="support-detail-top">
          <button type="button" className="support-back-btn" onClick={backToList}>
            <ArrowLeft size={16} />
            Quay lại
          </button>
          <div className="support-detail-id">
            <span className="support-detail-code">#{selectedTicket.ticketCode}</span>
            <span className="support-detail-priority">Ưu tiên: Bình thường</span>
          </div>
        </div>

        <section className="support-customer-bar">
          <span className="support-avatar support-avatar--lg" aria-hidden="true">
            {getInitials(selectedTicket.ownerName, selectedTicket.ownerEmail)}
          </span>
          <div className="support-customer-bar__main">
            <strong>{selectedTicket.ownerName || 'Khách hàng'}</strong>
            <div className="support-customer-bar__meta">
              <span>{selectedTicket.ownerEmail || '—'}</span>
              <span>Nguồn: Website</span>
              <span>Tạo: {formatAbsoluteDateTime(selectedTicket.createdAt)}</span>
              <span>Cập nhật: {formatAbsoluteDateTime(selectedTicket.updatedAt)}</span>
            </div>
          </div>
          <StatusBadge variant={incoming ? 'muted' : getStatusMeta(selectedTicket.status).variant}>
            {incoming ? 'Chờ nhận' : getStatusMeta(selectedTicket.status).label}
          </StatusBadge>
        </section>

        {selectedTicket.description ? (
          <div className="support-ticket-summary">
            <span>Mô tả yêu cầu · {getCategoryMeta(selectedTicket.category).label}</span>
            <p>{selectedTicket.description}</p>
          </div>
        ) : null}

        {incoming ? (
          <div className="support-closed-note support-closed-note--incoming">
            Ticket đang chờ nhận. Nhấn &quot;Nhận ticket&quot; hoặc &quot;Nhận hỗ trợ trực tiếp&quot; để chat với khách.
          </div>
        ) : null}

        {closed ? (
          <div className="support-closed-note">
            {selectedTicket.status === 'CLOSED'
              ? 'Khách đã hủy yêu cầu.'
              : selectedTicket.satisfactionRating
                ? `Khách đã đánh giá: ${selectedTicket.satisfactionLabel} — hỗ trợ đã hoàn tất.`
                : 'Hỗ trợ đã kết thúc.'}
          </div>
        ) : null}

        <section className="support-chat-panel support-chat-panel--full">
          <div className="support-messages custom-scrollbar">
            {messages.length === 0 ? (
              <div className="support-state">
                <div className="support-state-icon">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <p className="support-state-title">Chưa có tin nhắn</p>
                <p className="support-state-desc">
                  {incoming
                    ? 'Nhận ticket để bắt đầu hội thoại với khách hàng.'
                    : 'Gửi phản hồi đầu tiên cho khách hàng bên dưới.'}
                </p>
              </div>
            ) : (
              renderMessageTimeline()
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="support-compose">
            {pendingImages.length > 0 ? (
              <div className="support-image-preview-row">
                {pendingImages.map((item) => (
                  <div key={item.id} className="support-image-preview-item">
                    <img src={item.previewUrl} alt="Ảnh sẽ gửi" />
                    <button
                      type="button"
                      className="support-image-preview-remove"
                      onClick={() => removePendingImage(item.id)}
                      aria-label="Xóa ảnh"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <span className="support-image-preview-hint">
                  Đính kèm ({pendingImages.length}/{MAX_SUPPORT_IMAGES})
                </span>
              </div>
            ) : null}

            <div className="support-compose-row">
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
                className="support-attach-btn"
                disabled={!canCompose || loading || pendingImages.length >= MAX_SUPPORT_IMAGES}
                onClick={() => imageInputRef.current?.click()}
                title="Gửi tối đa 3 ảnh"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="support-attach-btn"
                disabled={!canCompose || loading || pendingImages.length >= MAX_SUPPORT_IMAGES}
                onClick={() => imageInputRef.current?.click()}
                title="Đính kèm ảnh"
              >
                <ImagePlus className="h-4 w-4" />
              </button>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                onPaste={handlePasteSupportImages}
                className="support-textarea"
                rows={1}
                placeholder={
                  incoming
                    ? 'Nhận ticket trước khi gửi phản hồi...'
                    : 'Nhập tin nhắn...'
                }
                disabled={loading || !canCompose}
              />
              <PrimaryButton
                type="button"
                disabled={(!draft.trim() && pendingImages.length === 0) || !canCompose}
                loading={loading}
                onClick={handleReply}
              >
                <Send className="h-4 w-4" />
              </PrimaryButton>
            </div>
          </div>

          <div className="support-detail-actions">
            {incoming ? (
              <>
                <button
                  type="button"
                  className="support-action-btn support-action-btn--ghost"
                  disabled={processingLiveTicket === selectedTicket.ticketCode}
                  onClick={() => handleAcceptTicket(selectedTicket)}
                >
                  <Headphones size={16} />
                  {livePending ? 'Nhận hỗ trợ trực tiếp' : 'Nhận ticket'}
                </button>
                {livePending ? (
                  <button
                    type="button"
                    className="support-action-btn support-action-btn--muted"
                    disabled={processingLiveTicket === selectedTicket.ticketCode}
                    onClick={() => handleRejectLiveSupport(selectedTicket.ticketCode)}
                  >
                    Từ chối
                  </button>
                ) : null}
              </>
            ) : !closed ? (
              <>
                {livePending ? (
                  <button
                    type="button"
                    className="support-action-btn support-action-btn--ghost"
                    disabled={processingLiveTicket === selectedTicket.ticketCode}
                    onClick={() => handleAcceptLiveSupport(selectedTicket.ticketCode)}
                  >
                    <Headphones size={16} />
                    Nhận hỗ trợ trực tiếp
                  </button>
                ) : (
                  <button type="button" className="support-action-btn support-action-btn--ghost" disabled>
                    <Headphones size={16} />
                    Đang hỗ trợ trực tiếp
                  </button>
                )}
                <button
                  type="button"
                  className="support-action-btn support-action-btn--danger"
                  disabled={loading}
                  onClick={handleFinishSupport}
                >
                  <CheckCircle2 size={16} />
                  Đóng ticket
                </button>
              </>
            ) : null}
          </div>
        </section>
      </AdminPage>
    );
  }

  const rangeStart = filteredTickets.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, filteredTickets.length);

  return (
    <AdminPage className="support-page">
      <PageHeader
        eyebrow="Trang chủ / Hỗ trợ"
        title="Hỗ trợ khách hàng"
        description="Quản lý và xử lý các yêu cầu hỗ trợ từ khách hàng."
      />

      <FilterPills
        value={statusFilter}
        onChange={setStatusFilter}
        items={statusFilterItems}
        ariaLabel="Lọc trạng thái ticket"
        className="support-status-tabs"
      />

      <AdminKpiGrid
        columns={4}
        items={[
          {
            label: 'Tổng ticket',
            value: ticketStats.total,
            icon: Inbox,
            kpiClass: 'kpi-total',
          },
          {
            label: 'Chờ nhận',
            value: ticketStats.open,
            badge: pct(ticketStats.open, ticketStats.total),
            icon: Clock3,
            kpiClass: 'kpi-upcoming',
            onClick: () => setStatusFilter('open'),
            active: statusFilter === 'open',
          },
          {
            label: 'Đang xử lý',
            value: ticketStats.progress,
            badge: pct(ticketStats.progress, ticketStats.total),
            icon: RefreshCcw,
            kpiClass: 'kpi-inactive',
            onClick: () => setStatusFilter('progress'),
            active: statusFilter === 'progress',
          },
          {
            label: 'Đã đóng',
            value: ticketStats.resolved,
            badge: pct(ticketStats.resolved, ticketStats.total),
            icon: CheckCircle2,
            kpiClass: 'kpi-active',
            onClick: () => setStatusFilter('resolved'),
            active: statusFilter === 'resolved',
          },
        ]}
      />

      <div className="adm-table-shell support-table-shell">
        <div className="adm-table-shell__toolbar support-toolbar">
          <div className="support-search-wrap">
            <Search className="support-search-icon w-4 h-4" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo email, mã ticket, nội dung..."
              className="support-search-input"
            />
          </div>
          <AdminSelectDropdown
            value={categoryFilter}
            options={CATEGORY_FILTER_OPTIONS}
            onChange={setCategoryFilter}
            size="sm"
            className="support-filter-select"
          />
          <AdminSelectDropdown
            value={sortBy}
            options={SORT_OPTIONS}
            onChange={setSortBy}
            size="sm"
            className="support-filter-select"
          />
          <button type="button" className="support-icon-btn" aria-label="Bộ lọc" title="Bộ lọc">
            <SlidersHorizontal size={16} />
          </button>
        </div>

        <div className="adm-table-shell__body custom-scrollbar">
          {loadingTickets ? (
            <div className="support-state" style={{ minHeight: '16rem' }}>
              <Loader2 className="w-8 h-8 text-red-500 support-spin" />
              <p>Đang tải ticket...</p>
            </div>
          ) : (
            <table className="adm-table support-table">
              <thead>
                <tr>
                  <th>Mã ticket</th>
                  <th>Trạng thái</th>
                  <th>Danh mục</th>
                  <th>Khách hàng</th>
                  <th>Nội dung</th>
                  <th>Người phụ trách</th>
                  <th>Thời gian</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pagedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="support-table-empty">
                      {allTickets.length === 0
                        ? 'Chưa có ticket hỗ trợ nào.'
                        : 'Không tìm thấy ticket phù hợp.'}
                    </td>
                  </tr>
                ) : (
                  pagedTickets.map((ticket) => {
                    const incoming = isIncomingTicket(ticket);
                    const statusMeta = incoming
                      ? { label: 'Mới', variant: 'muted' }
                      : getStatusMeta(ticket.status);
                    const category = getCategoryMeta(ticket.category);
                    const content = previewText(ticket.lastMessage || ticket.description, 56);

                    return (
                      <tr
                        key={ticket.ticketCode}
                        className={!ticket.readByAdmin ? 'support-row--unread' : undefined}
                        onDoubleClick={() => openTicketDetail(ticket.ticketCode)}
                      >
                        <td>
                          <button
                            type="button"
                            className="support-code-link"
                            onClick={() => openTicketDetail(ticket.ticketCode)}
                          >
                            {ticket.ticketCode}
                          </button>
                          {isLivePending(ticket) ? (
                            <span className="support-live-dot" title="Live support" />
                          ) : null}
                        </td>
                        <td>
                          <StatusBadge variant={statusMeta.variant}>{statusMeta.label}</StatusBadge>
                        </td>
                        <td>
                          <span className={`support-cat support-cat--${category.tone}`}>
                            {category.label}
                          </span>
                        </td>
                        <td>
                          <span className="adm-table__secondary">{ticket.ownerEmail || '—'}</span>
                        </td>
                        <td>
                          <span className="support-content-cell" title={ticket.description || ''}>
                            {content}
                          </span>
                        </td>
                        <td>{renderAssignee(ticket)}</td>
                        <td>
                          <span className="adm-table__secondary">
                            {formatRelativeTime(ticket.updatedAt || ticket.createdAt)}
                          </span>
                        </td>
                        <td>
                          {incoming ? (
                            <PrimaryButton
                              type="button"
                              loading={processingLiveTicket === ticket.ticketCode}
                              onClick={() => handleAcceptTicket(ticket)}
                            >
                              Nhận ticket
                            </PrimaryButton>
                          ) : (
                            <button
                              type="button"
                              className="support-open-btn"
                              onClick={() => openTicketDetail(ticket.ticketCode)}
                            >
                              Mở chat
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="adm-table-shell__footer support-table-footer">
          <p className="support-table-range">
            Hiển thị {rangeStart} - {rangeEnd} của {filteredTickets.length} ticket
          </p>
          <Pagination
            currentPage={safePage}
            totalItems={filteredTickets.length}
            itemsPerPage={pageSize}
            onPageChange={setPage}
            onItemsPerPageChange={setPageSize}
            itemsPerPageOptions={[10, 20, 50]}
          />
        </div>
      </div>
    </AdminPage>
  );
};

export default SupportInboxPage;
