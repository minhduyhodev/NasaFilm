import { authService } from '../../features/auth/api/authService';

class PreShowService {
  async getBoardingPass(bookingUuid) {
    try {
      const response = await authService.api.get(`/api/pre-show/boarding/${bookingUuid}`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const preShowService = new PreShowService();
export default preShowService;
