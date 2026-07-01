import { authService } from '../../features/auth/api/authService';
import { notificationService } from './notificationService';

class MissionService {
  async getMissionBoard() {
    try {
      const response = await authService.api.get('/api/user/missions');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getBadges() {
    try {
      const response = await authService.api.get('/api/user/badges');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const missionService = new MissionService();

export const showMissionCompletionToasts = (completions = []) => {
  if (!Array.isArray(completions) || completions.length === 0) {
    return;
  }

  completions.forEach((item) => {
    const badgeText = item?.badge?.title ? ` Huy hiệu: ${item.badge.title}.` : '';
    const pointsText = item?.pointsAwarded > 0 ? `+${item.pointsAwarded} điểm NASA.` : '';
    const message = `Hoàn thành nhiệm vụ "${item.title}". ${pointsText}${badgeText}`.trim();
    notificationService.success(message, { autoClose: 6000 });
  });
};
