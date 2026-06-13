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
}

export const promotionService = new PromotionService();
export default promotionService;
