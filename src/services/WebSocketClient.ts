import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { logger } from '../utils/Logger';

export interface SyncMessage {
  type: string;
  payload?: {
    relativePath?: string;
    fileContent?: string;
    version?: number;
  };
}

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(url: string) {
    super();
    this.url = url;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        // Set up event handlers
        this.ws.on('open', () => {
          this.reconnectAttempts = 0;
          this.emit('open');
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString());
            this.emit('message', message);
                  } catch (error) {
          logger.error('Invalid JSON message received:', error);
        }
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          this.emit('close', code, reason.toString());
          this.ws = null;
        });

        this.ws.on('error', (error: Error) => {
          this.emit('error', error);
          reject(error);
        });

        // For testing purposes, if the WebSocket is already in OPEN state, resolve immediately
        if (this.ws.readyState === WebSocket.OPEN) {
          this.reconnectAttempts = 0;
          this.emit('open');
          resolve();
        }

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send a message to the server
   */
  send(message: SyncMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      logger.warn('WebSocket is not connected. Message not sent:', message);
    }
  }

  /**
   * Send a file sync message
   */
  sendFile(relativePath: string, fileContent: string): void {
    this.send({
      type: 'SYNC_FILE',
      payload: {
        relativePath,
        fileContent
      }
    });
  }

  /**
   * Send a file delete message
   */
  sendDeleteFile(relativePath: string): void {
    this.send({
      type: 'DELETE_FILE',
      payload: {
        relativePath
      }
    });
  }

  /**
   * Send a clear folder message
   */
  sendClearFolder(): void {
    this.send({
      type: 'CLEAR_FOLDER'
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get WebSocket ready state
   */
  getReadyState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logger.error('Reconnection attempt failed:', error);
        await this.reconnect();
      }
    }, delay);
  }
}
