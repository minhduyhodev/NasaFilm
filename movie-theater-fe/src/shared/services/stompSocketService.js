import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const resolveWsHttpUrl = () => {
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

const toNativeWebSocketUrl = (httpUrl) =>
  httpUrl.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');

const useSockJsTransport = () => import.meta.env.VITE_WS_USE_SOCKJS === 'true';

const SEAT_MAP_REFRESH_MS = 5000;

class StompSocketService {
  constructor() {
    this.client = null;
    this.connectPromise = null;
    this.activeSubscriptions = new Map();
    this.subscriptionCounter = 0;
    this.connected = false;
  }

  isConnected() {
    return Boolean(this.client?.connected && this.connected);
  }

  ensureConnected() {
    if (this.client?.connected) {
      return Promise.resolve();
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise((resolve, reject) => {
      let settled = false;
      const settle = (fn, value) => {
        if (settled) return;
        settled = true;
        fn(value);
      };

      this.client = new Client({
        webSocketFactory: () => {
          const httpUrl = resolveWsHttpUrl();
          if (useSockJsTransport()) {
            return new SockJS(httpUrl);
          }
          return new WebSocket(toNativeWebSocketUrl(httpUrl));
        },
        reconnectDelay: 5000,
        connectionTimeout: 8000,
        heartbeatIncoming: 5000,
        heartbeatOutgoing: 5000,
        onConnect: () => {
          this.connected = true;
          settle(resolve);
        },
        onStompError: (frame) => {
          console.error('WebSocket error:', frame.headers?.message ?? frame.body);
          settle(reject, new Error(frame.headers?.message ?? 'STOMP error'));
        },
        onWebSocketError: () => {
          this.connected = false;
          settle(reject, new Error('WebSocket connection failed'));
        },
        onWebSocketClose: () => {
          this.connected = false;
          this.connectPromise = null;
        },
      });

      this.client.onDisconnect = () => {
        this.connected = false;
        this.connectPromise = null;
      };

      try {
        this.client.activate();
      } catch (error) {
        this.connected = false;
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
      this.connected = false;
      this.connectPromise = null;
    }
  }
}

export const stompSocketService = new StompSocketService();
export { SEAT_MAP_REFRESH_MS };
export default stompSocketService;
