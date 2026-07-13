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
import { AdminPage, PageHeader, PrimaryButton } from '../components';
import './SupportInboxPage.css';

const STATUS_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'open', label: 'Mới' },
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

const SupportInboxPage = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicketCode, setSelectedTicketCode] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [liveQueue, setLiveQueue] = useState([]);
  const [liveAvailability, setLiveAvailability] = useState({ anyOnline: false, agents: [] });
  const [processingLiveTicket, setProcessingLiveTicket] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicketDetail, setSelectedTicketDetail] = useState(null);
  const messagesEndRef = useRef(null);

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
      const bucket = getStatusMeta(ticket.status).bucket;
      if (bucket === 'open') open += 1;
      else if (bucket === 'progress') progress += 1;
      else if (bucket === 'resolved') resolved += 1;
    });
    return { total: tickets.length, open, progress, resolved };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tickets.filter((ticket) => {
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
  }, [tickets, searchQuery, statusFilter]);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const list = await supportService.getAdminSupportRequests();
      const next = Array.isArray(list) ? list : [];
      setTickets(next);
      if (!selectedTicketCode && next[0]?.ticketCode) {
        setSelectedTicketCode(next[0].ticketCode);
      } else if (selectedTicketCode && !next.some((t) => t.ticketCode === selectedTicketCode)) {
        setSelectedTicketCode(next[0]?.ticketCode || '');
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

  const loadLiveAvailability = async () => {
    try {
      const data = await supportService.getLiveSupportAvailability();
      setLiveAvailability(data || { anyOnline: false, agents: [] });
    } catch {
      setLiveAvailability({ anyOnline: false, agents: [] });
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
    loadLiveAvailability();
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
    if (selectedTicketCode) {
      loadTicketDetail(selectedTicketCode);
    }
  });
  useRealtimeTopic(REALTIME_TOPICS.ADMIN_SUPPORT_LIVE, () => {
    loadTickets();
    loadLiveQueue();
    loadLiveAvailability();
  });
  useRealtimeTopic(REALTIME_TOPICS.SUPPORT_AGENTS, () => {
    loadLiveAvailability();
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
      notificationService.success('Đã gửi phản hồi.');
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

  const renderTicketRequestCard = (ticket, {
    isActive = false,
    onClick,
    asButton = true,
    actions = null,
  }) => {
    const statusMeta = getStatusMeta(ticket.status);
    const card = (
      <div
        className={`support-request-card support-request-card--list ${isActive ? 'support-request-card--active' : ''} ${!ticket.readByAdmin ? 'support-request-card--unread' : ''}`.trim()}
      >
        <div className="support-request-card__toolbar">
          <div className="support-request-card__ticket">
            {!ticket.readByAdmin ? <span className="support-ticket-unread" aria-label="Chưa đọc" /> : null}
            <strong>{ticket.ticketCode}</strong>
          </div>
          <span className={statusMeta.className}>{statusMeta.label}</span>
        </div>
        <div className="support-request-card__head">Yêu cầu từ khách hàng</div>
        <dl className="support-request-card__grid">
          <div>
            <dt>Danh mục</dt>
            <dd>{getCategoryLabel(ticket.category)}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{ticket.ownerEmail || '—'}</dd>
          </div>
          <div>
            <dt>Họ tên</dt>
            <dd>{ticket.ownerName || '—'}</dd>
          </div>
          <div>
            <dt>Thời gian</dt>
            <dd>{formatDateTime(ticket.createdAt)}</dd>
          </div>
        </dl>
        <div className="support-request-card__description">
          <span>Mô tả</span>
          <p>{ticket.description || 'Không có mô tả'}</p>
        </div>
        {ticket.liveRequested ? (
          <p className="support-request-card__live">
            {ticket.liveConnected
              ? `Live: ${ticket.assignedStaffName || ticket.assignedStaffEmail || 'Đã có người nhận'}`
              : 'Live: Đang chờ staff/admin nhận'}
          </p>
        ) : null}
        {actions}
      </div>
    );

    if (asButton && onClick) {
      return (
        <button
          key={ticket.ticketCode}
          type="button"
          onClick={onClick}
          className="support-request-card-btn"
        >
          {card}
        </button>
      );
    }

    return card;
  };

  return (
    <AdminPage>
      <PageHeader
        eyebrow="NASAFilm · Support Inbox"
        title="Hỗ trợ khách hàng"
        description="Ticket từ chatbot sẽ đổ vào đây. Admin có thể chat qua lại theo từng mã ticket, đồng bộ realtime."
        secondaryActions={[
          {
            label: 'Làm mới',
            onClick: loadTickets,
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
          <div className="support-kpi-label">Mới</div>
          <div className="support-kpi-value support-kpi-value--warn">{ticketStats.open}</div>
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

      <div className="support-kpi-grid" style={{ marginTop: '-0.25rem' }}>
        <div className="support-kpi-card">
          <div className="support-kpi-label">Staff online</div>
          <div className="support-kpi-value support-kpi-value--success">
            {liveAvailability.agents?.length || 0}
          </div>
        </div>
        <div className="support-kpi-card">
          <div className="support-kpi-label">Yêu cầu live chờ nhận</div>
          <div className="support-kpi-value support-kpi-value--warn">
            {liveQueue.length}
          </div>
        </div>
      </div>

      <div className="support-list-panel" style={{ marginBottom: '1rem', minHeight: 'auto', maxHeight: 'none' }}>
        <div className="support-list-head">
          <div className="support-list-title">
            <Headphones className="w-4 h-4" />
            Hàng chờ chat trực tiếp
          </div>
          <p className="support-list-desc">
            {liveAvailability.anyOnline
              ? `${liveAvailability.agents?.length || 0} staff/admin đang online`
              : 'Hiện chưa có staff/admin online'}
          </p>
        </div>
        <div className="support-ticket-list">
          {liveQueue.length === 0 ? (
            <div className="support-list-empty">
              Chưa có yêu cầu chat trực tiếp nào đang chờ nhận.
            </div>
          ) : (
            liveQueue.map((ticket) => (
              <div key={ticket.ticketCode}>
                {renderTicketRequestCard(ticket, {
                  isActive: true,
                  asButton: false,
                  actions: (
                    <div className="support-request-card__actions">
                      <PrimaryButton
                        type="button"
                        loading={processingLiveTicket === ticket.ticketCode}
                        onClick={() => handleAcceptLiveSupport(ticket.ticketCode)}
                      >
                        Nhận
                      </PrimaryButton>
                      <button
                        type="button"
                        className="support-filter-tab"
                        disabled={processingLiveTicket === ticket.ticketCode}
                        onClick={() => handleRejectLiveSupport(ticket.ticketCode)}
                      >
                        Từ chối
                      </button>
                    </div>
                  ),
                })}
              </div>
            ))
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
              {filteredTickets.length} / {tickets.length} ticket hiển thị
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
                {tickets.length === 0 ? 'Chưa có ticket hỗ trợ nào.' : 'Không tìm thấy ticket phù hợp.'}
              </div>
            ) : (
              filteredTickets.map((ticket) => renderTicketRequestCard(ticket, {
                isActive: selectedTicketCode === ticket.ticketCode,
                onClick: () => setSelectedTicketCode(ticket.ticketCode),
              }))
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
                  </div>
                </div>
                <span className={getStatusMeta(selectedTicket.status).className}>
                  {getStatusMeta(selectedTicket.status).label}
                </span>
              </header>

              {selectedTicket.status === 'DONE' && (
                <div className="support-state" style={{ minHeight: 'auto', marginBottom: '0.75rem' }}>
                  <p className="support-state-title">
                    {selectedTicket.satisfactionRating
                      ? `Khách đã đánh giá: ${selectedTicket.satisfactionLabel}`
                      : 'Hỗ trợ đã kết thúc'}
                  </p>
                  <p className="support-state-desc">
                    {selectedTicket.satisfactionRating
                      ? 'Bạn có thể xóa ticket này vì hỗ trợ đã hoàn tất.'
                      : 'Ticket đã được đánh dấu DONE. Nếu không cần giữ lại, bạn có thể xóa ngay.'}
                  </p>
                  <div className="support-compose-footer" style={{ justifyContent: 'flex-end' }}>
                    <button type="button" className="support-filter-tab" onClick={handleDeleteTicket}>
                      Xóa ticket
                    </button>
                  </div>
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
                  <div className="flex gap-2 items-center">
                    {selectedTicket.status !== 'DONE' && (
                      <button type="button" className="support-filter-tab" onClick={handleDeleteTicket} disabled={loading}>
                        Xóa ticket
                      </button>
                    )}
                    {selectedTicket.status !== 'DONE' && (
                      <button type="button" className="support-filter-tab support-filter-tab--active" onClick={handleFinishSupport} disabled={loading}>
                        Gửi cảm ơn & kết thúc
                      </button>
                    )}
                    <PrimaryButton
                      type="button"
                      disabled={!draft.trim()}
                      loading={loading}
                      onClick={handleReply}
                    >
                      <Send className="h-4 w-4" />
                      Gửi phản hồi
                    </PrimaryButton>
                  </div>
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
                Chọn một ticket từ danh sách bên trái để xem hội thoại và phản hồi khách hàng.
              </p>
            </div>
          )}
        </section>
      </div>
    </AdminPage>
  );
};

export default SupportInboxPage;
