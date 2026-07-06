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

  async createUser(userData) {
    try {
      const response = await authService.api.post('/api/admin/users', userData);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getPermissions() {
    try {
      const response = await authService.api.get('/api/admin/users/permissions');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateUserPermissions(userId, permissions) {
    try {
      const response = await authService.api.put(`/api/admin/users/${userId}/permissions`, { permissions });
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

  async updateUserScore(userId, score) {
    try {
      const response = await authService.api.put(`/api/admin/users/${userId}/score`, { score });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const adminUserService = new AdminUserService();
export default adminUserService;
