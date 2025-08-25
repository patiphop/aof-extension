import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';
import { logger } from './Logger';

export class GitignoreParser {
  /**
   * Parse gitignore content and return array of patterns
   */
  parseGitignore(content: string): string[] {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'))
      .map(line => line.replace(/\r$/, ''));
  }

  /**
   * Load gitignore patterns from a directory path
   */
  loadGitignoreFromPath(dirPath: string): string[] {
    const gitignorePath = path.join(dirPath, '.gitignore');
    
    if (!fs.existsSync(gitignorePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      return this.parseGitignore(content);
    } catch (error) {
      logger.error(`Error reading .gitignore from ${dirPath}:`, error);
      return [];
    }
  }

  /**
   * Check if a file path should be ignored based on gitignore patterns
   */
  shouldIgnore(filePath: string, patterns: string[]): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Always ignore .git folder
    if (normalizedPath.startsWith('.git/')) {
      logger.debug(`Ignoring ${filePath} (always ignore .git folder)`);
      return true;
    }
    
    // First check for negated patterns
    for (const pattern of patterns) {
      if (pattern.startsWith('!')) {
        const negatedPattern = pattern.substring(1);
        if (minimatch(normalizedPath, negatedPattern, { dot: true })) {
          logger.debug(`Not ignoring ${filePath} (negated pattern: ${pattern})`);
          return false;
        }
      }
    }
    
    // Then check for regular patterns
    for (const pattern of patterns) {
      if (!pattern.startsWith('!')) {
        // Handle directory patterns (ending with /)
        if (pattern.endsWith('/')) {
          const dirPattern = pattern.slice(0, -1); // Remove trailing slash
          if (normalizedPath.startsWith(dirPattern + '/')) {
            logger.debug(`Ignoring ${filePath} (directory pattern: ${pattern})`);
            return true;
          }
        } else {
          // Handle file patterns
          if (minimatch(normalizedPath, pattern, { dot: true })) {
            logger.debug(`Ignoring ${filePath} (file pattern: ${pattern})`);
            return true;
          }
        }
      }
    }
    
    logger.debug(`Not ignoring ${filePath} (no matching patterns)`);
    return false;
  }

  /**
   * Load all gitignore patterns from root and subdirectories
   */
  loadAllGitignores(rootPath: string): string[] {
    const patterns: string[] = [];
    
    const loadGitignoresRecursive = (dirPath: string) => {
      // Load gitignore from current directory
      const currentPatterns = this.loadGitignoreFromPath(dirPath);
      if (currentPatterns.length > 0) {
        logger.debug(`Loaded ${currentPatterns.length} patterns from ${dirPath}/.gitignore:`, currentPatterns);
      }
      patterns.push(...currentPatterns);
      
      // Recursively check subdirectories
      try {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stats = fs.statSync(itemPath);
          
          if (stats.isDirectory() && !item.startsWith('.')) {
            loadGitignoresRecursive(itemPath);
          }
        }
      } catch (error) {
        logger.error(`Error reading directory ${dirPath}:`, error);
      }
    };
    
    loadGitignoresRecursive(rootPath);
    logger.debug(`Total gitignore patterns loaded: ${patterns.length}`, patterns);
    return patterns;
  }
}

