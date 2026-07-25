import { authService } from '../../auth/api/authService';

const parseSpringPage = (data) => {
  const page = data?.content !== undefined ? data : { content: Array.isArray(data) ? data : [] };
  return {
    items: page.content ?? [],
    total: page.totalElements ?? page.content?.length ?? 0,
    page: (page.number ?? 0) + 1,
    totalPages: Math.max(1, page.totalPages ?? 1),
  };
};

class AdminUserService {
  async getUsers({ query = '', status = '', audience = 'CUSTOMER', page = 0, size = 10 } = {}) {
    try {
      const response = await authService.api.get('/api/admin/users', {
        params: {
          query: query.trim() || undefined,
          status: status && status !== 'all' ? status : undefined,
          audience,
          page,
          size,
        },
      });
      return parseSpringPage(response.data.data ?? response.data);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getUserStats() {
    try {
      const response = await authService.api.get('/api/admin/users/stats');
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
