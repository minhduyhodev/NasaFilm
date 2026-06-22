import { authService } from '../../auth/api/authService';

class AdminEmailTemplateService {
  async getTemplates() {
    try {
      const response = await authService.api.get('/api/admin/email-templates');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getTemplate(id) {
    try {
      const response = await authService.api.get(`/api/admin/email-templates/${id}`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createTemplate(payload) {
    try {
      const response = await authService.api.post('/api/admin/email-templates', payload);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateTemplate(id, payload) {
    try {
      const response = await authService.api.put(`/api/admin/email-templates/${id}`, payload);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async deleteTemplate(id) {
    try {
      const response = await authService.api.delete(`/api/admin/email-templates/${id}`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const adminEmailTemplateService = new AdminEmailTemplateService();
export default adminEmailTemplateService;
