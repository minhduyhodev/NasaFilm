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

  async getReviews({ movieUuid, status, query, page = 0, size = 10 } = {}) {
    const response = await authService.api.get('/api/admin/review-moderation/reviews', {
      params: {
        movieUuid: movieUuid || undefined,
        status: status || undefined,
        query: query || undefined,
        page,
        size,
      },
    });
    return response.data.data ?? response.data;
  }

  async updateReviewStatus(reviewUuid, { status, note }) {
    const response = await authService.api.put(
      `/api/admin/review-moderation/reviews/${reviewUuid}/status`,
      { status, note },
    );
    return response.data.data ?? response.data;
  }

  async deleteReview(reviewUuid) {
    const response = await authService.api.delete(
      `/api/admin/review-moderation/reviews/${reviewUuid}`,
    );
    return response.data;
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
}

export const adminReviewService = new AdminReviewService();
