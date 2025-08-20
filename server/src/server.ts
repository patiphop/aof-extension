import { SyncServer } from './SyncServer';
import { logger, LogLevel } from './utils/Logger';

// Set up logger for server mode
logger.setExtensionMode(false);
logger.setLogLevel(LogLevel.INFO); // Can be changed to WARN to reduce logs

// Get port from environment or use default
const port = parseInt(process.env.PORT || '1420', 10);

// Create and start the sync server
const server = new SyncServer(port);

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
logger.server(`- Port: ${port}`);
logger.server(`- WebSocket URL: ws://localhost:${port}`);
logger.server(`- BaseDir: /Users/patiphopungudchuak/Documents/workspaces/sync-local-files`);
logger.server(`- Press Ctrl+C to stop the server`);
