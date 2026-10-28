import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class LubrixSocketService {
  constructor() {
    this.socket = null;
    this.tenantId = 'org-lubrix-01';
  }

  setTenant(tenantId) {
    if (tenantId) {
      this.tenantId = tenantId;
      if (this.socket && this.socket.connected) {
        this.socket.emit('join_tenant', tenantId);
      }
    }
  }

  connect(tenantId = null) {
    if (tenantId) this.tenantId = tenantId;
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        if (this.tenantId) {
          this.socket.emit('join_tenant', this.tenantId);
        }
      });

      this.socket.on('disconnect', () => {
        console.log('[Lubrix Realtime] Disconnected');
      });
    }
    return this.socket;
  }

  subscribe(event, callback) {
    if (!this.socket) this.connect();
    this.socket.on(event, callback);
    return () => {
      this.socket.off(event, callback);
    };
  }

  emit(event, data) {
    if (!this.socket) this.connect();
    this.socket.emit(event, data);
  }
}

export const lubrixSocket = new LubrixSocketService();
