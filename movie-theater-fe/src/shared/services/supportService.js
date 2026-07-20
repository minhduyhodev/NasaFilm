import { authService } from '../../features/auth/api/authService';

/** Ticket/tin nhắn cần staff chú ý trên sidebar. */
function needsStaffAttention(ticket) {
  if (!ticket) return false;
  if (ticket.liveRequested && !ticket.liveConnected) return true;
  const status = `${ticket.status || ''}`.toUpperCase();
  if (status === 'PENDING' || status === 'OPEN' || status === 'NEW' || status === 'LIVE_REQUESTED') {
    return true;
  }
  if (status === 'IN_PROGRESS') {
    const sender = `${ticket.lastMessageSender || ''}`.toUpperCase();
    return sender === 'USER';
  }
  return false;
}

export const supportService = {
  async chatSupport(payload) {
    const response = await authService.api.post('/api/support-ai/chat', payload);
    return response.data.data ?? response.data;
  },

  async getSupportAiStatus() {
    const response = await authService.api.get('/api/support-ai/status');
    return response.data.data ?? response.data;
  },

  async getAiSessions() {
    const response = await authService.api.get('/api/support-ai/sessions');
    return response.data.data ?? response.data;
  },

  async getAiSessionMessages(sessionCode) {
    const response = await authService.api.get(`/api/support-ai/sessions/${sessionCode}/messages`);
    return response.data.data ?? response.data;
  },

  async createSupportRequest(payload) {
    const response = await authService.api.post('/api/support-requests', payload);
    return response.data.data ?? response.data;
  },

  async getMySupportRequests() {
    const response = await authService.api.get('/api/support-requests/my');
    return response.data.data ?? response.data;
  },

  async getLiveSupportAvailability() {
    const response = await authService.api.get('/api/support-live/availability');
    return response.data.data ?? response.data;
  },

  async requestLiveSupport(payload) {
    const response = await authService.api.post('/api/support-live/request', payload);
    return response.data.data ?? response.data;
  },

  async submitSatisfaction(ticketCode, payload) {
    const response = await authService.api.post(`/api/support-live/${ticketCode}/satisfaction`, payload);
    return response.data.data ?? response.data;
  },

  async fallbackLiveSupport(ticketCode) {
    const response = await authService.api.post(`/api/support-live/${ticketCode}/fallback`);
    return response.data.data ?? response.data;
  },

  async getSupportRequest(ticketCode) {
    const response = await authService.api.get(`/api/support-requests/${ticketCode}`);
    return response.data.data ?? response.data;
  },

  async getSupportMessages(ticketCode) {
    const response = await authService.api.get(`/api/support-requests/${ticketCode}/messages`);
    return response.data.data ?? response.data;
  },

  async sendSupportMessage(ticketCode, payload) {
    const response = await authService.api.post(`/api/support-requests/${ticketCode}/messages`, payload);
    return response.data.data ?? response.data;
  },

  async uploadSupportImages(files) {
    const formData = new FormData();
    (files || []).forEach((file) => {
      if (file) formData.append('files', file);
    });
    const response = await authService.api.post('/api/support-requests/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data ?? response.data;
  },

  async uploadAdminSupportImages(files) {
    const formData = new FormData();
    (files || []).forEach((file) => {
      if (file) formData.append('files', file);
    });
    const response = await authService.api.post('/api/admin/support/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data ?? response.data;
  },

  async cancelSupportRequest(ticketCode) {
    const response = await authService.api.post(`/api/support-requests/${ticketCode}/cancel`);
    return response.data.data ?? response.data;
  },

  async getAdminSupportRequests({ page = 0, size = 100 } = {}) {
    const response = await authService.api.get('/api/admin/support', { params: { page, size } });
    const data = response.data.data ?? response.data;
    if (Array.isArray(data)) return data;
    return data?.content ?? [];
  },

  async getAdminSupportRequest(ticketCode) {
    const response = await authService.api.get(`/api/admin/support/${ticketCode}`);
    return response.data.data ?? response.data;
  },

  async getAdminSupportMessages(ticketCode) {
    const response = await authService.api.get(`/api/admin/support/${ticketCode}/messages`);
    return response.data.data ?? response.data;
  },

  async getPendingLiveSupportRequests() {
    const response = await authService.api.get('/api/admin/support-live/pending');
    return response.data.data ?? response.data;
  },

  /**
   * Số ticket/tin cần staff chú ý: chờ nhận, live request, hoặc đang xử lý mà khách vừa nhắn.
   */
  async getSupportAttentionCount() {
    const [tickets, livePending] = await Promise.all([
      this.getAdminSupportRequests({ page: 0, size: 100 }),
      this.getPendingLiveSupportRequests().catch(() => []),
    ]);
    const list = Array.isArray(tickets) ? tickets : [];
    const liveList = Array.isArray(livePending) ? livePending : [];
    const codes = new Set();

    const markIfAttention = (ticket) => {
      if (!ticket?.ticketCode) return;
      if (needsStaffAttention(ticket)) codes.add(ticket.ticketCode);
    };

    list.forEach(markIfAttention);
    liveList.forEach(markIfAttention);
    return codes.size;
  },

  async acceptLiveSupport(ticketCode) {
    const response = await authService.api.post(`/api/admin/support-live/${ticketCode}/accept`);
    return response.data.data ?? response.data;
  },

  async rejectLiveSupport(ticketCode) {
    const response = await authService.api.post(`/api/admin/support-live/${ticketCode}/reject`);
    return response.data.data ?? response.data;
  },

  async deleteSupportTicket(ticketCode) {
    const response = await authService.api.delete(`/api/admin/support/${ticketCode}`);
    return response.data.data ?? response.data;
  },

  async sendAdminSupportMessage(ticketCode, payload) {
    const response = await authService.api.post(`/api/admin/support/${ticketCode}/messages`, payload);
    return response.data.data ?? response.data;
  },

  async updateAdminSupportStatus(ticketCode, payload) {
    const response = await authService.api.patch(`/api/admin/support/${ticketCode}/status`, payload);
    return response.data.data ?? response.data;
  },
};

export default supportService;
