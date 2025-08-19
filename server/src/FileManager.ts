import * as fs from 'fs-extra';
import * as path from 'path';
import { FileInfo } from './types';
import { logger } from './utils/Logger';
import { EventEmitter } from 'events';

export class FileManager extends EventEmitter {
  private files: Map<string, FileInfo> = new Map();
  private baseDir: string;
  private fileWatcher: fs.FSWatcher | null = null;
  private isWatching = false;

  constructor(baseDir: string = './synced-files') {
    super();
    this.baseDir = baseDir;
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

      // Write file
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

  /**
   * Delete a file
   */
  async deleteFile(relativePath: string): Promise<void> {
    try {
      const filePath = path.join(this.baseDir, relativePath);
      
      if (fs.existsSync(filePath)) {
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
}
