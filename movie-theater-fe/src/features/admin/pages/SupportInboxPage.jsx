import React, { useEffect, useMemo, useState } from 'react';
import { BadgeInfo, MessageSquareReply, RefreshCw, Send } from 'lucide-react';
import { supportService } from '../../../shared/services/supportService';
import { notificationService } from '../../../shared/services/notificationService';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';

const COMBO_PROMO_STORAGE_KEY = 'nasafilm.promo.combo';
const MOVIE_PROMO_STORAGE_KEY = 'nasafilm.promo.movie';

const SupportInboxPage = () => {
  const { user } = useAuthContext();
  const [tickets, setTickets] = useState([]);
  const [selectedTicketCode, setSelectedTicketCode] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const isAdminUser = useMemo(() => {
    const roles = (user?.roles || []).map((role) => `${role}`.toLowerCase());
    return roles.includes('admin');
  }, [user]);

  const selectedTicket = useMemo(
    () => tickets.find((item) => item.ticketCode === selectedTicketCode) || null,
    [tickets, selectedTicketCode],
  );

  const loadTickets = async () => {
    try {
      const list = await supportService.getAdminSupportRequests();
      setTickets(Array.isArray(list) ? list : []);
      if (!selectedTicketCode && list?.[0]?.ticketCode) {
        setSelectedTicketCode(list[0].ticketCode);
      }
    } catch (err) {
      notificationService.error(err?.response?.data?.message || 'Không tải được danh sách ticket hỗ trợ.');
    }
  };

  const loadMessages = async (ticketCode = selectedTicketCode) => {
    if (!ticketCode) return;
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

  return (
    <div className="dashboard-page">
      <header className="dashboard-page-header">
        <div>
          <p className="dashboard-page-eyebrow">NASAFilm · Support Inbox</p>
          <h1 className="dashboard-page-title">Hỗ trợ khách hàng</h1>
          <p className="dashboard-page-desc">Ticket từ chatbot sẽ đổ vào đây. Admin có thể chat qua lại theo từng mã ticket.</p>
        </div>
        <button type="button" className="dashboard-action-btn" onClick={loadTickets}>
          <RefreshCw className="w-4 h-4" />
          Làm mới
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="dashboard-mini-panel space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Ticket hỗ trợ</div>
            <div className="mt-2 text-sm text-gray-300">Danh sách ticket từ chatbot, đồng bộ theo realtime và chat qua lại với từng mã.</div>
          </div>

          {tickets.map((ticket) => (
            <button
              key={ticket.ticketCode}
              type="button"
              onClick={() => setSelectedTicketCode(ticket.ticketCode)}
              className={`w-full text-left rounded-xl border px-4 py-3 transition ${selectedTicketCode === ticket.ticketCode ? 'border-red-500/40 bg-red-500/10' : 'border-white/10 bg-white/5 hover:bg-white/8'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <strong className="text-white">{ticket.ticketCode}</strong>
                <span className="text-[11px] text-gray-400">{ticket.status}</span>
              </div>
              <div className="mt-1 text-xs text-gray-300 line-clamp-2">{ticket.description}</div>
              <div className="mt-2 text-[11px] text-gray-500">{ticket.category} · {ticket.ownerEmail}</div>
            </button>
          ))}
        </div>

        <div className="dashboard-mini-panel flex min-h-[70vh] flex-col">
          {selectedTicket ? (
            <>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <div className="text-lg font-black text-white">{selectedTicket.ticketCode}</div>
                  <div className="text-xs text-gray-400">{selectedTicket.category} · {selectedTicket.ownerEmail}</div>
                </div>
                <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-300">{selectedTicket.status}</span>
              </div>

              <div className="mt-4 flex-1 space-y-3 overflow-auto pr-1">
                {messages.map((message) => (
                  <div key={message.uuid} className={`flex ${message.senderRole === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${message.senderRole === 'ADMIN' ? 'bg-red-600 text-white' : 'bg-white/8 text-white'}`}>
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider opacity-70">
                        {message.senderRole === 'ADMIN' ? 'Admin' : 'User'}
                      </div>
                      {message.message}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full min-h-24 resize-none rounded-xl border border-white/10 bg-[#0a0d16] px-4 py-3 text-sm text-white outline-none"
                  placeholder="Phản hồi cho khách..."
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleReply}
                    className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                    Gửi phản hồi
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-gray-400">
              <div className="text-center">
                <BadgeInfo className="mx-auto mb-3 h-10 w-10 text-red-400" />
                Chưa có ticket hỗ trợ nào.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportInboxPage;
