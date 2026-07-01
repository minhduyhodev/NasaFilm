import { authService } from '../../features/auth/api/authService';

class MovieReviewService {
  async getSummary(movieUuid) {
    const response = await authService.api.get(`/api/movies/${movieUuid}/reviews/summary`);
    return response.data.data ?? response.data;
  }

  async getReviews(movieUuid, page = 0, size = 10, { sort, onlyWithComment, vibeTag } = {}) {
    const response = await authService.api.get(`/api/movies/${movieUuid}/reviews`, {
      params: {
        page,
        size,
        sort: sort || undefined,
        onlyWithComment: onlyWithComment || undefined,
        vibeTag: vibeTag || undefined,
      },
    });
    return response.data.data ?? response.data;
  }

  async createReview(movieUuid, { rating, comment, vibeTags }) {
    const response = await authService.api.post(`/api/movies/${movieUuid}/reviews`, {
      rating,
      comment: comment?.trim() || null,
      vibeTags: vibeTags?.length ? vibeTags : [],
    });
    return response.data.data ?? response.data;
  }

  async deleteReview(movieUuid, reviewUuid) {
    const response = await authService.api.delete(
      `/api/movies/${movieUuid}/reviews/${reviewUuid}`,
    );
    return response.data;
  }

  async reportReview(movieUuid, reviewUuid, reason) {
    const response = await authService.api.post(
      `/api/movies/${movieUuid}/reviews/${reviewUuid}/report`,
      { reason },
    );
    return response.data.data ?? response.data;
  }
}

export const movieReviewService = new MovieReviewService();
