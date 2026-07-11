import { authService } from '../../features/auth/api/authService';

export const userNotificationApi = {
  async list() {
    const response = await authService.api.get('/api/notifications');
    return response.data.data ?? response.data ?? [];
  },

  async markAllRead() {
    const response = await authService.api.put('/api/notifications/read-all');
    return response.data.data ?? response.data;
  },

  async deleteAll() {
    const response = await authService.api.delete('/api/notifications');
    return response.data.data ?? response.data;
  },

  async subscribePush(subscription) {
    const json = subscription.toJSON();
    const response = await authService.api.post('/api/notifications/push/subscribe', {
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    });
    return response.data.data ?? response.data;
  },
};

export default userNotificationApi;
