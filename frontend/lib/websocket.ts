import { getToken, refreshAccessToken } from '@/lib/api';

type WSEventType = 'new_alert' | 'new_event' | 'camera_status_changed' | 'evidence_created' | 'blockchain_updated';

type WSListener = (data: Record<string, unknown>) => void;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

class IBVAPWebSocket {
  private socket: import('socket.io-client').Socket | null = null;
  private listeners: Map<WSEventType, WSListener[]> = new Map();
  private connecting = false;

  connect() {
    if (typeof window === 'undefined') return;
    if (this.socket?.connected || this.connecting) return;

    const token = getToken();
    if (!token) return;

    this.connecting = true;

    import('socket.io-client').then(({ io }) => {
      this.socket = io(WS_URL, {
        auth: (cb) => {
          cb({ token: getToken() });
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 2000,
      });

      this.socket.on('connect', () => {
        this.connecting = false;
        console.info('[WS] Connected to IBVAP backend');
      });

      this.socket.on('connect_error', async (err) => {
        this.connecting = false;
        console.warn('[WS] Connection failed:', err.message);
        if (err.message?.includes('Authentication error')) {
          const refreshed = await refreshAccessToken();
          if (refreshed && this.socket) {
            this.socket.connect();
          }
        }
      });

      const events: WSEventType[] = [
        'new_alert',
        'new_event',
        'camera_status_changed',
        'evidence_created',
        'blockchain_updated',
      ];

      for (const event of events) {
        this.socket.on(event, (data: Record<string, unknown>) => {
          this.emit(event, data);
        });
      }
    }).catch((err) => {
      this.connecting = false;
      console.warn('[WS] Failed to load socket.io-client:', err);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.connecting = false;
  }

  on(event: WSEventType, listener: WSListener) {
    const list = this.listeners.get(event) || [];
    list.push(listener);
    this.listeners.set(event, list);
  }

  off(event: WSEventType, listener: WSListener) {
    const list = this.listeners.get(event) || [];
    this.listeners.set(event, list.filter((l) => l !== listener));
  }

  private emit(event: WSEventType, data: Record<string, unknown>) {
    const list = this.listeners.get(event) || [];
    list.forEach((l) => l(data));
  }
}

export const wsClient = new IBVAPWebSocket();
