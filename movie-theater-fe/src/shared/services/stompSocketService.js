import { Client } from '@stomp/stompjs';
import { tokenService } from '../../features/auth/utils/tokenService';

const resolveApiBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl.replace(/\/$/, '');
  }
  return window.location.origin;
};

const resolveWsHttpUrl = (useSockJs = useSockJsTransport()) => {
  const configured = import.meta.env.VITE_WS_URL;
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  const base = resolveApiBaseUrl();
  return useSockJs ? `${base}/ws` : `${base}/stomp`;
};

const toNativeWebSocketUrl = (httpUrl) =>
  httpUrl.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');

const useSockJsTransport = () => import.meta.env.VITE_WS_USE_SOCKJS === 'true';

const buildConnectHeaders = () => {
  const token = tokenService.getToken();
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
};

const appendAccessTokenQuery = (httpUrl) => {
  const token = tokenService.getToken();
  if (!token) {
    return httpUrl;
  }
  const separator = httpUrl.includes('?') ? '&' : '?';
  return `${httpUrl}${separator}access_token=${encodeURIComponent(token)}`;
};

const SEAT_MAP_REFRESH_MS = 5000;

/** Lazy-loaded only when native WebSocket fails or VITE_WS_USE_SOCKJS=true */
let sockJsModulePromise = null;
const loadSockJS = () => {
  if (!sockJsModulePromise) {
    sockJsModulePromise = import('sockjs-client').then((mod) => mod.default);
  }
  return sockJsModulePromise;
};

class StompSocketService {
  constructor() {
    this.client = null;
    this.connectPromise = null;
    this.activeSubscriptions = new Map();
    this.subscriptionCounter = 0;
    this.connected = false;
    this.usingSockJs = false;
    this.sockJsClass = null;
  }

  isConnected() {
    return Boolean(this.client?.connected && this.connected);
  }

  async ensureSockJsLoaded() {
    if (!this.sockJsClass) {
      this.sockJsClass = await loadSockJS();
    }
    return this.sockJsClass;
  }

  createClient(useSockJs, SockJSClass) {
    this.usingSockJs = useSockJs;
    return new Client({
      connectHeaders: buildConnectHeaders(),
      webSocketFactory: () => {
        let httpUrl = resolveWsHttpUrl(useSockJs);
        if (useSockJs) {
          httpUrl = appendAccessTokenQuery(httpUrl);
          return new SockJSClass(httpUrl);
        }
        // If the URL is a SockJS endpoint (e.g. /ws) and we want native WebSocket,
        // we must append '/websocket'. If it's a raw STOMP endpoint (e.g. /stomp), we don't.
        const needsWebsocketSuffix = httpUrl.includes('/ws') && !httpUrl.endsWith('/websocket');
        const nativeUrl = needsWebsocketSuffix ? `${httpUrl}/websocket` : httpUrl;
        return new WebSocket(toNativeWebSocketUrl(nativeUrl));
      },
      reconnectDelay: 5000,
      connectionTimeout: 8000,
      heartbeatIncoming: 5000,
      heartbeatOutgoing: 5000,
      onConnect: () => {
        this.connected = true;
      },
      onStompError: (frame) => {
        console.error('WebSocket error:', frame.headers?.message ?? frame.body);
      },
      onWebSocketClose: () => {
        this.connected = false;
        this.connectPromise = null;
      },
    });
  }

  ensureConnected() {
    if (this.client?.connected) {
      return Promise.resolve();
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    const tryConnect = async (useSockJs) => {
      let SockJSClass = null;
      if (useSockJs) {
        SockJSClass = await this.ensureSockJsLoaded();
      }

      return new Promise((resolve, reject) => {
        let settled = false;
        const settle = (fn, value) => {
          if (settled) return;
          settled = true;
          fn(value);
        };

        this.client = this.createClient(useSockJs, SockJSClass);
        this.client.onConnect = () => {
          this.connected = true;
          settle(resolve);
        };
        this.client.onStompError = (frame) => {
          console.error('WebSocket error:', frame.headers?.message ?? frame.body);
          settle(reject, new Error(frame.headers?.message ?? 'STOMP error'));
        };
        this.client.onWebSocketError = () => {
          this.connected = false;
          settle(reject, new Error('WebSocket connection failed'));
        };
        this.client.onDisconnect = () => {
          this.connected = false;
          this.connectPromise = null;
        };

        try {
          this.client.activate();
        } catch (error) {
          this.connected = false;
          this.client = null;
          reject(error);
        }
      });
    };

    const preferredSockJs = useSockJsTransport();
    this.connectPromise = tryConnect(preferredSockJs).catch(async (error) => {
      if (preferredSockJs) {
        throw error;
      }
      console.warn('Native WebSocket failed, retrying with SockJS:', error?.message ?? error);
      this.client = null;
      return tryConnect(true);
    });

    return this.connectPromise;
  }

  subscribe(topic, callback) {
    if (!topic || typeof callback !== 'function') {
      return () => { };
    }

    const id = ++this.subscriptionCounter;
    const entry = { topic, callback, disposed: false, stompSub: null };
    this.activeSubscriptions.set(id, entry);

    this.ensureConnected()
      .then(() => {
        if (entry.disposed || !this.client?.connected) {
          return;
        }
        entry.stompSub = this.client.subscribe(topic, (message) => {
          if (!entry.disposed) {
            let payload = null;
            try {
              const body = message?.body;
              if (body) {
                payload = JSON.parse(body);
              }
            } catch {
              payload = null;
            }
            callback(payload);
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
      this.usingSockJs = false;
    }
  }
}

export const stompSocketService = new StompSocketService();
export { SEAT_MAP_REFRESH_MS };
export default stompSocketService;
