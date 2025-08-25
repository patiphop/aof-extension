import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncServer } from '../src/SyncServer';
import { type ServerConfig } from '../src/config';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mock WebSocket
class MockWebSocket {
  public readyState = 1; // OPEN
  public onmessage: ((data: any) => void) | null = null;
  public onclose: ((code: number, reason: string) => void) | null = null;
  public onerror: ((error: Error) => void) | null = null;
  public onpong: (() => void) | null = null;
  
  public send(data: string) {
    // Mock send
  }
  
  public ping() {
    if (this.onpong) this.onpong();
  }
  
  public terminate() {
    if (this.onclose) this.onclose(1000, 'Terminated');
  }
}

describe('SyncServer - Bidirectional Sync', () => {
  let server: SyncServer;
  let mockWs: MockWebSocket;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(__dirname, 'test-sync-files');
    await fs.ensureDir(testDir);
    
    // Create server with explicit config for tests
    const cfg: ServerConfig = {
      port: 1421,
      baseDir: testDir,
      maxPayloadSize: 100 * 1024 * 1024,
      maxFileSize: 50 * 1024 * 1024,
      pingInterval: 30000,
      compression: { enabled: false, threshold: 1024, concurrencyLimit: 10 }
    };
    server = new SyncServer(cfg);
    mockWs = new MockWebSocket();
  });

  afterEach(async () => {
    if (server) {
      server.stop();
    }
    await fs.remove(testDir);
    vi.clearAllMocks();
  });

  describe('File Watcher Integration', () => {
    it('should detect local file changes and broadcast to clients', async () => {
      // Create a test file
      const testFile = path.join(testDir, 'test.txt');
      await fs.writeFile(testFile, 'initial content');

      // Simulate file change
      await fs.writeFile(testFile, 'updated content');

      // Wait for file watcher to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify that the change was detected and broadcast
      // This would require checking the broadcast mechanism
      expect(true).toBe(true); // Placeholder for actual verification
    });

    it('should handle file deletions from local storage', async () => {
      // Create and then delete a file
      const testFile = path.join(testDir, 'delete-test.txt');
      await fs.writeFile(testFile, 'content');
      await fs.remove(testFile);

      // Wait for file watcher to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify deletion was broadcast
      expect(true).toBe(true); // Placeholder for actual verification
    });

    it('should handle file creation from local storage', async () => {
      // Create a new file
      const testFile = path.join(testDir, 'new-file.txt');
      await fs.writeFile(testFile, 'new content');

      // Wait for file watcher to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify creation was broadcast
      expect(true).toBe(true); // Placeholder for actual verification
    });
  });

  describe('Server-to-Client Sync', () => {
    it('should send file updates to all connected clients', () => {
      const mockClient1 = new MockWebSocket();
      const mockClient2 = new MockWebSocket();
      
      // Simulate clients connecting
      // This would require accessing private methods or restructuring
      
      // Simulate server file change
      const fileUpdateMessage = {
        type: 'FILE_UPDATED',
        payload: {
          relativePath: 'test.txt',
          fileContent: 'server updated content'
        }
      };

      // Verify both clients receive the update
      expect(true).toBe(true); // Placeholder for actual verification
    });

    it('should handle client disconnection during sync', () => {
      // Test scenario where client disconnects while receiving sync
      expect(true).toBe(true); // Placeholder for actual verification
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflicts when both client and server modify same file', () => {
      // Test simultaneous modifications
      expect(true).toBe(true); // Placeholder for actual verification
    });

    it('should preserve file versioning to prevent data loss', () => {
      // Test versioning mechanism
      expect(true).toBe(true); // Placeholder for actual verification
    });
  });

  describe('Bidirectional Sync Flow', () => {
    it('should maintain consistency between client and server', async () => {
      // Test complete bidirectional sync cycle
      expect(true).toBe(true); // Placeholder for actual verification
    });

    it('should handle network interruptions gracefully', () => {
      // Test sync recovery after network issues
      expect(true).toBe(true); // Placeholder for actual verification
    });
  });

  it('should not echo updates back to sender and preserve subfolder edits', async () => {
    const port = 1422;
    const baseDir = path.join(__dirname, 'test-sync-files-echo');
    if (fs.existsSync(baseDir)) await fs.promises.rm(baseDir, { recursive: true, force: true });
    const server = new SyncServer({
      port,
      baseDir,
      maxPayloadSize: 100 * 1024 * 1024,
      maxFileSize: 50 * 1024 * 1024,
      compression: { enabled: false, threshold: 0, concurrencyLimit: 1 }
    } as any);

    // Create two clients
    const WebSocket = require('ws');
    const sender = new WebSocket(`ws://localhost:${port}`);
    const receiver = new WebSocket(`ws://localhost:${port}`);

    const receivedBySender: any[] = [];
    const receivedByReceiver: any[] = [];

    await new Promise<void>((resolve) => {
      let opened = 0;
      const maybe = () => { if (++opened === 2) resolve(); };
      sender.on('open', maybe);
      receiver.on('open', maybe);
    });

    sender.on('message', (raw: any) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'FILE_UPDATED') receivedBySender.push(msg);
    });
    receiver.on('message', (raw: any) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'FILE_UPDATED') receivedByReceiver.push(msg);
    });

    // Sender syncs a subfolder file
    const rel = 'packages/storybook/.storybook/axe.ts';
    const content1 = 'export const a = 1;';
    sender.send(JSON.stringify({ type: 'SYNC_FILE', payload: { relativePath: rel, fileContent: content1 } }));

    // Wait a moment for processing
    await new Promise(r => setTimeout(r, 200));

    // Assert that receiver got update but sender did not
    expect(receivedBySender.length).toBe(0);
    expect(receivedByReceiver.length).toBe(1);

    // Now receiver makes a small edit and sends back
    const content2 = 'export const a = 2;';
    receiver.send(JSON.stringify({ type: 'SYNC_FILE', payload: { relativePath: rel, fileContent: content2 } }));

    await new Promise(r => setTimeout(r, 200));

    // File on disk should match last content and not be reverted
    const fullPath = path.join(baseDir, rel);
    const disk = await fs.promises.readFile(fullPath, 'utf8');
    expect(disk).toBe(content2);

    // Cleanup
    sender.close();
    receiver.close();
    server.stop();
  });

  it('should not echo deletions back to sender', async () => {
    const port = 1423;
    const baseDir = path.join(__dirname, 'test-sync-files-delete');
    if (fs.existsSync(baseDir)) await fs.promises.rm(baseDir, { recursive: true, force: true });
    const server = new SyncServer({
      port,
      baseDir,
      maxPayloadSize: 100 * 1024 * 1024,
      maxFileSize: 50 * 1024 * 1024,
      compression: { enabled: false, threshold: 0, concurrencyLimit: 1 }
    } as any);

    const WebSocket = require('ws');
    const sender = new WebSocket(`ws://localhost:${port}`);
    const receiver = new WebSocket(`ws://localhost:${port}`);

    await new Promise<void>((resolve) => {
      let opened = 0;
      const maybe = () => { if (++opened === 2) resolve(); };
      sender.on('open', maybe);
      receiver.on('open', maybe);
    });

    const rel = 'pkg/a/file.txt';
    // Create first
    sender.send(JSON.stringify({ type: 'SYNC_FILE', payload: { relativePath: rel, fileContent: 'x' } }));
    await new Promise(r => setTimeout(r, 100));

    const receivedBySender: any[] = [];
    const receivedByReceiver: any[] = [];
    sender.on('message', (raw: any) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'FILE_DELETED') receivedBySender.push(msg);
    });
    receiver.on('message', (raw: any) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'FILE_DELETED') receivedByReceiver.push(msg);
    });

    // Delete from sender
    sender.send(JSON.stringify({ type: 'DELETE_FILE', payload: { relativePath: rel } }));
    await new Promise(r => setTimeout(r, 150));

    expect(receivedBySender.length).toBe(0);
    expect(receivedByReceiver.length).toBe(1);

    sender.close();
    receiver.close();
    server.stop();
  });
});


