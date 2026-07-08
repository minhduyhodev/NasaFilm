import { authService } from '../../features/auth/api/authService';

class OrbitService {
  async getFeatureStatus() {
    try {
      const response = await authService.api.get('/api/orbit-rooms/feature-status');
      return response.data.data ?? response.data;
    } catch {
      return { enabled: false };
    }
  }

  async createRoom(showtimeUuid, maxMembers = 8) {
    try {
      const response = await authService.api.post('/api/orbit-rooms', {
        showtimeUuid,
        maxMembers,
      });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async joinRoom(roomUuid) {
    try {
      const response = await authService.api.post(`/api/orbit-rooms/${roomUuid}/join`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async leaveRoom(roomUuid) {
    try {
      const response = await authService.api.delete(`/api/orbit-rooms/${roomUuid}/leave`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async cancelRoom(roomUuid) {
    try {
      const response = await authService.api.delete(`/api/orbit-rooms/${roomUuid}`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getRoom(roomUuid) {
    try {
      const response = await authService.api.get(`/api/orbit-rooms/${roomUuid}`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getActiveRooms() {
    try {
      const response = await authService.api.get('/api/orbit-rooms/active');
      const data = response.data.data ?? response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateMemberSeats(roomUuid, seatUuids) {
    try {
      const response = await authService.api.put(`/api/orbit-rooms/${roomUuid}/seats`, {
        seatUuids,
      });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async prepareCheckout(roomUuid) {
    try {
      const response = await authService.api.post(`/api/orbit-rooms/${roomUuid}/prepare-checkout`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async abortCheckout(roomUuid) {
    try {
      const response = await authService.api.post(`/api/orbit-rooms/${roomUuid}/abort-checkout`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getChatMessages(roomUuid) {
    try {
      const response = await authService.api.get(`/api/orbit-rooms/${roomUuid}/messages`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async sendChatMessage(roomUuid, message) {
    try {
      const response = await authService.api.post(`/api/orbit-rooms/${roomUuid}/messages`, { message });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateMemberCombos(roomUuid, combos, completed) {
    try {
      const response = await authService.api.put(`/api/orbit-rooms/${roomUuid}/member-combos`, {
        combos,
        completed,
      });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const orbitService = new OrbitService();
