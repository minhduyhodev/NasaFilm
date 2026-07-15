import { authService } from '../../auth/api/authService';

class AdminDashboardService {
  async getDashboardStats() {
    try {
      const response = await authService.api.get(`/api/admin/dashboard/stats`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getRevenueSeries(granularity = 'day', date = null) {
    try {
      const params = { granularity };
      if (date) params.date = date;
      const response = await authService.api.get(`/api/admin/dashboard/revenue-series`, { params });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const adminDashboardService = new AdminDashboardService();
export default adminDashboardService;
