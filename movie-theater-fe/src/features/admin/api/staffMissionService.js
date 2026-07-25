import { authService } from '../../auth/api/authService';

class StaffMissionService {
  async getOperationalShowtimes() {
    try {
      const response = await authService.api.get('/api/staff/showtimes');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getShowtimeStats(showtimeUuid) {
    try {
      const response = await authService.api.get(`/api/staff/showtimes/${showtimeUuid}/stats`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async previewTicket(ticketCode, scanSource = 'MANUAL') {
    try {
      const response = await authService.api.get(
        `/api/staff/tickets/${encodeURIComponent(ticketCode)}/preview`,
        { params: { scanSource } },
      );
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async checkInTicket(ticketCode, scanSource = 'MANUAL', showtimeUuid = null) {
    try {
      const params = { scanSource };
      if (showtimeUuid) params.showtimeUuid = showtimeUuid;
      const response = await authService.api.put(
        `/api/staff/tickets/${encodeURIComponent(ticketCode)}/check-in`,
        null,
        { params },
      );
      return {
        data: response.data.data ?? response.data,
        message: response.data.message,
      };
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getRecentGateEvents(showtimeUuid, limit = 10) {
    try {
      const response = await authService.api.get(
        `/api/staff/showtimes/${showtimeUuid}/gate-events`,
        { params: { limit } },
      );
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const staffMissionService = new StaffMissionService();
export default staffMissionService;
