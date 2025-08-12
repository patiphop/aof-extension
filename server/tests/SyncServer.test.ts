import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SyncServer } from '../src/SyncServer';

describe('SyncServer', () => {
  let server: SyncServer;

  beforeEach(() => {
    // Use a different port for testing
    server = new SyncServer(1421);
  });

  afterEach(() => {
    server.stop();
  });

  describe('constructor', () => {
    it('should create server instance', () => {
      expect(server).toBeInstanceOf(SyncServer);
    });

    it('should have correct stats', () => {
      const stats = server.getStats();
      expect(stats.port).toBe(1421);
      expect(stats.clientCount).toBe(0);
      expect(stats.fileCount).toBe(0);
    });
  });

  describe('server lifecycle', () => {
    it('should start and stop without errors', () => {
      expect(() => server.stop()).not.toThrow();
    });
  });
});
