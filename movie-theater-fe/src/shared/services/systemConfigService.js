import { authService } from '../../features/auth/api/authService';
import {
  DEFAULT_SYSTEM_CONFIG,
  SYSTEM_CONFIG_STORAGE_KEY,
} from '../constants/systemConfig';
import { mergeSystemConfig, writeCachedSystemConfig } from '../utils/systemConfig';

class SystemConfigService {
  async getConfig() {
    try {
      const response = await authService.api.get('/api/system-config');
      const data = mergeSystemConfig(response.data.data ?? response.data);
      writeCachedSystemConfig(data);
      return data;
    } catch (error) {
      try {
        const cached = localStorage.getItem(SYSTEM_CONFIG_STORAGE_KEY);
        if (cached) {
          return mergeSystemConfig(JSON.parse(cached));
        }
      } catch {
        // ignore parse errors
      }
      return { ...DEFAULT_SYSTEM_CONFIG };
    }
  }

  async saveConfig(config) {
    try {
      const response = await authService.api.put('/api/admin/system-config', config);
      const data = mergeSystemConfig(response.data.data ?? response.data);
      writeCachedSystemConfig(data);
      return data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const systemConfigService = new SystemConfigService();
