import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Hoist the mock instances array so the mock factory can reference it
const { mockInstances } = vi.hoisted(() => {
  return {
    mockInstances: [] as EventEmitter[],
  };
});

vi.mock('ws', async () => {
  const { EventEmitter: EE } = await import('events');

  class WS extends EE {
    readyState = 1;
    send = vi.fn();
    close = vi.fn(function (this: WS) { this.emit('close'); });
    terminate = vi.fn();
    constructor(_url: string) {
      super();
      mockInstances.push(this);
    }
  }
  return { default: WS };
});

import { HAWebSocketClient } from '../ws-client.js';

interface MockWS extends EventEmitter {
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  readyState: number;
}

function getLastWS(): MockWS {
  return mockInstances[mockInstances.length - 1] as MockWS;
}

// Simulate the HA auth handshake: auth_required → client sends auth → auth_ok
function completeAuth(ws: MockWS) {
  ws.emit('message', JSON.stringify({ type: 'auth_required', ha_version: '2024.1.0' }));
  // Client should have sent auth message
  ws.emit('message', JSON.stringify({ type: 'auth_ok', ha_version: '2024.1.0' }));
}

describe('HAWebSocketClient', () => {
  beforeEach(() => {
    mockInstances.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('authenticates with the provided token', async () => {
    const client = new HAWebSocketClient({
      url: 'ws://supervisor/core/websocket',
      token: 'test-token',
    });

    const connectPromise = client.connect();
    const ws = getLastWS();

    // Server sends auth_required
    ws.emit('message', JSON.stringify({ type: 'auth_required', ha_version: '2024.1.0' }));

    // Client should have sent auth with token
    expect(ws.send).toHaveBeenCalledWith(JSON.stringify({
      type: 'auth',
      access_token: 'test-token',
    }));

    // Server confirms
    ws.emit('message', JSON.stringify({ type: 'auth_ok', ha_version: '2024.1.0' }));
    await connectPromise;

    expect(client.isConnected()).toBe(true);
    expect(client.getHAVersion()).toBe('2024.1.0');
    await client.disconnect();
  });

  it('rejects connect on auth_invalid', async () => {
    const client = new HAWebSocketClient({
      url: 'ws://supervisor/core/websocket',
      token: 'bad-token',
    });

    const connectPromise = client.connect();
    const ws = getLastWS();

    ws.emit('message', JSON.stringify({ type: 'auth_required' }));
    ws.emit('message', JSON.stringify({ type: 'auth_invalid', message: 'Invalid password' }));

    await expect(connectPromise).rejects.toThrow('HA auth failed');
    await client.disconnect();
  });

  it('sends commands with incrementing IDs and resolves on result', async () => {
    const client = new HAWebSocketClient({
      url: 'ws://test',
      token: 'tok',
    });

    const connectPromise = client.connect();
    const ws = getLastWS();
    completeAuth(ws);
    await connectPromise;

    ws.send.mockClear();

    const resultPromise = client.sendCommand('get_states');

    // Parse the sent message to get the ID
    const sentMsg = JSON.parse(ws.send.mock.calls[0][0] as string) as { id: number; type: string };
    expect(sentMsg.type).toBe('get_states');
    expect(sentMsg.id).toBeGreaterThan(0);

    // Simulate result
    ws.emit('message', JSON.stringify({
      id: sentMsg.id,
      type: 'result',
      success: true,
      result: [{ entity_id: 'light.test', state: 'on' }],
    }));

    const result = await resultPromise;
    expect(result).toEqual([{ entity_id: 'light.test', state: 'on' }]);
    await client.disconnect();
  });

  it('rejects commands on error result', async () => {
    const client = new HAWebSocketClient({
      url: 'ws://test',
      token: 'tok',
    });

    const connectPromise = client.connect();
    const ws = getLastWS();
    completeAuth(ws);
    await connectPromise;

    ws.send.mockClear();
    const resultPromise = client.sendCommand('call_service', {
      domain: 'light',
      service: 'turn_on',
    });

    const sentMsg = JSON.parse(ws.send.mock.calls[0][0] as string) as { id: number };

    ws.emit('message', JSON.stringify({
      id: sentMsg.id,
      type: 'result',
      success: false,
      error: { code: 'service_not_found', message: 'Service not found' },
    }));

    await expect(resultPromise).rejects.toThrow('Service not found');
    await client.disconnect();
  });

  it('subscribes to events and forwards them to callback', async () => {
    const onEvent = vi.fn();
    const client = new HAWebSocketClient({
      url: 'ws://test',
      token: 'tok',
      onEvent,
    });

    const connectPromise = client.connect();
    const ws = getLastWS();
    completeAuth(ws);
    await connectPromise;

    ws.send.mockClear();
    const subPromise = client.subscribeEvents('state_changed');

    const sentMsg = JSON.parse(ws.send.mock.calls[0][0] as string) as { id: number };

    // Confirm subscription
    ws.emit('message', JSON.stringify({
      id: sentMsg.id,
      type: 'result',
      success: true,
      result: null,
    }));

    const subId = await subPromise;
    expect(subId).toBe(sentMsg.id);

    // Simulate an event
    const event = {
      event_type: 'state_changed',
      data: {
        entity_id: 'light.living_room',
        new_state: { entity_id: 'light.living_room', state: 'on', attributes: {} },
        old_state: { entity_id: 'light.living_room', state: 'off', attributes: {} },
      },
      time_fired: '2024-01-15T10:00:00.000Z',
      origin: 'LOCAL',
      context: { id: 'ctx1', parent_id: null, user_id: null },
    };

    ws.emit('message', JSON.stringify({
      id: subId,
      type: 'event',
      event,
    }));

    expect(onEvent).toHaveBeenCalledWith(subId, event);
    await client.disconnect();
  });

  it('unsubscribes from events', async () => {
    const onEvent = vi.fn();
    const client = new HAWebSocketClient({
      url: 'ws://test',
      token: 'tok',
      onEvent,
    });

    const connectPromise = client.connect();
    const ws = getLastWS();
    completeAuth(ws);
    await connectPromise;

    ws.send.mockClear();
    const subPromise = client.subscribeEvents('state_changed');
    const subMsg = JSON.parse(ws.send.mock.calls[0][0] as string) as { id: number };
    ws.emit('message', JSON.stringify({ id: subMsg.id, type: 'result', success: true, result: null }));
    const subId = await subPromise;

    ws.send.mockClear();
    const unsubPromise = client.unsubscribeEvents(subId);
    const unsubMsg = JSON.parse(ws.send.mock.calls[0][0] as string) as { id: number };
    ws.emit('message', JSON.stringify({ id: unsubMsg.id, type: 'result', success: true, result: null }));
    await unsubPromise;

    // Events for this subscription should no longer be forwarded
    ws.emit('message', JSON.stringify({
      id: subId,
      type: 'event',
      event: { event_type: 'state_changed', data: {} },
    }));

    expect(onEvent).not.toHaveBeenCalled();
    await client.disconnect();
  });

  it('rejects pending commands on connection close', async () => {
    const client = new HAWebSocketClient({
      url: 'ws://test',
      token: 'tok',
    });

    const connectPromise = client.connect();
    const ws = getLastWS();
    completeAuth(ws);
    await connectPromise;

    ws.send.mockClear();
    const cmdPromise = client.sendCommand('get_states');

    // Close the connection before result arrives
    // Disable reconnect for this test
    await client.disconnect();

    await expect(cmdPromise).rejects.toThrow();
  });

  it('throws when sending command while disconnected', async () => {
    const client = new HAWebSocketClient({
      url: 'ws://test',
      token: 'tok',
    });

    await expect(client.sendCommand('get_states')).rejects.toThrow('not connected');
  });

  it('calls onConnect and onDisconnect callbacks', async () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();

    const client = new HAWebSocketClient({
      url: 'ws://test',
      token: 'tok',
      onConnect,
      onDisconnect,
    });

    const connectPromise = client.connect();
    const ws = getLastWS();
    completeAuth(ws);
    await connectPromise;

    expect(onConnect).toHaveBeenCalledTimes(1);

    await client.disconnect();
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });
});
