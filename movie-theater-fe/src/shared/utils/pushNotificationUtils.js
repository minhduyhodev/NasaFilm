import { userNotificationApi } from '../services/userNotificationApi';
import { notificationService } from '../services/notificationService';

export const subscribeToWebPush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    notificationService.warning('Trình duyệt không hỗ trợ Web Push');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    notificationService.info('Bạn đã từ chối thông báo đẩy');
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: undefined,
    });
  }

  await userNotificationApi.subscribePush(subscription);
  notificationService.success('Đã bật thông báo đẩy');
  return true;
};

export default subscribeToWebPush;
