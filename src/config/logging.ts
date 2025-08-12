import { LogLevel } from '../utils/Logger';

export interface LoggingConfig {
  level: LogLevel;
  showFileSync: boolean;
  showConnection: boolean;
  showDebug: boolean;
}

export const defaultLoggingConfig: LoggingConfig = {
  level: LogLevel.INFO,
  showFileSync: true,
  showConnection: true,
  showDebug: false
};

export const quietLoggingConfig: LoggingConfig = {
  level: LogLevel.WARN,
  showFileSync: false,
  showConnection: true,
  showDebug: false
};

export const verboseLoggingConfig: LoggingConfig = {
  level: LogLevel.DEBUG,
  showFileSync: true,
  showConnection: true,
  showDebug: true
};
