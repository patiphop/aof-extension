import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncManager } from '../src/services/SyncManager';
import { FileScanner } from '../src/utils/FileScanner';
import { WebSocketClient } from '../src/services/WebSocketClient';
import { GitignoreParser } from '../src/utils/GitignoreParser';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock dependencies
vi.mock('../src/utils/FileScanner');
vi.mock('../src/services/WebSocketClient');
vi.mock('../src/utils/GitignoreParser');

// Mock fs module
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    rmSync: vi.fn()
  };
});

describe('SyncManager', () => {
  let syncManager: SyncManager;
  let mockFileScanner: any;
  let mockWebSocketClient: any;
  let mockGitignoreParser: any;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'syncmanager-test-'));
    
    // Create mocks
    mockFileScanner = {
      scanFiles: vi.fn(),
      getRelativePath: vi.fn(),
      isTextFile: vi.fn()
    };

    mockWebSocketClient = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendFile: vi.fn(),
      sendDeleteFile: vi.fn(),
      sendClearFolder: vi.fn(),
      isConnected: vi.fn(),
      on: vi.fn()
    };

    mockGitignoreParser = {
      loadAllGitignores: vi.fn(),
      shouldIgnore: vi.fn()
    };

    // Mock constructor calls
    vi.mocked(FileScanner).mockImplementation(() => mockFileScanner);
    vi.mocked(WebSocketClient).mockImplementation(() => mockWebSocketClient);
    vi.mocked(GitignoreParser).mockImplementation(() => mockGitignoreParser);

    // Mock fs functions
    vi.mocked(fs.readFileSync).mockReturnValue('file content');
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
    vi.mocked(fs.unlinkSync).mockImplementation(() => {});
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.mkdirSync).mockImplementation(() => {});

    syncManager = new SyncManager(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create SyncManager with correct folder path', () => {
      expect(syncManager).toBeInstanceOf(SyncManager);
      expect(FileScanner).toHaveBeenCalledWith(expect.any(Object));
      expect(WebSocketClient).toHaveBeenCalledWith('ws://192.168.1.105:1420');
    });
  });

  describe('startSync', () => {
    it('should start sync process', async () => {
      mockWebSocketClient.connect.mockResolvedValue(undefined);
      mockFileScanner.scanFiles.mockReturnValue([]);
      mockWebSocketClient.isConnected.mockReturnValue(true);

      await syncManager.startSync();

      expect(mockWebSocketClient.connect).toHaveBeenCalled();
      expect(mockFileScanner.scanFiles).toHaveBeenCalledWith(tempDir);
    });

    it('should scan and sync all files on start', async () => {
      const mockFiles = [
        path.join(tempDir, 'file1.txt'),
        path.join(tempDir, 'file2.js')
      ];

      mockWebSocketClient.connect.mockResolvedValue(undefined);
      mockFileScanner.scanFiles.mockReturnValue(mockFiles);
      mockFileScanner.getRelativePath.mockImplementation((root, file) => path.relative(root, file));
      mockWebSocketClient.isConnected.mockReturnValue(true);

      await syncManager.startSync();

      expect(mockFileScanner.scanFiles).toHaveBeenCalledWith(tempDir);
      expect(mockWebSocketClient.sendFile).toHaveBeenCalledTimes(2);
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockWebSocketClient.connect.mockRejectedValue(error);

      await expect(syncManager.startSync()).rejects.toThrow('Connection failed');
    });
  });

  describe('stopSync', () => {
    it('should stop sync process', async () => {
      // First start sync to set isActive to true
      mockWebSocketClient.connect.mockResolvedValue(undefined);
      mockFileScanner.scanFiles.mockReturnValue([]);
      mockWebSocketClient.isConnected.mockReturnValue(true);
      await syncManager.startSync();

      // Then stop sync
      await syncManager.stopSync();

      expect(mockWebSocketClient.sendClearFolder).toHaveBeenCalled();
      expect(mockWebSocketClient.disconnect).toHaveBeenCalled();
    });

    it('should handle stop when not connected', async () => {
      // Set isActive to true manually since we're not starting sync
      (syncManager as any).isActive = true;
      mockWebSocketClient.isConnected.mockReturnValue(false);

      await syncManager.stopSync();

      expect(mockWebSocketClient.sendClearFolder).not.toHaveBeenCalled();
      expect(mockWebSocketClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('syncFile', () => {
    it('should sync a single file', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const relativePath = 'test.txt';

      // Start sync to set isActive to true
      mockWebSocketClient.connect.mockResolvedValue(undefined);
      mockFileScanner.scanFiles.mockReturnValue([]);
      mockWebSocketClient.isConnected.mockReturnValue(true);
      await syncManager.startSync();

      mockFileScanner.getRelativePath.mockReturnValue(relativePath);

      syncManager.syncFile(filePath);

      expect(mockFileScanner.getRelativePath).toHaveBeenCalledWith(tempDir, filePath);
      expect(mockWebSocketClient.sendFile).toHaveBeenCalledWith(relativePath, 'file content');
    });

    it('should not sync when not connected', () => {
      const filePath = path.join(tempDir, 'test.txt');
      mockWebSocketClient.isConnected.mockReturnValue(false);

      syncManager.syncFile(filePath);

      expect(mockWebSocketClient.sendFile).not.toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('should send delete file message', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const relativePath = 'test.txt';

      // Start sync to set isActive to true
      mockWebSocketClient.connect.mockResolvedValue(undefined);
      mockFileScanner.scanFiles.mockReturnValue([]);
      mockWebSocketClient.isConnected.mockReturnValue(true);
      await syncManager.startSync();

      mockFileScanner.getRelativePath.mockReturnValue(relativePath);

      syncManager.deleteFile(filePath);

      expect(mockFileScanner.getRelativePath).toHaveBeenCalledWith(tempDir, filePath);
      expect(mockWebSocketClient.sendDeleteFile).toHaveBeenCalledWith(relativePath);
    });

    it('should not delete when not connected', () => {
      const filePath = path.join(tempDir, 'test.txt');
      mockWebSocketClient.isConnected.mockReturnValue(false);

      syncManager.deleteFile(filePath);

      expect(mockWebSocketClient.sendDeleteFile).not.toHaveBeenCalled();
    });
  });

  describe('isSyncing', () => {
    it('should return false initially', () => {
      expect(syncManager.isSyncing()).toBe(false);
    });

    it('should return true when sync is active', async () => {
      mockWebSocketClient.connect.mockResolvedValue(undefined);
      mockFileScanner.scanFiles.mockReturnValue([]);
      mockWebSocketClient.isConnected.mockReturnValue(true);

      await syncManager.startSync();

      expect(syncManager.isSyncing()).toBe(true);
    });

    it('should return false after stopping sync', async () => {
      mockWebSocketClient.connect.mockResolvedValue(undefined);
      mockFileScanner.scanFiles.mockReturnValue([]);
      mockWebSocketClient.isConnected.mockReturnValue(true);

      await syncManager.startSync();
      await syncManager.stopSync();

      expect(syncManager.isSyncing()).toBe(false);
    });
  });

  describe('handleServerMessage', () => {
    it('should handle FILE_UPDATED message', () => {
      const message = {
        type: 'FILE_UPDATED',
        payload: {
          relativePath: 'test.txt',
          fileContent: 'new content'
        }
      };

      // Mock that directory doesn't exist so mkdirSync gets called
      vi.mocked(fs.existsSync).mockReturnValueOnce(false);

      syncManager.handleServerMessage(message);

      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join(tempDir, 'test.txt'),
        'new content',
        'utf8'
      );
    });

    it('should handle DELETE_FILE message', () => {
      const message = {
        type: 'DELETE_FILE',
        payload: {
          relativePath: 'test.txt'
        }
      };

      syncManager.handleServerMessage(message);

      expect(fs.existsSync).toHaveBeenCalledWith(path.join(tempDir, 'test.txt'));
      expect(fs.unlinkSync).toHaveBeenCalledWith(path.join(tempDir, 'test.txt'));
    });

    it('should handle FOLDER_CLEARED message', () => {
      const message = {
        type: 'FOLDER_CLEARED'
      };

      const onFolderClearedSpy = vi.fn();
      syncManager.on('folderCleared', onFolderClearedSpy);

      syncManager.handleServerMessage(message);

      expect(onFolderClearedSpy).toHaveBeenCalled();
    });

    it('should ignore unknown message types', () => {
      const message = {
        type: 'UNKNOWN_TYPE',
        payload: {}
      };

      expect(() => syncManager.handleServerMessage(message)).not.toThrow();
    });
  });
});
