import WebSocket from 'ws';

export interface WSClientOptions {
  url: string;
  token: string;
  onEvent?: (subscriptionId: number, event: HAEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export interface HAStateObject {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

export interface HAStateChangedData {
  entity_id: string;
  new_state: HAStateObject | null;
  old_state: HAStateObject | null;
}

export interface HAEvent {
  event_type: string;
  data: Record<string, unknown>;
  time_fired: string;
  origin: string;
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

export interface HAResultMessage {
  id: number;
  type: 'result';
  success: boolean;
  result: unknown;
  error?: {
    code: string;
    message: string;
  };
}

type PendingCommand = {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
};

export class HAWebSocketClient {
  private ws: WebSocket | null = null;
  private options: WSClientOptions;
  private nextId = 1;
  private pendingCommands = new Map<number, PendingCommand>();
  private activeSubscriptions = new Map<number, true>();
  private reconnectAttempt = 0;
  private maxReconnectDelay = 30_000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;
  private intentionalClose = false;
  private haVersion: string | null = null;

  // Track subscriptions for re-establishment on reconnect
  private subscriptionSpecs: Array<{
    eventType: string;
    subscriptionId: number;
  }> = [];

  constructor(options: WSClientOptions) {
    this.options = options;
  }

  async connect(): Promise<void> {
    this.intentionalClose = false;
    return this.doConnect();
  }

  private doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.options.url);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      let authResolved = false;

      this.ws.on('message', (data: WebSocket.Data) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(data.toString()) as Record<string, unknown>;
        } catch {
          return;
        }

        const type = msg.type as string;

        if (type === 'auth_required') {
          this.haVersion = (msg.ha_version as string) ?? null;
          this.ws?.send(JSON.stringify({
            type: 'auth',
            access_token: this.options.token,
          }));
          return;
        }

        if (type === 'auth_ok') {
          this.connected = true;
          this.reconnectAttempt = 0;
          authResolved = true;
          this.options.onConnect?.();
          resolve();
          return;
        }

        if (type === 'auth_invalid') {
          const error = new Error(`HA auth failed: ${msg.message ?? 'invalid token'}`);
          authResolved = true;
          reject(error);
          this.options.onError?.(error);
          return;
        }

        if (type === 'result') {
          const resultMsg = msg as unknown as HAResultMessage;
          const pending = this.pendingCommands.get(resultMsg.id);
          if (pending) {
            this.pendingCommands.delete(resultMsg.id);
            if (resultMsg.success) {
              pending.resolve(resultMsg.result);
            } else {
              pending.reject(new Error(
                resultMsg.error?.message ?? 'Unknown HA error',
              ));
            }
          }
          return;
        }

        if (type === 'event') {
          const subscriptionId = msg.id as number;
          const event = msg.event as HAEvent;
          if (this.activeSubscriptions.has(subscriptionId)) {
            this.options.onEvent?.(subscriptionId, event);
          }
          return;
        }
      });

      this.ws.on('error', (err: Error) => {
        this.options.onError?.(err);
        if (!authResolved) {
          authResolved = true;
          reject(err);
        }
      });

      this.ws.on('close', () => {
        this.connected = false;

        // Reject any pending commands
        for (const [, pending] of this.pendingCommands) {
          pending.reject(new Error('WebSocket connection closed'));
        }
        this.pendingCommands.clear();

        this.options.onDisconnect?.();

        if (!authResolved) {
          authResolved = true;
          reject(new Error('WebSocket closed before auth completed'));
        }

        if (!this.intentionalClose) {
          this.scheduleReconnect();
        }
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempt),
      this.maxReconnectDelay,
    );
    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.doConnect();
        // Re-establish subscriptions
        await this.resubscribeAll();
      } catch {
        // doConnect failure will trigger another close → scheduleReconnect
      }
    }, delay);
  }

  private async resubscribeAll(): Promise<void> {
    const oldSpecs = [...this.subscriptionSpecs];
    this.subscriptionSpecs = [];
    this.activeSubscriptions.clear();

    for (const spec of oldSpecs) {
      try {
        const newId = await this.subscribeEvents(spec.eventType);
        // Update the subscription ID mapping
        spec.subscriptionId = newId;
        this.subscriptionSpecs.push(spec);
      } catch {
        // Will retry on next reconnect
      }
    }
  }

  async sendCommand(type: string, data?: Record<string, unknown>): Promise<unknown> {
    if (!this.connected || !this.ws) {
      throw new Error('HA WebSocket not connected');
    }

    const id = this.nextId++;
    const message = { id, type, ...data };

    return new Promise((resolve, reject) => {
      this.pendingCommands.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify(message));
    });
  }

  async subscribeEvents(eventType: string): Promise<number> {
    const id = this.nextId++;

    return new Promise((resolve, reject) => {
      this.pendingCommands.set(id, {
        resolve: () => {
          this.activeSubscriptions.set(id, true);
          this.subscriptionSpecs.push({ eventType, subscriptionId: id });
          resolve(id);
        },
        reject,
      });
      this.ws!.send(JSON.stringify({
        id,
        type: 'subscribe_events',
        event_type: eventType,
      }));
    });
  }

  async unsubscribeEvents(subscriptionId: number): Promise<void> {
    this.activeSubscriptions.delete(subscriptionId);
    this.subscriptionSpecs = this.subscriptionSpecs.filter(
      (s) => s.subscriptionId !== subscriptionId,
    );

    if (!this.connected) return;

    await this.sendCommand('unsubscribe_events', {
      subscription: subscriptionId,
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  getHAVersion(): string | null {
    return this.haVersion;
  }

  async disconnect(): Promise<void> {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    for (const [, pending] of this.pendingCommands) {
      pending.reject(new Error('Client disconnecting'));
    }
    this.pendingCommands.clear();
    this.activeSubscriptions.clear();
    this.subscriptionSpecs = [];

    return new Promise((resolve) => {
      if (this.ws && this.connected) {
        this.ws.once('close', () => resolve());
        this.ws.close();
      } else {
        this.ws?.terminate();
        resolve();
      }
    });
  }
}
