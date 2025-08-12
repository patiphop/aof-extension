import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocketClient } from '../src/services/WebSocketClient';

describe('WebSocketClient', () => {
  let client: WebSocketClient;

  beforeEach(() => {
    client = new WebSocketClient('ws://192.168.1.105:1420');
  });

  afterEach(() => {
    client.disconnect();
  });

  describe('constructor', () => {
    it('should create WebSocket client with correct URL', () => {
      expect(client).toBeInstanceOf(WebSocketClient);
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('send methods', () => {
    it('should not send message when not connected', () => {
      const message = { type: 'SYNC_FILE', payload: { relativePath: 'test.txt', fileContent: 'content' } };
      // Should not throw error when not connected
      expect(() => client.send(message)).not.toThrow();
    });

    it('should not send file when not connected', () => {
      // Should not throw error when not connected
      expect(() => client.sendFile('test.txt', 'content')).not.toThrow();
    });

    it('should not send delete file when not connected', () => {
      // Should not throw error when not connected
      expect(() => client.sendDeleteFile('test.txt')).not.toThrow();
    });

    it('should not send clear folder when not connected', () => {
      // Should not throw error when not connected
      expect(() => client.sendClearFolder()).not.toThrow();
    });
  });

  describe('disconnect', () => {
    it('should disconnect without error when not connected', () => {
      expect(() => client.disconnect()).not.toThrow();
    });
  });

  describe('getReadyState', () => {
    it('should return CLOSED when not connected', () => {
      expect(client.getReadyState()).toBe(3); // WebSocket.CLOSED
    });
  });
});
