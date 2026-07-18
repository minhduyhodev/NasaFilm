import { authService } from '../../features/auth/api/authService';

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
