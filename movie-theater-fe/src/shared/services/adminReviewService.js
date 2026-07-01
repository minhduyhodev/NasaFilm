import { authService } from '../../features/auth/api/authService';

class AdminReviewService {
  async getReports({ status, excludeStatus, page = 0, size = 10 } = {}) {
    const response = await authService.api.get('/api/admin/review-moderation/reports', {
      params: {
        status: status || undefined,
        excludeStatus: excludeStatus || undefined,
        page,
        size,
      },
    });
    return response.data.data ?? response.data;
  }

  async getPendingReportCount() {
    const response = await authService.api.get('/api/admin/review-moderation/reports/pending-count');
    return response.data.data ?? response.data ?? 0;
  }

  async resolveReport(reportUuid, { action, note }) {
    const response = await authService.api.post(
      `/api/admin/review-moderation/reports/${reportUuid}/resolve`,
      { action, note },
    );
    return response.data.data ?? response.data;
  }

  async getBannedWords() {
    const response = await authService.api.get('/api/admin/review-moderation/banned-words');
    return response.data.data ?? response.data ?? [];
  }

  async updateBannedWords(words) {
    const response = await authService.api.put('/api/admin/review-moderation/banned-words', {
      words,
    });
    return response.data.data ?? response.data;
  }

  async getVibeTags() {
    const response = await authService.api.get('/api/admin/review-vibe-tags');
    return response.data.data ?? response.data ?? [];
  }

  async createVibeTag(payload) {
    const response = await authService.api.post('/api/admin/review-vibe-tags', payload);
    return response.data.data ?? response.data;
  }

  async updateVibeTag(uuid, payload) {
    const response = await authService.api.put(`/api/admin/review-vibe-tags/${uuid}`, payload);
    return response.data.data ?? response.data;
  }
}

export const adminReviewService = new AdminReviewService();
