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
      return true;
    }

    // Always ignore any node_modules directory (including nested ones)
    if (
      normalizedPath.startsWith('node_modules/') ||
      normalizedPath.includes('/node_modules/')
    ) {
      logger.debug(`Ignoring ${filePath} (always ignore node_modules directory)`);
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
            return true;
          }
        } else {
          // Handle file patterns
          if (minimatch(normalizedPath, pattern, { dot: true })) {
            return true;
          }
          // Handle bare directory-name patterns like "dist" at any depth
          const hasSlash = pattern.includes('/');
          const hasGlob = /[*?[\]]/.test(pattern);
          if (!hasSlash && !hasGlob) {
            if (
              normalizedPath === pattern ||
              normalizedPath.startsWith(pattern + '/') ||
              normalizedPath.endsWith('/' + pattern) ||
              normalizedPath.includes('/' + pattern + '/')
            ) {
              return true;
            }
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
    const normalizeSlashes = (p: string) => p.replace(/\\/g, '/');

    const loadGitignoresRecursive = (dirPath: string) => {
      // Load gitignore from current directory and scope patterns to directory
      const currentPatterns = this.loadGitignoreFromPath(dirPath);
      if (currentPatterns.length > 0) {
        const baseRel = normalizeSlashes(path.relative(rootPath, dirPath));
        const scoped: string[] = [];
        for (const raw of currentPatterns) {
          let effective = raw;
          if (effective.startsWith('/')) {
            effective = effective.slice(1);
          } else if (baseRel && baseRel !== '.') {
            effective = `${baseRel}/${effective}`;
          }
          effective = effective.replace(/\/+/g, '/').replace(/\/+/g, '/');
          scoped.push(effective);
          patterns.push(effective);
        }
        logger.debug(`Loaded ${scoped.length} patterns from ${dirPath}/.gitignore:`, scoped);
      }

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

