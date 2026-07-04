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
  User,
} from 'lucide-react';
import { supportService } from '../../../shared/services/supportService';
import { notificationService } from '../../../shared/services/notificationService';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { AdminPage, PageHeader, PrimaryButton } from '../components';
import './SupportInboxPage.css';

const STATUS_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'open', label: 'Mới' },
  { id: 'progress', label: 'Đang xử lý' },
  { id: 'resolved', label: 'Đã đóng' },
];

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

function formatListTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ`;
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function getStatusMeta(status) {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'OPEN' || normalized === 'NEW') {
    return { label: 'Mới', className: 'support-status support-status--open', bucket: 'open' };
  }
  if (normalized === 'IN_PROGRESS') {
    return { label: 'Đang xử lý', className: 'support-status support-status--progress', bucket: 'progress' };
  }
  if (normalized === 'RESOLVED' || normalized === 'CLOSED') {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const messagesEndRef = useRef(null);

  const selectedTicket = useMemo(
    () => tickets.find((item) => item.ticketCode === selectedTicketCode) || null,
    [tickets, selectedTicketCode],
  );

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

  const loadMessages = async (ticketCode = selectedTicketCode) => {
    if (!ticketCode) {
      setMessages([]);
      return;
    }
    try {
      const list = await supportService.getSupportMessages(ticketCode);
      setMessages(Array.isArray(list) ? list : []);
    } catch {
      setMessages([]);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    loadMessages(selectedTicketCode);
  }, [selectedTicketCode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedTicketCode]);

  useRealtimeTopic(REALTIME_TOPICS.ADMIN_SUPPORT, loadTickets);
  useRealtimeTopic(
    selectedTicketCode ? REALTIME_TOPICS.supportTicket(selectedTicketCode) : null,
    () => loadMessages(selectedTicketCode),
  );

  const handleReply = async () => {
    const value = draft.trim();
    if (!value || !selectedTicketCode) return;
    setLoading(true);
    try {
      await supportService.sendAdminSupportMessage(selectedTicketCode, { message: value, status: 'IN_PROGRESS' });
      setDraft('');
      await loadMessages(selectedTicketCode);
      await loadTickets();
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
              filteredTickets.map((ticket) => {
                const statusMeta = getStatusMeta(ticket.status);
                const isActive = selectedTicketCode === ticket.ticketCode;
                const preview = ticket.lastMessage || ticket.description || 'Không có nội dung';
                return (
                  <button
                    key={ticket.ticketCode}
                    type="button"
                    onClick={() => setSelectedTicketCode(ticket.ticketCode)}
                    className={`support-ticket-card ${isActive ? 'support-ticket-card--active' : ''}`}
                  >
                    <div className="support-ticket-card-top">
                      <div className="flex items-start gap-2 min-w-0">
                        {!ticket.readByAdmin && <span className="support-ticket-unread" aria-label="Chưa đọc" />}
                        <strong className="support-ticket-code truncate">{ticket.ticketCode}</strong>
                      </div>
                      <span className={statusMeta.className}>{statusMeta.label}</span>
                    </div>
                    <p className="support-ticket-preview">{preview}</p>
                    <div className="support-ticket-meta">
                      <span className="support-ticket-owner">{ticket.ownerEmail}</span>
                      <span>{formatListTime(ticket.updatedAt || ticket.createdAt)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="support-chat-panel">
          {selectedTicket ? (
            <>
              <header className="support-chat-head">
                <div className="min-w-0">
                  <div className="support-chat-title">{selectedTicket.ticketCode}</div>
                  <div className="support-chat-subtitle">
                    <User className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                    {selectedTicket.ownerName || selectedTicket.ownerEmail}
                    {selectedTicket.ownerName && (
                      <span> · {selectedTicket.ownerEmail}</span>
                    )}
                  </div>
                  {selectedTicket.category && (
                    <div className="support-chat-category">
                      <Headphones className="w-3 h-3" />
                      {selectedTicket.category}
                    </div>
                  )}
                </div>
                <span className={getStatusMeta(selectedTicket.status).className}>
                  {getStatusMeta(selectedTicket.status).label}
                </span>
              </header>

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
                    return (
                      <div
                        key={message.uuid}
                        className={`support-message-row ${isAdmin ? 'support-message-row--admin' : 'support-message-row--user'}`}
                      >
                        <div className={`support-bubble ${isAdmin ? 'support-bubble--admin' : 'support-bubble--user'}`}>
                          <div className="support-bubble-head">
                            <span className="support-bubble-sender">
                              {isAdmin ? (message.senderName || 'Admin') : (message.senderName || 'Khách hàng')}
                            </span>
                            {message.createdAt && (
                              <span className="support-bubble-time">{formatDateTime(message.createdAt)}</span>
                            )}
                          </div>
                          <div className="support-bubble-text">{message.message}</div>
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
                    disabled={!draft.trim()}
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
