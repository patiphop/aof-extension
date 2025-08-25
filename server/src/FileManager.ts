import * as fs from 'fs-extra';
import * as path from 'path';
import { FileInfo } from './types';
import { logger } from './utils/Logger';
import { EventEmitter } from 'events';
import { GitignoreParser } from './utils/GitignoreParser';

export class FileManager extends EventEmitter {
  private files: Map<string, FileInfo> = new Map();
  private baseDir: string;
  private fileWatcher: fs.FSWatcher | null = null;
  private isWatching = false;
  private readonly maxFileSize: number;
  private readonly gitignoreParser: GitignoreParser;
  private cachedGitignorePatterns: string[] = [];
  private lastGitignoreLoad = 0;
  private readonly gitignoreReloadMs = 3000;
  private suppressedWatcherPaths: Map<string, number> = new Map();
  private readonly suppressTtlMs = 2000;

  constructor(baseDir: string = './synced-files', maxFileSize: number = 50 * 1024 * 1024) {
    super();
    this.baseDir = baseDir;
    this.maxFileSize = maxFileSize;
    this.gitignoreParser = new GitignoreParser();
    this.ensureBaseDir();
  }

  /**
   * Ensure base directory exists
   */
  private ensureBaseDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirpSync(this.baseDir);
    }
  }

  /**
   * Start watching for file changes
   */
  startWatching(): void {
    if (this.isWatching) {
      return;
    }

    try {
      this.fileWatcher = fs.watch(this.baseDir, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        
        const relativePath = path.relative(this.baseDir, path.join(this.baseDir, filename));
        
        // Load gitignore patterns for this directory (cached)
        const gitignorePatterns = this.getGitignorePatterns();
        
        // Check if file/directory should be ignored based on gitignore
        if (this.gitignoreParser.shouldIgnore(relativePath, gitignorePatterns)) {
          logger.debug(`Ignoring ${eventType} for ${relativePath} (gitignore pattern)`);
          return;
        }
        
        // Ignore temporary files and hidden files
        if (relativePath.startsWith('.') || relativePath.includes('~') || relativePath.includes('#')) {
          return;
        }

        logger.debug(`File watcher detected ${eventType} for ${relativePath}`);
        
        if (eventType === 'rename') {
          // Check if file was deleted or created
          const fullPath = path.join(this.baseDir, relativePath);
          if (fs.existsSync(fullPath)) {
            this.handleFileCreated(relativePath);
          } else {
            this.handleFileDeleted(relativePath);
          }
        } else if (eventType === 'change') {
          this.handleFileChanged(relativePath);
        }
      });

      this.isWatching = true;
      logger.sync('File watcher started');
    } catch (error) {
      logger.error('Error starting file watcher:', error);
    }
  }

  /**
   * Stop watching for file changes
   */
  stopWatching(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
      this.isWatching = false;
      logger.sync('File watcher stopped');
    }
  }

  /**
   * Handle file creation
   */
  private async handleFileCreated(relativePath: string): Promise<void> {
    try {
      if (this.shouldSuppress(relativePath)) {
        return;
      }
      // Load gitignore patterns and check if file should be ignored
      const gitignorePatterns = this.getGitignorePatterns();
      if (this.gitignoreParser.shouldIgnore(relativePath, gitignorePatterns)) {
        logger.debug(`Ignoring file creation for ${relativePath} (gitignore pattern)`);
        return;
      }

      const fullPath = path.join(this.baseDir, relativePath);
      const stats = await fs.stat(fullPath);
      
      if (stats.isFile()) {
        const content = await fs.readFile(fullPath, 'utf8');
        const fileInfo: FileInfo = {
          relativePath,
          content,
          lastModified: stats.mtime.getTime(),
          lastClientId: 'server',
          version: this.getNextVersion(relativePath)
        };
        
        this.files.set(relativePath, fileInfo);
        
        // Emit event for server to broadcast
        this.emit('fileCreated', { relativePath, content, version: fileInfo.version });
        logger.sync(`File created: ${relativePath}`);
      }
    } catch (error) {
      logger.error(`Error handling file creation for ${relativePath}:`, error);
    }
  }

  /**
   * Handle file change
   */
  private async handleFileChanged(relativePath: string): Promise<void> {
    try {
      if (this.shouldSuppress(relativePath)) {
        return;
      }
      // Load gitignore patterns and check if file should be ignored
      const gitignorePatterns = this.getGitignorePatterns();
      if (this.gitignoreParser.shouldIgnore(relativePath, gitignorePatterns)) {
        logger.debug(`Ignoring file change for ${relativePath} (gitignore pattern)`);
        return;
      }

      const fullPath = path.join(this.baseDir, relativePath);
      const stats = await fs.stat(fullPath);
      
      if (stats.isFile()) {
        const content = await fs.readFile(fullPath, 'utf8');
        const existingFile = this.files.get(relativePath);
        
        // Only update if content actually changed
        if (!existingFile || existingFile.content !== content) {
          const fileInfo: FileInfo = {
            relativePath,
            content,
            lastModified: stats.mtime.getTime(),
            lastClientId: 'server',
            version: this.getNextVersion(relativePath)
          };
          
          this.files.set(relativePath, fileInfo);
          
          // Emit event for server to broadcast
          this.emit('fileChanged', { relativePath, content, version: fileInfo.version });
          logger.sync(`File changed: ${relativePath}`);
        }
      }
    } catch (error) {
      logger.error(`Error handling file change for ${relativePath}:`, error);
    }
  }

  /**
   * Handle file deletion
   */
  private handleFileDeleted(relativePath: string): void {
    // Suppress echo if this deletion was initiated programmatically
    if (this.shouldSuppress(relativePath)) {
      return;
    }
    // Load gitignore patterns and check if file should be ignored
    const gitignorePatterns = this.getGitignorePatterns();
    if (this.gitignoreParser.shouldIgnore(relativePath, gitignorePatterns)) {
      logger.debug(`Ignoring file deletion for ${relativePath} (gitignore pattern)`);
      return;
    }

    this.files.delete(relativePath);
    
    // Emit event for server to broadcast
    this.emit('fileDeleted', { relativePath });
    logger.sync(`File deleted: ${relativePath}`);
  }

  /**
   * Get next version number for a file
   */
  private getNextVersion(relativePath: string): number {
    const existingFile = this.files.get(relativePath);
    return (existingFile?.version || 0) + 1;
  }

  /**
   * Sync a file from client
   */
  async syncFile(relativePath: string, content: string, clientId: string): Promise<void> {
    try {
      // Load gitignore patterns and check if file should be ignored
      const gitignorePatterns = this.getGitignorePatterns();
      logger.debug(`Loaded ${gitignorePatterns.length} gitignore patterns for ${relativePath}`);
      logger.debug(`Gitignore patterns:`, gitignorePatterns);
      
      if (this.gitignoreParser.shouldIgnore(relativePath, gitignorePatterns)) {
        logger.debug(`Ignoring file sync for ${relativePath} (gitignore pattern)`);
        return;
      }

      // Check file content size before processing
      const contentSize = Buffer.byteLength(content, 'utf8');
      if (contentSize > this.maxFileSize) {
        throw new Error(`File too large: ${relativePath} (${contentSize} bytes, max: ${this.maxFileSize} bytes)`);
      }

      const filePath = path.join(this.baseDir, relativePath);
      const dir = path.dirname(filePath);
      
      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirpSync(dir);
      }

      // Check for conflicts
      const existingFile = this.files.get(relativePath);
      if (existingFile && existingFile.lastClientId !== clientId) {
        // Potential conflict - check if content is different
        if (existingFile.content !== content) {
          logger.warn(`Potential conflict detected for ${relativePath}`);
          // For now, we'll let the latest change win
          // In a more sophisticated system, we'd implement conflict resolution
        }
      }

      // Write file (suppress watcher echo for this path)
      this.markSuppress(relativePath);
      await fs.writeFile(filePath, content, 'utf8');

      // Update file info
      const fileInfo: FileInfo = {
        relativePath,
        content,
        lastModified: Date.now(),
        lastClientId: clientId,
        version: this.getNextVersion(relativePath)
      };

      this.files.set(relativePath, fileInfo);

      logger.sync(`File synced: ${relativePath} from client ${clientId}`);
    } catch (error) {
      logger.error(`Error syncing file ${relativePath}:`, error);
      throw error;
    }
  }

  private markSuppress(relativePath: string): void {
    const now = Date.now();
    this.suppressedWatcherPaths.set(relativePath, now + this.suppressTtlMs);
  }

  private shouldSuppress(relativePath: string): boolean {
    const now = Date.now();
    const expireAt = this.suppressedWatcherPaths.get(relativePath);
    if (expireAt && expireAt > now) {
      return true;
    }
    if (expireAt && expireAt <= now) {
      this.suppressedWatcherPaths.delete(relativePath);
    }
    return false;
  }

  /**
   * Delete a file
   */
  async deleteFile(relativePath: string): Promise<void> {
    try {
      // Load gitignore patterns and check if file should be ignored
      const gitignorePatterns = this.getGitignorePatterns();
      if (this.gitignoreParser.shouldIgnore(relativePath, gitignorePatterns)) {
        logger.debug(`Ignoring file deletion for ${relativePath} (gitignore pattern)`);
        return;
      }

      const filePath = path.join(this.baseDir, relativePath);
      
      if (fs.existsSync(filePath)) {
        // Mark suppression to prevent watcher emitting a duplicate event
        this.markSuppress(relativePath);
        await fs.remove(filePath);
        this.files.delete(relativePath);
        logger.sync(`File deleted: ${relativePath}`);
      }
    } catch (error) {
      logger.error(`Error deleting file ${relativePath}:`, error);
      throw error;
    }
  }

  /**
   * Clear all files
   */
  async clearFolder(): Promise<void> {
    try {
      if (fs.existsSync(this.baseDir)) {
        await fs.remove(this.baseDir);
      }
      this.ensureBaseDir();
      this.files.clear();
      logger.sync('Folder cleared');
    } catch (error) {
      logger.error('Error clearing folder:', error);
      throw error;
    }
  }

  /**
   * Get file content
   */
  getFileContent(relativePath: string): string | null {
    const fileInfo = this.files.get(relativePath);
    return fileInfo ? fileInfo.content : null;
  }

  /**
   * Get all files
   */
  getAllFiles(): FileInfo[] {
    return Array.from(this.files.values());
  }

  /**
   * Check if file exists
   */
  fileExists(relativePath: string): boolean {
    return this.files.has(relativePath);
  }

  /**
   * Get file info
   */
  getFileInfo(relativePath: string): FileInfo | null {
    return this.files.get(relativePath) || null;
  }

  /**
   * Get base directory
   */
  getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * Get file count
   */
  getFileCount(): number {
    return this.files.size;
  }

  /**
   * Check if watching is active
   */
  isWatchingActive(): boolean {
    return this.isWatching;
  }

  /**
   * Get maximum file size
   */
  getMaxFileSize(): number {
    return this.maxFileSize;
  }

  /**
   * Get maximum file size in MB
   */
  getMaxFileSizeMB(): number {
    return this.maxFileSize / (1024 * 1024);
  }

  /**
   * Check if a file should be ignored based on gitignore patterns
   */
  shouldIgnoreFile(relativePath: string): boolean {
    const gitignorePatterns = this.gitignoreParser.loadAllGitignores(this.baseDir);
    return this.gitignoreParser.shouldIgnore(relativePath, gitignorePatterns);
  }

  /**
   * Get all gitignore patterns for the current directory
   */
  getGitignorePatterns(): string[] {
    const now = Date.now();
    if (now - this.lastGitignoreLoad > this.gitignoreReloadMs || this.cachedGitignorePatterns.length === 0) {
      this.cachedGitignorePatterns = this.gitignoreParser.loadAllGitignores(this.baseDir);
      this.lastGitignoreLoad = now;
    }
    return this.cachedGitignorePatterns;
  }
}
