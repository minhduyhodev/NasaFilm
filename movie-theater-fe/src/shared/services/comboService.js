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

  async getAdminCombos() {
    try {
      const response = await authService.api.get('/api/admin/combos');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createCombo(comboData) {
    try {
      const response = await authService.api.post('/api/admin/combos', comboData);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateCombo(uuid, comboData) {
    try {
      const response = await authService.api.put(`/api/admin/combos/${uuid}`, comboData);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async deleteCombo(uuid) {
    try {
      const response = await authService.api.delete(`/api/admin/combos/${uuid}`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async uploadComboImage(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await authService.api.post('/api/admin/combos/upload', formData, {
        headers: {
          'Content-Type': undefined,
        },
      });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const comboService = new ComboService();
export default comboService;
