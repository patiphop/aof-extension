import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger, LogLevel } from '../src/utils/Logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: any;

  beforeEach(() => {
    logger = Logger.getInstance();
    // Reset logger configuration for each test
    logger.setConfig({
      level: LogLevel.INFO,
      showFileSync: true,
      showConnection: true,
      showDebug: false
    });
    logger.setExtensionMode(false);
    
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Log Levels', () => {
    it('should log error messages regardless of level', () => {
      logger.setLogLevel(LogLevel.ERROR);
      logger.error('Test error');
      
      expect(consoleSpy.error).toHaveBeenCalledWith('[ERROR] Test error');
    });

    it('should not log info messages when level is ERROR', () => {
      logger.setLogLevel(LogLevel.ERROR);
      logger.info('Test info');
      
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should log warn messages when level is WARN', () => {
      logger.setLogLevel(LogLevel.WARN);
      logger.warn('Test warning');
      
      expect(consoleSpy.warn).toHaveBeenCalledWith('[WARN] Test warning');
    });

    it('should log info messages when level is INFO', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.info('Test info');
      
      expect(consoleSpy.log).toHaveBeenCalledWith('[INFO] Test info');
    });

    it('should log debug messages when level is DEBUG', () => {
      logger.setLogLevel(LogLevel.DEBUG);
      logger.setConfig({ showDebug: true });
      logger.debug('Test debug');
      
      expect(consoleSpy.log).toHaveBeenCalledWith('[DEBUG] Test debug');
    });
  });

  describe('Extension Mode', () => {
    it('should log extension messages only in extension mode', () => {
      logger.setExtensionMode(true);
      logger.setLogLevel(LogLevel.INFO);
      
      logger.extension('Test extension');
      expect(consoleSpy.log).toHaveBeenCalledWith('[EXTENSION] Test extension');
    });

    it('should not log extension messages in server mode', () => {
      logger.setExtensionMode(false);
      logger.setLogLevel(LogLevel.INFO);
      
      logger.extension('Test extension');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('Server Mode', () => {
    it('should log server messages only in server mode', () => {
      logger.setExtensionMode(false);
      logger.setLogLevel(LogLevel.INFO);
      
      logger.server('Test server');
      expect(consoleSpy.log).toHaveBeenCalledWith('[SERVER] Test server');
    });

    it('should not log server messages in extension mode', () => {
      logger.setExtensionMode(true);
      logger.setLogLevel(LogLevel.INFO);
      
      logger.server('Test server');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('Sync Logs', () => {
    it('should log sync messages when showFileSync is true', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.setConfig({ showFileSync: true });
      
      logger.sync('Test sync');
      expect(consoleSpy.log).toHaveBeenCalledWith('[SYNC] Test sync');
    });

    it('should not log sync messages when showFileSync is false', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.setConfig({ showFileSync: false });
      
      logger.sync('Test sync');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('Connection Logs', () => {
    it('should log connection messages when showConnection is true', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.setConfig({ showConnection: true });
      
      logger.connection('Test connection');
      expect(consoleSpy.log).toHaveBeenCalledWith('[CONNECTION] Test connection');
    });

    it('should not log connection messages when showConnection is false', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.setConfig({ showConnection: false });
      
      logger.connection('Test connection');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('Debug Logs', () => {
    it('should log debug messages when showDebug is true and level is DEBUG', () => {
      logger.setLogLevel(LogLevel.DEBUG);
      logger.setConfig({ showDebug: true });
      
      logger.debug('Test debug');
      expect(consoleSpy.log).toHaveBeenCalledWith('[DEBUG] Test debug');
    });

    it('should not log debug messages when showDebug is false', () => {
      logger.setLogLevel(LogLevel.DEBUG);
      logger.setConfig({ showDebug: false });
      
      logger.debug('Test debug');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should apply configuration correctly', () => {
      logger.setConfig({
        level: LogLevel.INFO,
        showFileSync: false,
        showConnection: true,
        showDebug: false
      });

      // Should log info (level is INFO)
      logger.info('Test info');
      expect(consoleSpy.log).toHaveBeenCalledWith('[INFO] Test info');

      // Should log warn
      logger.warn('Test warning');
      expect(consoleSpy.warn).toHaveBeenCalledWith('[WARN] Test warning');

      // Should not log sync (disabled)
      logger.sync('Test sync');
      expect(consoleSpy.log).not.toHaveBeenCalledWith('[SYNC] Test sync');

      // Should log connection (enabled)
      logger.connection('Test connection');
      expect(consoleSpy.log).toHaveBeenCalledWith('[CONNECTION] Test connection');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});
