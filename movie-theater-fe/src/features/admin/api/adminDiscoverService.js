import { authService } from '../../auth/api/authService';

class AdminDiscoverService {
  async getAnalytics() {
    try {
      const response = await authService.api.get('/api/admin/discover/analytics');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getQuizConfig() {
    try {
      const response = await authService.api.get('/api/admin/discover/quiz-config');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateQuizSettings(payload) {
    try {
      const response = await authService.api.put('/api/admin/discover/quiz-settings', payload);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createQuizOption(payload) {
    try {
      const response = await authService.api.post('/api/admin/discover/quiz-options', payload);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateQuizOption(uuid, payload) {
    try {
      const response = await authService.api.put(`/api/admin/discover/quiz-options/${uuid}`, payload);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async deleteQuizOption(uuid) {
    try {
      const response = await authService.api.delete(`/api/admin/discover/quiz-options/${uuid}`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getSuggestions(params = {}) {
    try {
      const response = await authService.api.get('/api/admin/discover/suggestions', { params });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createSuggestion(payload) {
    try {
      const response = await authService.api.post('/api/admin/discover/suggestions', payload);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateSuggestion(uuid, payload) {
    try {
      const response = await authService.api.put(`/api/admin/discover/suggestions/${uuid}`, payload);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async deleteSuggestion(uuid) {
    try {
      const response = await authService.api.delete(`/api/admin/discover/suggestions/${uuid}`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const adminDiscoverService = new AdminDiscoverService();

export default adminDiscoverService;
