export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private isExtension: boolean = false;
  private showFileSync: boolean = true;
  private showConnection: boolean = true;
  private showDebug: boolean = false;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  setExtensionMode(isExtension: boolean): void {
    this.isExtension = isExtension;
  }

  setConfig(config: {
    level?: LogLevel;
    showFileSync?: boolean;
    showConnection?: boolean;
    showDebug?: boolean;
  }): void {
    if (config.level !== undefined) this.logLevel = config.level;
    if (config.showFileSync !== undefined) this.showFileSync = config.showFileSync;
    if (config.showConnection !== undefined) this.showConnection = config.showConnection;
    if (config.showDebug !== undefined) this.showDebug = config.showDebug;
  }

  error(message: string, ...args: unknown[]): void {
    if (this.logLevel >= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.logLevel >= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.logLevel >= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.logLevel >= LogLevel.DEBUG && this.showDebug) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  // Extension-specific logging (only show in extension mode)
  extension(message: string, ...args: unknown[]): void {
    if (this.isExtension && this.logLevel >= LogLevel.INFO) {
      console.log(`[EXTENSION] ${message}`, ...args);
    }
  }

  // Server-specific logging (only show in server mode)
  server(message: string, ...args: unknown[]): void {
    if (!this.isExtension && this.logLevel >= LogLevel.INFO) {
      console.log(`[SERVER] ${message}`, ...args);
    }
  }

  // File sync logging (reduced frequency)
  sync(message: string, ...args: unknown[]): void {
    if (this.logLevel >= LogLevel.INFO && this.showFileSync) {
      console.log(`[SYNC] ${message}`, ...args);
    }
  }

  // Connection logging (important events only)
  connection(message: string, ...args: unknown[]): void {
    if (this.logLevel >= LogLevel.INFO && this.showConnection) {
      console.log(`[CONNECTION] ${message}`, ...args);
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
