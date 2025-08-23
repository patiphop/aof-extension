import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { FileScanner } from '../utils/FileScanner';
import { WebSocketClient, SyncMessage } from './WebSocketClient';
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
