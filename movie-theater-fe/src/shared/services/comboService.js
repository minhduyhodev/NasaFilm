import { authService } from '../../features/auth/api/authService';

class ComboService {
  async getActiveCombos() {
    try {
      const response = await authService.api.get('/api/combos/active');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const comboService = new ComboService();
export default comboService;
