import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { FileScanner } from '../utils/FileScanner';
import { WebSocketClient, SyncMessage } from './WebSocketClient';
import { GitignoreParser } from '../utils/GitignoreParser';
import { logger } from '../utils/Logger';

export interface ServerMessage {
  type: string;
  payload?: any;
}

export class SyncManager extends EventEmitter {
  private fileScanner: FileScanner;
  private webSocketClient: WebSocketClient;
  private localFolderPath: string;
  private isActive = false;

  constructor(localFolderPath: string) {
    super();
    this.localFolderPath = localFolderPath;
    const gitignoreParser = new GitignoreParser();
    this.fileScanner = new FileScanner(gitignoreParser);
    this.webSocketClient = new WebSocketClient('ws://192.168.1.105:1420');
    
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
        this.webSocketClient.sendClearFolder();
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
      const relativePath = this.fileScanner.getRelativePath(this.localFolderPath, filePath);
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
        this.handleFileUpdate(message.payload);
        break;
      case 'DELETE_FILE':
        this.handleFileDelete(message.payload);
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
    
    for (const filePath of files) {
      try {
        const relativePath = this.fileScanner.getRelativePath(this.localFolderPath, filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        this.webSocketClient.sendFile(relativePath, content);
      } catch (error) {
        logger.error(`Error in initial sync for ${filePath}:`, error);
      }
    }

    logger.sync(`Initial sync complete. Synced ${files.length} files.`);
  }

  /**
   * Set up WebSocket event listeners
   */
  private setupWebSocketListeners(): void {
    this.webSocketClient.on('open', () => {
      logger.connection('Connected to sync server');
      this.emit('connected');
    });

    this.webSocketClient.on('message', (message: SyncMessage) => {
      this.handleServerMessage(message);
    });

    this.webSocketClient.on('close', (code: number, reason: string) => {
      logger.connection(`Disconnected from sync server: ${code} - ${reason}`);
      this.isActive = false;
      this.emit('disconnected', code, reason);
    });

    this.webSocketClient.on('error', (error: Error) => {
      logger.error('WebSocket error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Handle file update from server
   */
  private handleFileUpdate(payload: { relativePath: string; fileContent: string }): void {
    const { relativePath, fileContent } = payload;
    const localFilePath = path.join(this.localFolderPath, ...relativePath.split('/'));

    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(localFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file content
      fs.writeFileSync(localFilePath, fileContent, 'utf8');
      logger.sync(`File updated from server: ${relativePath}`);
      this.emit('fileUpdated', relativePath);
    } catch (error) {
      logger.error(`Error updating file ${relativePath}:`, error);
    }
  }

  /**
   * Handle file delete from server
   */
  private handleFileDelete(payload: { relativePath: string }): void {
    const { relativePath } = payload;
    const localFilePath = path.join(this.localFolderPath, ...relativePath.split('/'));

    try {
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
}
