import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { FileManager } from './FileManager';
import { logger } from './utils/Logger';
import { 
  SyncMessage, 
  FileSyncMessage, 
  DeleteFileMessage, 
  ClearFolderMessage,
  FileUpdateMessage,
  FileCreatedMessage,
  FileChangedMessage,
  ClientInfo 
} from './types';

export class SyncServer {
  private wss: WebSocketServer;
  private clients: Map<string, ClientInfo> = new Map();
  private fileManager: FileManager;
  private port: number;
  private pingInterval!: NodeJS.Timeout;

  constructor(port: number = 1420) {
    this.port = port;
    const baseDir = process.env.BASE_DIR || './synced-files';
    this.fileManager = new FileManager(baseDir);
    this.wss = new WebSocketServer({ port });
    
    this.setupWebSocketServer();
    this.setupFileWatcher();
    this.startPingInterval();
    
    logger.server(`faizSync Server started on port ${port}`);
    logger.server(`Base directory: ${this.fileManager.getBaseDir()}`);
  }

  /**
   * Set up WebSocket server
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      this.handleNewConnection(ws);
    });

    this.wss.on('error', (error: Error) => {
      logger.error('WebSocket server error:', error);
    });
  }

  /**
   * Set up file watcher for bidirectional sync
   */
  private setupFileWatcher(): void {
    this.fileManager.on('fileCreated', (data: { relativePath: string; content: string; version: number }) => {
      this.broadcastToAll({
        type: 'FILE_CREATED',
        payload: {
          relativePath: data.relativePath,
          fileContent: data.content,
          version: data.version
        }
      });
    });

    this.fileManager.on('fileChanged', (data: { relativePath: string; content: string; version: number }) => {
      this.broadcastToAll({
        type: 'FILE_CHANGED',
        payload: {
          relativePath: data.relativePath,
          fileContent: data.content,
          version: data.version
        }
      });
    });

    this.fileManager.on('fileDeleted', (data: { relativePath: string }) => {
      this.broadcastToAll({
        type: 'FILE_DELETED',
        payload: {
          relativePath: data.relativePath
        }
      });
    });

    // Start watching for file changes
    this.fileManager.startWatching();
  }

  /**
   * Handle new client connection
   */
  private handleNewConnection(ws: WebSocket): void {
    const clientId = uuidv4();
    const clientInfo: ClientInfo = {
      id: clientId,
      ws,
      isAlive: true,
      lastPing: Date.now()
    };

    this.clients.set(clientId, clientInfo);
    logger.connection(`Client connected: ${clientId} (Total: ${this.clients.size})`);

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'CONNECTED',
      payload: { clientId, fileCount: this.fileManager.getFileCount() }
    });

    // Set up message handler
    ws.on('message', (data: any) => {
      this.handleMessage(clientId, data);
    });

    // Set up close handler
    ws.on('close', () => {
      this.handleClientDisconnect(clientId);
    });

    // Set up error handler
    ws.on('error', (error: Error) => {
      logger.error(`Client ${clientId} error:`, error);
      this.handleClientDisconnect(clientId);
    });

    // Set up pong handler
    ws.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.isAlive = true;
        client.lastPing = Date.now();
      }
    });
  }

  /**
   * Handle incoming messages from clients
   */
  private handleMessage(clientId: string, data: any): void {
    try {
      const message: SyncMessage = JSON.parse(data.toString());
      logger.debug(`Message from client ${clientId}:`, message.type);

      switch (message.type) {
        case 'SYNC_FILE':
          this.handleFileSync(clientId, message as FileSyncMessage);
          break;
        case 'DELETE_FILE':
          this.handleFileDelete(clientId, message as DeleteFileMessage);
          break;
        case 'CLEAR_FOLDER':
          this.handleClearFolder(clientId, message as ClearFolderMessage);
          break;
        case 'PING':
          this.handlePing(clientId);
          break;
        default:
          logger.warn(`Unknown message type from client ${clientId}:`, message.type);
      }
    } catch (error) {
      logger.error(`Error parsing message from client ${clientId}:`, error);
    }
  }

  /**
   * Handle file sync message
   */
  private async handleFileSync(clientId: string, message: FileSyncMessage): Promise<void> {
    try {
      const { relativePath, fileContent } = message.payload;
      
      // Sync file to local storage
      await this.fileManager.syncFile(relativePath, fileContent, clientId);

      // Broadcast to other clients
      this.broadcastToOthers(clientId, {
        type: 'FILE_UPDATED',
        payload: { relativePath, fileContent }
      });

      // Send confirmation to sender
      this.sendToClient(clientId, {
        type: 'FILE_SYNCED',
        payload: { relativePath }
      });

    } catch (error) {
      logger.error(`Error handling file sync from client ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'ERROR',
        payload: { message: 'Failed to sync file' }
      });
    }
  }

  /**
   * Handle file delete message
   */
  private async handleFileDelete(clientId: string, message: DeleteFileMessage): Promise<void> {
    try {
      const { relativePath } = message.payload;
      
      // Delete file from local storage
      await this.fileManager.deleteFile(relativePath);

      // Broadcast to other clients
      this.broadcastToOthers(clientId, {
        type: 'FILE_DELETED',
        payload: { relativePath }
      });

      // Send confirmation to sender
      this.sendToClient(clientId, {
        type: 'FILE_DELETED_CONFIRMED',
        payload: { relativePath }
      });

    } catch (error) {
      logger.error(`Error handling file delete from client ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'ERROR',
        payload: { message: 'Failed to delete file' }
      });
    }
  }

  /**
   * Handle clear folder message
   */
  private async handleClearFolder(clientId: string, message: ClearFolderMessage): Promise<void> {
    try {
      // Clear all files
      await this.fileManager.clearFolder();

      // Broadcast to other clients
      this.broadcastToOthers(clientId, {
        type: 'FOLDER_CLEARED'
      });

      // Send confirmation to sender
      this.sendToClient(clientId, {
        type: 'FOLDER_CLEARED_CONFIRMED'
      });

    } catch (error) {
      logger.error(`Error handling clear folder from client ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'ERROR',
        payload: { message: 'Failed to clear folder' }
      });
    }
  }

  /**
   * Handle ping message
   */
  private handlePing(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.isAlive = true;
      client.lastPing = Date.now();
      
      this.sendToClient(clientId, { type: 'PONG' });
    }
  }

  /**
   * Handle client disconnection
   */
  private handleClientDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      logger.connection(`Client disconnected: ${clientId} (Total: ${this.clients.size})`);
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error(`Error sending message to client ${clientId}:`, error);
      }
    }
  }

  /**
   * Broadcast message to all clients except sender
   */
  private broadcastToOthers(senderId: string, message: any): void {
    this.clients.forEach((client, clientId) => {
      if (clientId !== senderId && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(message));
        } catch (error) {
          logger.error(`Error broadcasting to client ${clientId}:`, error);
        }
      }
    });
  }

  /**
   * Broadcast message to all clients
   */
  private broadcastToAll(message: any): void {
    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(message));
        } catch (error) {
          logger.error(`Error broadcasting to client ${clientId}:`, error);
        }
      }
    });
  }

  /**
   * Start ping interval to check client health
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          logger.connection(`Terminating inactive client: ${clientId}`);
          client.ws.terminate();
          this.clients.delete(clientId);
          return;
        }

        client.isAlive = false;
        try {
          client.ws.ping();
        } catch (error) {
          logger.error(`Error pinging client ${clientId}:`, error);
        }
      });
    }, 30000); // 30 seconds
  }

  /**
   * Get server statistics
   */
  getStats(): any {
    return {
      port: this.port,
      clientCount: this.clients.size,
      fileCount: this.fileManager.getFileCount(),
      baseDir: this.fileManager.getBaseDir()
    };
  }

  /**
   * Stop the server
   */
  stop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // Stop file watcher
    this.fileManager.stopWatching();
    
    this.wss.close(() => {
      logger.server('faizSync Server stopped');
    });
  }
}
