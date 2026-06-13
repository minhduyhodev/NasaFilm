import { authService } from '../../auth/api/authService';

class AdminPromotionService {
  async getPromotions() {
    try {
      const response = await authService.api.get(`/api/admin/promotions`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createPromotion(promoData) {
    try {
      const response = await authService.api.post(`/api/admin/promotions`, promoData);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updatePromotion(id, promoData) {
    try {
      const response = await authService.api.put(`/api/admin/promotions/${id}`, promoData);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async deletePromotion(id) {
    try {
      const response = await authService.api.delete(`/api/admin/promotions/${id}`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const adminPromotionService = new AdminPromotionService();
export default adminPromotionService;
