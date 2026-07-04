import { authService } from '../../features/auth/api/authService';

export const supportService = {
  async chatSupport(payload) {
    const response = await authService.api.post('/api/support-ai/chat', payload);
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

  async getAdminSupportRequests() {
    const response = await authService.api.get('/api/admin/support');
    return response.data.data ?? response.data;
  },

  async sendAdminSupportMessage(ticketCode, payload) {
    const response = await authService.api.post(`/api/admin/support/${ticketCode}/messages`, payload);
    return response.data.data ?? response.data;
  },
};

export default supportService;
