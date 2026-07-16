import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeInfo,
  Headphones,
  Inbox,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import SupportStickerBubble from '../../../shared/components/SupportStickerBubble';
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
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import { AdminPage, PageHeader, PrimaryButton } from '../components';
import './SupportInboxPage.css';

const STATUS_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'progress', label: 'Đang xử lý' },
  { id: 'resolved', label: 'Đã đóng' },
];

const CATEGORY_LABELS = {
  ticket: 'Vé / suất chiếu',
  payment: 'Thanh toán',
  account: 'Tài khoản',
  promo: 'Khuyến mãi',
  membership: 'Hội viên',
  other: 'Khác',
};

function getCategoryLabel(category = '') {
  const key = `${category || ''}`.trim().toLowerCase();
  if (!key) return '—';
  return CATEGORY_LABELS[key] || category;
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusMeta(status) {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'OPEN' || normalized === 'NEW' || normalized === 'PENDING' || normalized === 'LIVE_REQUESTED') {
    return { label: 'Mới', className: 'support-status support-status--open', bucket: 'open' };
  }
  if (normalized === 'IN_PROGRESS') {
    return { label: 'Đang xử lý', className: 'support-status support-status--progress', bucket: 'progress' };
  }
  if (normalized === 'RESOLVED' || normalized === 'CLOSED' || normalized === 'DONE') {
    return { label: 'Đã đóng', className: 'support-status support-status--resolved', bucket: 'resolved' };
  }
  return { label: status || '—', className: 'support-status support-status--default', bucket: 'all' };
}

/** Ticket chưa được admin/staff nhận — chỉ hiện ở hàng chờ gọn. */
function isIncomingTicket(ticket) {
  if (!ticket) return false;
  if (ticket.liveRequested && !ticket.liveConnected) return true;
  const status = `${ticket.status || ''}`.toUpperCase();
  return status === 'PENDING' || status === 'OPEN' || status === 'NEW' || status === 'LIVE_REQUESTED';
}

function previewText(value = '', max = 72) {
  const text = `${value || ''}`.replace(/\s+/g, ' ').trim();
  if (!text) return 'Không có mô tả';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

const SupportInboxPage = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicketCode, setSelectedTicketCode] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [liveQueue, setLiveQueue] = useState([]);
  const [processingLiveTicket, setProcessingLiveTicket] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicketDetail, setSelectedTicketDetail] = useState(null);
  const messagesEndRef = useRef(null);
  const confirm = useConfirm();

  const selectedTicket = useMemo(() => {
    const fromList = tickets.find((item) => item.ticketCode === selectedTicketCode) || null;
    if (!selectedTicketDetail || selectedTicketDetail.ticketCode !== selectedTicketCode) {
      return fromList;
    }
    return { ...fromList, ...selectedTicketDetail };
  }, [selectedTicketDetail, tickets, selectedTicketCode]);

  const ticketStats = useMemo(() => {
    let open = 0;
    let progress = 0;
    let resolved = 0;
    tickets.forEach((ticket) => {
      if (isIncomingTicket(ticket)) {
        open += 1;
        return;
      }
      const bucket = getStatusMeta(ticket.status).bucket;
      if (bucket === 'progress') progress += 1;
      else if (bucket === 'resolved') resolved += 1;
      else open += 1;
    });
    return { total: tickets.length, open, progress, resolved };
  }, [tickets]);

  const incomingTickets = useMemo(() => {
    const byCode = new Map();
    tickets.filter(isIncomingTicket).forEach((ticket) => {
      byCode.set(ticket.ticketCode, ticket);
    });
    liveQueue.forEach((ticket) => {
      if (!byCode.has(ticket.ticketCode)) {
        byCode.set(ticket.ticketCode, ticket);
      }
    });
    return [...byCode.values()].sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }, [tickets, liveQueue]);

  const inboxTickets = useMemo(
    () => tickets.filter((ticket) => !isIncomingTicket(ticket)),
    [tickets],
  );

  const filteredTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return inboxTickets.filter((ticket) => {
      const bucket = getStatusMeta(ticket.status).bucket;
      if (statusFilter !== 'all' && bucket !== statusFilter) return false;
      if (!query) return true;
      const haystack = [
        ticket.ticketCode,
        ticket.ownerEmail,
        ticket.ownerName,
        ticket.category,
        ticket.description,
        ticket.lastMessage,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [inboxTickets, searchQuery, statusFilter]);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const list = await supportService.getAdminSupportRequests();
      const next = Array.isArray(list) ? list : [];
      setTickets(next);
      const accepted = next.filter((ticket) => !isIncomingTicket(ticket));
      if (selectedTicketCode && !next.some((t) => t.ticketCode === selectedTicketCode)) {
        setSelectedTicketCode(accepted[0]?.ticketCode || '');
      } else if (selectedTicketCode && isIncomingTicket(next.find((t) => t.ticketCode === selectedTicketCode))) {
        setSelectedTicketCode(accepted[0]?.ticketCode || '');
      }
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

  useEffect(() => {
    loadTickets();
    loadLiveQueue();
  }, []);

  useEffect(() => {
    loadMessages(selectedTicketCode);
    loadTicketDetail(selectedTicketCode);
  }, [selectedTicketCode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedTicketCode]);

  useRealtimeTopic(REALTIME_TOPICS.ADMIN_SUPPORT, () => {
    loadTickets();
    loadLiveQueue();
    if (selectedTicketCode) {
      loadTicketDetail(selectedTicketCode);
    }
  });
  useRealtimeTopic(REALTIME_TOPICS.ADMIN_SUPPORT_LIVE, () => {
    loadTickets();
    loadLiveQueue();
  });
  useRealtimeTopic(
    selectedTicketCode ? REALTIME_TOPICS.supportTicket(selectedTicketCode) : null,
    () => {
      loadMessages(selectedTicketCode);
      loadTicketDetail(selectedTicketCode);
    },
  );

  const handleAcceptLiveSupport = async (ticketCode) => {
    setProcessingLiveTicket(ticketCode);
    try {
      await supportService.acceptLiveSupport(ticketCode);
      await Promise.all([loadTickets(), loadLiveQueue(), loadMessages(ticketCode)]);
      setSelectedTicketCode(ticketCode);
      notificationService.success('Đã nhận hỗ trợ trực tiếp cho khách hàng.');
    } catch (err) {
      notificationService.error(err?.response?.data?.message || 'Không thể nhận hỗ trợ.');
    } finally {
      setProcessingLiveTicket('');
    }
  };

  const handleAcceptTicket = async (ticket) => {
    const ticketCode = ticket?.ticketCode;
    if (!ticketCode) return;
    const isLive = Boolean(ticket.liveRequested && !ticket.liveConnected)
      || `${ticket.status || ''}`.toUpperCase() === 'LIVE_REQUESTED';
    if (isLive) {
      await handleAcceptLiveSupport(ticketCode);
      return;
    }
    setProcessingLiveTicket(ticketCode);
    try {
      await supportService.updateAdminSupportStatus(ticketCode, { status: 'IN_PROGRESS' });
      await Promise.all([loadTickets(), loadLiveQueue(), loadMessages(ticketCode)]);
      setSelectedTicketCode(ticketCode);
      notificationService.success(`Đã nhận ticket ${ticketCode}.`);
    } catch (err) {
      notificationService.error(err?.response?.data?.message || 'Không thể nhận ticket.');
    } finally {
      setProcessingLiveTicket('');
    }
  };

  const handleRejectLiveSupport = async (ticketCode) => {
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

  const handleDeleteTicket = async () => {
    if (!selectedTicketCode) return;
    const confirmed = await confirm({
      title: 'Xóa ticket',
      message: `Bạn có chắc chắn muốn xóa ticket "${selectedTicketCode}"? Toàn bộ nội dung trò chuyện sẽ bị xóa vĩnh viễn và không thể khôi phục.`,
      confirmLabel: 'Xóa ticket',
      cancelLabel: 'Giữ lại',
      variant: 'danger',
    });
    if (!confirmed) return;
    setLoading(true);
    try {
      await supportService.deleteSupportTicket(selectedTicketCode);
      await Promise.all([loadTickets(), loadLiveQueue()]);
      setSelectedTicketCode('');
      setMessages([]);
      notificationService.success('Đã xóa ticket đã hoàn tất.');
    } catch (err) {
      notificationService.error(err?.response?.data?.message || 'Không thể xóa ticket này.');
    } finally {
      setLoading(false);
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
    await handleSendSticker(DEFAULT_THANK_YOU_STICKER_ID, { markDone: true });
  };

  const handleReply = async () => {
    const value = draft.trim();
    if (!value || !selectedTicketCode) return;
    setLoading(true);
    try {
      await supportService.sendAdminSupportMessage(selectedTicketCode, { message: value, status: 'IN_PROGRESS' });
      setDraft('');
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
      if (!loading && draft.trim()) handleReply();
    }
  };

  const renderIncomingNotice = (ticket) => {
    const isLive = Boolean(ticket.liveRequested && !ticket.liveConnected)
      || `${ticket.status || ''}`.toUpperCase() === 'LIVE_REQUESTED';
    const busy = processingLiveTicket === ticket.ticketCode;

    return (
      <div
        key={ticket.ticketCode}
        className={`support-incoming-notice ${isLive ? 'support-incoming-notice--live' : ''}`}
      >
        <div className="support-incoming-notice__main">
          <div className="support-incoming-notice__top">
            <span className="support-incoming-notice__badge">
              {isLive ? 'Chat trực tiếp' : 'Yêu cầu mới'}
            </span>
            <span className="support-incoming-notice__meta">{formatDateTime(ticket.createdAt)}</span>
          </div>
          <div className="support-incoming-notice__title">
            {getCategoryLabel(ticket.category)}
            <span>·</span>
            <strong>{ticket.ticketCode}</strong>
          </div>
          <p className="support-incoming-notice__who">
            {ticket.ownerName || ticket.ownerEmail || 'Khách hàng'}
          </p>
          <p className="support-incoming-notice__preview">
            {previewText(ticket.description || ticket.lastMessage)}
          </p>
        </div>
        <div className="support-incoming-notice__actions">
          <PrimaryButton
            type="button"
            loading={busy}
            onClick={() => handleAcceptTicket(ticket)}
          >
            Nhận
          </PrimaryButton>
          {isLive ? (
            <button
              type="button"
              className="support-filter-tab"
              disabled={busy}
              onClick={() => handleRejectLiveSupport(ticket.ticketCode)}
            >
              Từ chối
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderInboxTicketCard = (ticket) => {
    const statusMeta = getStatusMeta(ticket.status);
    const isActive = selectedTicketCode === ticket.ticketCode;
    const shortDescription = previewText(ticket.description || ticket.lastMessage, 64);
    const detailDescription = ticket.description || 'Không có mô tả';
    const latestMessage = ticket.lastMessage && ticket.lastMessage !== ticket.description
      ? ticket.lastMessage
      : null;

    return (
      <button
        key={ticket.ticketCode}
        type="button"
        className={`support-ticket-card ${isActive ? 'support-ticket-card--active' : ''} ${!ticket.readByAdmin ? 'support-ticket-card--unread' : ''}`.trim()}
        onClick={() => setSelectedTicketCode(ticket.ticketCode)}
      >
        <div className="support-ticket-card-top">
          <div className="support-ticket-code">
            {!ticket.readByAdmin ? <span className="support-ticket-unread" aria-label="Chưa đọc" /> : null}
            <strong>{ticket.ticketCode}</strong>
          </div>
          <span className={statusMeta.className}>{statusMeta.label}</span>
        </div>

        <div className="support-ticket-summary-line">
          <span className="support-ticket-category">{getCategoryLabel(ticket.category)}</span>
          <span className="support-ticket-summary-text">{shortDescription}</span>
        </div>

        <dl className="support-ticket-detail">
          <div>
            <dt>Khách</dt>
            <dd>{ticket.ownerName || '—'}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{ticket.ownerEmail || '—'}</dd>
          </div>
          <div className="support-ticket-detail--full">
            <dt>Mô tả</dt>
            <dd>{previewText(detailDescription, 140)}</dd>
          </div>
          {latestMessage ? (
            <div className="support-ticket-detail--full">
              <dt>Tin mới</dt>
              <dd>{previewText(latestMessage, 100)}</dd>
            </div>
          ) : null}
        </dl>

        <div className="support-ticket-foot">
          <span>{formatDateTime(ticket.updatedAt || ticket.createdAt)}</span>
          {ticket.assignedStaffName ? <span>{ticket.assignedStaffName}</span> : null}
        </div>
      </button>
    );
  };

  return (
    <AdminPage>
      <PageHeader
        eyebrow="NASAFilm · Support Inbox"
        title="Hỗ trợ khách hàng"
        description="Yêu cầu mới hiện dạng thông báo gọn. Nhấn Nhận để đưa ticket vào hộp thư và chat với khách."
        secondaryActions={[
          {
            label: 'Làm mới',
            onClick: () => {
              loadTickets();
              loadLiveQueue();
            },
            disabled: loadingTickets,
            icon: <RefreshCw className={`h-4 w-4 ${loadingTickets ? 'support-spin' : ''}`} />,
          },
        ]}
      />

      <div className="support-kpi-grid">
        <div className="support-kpi-card">
          <div className="support-kpi-label">Tổng ticket</div>
          <div className="support-kpi-value">{ticketStats.total}</div>
        </div>
        <div className="support-kpi-card">
          <div className="support-kpi-label">Chờ nhận</div>
          <div className="support-kpi-value support-kpi-value--warn">{incomingTickets.length}</div>
        </div>
        <div className="support-kpi-card">
          <div className="support-kpi-label">Đang xử lý</div>
          <div className="support-kpi-value support-kpi-value--accent">{ticketStats.progress}</div>
        </div>
        <div className="support-kpi-card">
          <div className="support-kpi-label">Đã đóng</div>
          <div className="support-kpi-value support-kpi-value--success">{ticketStats.resolved}</div>
        </div>
      </div>

      <div className="support-incoming-panel">
        <div className="support-list-head">
          <div className="support-list-title">
            <Headphones className="w-4 h-4" />
            Yêu cầu chờ nhận
            {incomingTickets.length > 0 ? (
              <span className="support-incoming-count">{incomingTickets.length}</span>
            ) : null}
          </div>
          <p className="support-list-desc">
            Ticket mới và chat trực tiếp hiện ở đây. Nhấn Nhận để mở hội thoại đầy đủ bên trái.
          </p>
        </div>
        <div className="support-incoming-list">
          {incomingTickets.length === 0 ? (
            <div className="support-list-empty support-list-empty--compact">
              Không có yêu cầu nào đang chờ nhận.
            </div>
          ) : (
            incomingTickets.map(renderIncomingNotice)
          )}
        </div>
      </div>

      <div className="support-inbox-layout">
        <aside className="support-list-panel">
          <div className="support-list-head">
            <div className="support-list-title">
              <Inbox className="w-4 h-4" />
              Hộp thư ticket
            </div>
            <p className="support-list-desc">
              {filteredTickets.length} / {inboxTickets.length} ticket đã nhận
            </p>
          </div>

          <div className="support-list-toolbar">
            <div className="support-search-wrap">
              <Search className="support-search-icon w-4 h-4" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã, email, nội dung..."
                className="support-search-input"
              />
            </div>
            <div className="support-filter-tabs">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setStatusFilter(filter.id)}
                  className={`support-filter-tab ${statusFilter === filter.id ? 'support-filter-tab--active' : ''}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="support-ticket-list custom-scrollbar">
            {loadingTickets ? (
              <div className="support-state" style={{ minHeight: '12rem' }}>
                <Loader2 className="w-8 h-8 text-red-500 support-spin" />
                <p>Đang tải ticket...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="support-list-empty">
                {inboxTickets.length === 0
                  ? 'Chưa có ticket đã nhận. Nhận yêu cầu ở phía trên để bắt đầu.'
                  : 'Không tìm thấy ticket phù hợp.'}
              </div>
            ) : (
              filteredTickets.map(renderInboxTicketCard)
            )}
          </div>
        </aside>

        <section className="support-chat-panel">
          {selectedTicket ? (
            <>
              <header className="support-chat-head support-chat-head--compact">
                <div className="min-w-0">
                  <div className="support-chat-title">{selectedTicket.ticketCode}</div>
                  <div className="support-chat-subtitle">
                    Hội thoại với {selectedTicket.ownerName || selectedTicket.ownerEmail}
                    {' · '}
                    {getCategoryLabel(selectedTicket.category)}
                  </div>
                </div>
                <div className="support-chat-head__actions">
                  {selectedTicket.status !== 'DONE' && selectedTicket.status !== 'CLOSED' && selectedTicket.status !== 'RESOLVED' ? (
                    <button
                      type="button"
                      className="support-filter-tab support-filter-tab--active"
                      onClick={handleFinishSupport}
                      disabled={loading}
                    >
                      Gửi cảm ơn & kết thúc
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="support-filter-tab support-chat-delete-btn"
                      onClick={handleDeleteTicket}
                      disabled={loading}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa ticket
                    </button>
                  )}
                  <span className={getStatusMeta(selectedTicket.status).className}>
                    {getStatusMeta(selectedTicket.status).label}
                  </span>
                </div>
              </header>

              {selectedTicket.description ? (
                <div className="support-ticket-summary">
                  <span>Mô tả yêu cầu</span>
                  <p>{selectedTicket.description}</p>
                </div>
              ) : null}

              {(selectedTicket.status === 'DONE' || selectedTicket.status === 'CLOSED' || selectedTicket.status === 'RESOLVED') && (
                <div className="support-closed-note">
                  {selectedTicket.status === 'CLOSED'
                    ? 'Khách đã hủy yêu cầu — có thể xóa ticket nếu không cần giữ.'
                    : selectedTicket.satisfactionRating
                      ? `Khách đã đánh giá: ${selectedTicket.satisfactionLabel} — hỗ trợ đã hoàn tất.`
                      : 'Hỗ trợ đã kết thúc (DONE).'}
                </div>
              )}

              <div className="support-messages custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="support-state">
                    <div className="support-state-icon">
                      <MessageSquare className="w-7 h-7" />
                    </div>
                    <p className="support-state-title">Chưa có tin nhắn</p>
                    <p className="support-state-desc">Gửi phản hồi đầu tiên cho khách hàng bên dưới.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isAdmin = message.senderRole === 'ADMIN';
                    const isSystem = message.senderRole === 'SYSTEM';
                    return (
                      <div
                        key={message.uuid}
                        className={`support-message-row ${
                          isAdmin
                            ? 'support-message-row--admin'
                            : isSystem
                              ? 'support-message-row--system'
                              : 'support-message-row--user'
                        }`}
                      >
                        <div className={`support-bubble ${
                          isAdmin
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
                              <span className="support-bubble-time">{formatDateTime(message.createdAt)}</span>
                            )}
                          </div>
                          <div className="support-bubble-text">
                            {parseSupportStickerMessage(message.message).type === 'sticker' ? (
                              <SupportStickerBubble message={message.message} showCaption />
                            ) : (
                              message.message
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="support-compose">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  className="support-textarea"
                  placeholder="Phản hồi cho khách... (Enter gửi, Shift+Enter xuống dòng)"
                  disabled={loading}
                />
                <div className="support-compose-footer">
                  <span className="support-compose-hint">Realtime · Enter gửi nhanh</span>
                  <PrimaryButton
                    type="button"
                    disabled={!draft.trim() || selectedTicket.status === 'DONE' || selectedTicket.status === 'CLOSED'}
                    loading={loading}
                    onClick={handleReply}
                  >
                    <Send className="h-4 w-4" />
                    Gửi phản hồi
                  </PrimaryButton>
                </div>
              </div>
            </>
          ) : (
            <div className="support-state">
              <div className="support-state-icon">
                <BadgeInfo className="w-7 h-7" />
              </div>
              <p className="support-state-title">Chưa chọn ticket</p>
              <p className="support-state-desc">
                Nhận một yêu cầu ở phía trên, hoặc chọn ticket đã nhận ở danh sách bên trái.
              </p>
            </div>
          )}
        </section>
      </div>
    </AdminPage>
  );
};

export default SupportInboxPage;
