import { authService } from '../../auth/api/authService';

const parseSpringPage = (data) => {
  const page = data?.content !== undefined ? data : { content: Array.isArray(data) ? data : [] };
  return {
    items: page.content ?? [],
    total: page.totalElements ?? page.content?.length ?? 0,
    page: (page.number ?? 0) + 1,
    totalPages: page.totalPages ?? 1,
  };
};

class AdminMissionService {
  async getAnalytics() {
    try {
      const response = await authService.api.get('/api/admin/missions/analytics');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getTemplates({ deleted = false, query = '', page = 0, size = 10 } = {}) {
    try {
      const response = await authService.api.get('/api/admin/missions', {
        params: {
          deleted,
          query: query.trim() || undefined,
          page,
          size,
        },
      });
      return parseSpringPage(response.data.data ?? response.data);
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

  async toggleTemplateActive(template) {
    return this.upsertTemplate(
      buildTemplatePayload(template, { active: !template.active }),
    );
  }

  async getCampaigns({ query = '', page = 0, size = 10 } = {}) {
    try {
      const response = await authService.api.get('/api/admin/missions/campaigns', {
        params: {
          query: query.trim() || undefined,
          page,
          size,
        },
      });
      return parseSpringPage(response.data.data ?? response.data);
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

  async duplicateTemplate(sourceCode, newCode) {
    try {
      const response = await authService.api.post(
        `/api/admin/missions/${encodeURIComponent(sourceCode)}/duplicate`,
        { newCode },
      );
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async softDeleteTemplate(code) {
    try {
      const response = await authService.api.delete(
        `/api/admin/missions/${encodeURIComponent(code)}`,
      );
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async restoreTemplate(code) {
    try {
      const response = await authService.api.post(
        `/api/admin/missions/${encodeURIComponent(code)}/restore`,
      );
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async archiveCampaign(campaignUuid) {
    try {
      const response = await authService.api.post(
        `/api/admin/missions/campaigns/${campaignUuid}/archive`,
      );
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async deleteCampaign(campaignUuid) {
    try {
      const response = await authService.api.delete(
        `/api/admin/missions/campaigns/${campaignUuid}`,
      );
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const adminMissionService = new AdminMissionService();

export const MISSION_CONDITION_TYPES = [
  { value: 'GENRE_WINDOW', label: 'Khám phá thể loại phim' },
  { value: 'PREMIERE_BOOKING', label: 'Đặt vé phim mới ra mắt' },
  { value: 'HYBRID_THEATER_VOD', label: 'Xem rạp và mua online' },
  { value: 'ORBIT_ROOM_JOIN', label: 'Tham gia phòng Orbit' },
  { value: 'REVIEW_WITH_VIBE_TAG', label: 'Viết đánh giá có vibe tag' },
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

/** Mẫu nhiệm vụ hệ thống — admin chọn, không tự nhập mã. */
export const MISSION_PRESETS = [
  {
    code: 'EXPLORER',
    label: 'Khám phá phim — 3 thể loại khác nhau',
    title: 'Khám phá phim',
    description: 'Xem phim thuộc 3 thể loại khác nhau trong 30 ngày gần nhất.',
    conditionType: 'GENRE_WINDOW',
    conditionJson: '{"windowDays":30}',
    recurrence: 'MONTHLY',
    rewardPoints: 200,
    rewardBadgeCode: 'EXPLORER',
    rewardBadgeTitle: 'Khám phá phim',
    requiresFeature: null,
    targetValue: 3,
    sortOrder: 1,
  },
  {
    code: 'PREMIERE',
    label: 'Suất chiếu đầu — Đặt vé phim mới',
    title: 'Suất chiếu đầu',
    description: 'Đặt vé rạp trong 3 ngày đầu phim mới ra mắt.',
    conditionType: 'PREMIERE_BOOKING',
    conditionJson: '{"windowDays":3}',
    recurrence: 'ONCE',
    rewardPoints: 150,
    requiresFeature: null,
    targetValue: 1,
    sortOrder: 2,
  },
  {
    code: 'HYBRID_PILOT',
    label: 'Xem rạp + online — Cùng một bộ phim',
    title: 'Xem rạp + online',
    description: 'Xem cùng một bộ phim ở rạp và mua bản xem online.',
    conditionType: 'HYBRID_THEATER_VOD',
    conditionJson: '{}',
    recurrence: 'ONCE',
    rewardPoints: 100,
    requiresFeature: null,
    targetValue: 1,
    sortOrder: 3,
  },
  {
    code: 'SOCIAL_ORBIT',
    label: 'Đặt vé nhóm — Orbit (cần bật app.missions.orbit-seat-enabled)',
    title: 'Đặt vé nhóm',
    description: 'Tham gia phòng Orbit để đặt vé cùng bạn bè.',
    conditionType: 'ORBIT_ROOM_JOIN',
    conditionJson: '{}',
    recurrence: 'ONCE',
    rewardPoints: 100,
    requiresFeature: 'ORBIT_SEAT',
    targetValue: 1,
    sortOrder: 4,
  },
  {
    code: 'REVIEWER',
    label: 'Nhà phê bình — 5 đánh giá có vibe tag',
    title: 'Nhà phê bình',
    description: 'Viết 5 đánh giá có gắn vibe tag trên trang phim.',
    conditionType: 'REVIEW_WITH_VIBE_TAG',
    conditionJson: '{}',
    recurrence: 'ONCE',
    rewardPoints: 0,
    rewardBadgeCode: 'NASA_AUDIENCE',
    rewardBadgeTitle: 'Khán giả NASA',
    requiresFeature: null,
    targetValue: 5,
    sortOrder: 5,
  },
];

export const getMissionPreset = (code) =>
  MISSION_PRESETS.find((item) => item.code === code) ?? null;

export const buildTemplatePayload = (template, overrides = {}) => ({
  code: template.code,
  title: template.title,
  description: template.description || '',
  conditionType: template.conditionType,
  conditionJson: template.conditionJson || '{}',
  recurrence: template.recurrence || 'ONCE',
  campaignUuid: template.campaignUuid || null,
  rewardPoints: template.rewardPoints ?? 0,
  rewardBadgeCode: template.rewardBadgeCode || null,
  rewardBadgeTitle: template.rewardBadgeTitle || null,
  requiresFeature: template.requiresFeature || null,
  targetValue: template.targetValue ?? 1,
  active: template.active !== false,
  sortOrder: template.sortOrder ?? 0,
  ...overrides,
});
