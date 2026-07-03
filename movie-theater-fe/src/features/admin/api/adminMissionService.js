import { authService } from '../../auth/api/authService';

class AdminMissionService {
  async getTemplates() {
    try {
      const response = await authService.api.get('/api/admin/missions');
      return response.data.data ?? response.data ?? [];
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async upsertTemplate(payload) {
    try {
      const response = await authService.api.post('/api/admin/missions', payload);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getCampaigns() {
    try {
      const response = await authService.api.get('/api/admin/missions/campaigns');
      return response.data.data ?? response.data ?? [];
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async upsertCampaign(payload) {
    try {
      const response = await authService.api.post('/api/admin/missions/campaigns', payload);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const adminMissionService = new AdminMissionService();

export const MISSION_CONDITION_TYPES = [
  { value: 'GENRE_WINDOW', label: 'Khám phá thể loại' },
  { value: 'PREMIERE_BOOKING', label: 'Đặt vé premiere' },
  { value: 'HYBRID_THEATER_VOD', label: 'Hybrid rạp + VOD' },
  { value: 'ORBIT_ROOM_JOIN', label: 'Orbit Seat' },
  { value: 'REVIEW_WITH_VIBE_TAG', label: 'Review có vibe tag' },
];

export const MISSION_RECURRENCE_TYPES = [
  { value: 'ONCE', label: 'Một lần' },
  { value: 'WEEKLY', label: 'Hàng tuần' },
  { value: 'MONTHLY', label: 'Hàng tháng' },
];

export const MISSION_CAMPAIGN_STATUSES = [
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'ACTIVE', label: 'Đang chạy' },
  { value: 'ARCHIVED', label: 'Lưu trữ' },
];
