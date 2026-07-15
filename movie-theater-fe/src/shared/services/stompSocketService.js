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
const RECONNECT_DELAY_MS = 8000;
const HEARTBEAT_MS = 20000;

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
    this.connectionListeners = new Set();
    this.tearingDown = false;
    this.disconnectTimeout = null;
  }

  isConnected() {
    return Boolean(this.client?.connected && this.connected);
  }

  /** @param {(connected: boolean) => void} listener */
  addConnectionListener(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }
    this.connectionListeners.add(listener);
    listener(this.isConnected());
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  notifyConnectionListeners() {
    const connected = this.isConnected();
    this.connectionListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (error) {
        console.error('STOMP connection listener failed:', error);
      }
    });
  }

  async ensureSockJsLoaded() {
    if (!this.sockJsClass) {
      this.sockJsClass = await loadSockJS();
    }
    return this.sockJsClass;
  }

  async safeDeactivate(client) {
    if (!client) return;
    try {
      client.reconnectDelay = 0;
      await client.deactivate();
    } catch {
      // Ignore CLOSING/CLOSED races during intentional teardown
    }
  }

  resubscribeActive() {
    if (!this.client?.connected) {
      return;
    }
    this.activeSubscriptions.forEach((entry) => {
      if (entry.disposed) {
        return;
      }
      try {
        entry.stompSub?.unsubscribe();
      } catch {
        // ignore stale subscription cleanup errors
      }
      entry.stompSub = this.client.subscribe(entry.topic, (message) => {
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
          entry.callback(payload);
        }
      });
    });
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
        const needsWebsocketSuffix = httpUrl.includes('/ws') && !httpUrl.endsWith('/websocket');
        const nativeUrl = needsWebsocketSuffix ? `${httpUrl}/websocket` : httpUrl;
        return new WebSocket(toNativeWebSocketUrl(nativeUrl));
      },
      reconnectDelay: RECONNECT_DELAY_MS,
      connectionTimeout: 8000,
      heartbeatIncoming: HEARTBEAT_MS,
      heartbeatOutgoing: HEARTBEAT_MS,
      onConnect: () => {
        this.connected = true;
        this.resubscribeActive();
        this.notifyConnectionListeners();
      },
      onStompError: (frame) => {
        console.error('WebSocket error:', frame.headers?.message ?? frame.body);
      },
      onWebSocketClose: () => {
        this.connected = false;
        // Keep client + connectPromise so auto-reconnect reuses the same Client
        // instead of spawning orphan sockets.
        this.notifyConnectionListeners();
      },
      debug: () => {},
    });
  }

  ensureConnected() {
    if (this.tearingDown) {
      return Promise.reject(new Error('WebSocket is disconnecting'));
    }

    if (this.client?.connected) {
      return Promise.resolve();
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    // Existing client is reconnecting — wait for it instead of creating another.
    if (this.client) {
      this.connectPromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          this.connectPromise = null;
          reject(new Error('WebSocket reconnect timeout'));
        }, 20000);

        const previousOnConnect = this.client.onConnect;
        this.client.onConnect = (frame) => {
          clearTimeout(timeoutId);
          this.connected = true;
          this.resubscribeActive();
          this.notifyConnectionListeners();
          previousOnConnect?.(frame);
          this.connectPromise = null;
          resolve();
        };
      });
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
          this.resubscribeActive();
          this.notifyConnectionListeners();
          settle(resolve);
        };
        this.client.onStompError = (frame) => {
          console.error('WebSocket error:', frame.headers?.message ?? frame.body);
          settle(reject, new Error(frame.headers?.message ?? 'STOMP error'));
        };
        this.client.onWebSocketError = () => {
          this.connected = false;
          this.notifyConnectionListeners();
          settle(reject, new Error('WebSocket connection failed'));
        };
        this.client.onDisconnect = () => {
          this.connected = false;
          this.notifyConnectionListeners();
        };

        try {
          this.client.activate();
        } catch (error) {
          this.connected = false;
          this.client = null;
          this.notifyConnectionListeners();
          reject(error);
        }
      });
    };

    const preferredSockJs = useSockJsTransport();
    this.connectPromise = tryConnect(preferredSockJs)
      .catch(async (error) => {
        if (preferredSockJs) {
          throw error;
        }
        console.warn('Native WebSocket failed, retrying with SockJS:', error?.message ?? error);
        const failedClient = this.client;
        this.client = null;
        this.connected = false;
        await this.safeDeactivate(failedClient);
        return tryConnect(true);
      })
      .catch((error) => {
        this.connectPromise = null;
        throw error;
      });

    return this.connectPromise;
  }

  subscribe(topic, callback) {
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }

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
        if (this.activeSubscriptions.has(id) && !entry.disposed) {
          console.error(`Failed to subscribe to ${topic}:`, error);
        }
      });

    return () => {
      entry.disposed = true;
      try {
        entry.stompSub?.unsubscribe();
      } catch {
        // ignore
      }
      this.activeSubscriptions.delete(id);
      this.disconnectIfIdle();
    };
  }

  disconnectIfIdle() {
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }

    this.disconnectTimeout = setTimeout(() => {
      this.disconnectTimeout = null;
      if (this.activeSubscriptions.size > 0) {
        return;
      }
      if (!this.client) {
        return;
      }

      const client = this.client;
      this.tearingDown = true;
      this.client = null;
      this.connected = false;
      this.connectPromise = null;
      this.usingSockJs = false;
      this.notifyConnectionListeners();

      this.safeDeactivate(client).finally(() => {
        this.tearingDown = false;
      });
    }, 2000);
  }
}

export const stompSocketService = new StompSocketService();
export { SEAT_MAP_REFRESH_MS };
export default stompSocketService;
