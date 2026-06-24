import { authService } from '../../features/auth/api/authService';

class PromotionService {
  async getMyVouchers() {
    try {
      const response = await authService.api.get('/api/promotions/my-vouchers');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getVoucherCatalog() {
    try {
      const response = await authService.api.get('/api/promotions/catalog');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getPublicPromotions() {
    try {
      const response = await authService.api.get('/api/promotions/public');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async redeemVoucher(promotionId) {
    try {
      const response = await authService.api.post(`/api/promotions/${promotionId}/redeem`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const promotionService = new PromotionService();
export default promotionService;
