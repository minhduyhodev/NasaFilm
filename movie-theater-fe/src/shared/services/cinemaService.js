import { authService } from '../../features/auth/api/authService';

class CinemaService {
  async getCinemas(keyword = '', page = 0, size = 10) {
    try {
      const response = await authService.api.get('/api/cinemas', {
        params: { keyword, page, size }
      });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getCinemaDetail(cinemaUuid) {
    try {
      const response = await authService.api.get(`/api/cinemas/${cinemaUuid}`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createCinema(data) {
    try {
      const response = await authService.api.post('/api/admin/cinemas', data);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateCinema(cinemaUuid, data) {
    try {
      const response = await authService.api.put(`/api/admin/cinemas/${cinemaUuid}`, data);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getRoomsByCinema(cinemaUuid) {
    try {
      const response = await authService.api.get(`/api/cinemas/${cinemaUuid}/rooms`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createRoom(cinemaUuid, data) {
    try {
      const response = await authService.api.post(`/api/admin/cinemas/${cinemaUuid}/rooms`, data);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateRoom(roomUuid, data) {
    try {
      const response = await authService.api.put(`/api/admin/rooms/${roomUuid}`, data);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async generateSeats(roomUuid, rowCount = 8, seatsPerRow = 12) {
    try {
      const response = await authService.api.post(`/api/admin/rooms/${roomUuid}/seats/generate`, {
        rowCount,
        seatsPerRow
      });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getSeatsByRoom(roomUuid) {
    try {
      const response = await authService.api.get(`/api/rooms/${roomUuid}/seats`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateSeat(seatUuid, data) {
    try {
      const response = await authService.api.put(`/api/admin/seats/${seatUuid}`, data);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const cinemaService = new CinemaService();
export default cinemaService;
