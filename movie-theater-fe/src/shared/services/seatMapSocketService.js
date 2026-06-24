import { stompSocketService } from './stompSocketService';
import { REALTIME_TOPICS } from '../constants/realtimeTopics';

class SeatMapSocketService {
  subscribe(showtimeUuid, onUpdate) {
    if (!showtimeUuid || typeof onUpdate !== 'function') {
      return () => {};
    }
    return stompSocketService.subscribe(REALTIME_TOPICS.showtimeSeats(showtimeUuid), onUpdate);
  }
}

export const seatMapSocketService = new SeatMapSocketService();
export default seatMapSocketService;
