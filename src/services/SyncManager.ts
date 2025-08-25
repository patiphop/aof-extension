import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { FileScanner } from '../utils/FileScanner';
import { WebSocketClient } from './WebSocketClient';
import { GitignoreParser } from '../utils/GitignoreParser';
import { logger } from '../utils/Logger';

export interface ServerMessage {
  type: string;
  payload?: {
    relativePath?: string;
    fileContent?: string;
    version?: number;
  };
}

export class SyncManager extends EventEmitter {
  private fileScanner: FileScanner;
  private webSocketClient: WebSocketClient;
  private localFolderPath: string;
  private isActive = false;
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit for individual files
  private suppressedPaths: Map<string, number> = new Map();
  private readonly suppressTtlMs = 2000;
  private gitignorePatterns: string[] = [];

  constructor(localFolderPath: string) {
    super();
    this.localFolderPath = localFolderPath;
    const gitignoreParser = new GitignoreParser();
    this.fileScanner = new FileScanner(gitignoreParser);
    this.webSocketClient = new WebSocketClient('ws://192.168.1.105:1420');
    // Preload gitignore patterns for client-side filtering (root + subfolders)
    this.gitignorePatterns = gitignoreParser.loadAllGitignores(this.localFolderPath);
    
    this.setupWebSocketListeners();
  }

  /**
   * Start the sync process
   */
  async startSync(): Promise<void> {
    if (this.isActive) {
      throw new Error('Sync is already active');
    }

    try {
      await this.webSocketClient.connect();
      this.isActive = true;

      // Perform initial sync
      await this.performInitialSync();

      this.emit('syncStarted');
    } catch (error) {
      this.isActive = false;
      logger.error('Error starting sync:', error);
      throw error;
    }
  }

  /**
   * Stop the sync process
   */
  async stopSync(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    try {
      if (this.webSocketClient.isConnected()) {
        // Ask server to clear its folder and wait for confirmation
        this.webSocketClient.sendClearFolder();
        await this.waitForFolderClearedConfirmation(2000);
      }
      this.webSocketClient.disconnect();
      this.isActive = false;
      this.emit('syncStopped');
    } catch (error) {
      logger.error('Error stopping sync:', error);
      throw error;
    }
  }

  /**
   * Sync a single file
   */
  syncFile(filePath: string): void {
    if (!this.isActive || !this.webSocketClient.isConnected()) {
      return;
    }

    try {
      // Determine relative path once
      const relativePathForIgnore = this.fileScanner.getRelativePath(this.localFolderPath, filePath);

      // Suppress echo updates coming from server-applied writes
      if (this.shouldSuppress(relativePathForIgnore)) {
        return;
      }

      // Skip node_modules and hidden/temp files
      if (
        relativePathForIgnore.startsWith('node_modules/') ||
        relativePathForIgnore.includes('/node_modules/') ||
        relativePathForIgnore.startsWith('.') ||
        relativePathForIgnore.includes('~') ||
        relativePathForIgnore.includes('#')
      ) {
        return;
      }

      // Apply .gitignore filtering
      const gitignoreParser = new GitignoreParser();
      if (gitignoreParser.shouldIgnore(relativePathForIgnore, this.gitignorePatterns)) {
        return;
      }

      // Check file size before syncing
      const stats = fs.statSync(filePath);
      if (stats.size > this.MAX_FILE_SIZE) {
        logger.warn(`File too large to sync: ${filePath} (${stats.size} bytes, max: ${this.MAX_FILE_SIZE} bytes)`);
        return;
      }

      const relativePath = relativePathForIgnore;
      const content = fs.readFileSync(filePath, 'utf8');
      this.webSocketClient.sendFile(relativePath, content);
    } catch (error) {
      logger.error(`Error syncing file ${filePath}:`, error);
    }
  }

  /**
   * Delete a file from sync
   */
  deleteFile(filePath: string): void {
    if (!this.isActive || !this.webSocketClient.isConnected()) {
      return;
    }

    try {
      const relativePath = this.fileScanner.getRelativePath(this.localFolderPath, filePath);
      if (this.shouldSuppress(relativePath)) {
        return;
      }
      if (
        relativePath.startsWith('node_modules/') ||
        relativePath.includes('/node_modules/')
      ) {
        return;
      }
      // Apply .gitignore filtering
      const gitignoreParser = new GitignoreParser();
      if (gitignoreParser.shouldIgnore(relativePath, this.gitignorePatterns)) {
        return;
      }
      this.webSocketClient.sendDeleteFile(relativePath);
    } catch (error) {
      logger.error(`Error deleting file ${filePath}:`, error);
    }
  }

  /**
   * Check if sync is currently active
   */
  isSyncing(): boolean {
    return this.isActive;
  }

  /**
   * Get the local folder path
   */
  getLocalFolderPath(): string {
    return this.localFolderPath;
  }



  /**
   * Handle messages from the server
   */
  handleServerMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'FILE_UPDATED':
        if (message.payload?.relativePath && message.payload?.fileContent) {
          this.handleFileUpdate({
            relativePath: message.payload.relativePath,
            fileContent: message.payload.fileContent
          });
        }
        break;
      case 'FILE_CREATED':
        if (message.payload?.relativePath && message.payload?.fileContent) {
          this.handleFileCreated({
            relativePath: message.payload.relativePath,
            fileContent: message.payload.fileContent,
            version: message.payload.version
          });
        }
        break;
      case 'FILE_CHANGED':
        if (message.payload?.relativePath && message.payload?.fileContent) {
          this.handleFileChanged({
            relativePath: message.payload.relativePath,
            fileContent: message.payload.fileContent,
            version: message.payload.version
          });
        }
        break;
      case 'FILE_DELETED':
        if (message.payload?.relativePath) {
          this.handleFileDelete({
            relativePath: message.payload.relativePath
          });
        }
        break;
      case 'FOLDER_CLEARED':
        this.handleFolderCleared();
        break;
      default:
        logger.warn('Unknown message type:', message.type);
    }
  }

  /**
   * Perform initial sync of all files
   */
  private async performInitialSync(): Promise<void> {
    const files = this.fileScanner.scanFiles(this.localFolderPath);
    let syncedCount = 0;
    let skippedCount = 0;
    
    for (const filePath of files) {
      try {
        // Check file size before syncing
        const stats = fs.statSync(filePath);
        if (stats.size > this.MAX_FILE_SIZE) {
          logger.warn(`Skipping oversized file in initial sync: ${filePath} (${stats.size} bytes, max: ${this.MAX_FILE_SIZE} bytes)`);
          skippedCount++;
          continue;
        }

        const relativePath = this.fileScanner.getRelativePath(this.localFolderPath, filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        this.webSocketClient.sendFile(relativePath, content);
        syncedCount++;
      } catch (error) {
        logger.error(`Error in initial sync for ${filePath}:`, error);
      }
    }

    logger.sync(`Initial sync complete. Synced ${syncedCount} files, skipped ${skippedCount} oversized files.`);
  }

  /**
   * Set up WebSocket event listeners
   */
  private setupWebSocketListeners(): void {
    this.webSocketClient.on('open', () => {
      this.emit('connected');
    });

    this.webSocketClient.on('close', (code: number, reason: string) => {
      this.emit('disconnected', code, reason);
    });

    this.webSocketClient.on('error', (error: Error) => {
      this.emit('error', error);
    });

    this.webSocketClient.on('serverError', (errorMessage: string) => {
      logger.error('Server error:', errorMessage);
      this.emit('serverError', errorMessage);
    });

    this.webSocketClient.on('message', (message: ServerMessage) => {
      this.handleServerMessage(message);
    });
  }

  /**
   * Handle file update from server (legacy)
   */
  private handleFileUpdate(payload: { relativePath: string; fileContent: string }): void {
    this.handleFileChanged(payload);
  }

  /**
   * Handle file creation from server
   */
  private handleFileCreated(payload: { relativePath: string; fileContent: string; version?: number }): void {
    const { relativePath, fileContent } = payload;
    const localFilePath = path.join(this.localFolderPath, ...relativePath.split('/'));

    try {
      // Suppress watcher echo for this path while we apply server change
      this.markSuppress(relativePath);
      // Create directory if it doesn't exist
      const dir = path.dirname(localFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Check if file already exists locally
      if (fs.existsSync(localFilePath)) {
        logger.warn(`File already exists locally: ${relativePath}`);
        return;
      }

      // Write file content
      fs.writeFileSync(localFilePath, fileContent, 'utf8');
      logger.sync(`File created from server: ${relativePath}`);
      this.emit('fileCreated', relativePath);
    } catch (error) {
      logger.error(`Error creating file ${relativePath}:`, error);
    }
  }

  /**
   * Handle file change from server
   */
  private handleFileChanged(payload: { relativePath: string; fileContent: string; version?: number }): void {
    const { relativePath, fileContent } = payload;
    const localFilePath = path.join(this.localFolderPath, ...relativePath.split('/'));

    try {
      // Suppress watcher echo for this path while we apply server change
      this.markSuppress(relativePath);
      // Create directory if it doesn't exist
      const dir = path.dirname(localFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Check if local file has been modified recently
      if (fs.existsSync(localFilePath)) {
        const localContent = fs.readFileSync(localFilePath, 'utf8');
        
        // If local content is different, there might be a conflict
        if (localContent !== fileContent) {
          logger.warn(`Potential conflict detected for ${relativePath}. Local and server versions differ.`);
          // For now, we'll let the server version win
          // In a more sophisticated system, we'd implement conflict resolution
        }
      }

      // Write file content
      fs.writeFileSync(localFilePath, fileContent, 'utf8');
      logger.sync(`File changed from server: ${relativePath}`);
      this.emit('fileChanged', relativePath);
    } catch (error) {
      logger.error(`Error changing file ${relativePath}:`, error);
    }
  }

  /**
   * Handle file delete from server
   */
  private handleFileDelete(payload: { relativePath: string }): void {
    const { relativePath } = payload;
    const localFilePath = path.join(this.localFolderPath, ...relativePath.split('/'));

    try {
      // Suppress watcher echo for this path while we apply server change
      this.markSuppress(relativePath);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
        logger.sync(`File deleted from server: ${relativePath}`);
        this.emit('fileDeleted', relativePath);
      }
    } catch (error) {
      logger.error(`Error deleting file ${relativePath}:`, error);
    }
  }

  /**
   * Handle folder cleared from server
   */
  private handleFolderCleared(): void {
    logger.sync('Server folder cleared');
    this.emit('folderCleared');
  }

  /**
   * Wait until server confirms folder cleared, or timeout
   */
  private waitForFolderClearedConfirmation(timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      let resolved = false;
      const onMessage = (message: ServerMessage) => {
        if (message.type === 'FOLDER_CLEARED_CONFIRMED') {
          if (!resolved) {
            resolved = true;
            this.webSocketClient.off('message', onMessage as any);
            resolve();
          }
        }
      };

      // Attach temporary listener
      this.webSocketClient.on('message', onMessage as any);

      // Fallback timeout
      setTimeout(() => {
        if (!resolved) {
          this.webSocketClient.off('message', onMessage as any);
          resolve();
        }
      }, Math.max(0, timeoutMs));
    });
  }

  private markSuppress(relativePath: string): void {
    const now = Date.now();
    this.suppressedPaths.set(relativePath, now + this.suppressTtlMs);
  }

  private shouldSuppress(relativePath: string): boolean {
    const now = Date.now();
    const expireAt = this.suppressedPaths.get(relativePath);
    if (expireAt && expireAt > now) {
      return true;
    }
    if (expireAt && expireAt <= now) {
      this.suppressedPaths.delete(relativePath);
    }
    return false;
  }
}
