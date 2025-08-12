import * as fs from 'fs-extra';
import * as path from 'path';
import { FileInfo } from './types';
import { logger } from './utils/Logger';

export class FileManager {
  private files: Map<string, FileInfo> = new Map();
  private baseDir: string;

  constructor(baseDir: string = './synced-files') {
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

      // Write file
      await fs.writeFile(filePath, content, 'utf8');

      // Update file info
      this.files.set(relativePath, {
        relativePath,
        content,
        lastModified: Date.now(),
        lastClientId: clientId
      });

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
}
