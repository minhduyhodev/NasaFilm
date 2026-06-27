import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const resolveWsUrl = () => {
  const configured = import.meta.env.VITE_WS_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return `${apiUrl.replace(/\/$/, '')}/ws`;
  }
  return `${window.location.origin}/ws`;
};

class StompSocketService {
  constructor() {
    this.client = null;
    this.connectPromise = null;
    this.activeSubscriptions = new Map();
    this.subscriptionCounter = 0;
  }

  ensureConnected() {
    if (this.client?.connected) {
      return Promise.resolve();
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise((resolve, reject) => {
      this.client = new Client({
        webSocketFactory: () => new SockJS(resolveWsUrl()),
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => resolve(),
        onStompError: (frame) => {
          console.error('WebSocket error:', frame.headers?.message ?? frame.body);
        },
        onWebSocketClose: () => {
          this.connectPromise = null;
        },
      });

      this.client.onDisconnect = () => {
        this.connectPromise = null;
      };

      try {
        this.client.activate();
      } catch (error) {
        this.connectPromise = null;
        reject(error);
      }
    });

    return this.connectPromise;
  }

  subscribe(topic, callback) {
    if (!topic || typeof callback !== 'function') {
      return () => {};
    }

    const id = ++this.subscriptionCounter;
    const entry = { topic, callback, disposed: false, stompSub: null };
    this.activeSubscriptions.set(id, entry);

    this.ensureConnected()
      .then(() => {
        if (entry.disposed || !this.client?.connected) {
          return;
        }
        entry.stompSub = this.client.subscribe(topic, () => {
          if (!entry.disposed) {
            callback();
          }
        });
      })
      .catch((error) => {
        console.error(`Failed to subscribe to ${topic}:`, error);
      });

    return () => {
      entry.disposed = true;
      entry.stompSub?.unsubscribe();
      this.activeSubscriptions.delete(id);
      this.disconnectIfIdle();
    };
  }

  disconnectIfIdle() {
    if (this.activeSubscriptions.size > 0) {
      return;
    }
    if (this.client) {
      try {
        this.client.deactivate();
      } catch (error) {
        console.error('Failed to disconnect WebSocket:', error);
      }
      this.client = null;
      this.connectPromise = null;
    }
  }
}

export const stompSocketService = new StompSocketService();
export default stompSocketService;
