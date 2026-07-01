import { authService } from '../../features/auth/api/authService';

class MovieReviewService {
  async getSummary(movieUuid) {
    try {
      const response = await authService.api.get(`/api/movies/${movieUuid}/reviews/summary`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getReviews(movieUuid, page = 0, size = 10, { sort, onlyWithComment, vibeTag } = {}) {
    try {
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
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createReview(movieUuid, { rating, comment, vibeTags }) {
    try {
      const response = await authService.api.post(`/api/movies/${movieUuid}/reviews`, {
        rating,
        comment: comment?.trim() || null,
        vibeTags: vibeTags?.length ? vibeTags : [],
      });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async deleteReview(movieUuid, reviewUuid) {
    try {
      const response = await authService.api.delete(
        `/api/movies/${movieUuid}/reviews/${reviewUuid}`,
      );
      return response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async reportReview(movieUuid, reviewUuid, reason) {
    try {
      const response = await authService.api.post(
        `/api/movies/${movieUuid}/reviews/${reviewUuid}/report`,
        { reason },
      );
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const movieReviewService = new MovieReviewService();
