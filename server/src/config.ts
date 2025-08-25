export interface ServerConfig {
  port: number;
  baseDir: string;
  maxPayloadSize: number;
  maxFileSize: number;
  pingInterval: number;
  compression: {
    enabled: boolean;
    threshold: number;
    concurrencyLimit: number;
  };
}

export const defaultConfig: ServerConfig = {
  port: 1420,
  baseDir: '/Users/patiphopungudchuak/Documents/workspaces/sync-local-files',
  maxPayloadSize: 100 * 1024 * 1024, // 100MB
  maxFileSize: 50 * 1024 * 1024, // 50MB
  pingInterval: 30000, // 30 seconds
  compression: {
    enabled: true,
    threshold: 1024, // 1KB
    concurrencyLimit: 10
  }
};

export function loadConfig(): ServerConfig {
  // Load from environment variables if available
  const config = { ...defaultConfig };
  
  if (process.env.PORT) {
    config.port = parseInt(process.env.PORT, 10);
  }
  
  if (process.env.BASE_DIR) {
    config.baseDir = process.env.BASE_DIR;
  }
  
  if (process.env.MAX_PAYLOAD_SIZE) {
    config.maxPayloadSize = parseInt(process.env.MAX_PAYLOAD_SIZE, 10);
  }
  
  if (process.env.MAX_FILE_SIZE) {
    config.maxFileSize = parseInt(process.env.MAX_FILE_SIZE, 10);
  }
  
  if (process.env.PING_INTERVAL) {
    config.pingInterval = parseInt(process.env.PING_INTERVAL, 10);
  }
  
  if (process.env.COMPRESSION_ENABLED !== undefined) {
    config.compression.enabled = process.env.COMPRESSION_ENABLED === 'true';
  }
  
  if (process.env.COMPRESSION_THRESHOLD) {
    config.compression.threshold = parseInt(process.env.COMPRESSION_THRESHOLD, 10);
  }
  
  if (process.env.COMPRESSION_CONCURRENCY_LIMIT) {
    config.compression.concurrencyLimit = parseInt(process.env.COMPRESSION_CONCURRENCY_LIMIT, 10);
  }
  
  return config;
}

