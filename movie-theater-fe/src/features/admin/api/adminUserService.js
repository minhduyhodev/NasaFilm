import { authService } from '../../auth/api/authService';

class AdminUserService {
  async getUsers(query = '') {
    try {
      const response = await authService.api.get(`/api/admin/users`, {
        params: { query },
      });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateUserStatus(userId, status) {
    try {
      const response = await authService.api.put(`/api/admin/users/${userId}/status`, { status });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateUserRole(userId, roleName) {
    try {
      const response = await authService.api.put(`/api/admin/users/${userId}/role`, { roleName });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const adminUserService = new AdminUserService();
export default adminUserService;
