import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncManager } from '../src/services/SyncManager';
import * as fs from 'fs';
import * as path from 'path';

// Mock WebSocketClient
vi.mock('../src/services/WebSocketClient', () => ({
  WebSocketClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
    sendFile: vi.fn(),
    sendDeleteFile: vi.fn(),
    sendClearFolder: vi.fn(),
    on: vi.fn(),
    emit: vi.fn()
  }))
}));

// Mock FileScanner
vi.mock('../src/utils/FileScanner', () => ({
  FileScanner: vi.fn().mockImplementation(() => ({
    scanFiles: vi.fn().mockReturnValue([]),
    getRelativePath: vi.fn().mockImplementation((basePath: string, filePath: string) => {
      return path.relative(basePath, filePath);
    })
  }))
}));

// Mock GitignoreParser
vi.mock('../src/utils/GitignoreParser', () => ({
  GitignoreParser: vi.fn().mockImplementation(() => ({
    isIgnored: vi.fn().mockReturnValue(false)
  }))
}));

describe('SyncManager - Bidirectional Sync', () => {
  let syncManager: SyncManager;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(__dirname, 'test-sync-folder');
    await fs.promises.mkdir(testDir, { recursive: true });
    
    syncManager = new SyncManager(testDir);
  });

  afterEach(async () => {
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  describe('Server-to-Client Sync', () => {
    it('should handle file creation from server', async () => {
      const fileCreatedSpy = vi.fn();
      syncManager.on('fileCreated', fileCreatedSpy);

      const payload = {
        relativePath: 'test.txt',
        fileContent: 'server created content',
        version: 1
      };

      syncManager.handleServerMessage({
        type: 'FILE_CREATED',
        payload
      });

      // Check if file was created locally
      const localFilePath = path.join(testDir, 'test.txt');
      expect(fs.existsSync(localFilePath)).toBe(true);
      
      const content = fs.readFileSync(localFilePath, 'utf8');
      expect(content).toBe('server created content');
      
      expect(fileCreatedSpy).toHaveBeenCalledWith('test.txt');
    });

    it('should handle file changes from server', async () => {
      // Create a file first
      const testFile = path.join(testDir, 'test.txt');
      fs.writeFileSync(testFile, 'initial content');

      const fileChangedSpy = vi.fn();
      syncManager.on('fileChanged', fileChangedSpy);

      const payload = {
        relativePath: 'test.txt',
        fileContent: 'server updated content',
        version: 2
      };

      syncManager.handleServerMessage({
        type: 'FILE_CHANGED',
        payload
      });

      // Check if file was updated locally
      const content = fs.readFileSync(testFile, 'utf8');
      expect(content).toBe('server updated content');
      
      expect(fileChangedSpy).toHaveBeenCalledWith('test.txt');
    });

    it('should handle file deletion from server', async () => {
      // Create a file first
      const testFile = path.join(testDir, 'test.txt');
      fs.writeFileSync(testFile, 'content');

      const fileDeletedSpy = vi.fn();
      syncManager.on('fileDeleted', fileDeletedSpy);

      const payload = {
        relativePath: 'test.txt'
      };

      syncManager.handleServerMessage({
        type: 'FILE_DELETED',
        payload
      });

      // Check if file was deleted locally
      expect(fs.existsSync(testFile)).toBe(false);
      
      expect(fileDeletedSpy).toHaveBeenCalledWith('test.txt');
    });

    it('should handle folder cleared from server', async () => {
      // Create some files first
      fs.writeFileSync(path.join(testDir, 'file1.txt'), 'content1');
      fs.writeFileSync(path.join(testDir, 'file2.txt'), 'content2');

      const folderClearedSpy = vi.fn();
      syncManager.on('folderCleared', folderClearedSpy);

      syncManager.handleServerMessage({
        type: 'FOLDER_CLEARED'
      });

      expect(folderClearedSpy).toHaveBeenCalled();
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect conflicts when local and server versions differ', async () => {
      // Create a file with local content
      const testFile = path.join(testDir, 'conflict.txt');
      fs.writeFileSync(testFile, 'local content');

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const payload = {
        relativePath: 'conflict.txt',
        fileContent: 'server content',
        version: 2
      };

      syncManager.handleServerMessage({
        type: 'FILE_CHANGED',
        payload
      });

      // Should log a warning about potential conflict
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Potential conflict detected')
      );

      // Server version should win (for now)
      const content = fs.readFileSync(testFile, 'utf8');
      expect(content).toBe('server content');

      consoleWarnSpy.mockRestore();
    });

    it('should not create duplicate files when server sends FILE_CREATED for existing file', async () => {
      // Create a file locally first
      const testFile = path.join(testDir, 'existing.txt');
      fs.writeFileSync(testFile, 'local content');

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const payload = {
        relativePath: 'existing.txt',
        fileContent: 'server content',
        version: 1
      };

      syncManager.handleServerMessage({
        type: 'FILE_CREATED',
        payload
      });

      // Should log a warning about file already existing
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('File already exists locally')
      );

      // Local content should remain unchanged
      const content = fs.readFileSync(testFile, 'utf8');
      expect(content).toBe('local content');

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Directory Creation', () => {
    it('should create nested directories when receiving files from server', async () => {
      const payload = {
        relativePath: 'nested/folder/test.txt',
        fileContent: 'nested content',
        version: 1
      };

      syncManager.handleServerMessage({
        type: 'FILE_CREATED',
        payload
      });

      // Check if nested directories were created
      const nestedDir = path.join(testDir, 'nested', 'folder');
      expect(fs.existsSync(nestedDir)).toBe(true);

      // Check if file was created
      const testFile = path.join(nestedDir, 'test.txt');
      expect(fs.existsSync(testFile)).toBe(true);
      
      const content = fs.readFileSync(testFile, 'utf8');
      expect(content).toBe('nested content');
    });
  });

  describe('Legacy Message Support', () => {
    it('should handle legacy FILE_UPDATED messages', async () => {
      const testFile = path.join(testDir, 'legacy.txt');
      fs.writeFileSync(testFile, 'initial content');

      const fileChangedSpy = vi.fn();
      syncManager.on('fileChanged', fileChangedSpy);

      const payload = {
        relativePath: 'legacy.txt',
        fileContent: 'updated content'
      };

      syncManager.handleServerMessage({
        type: 'FILE_UPDATED',
        payload
      });

      // Should handle as FILE_CHANGED
      const content = fs.readFileSync(testFile, 'utf8');
      expect(content).toBe('updated content');
      
      expect(fileChangedSpy).toHaveBeenCalledWith('legacy.txt');
    });
  });

  describe('Git folder sync', () => {
    it('should create SyncManager with git folder sync enabled by default', () => {
      const syncManager = new SyncManager('/test/path');
      expect(syncManager.isGitFolderSyncEnabled()).toBe(true);
    });

    it('should create SyncManager with git folder sync enabled explicitly', () => {
      const syncManager = new SyncManager('/test/path', true);
      expect(syncManager.isGitFolderSyncEnabled()).toBe(true);
    });

    it('should create SyncManager with git folder sync disabled explicitly', () => {
      const syncManager = new SyncManager('/test/path', false);
      expect(syncManager.isGitFolderSyncEnabled()).toBe(false);
    });
  });
});
