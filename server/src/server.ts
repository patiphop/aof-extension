import { SyncServer } from './SyncServer';
import { logger, LogLevel } from './utils/Logger';
import { loadConfig } from './config';

// Set up logger for server mode (reduce verbosity to WARN by default)
logger.setExtensionMode(false);
logger.setLogLevel(LogLevel.WARN);

// Load server configuration
const config = loadConfig();

// Create and start the sync server
const server = new SyncServer(config);

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.server('Received SIGINT, shutting down gracefully...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.server('Received SIGTERM, shutting down gracefully...');
  server.stop();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  server.stop();
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  server.stop();
  process.exit(1);
});

logger.server('faizSync Server is running...');
logger.server(`- Port: ${config.port}`);
logger.server(`- WebSocket URL: ws://localhost:${config.port}`);
logger.server(`- BaseDir: ${config.baseDir}`);
logger.server(`- Max Payload: ${config.maxPayloadSize / (1024 * 1024)}MB`);
logger.server(`- Max File Size: ${config.maxFileSize / (1024 * 1024)}MB`);

// Optionally show gitignore pattern summary at WARN/INFO threshold only
try {
  const gitignorePatterns = server.getGitignorePatterns();
  if (gitignorePatterns.length > 0) {
    logger.server(`- Gitignore Patterns: ${gitignorePatterns.length} patterns loaded`);
  } else {
    logger.server('- Gitignore Patterns: No .gitignore files found');
  }
} catch {}

logger.server(`- Press Ctrl+C to stop the server`);
