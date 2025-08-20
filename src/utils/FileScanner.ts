import * as fs from 'fs';
import * as path from 'path';
import { GitignoreParser } from './GitignoreParser';
import { logger } from './Logger';

export class FileScanner {
  private readonly textFileExtensions = [
    '.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp',
    '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.clj', '.hs', '.ml',
    '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.config',
    '.css', '.scss', '.sass', '.less', '.html', '.htm', '.svg', '.sql', '.sh', '.bat',
    '.ps1', '.dockerfile', '.gitignore', '.gitattributes', '.editorconfig', '.eslintrc',
    '.prettierrc', '.babelrc', '.env', '.env.example', '.env.local', '.env.production',
    '.env.development', '.env.test', '.npmrc', '.yarnrc', '.browserslistrc', '.babelrc.js',
    '.eslintrc.js', '.prettierrc.js', '.jest.config.js', '.webpack.config.js', '.rollup.config.js',
    '.vite.config.js', '.vite.config.ts', '.tsconfig.json', '.package.json', '.README',
    '.LICENSE', '.CHANGELOG', '.CONTRIBUTING', '.CODE_OF_CONDUCT', '.AUTHORS', '.TODO',
    '.Makefile', '.Dockerfile', '.dockerignore', '.docker-compose.yml', '.docker-compose.yaml'
  ];

  private readonly binaryFileExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp', '.ico', '.svg',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.7z',
    '.tar', '.gz', '.bz2', '.xz', '.exe', '.dll', '.so', '.dylib', '.a', '.lib',
    '.o', '.obj', '.class', '.jar', '.war', '.ear', '.apk', '.ipa', '.deb', '.rpm',
    '.msi', '.pkg', '.dmg', '.iso', '.bin', '.dat', '.db', '.sqlite', '.sqlite3'
  ];

  private readonly textFileNames = [
    'Dockerfile', 'Makefile', 'README', 'LICENSE', 'CHANGELOG', 'CONTRIBUTING',
    'CODE_OF_CONDUCT', 'AUTHORS', 'TODO', '.gitignore', '.gitattributes',
    '.editorconfig', '.eslintrc', '.prettierrc', '.babelrc', '.env', '.npmrc',
    '.yarnrc', '.browserslistrc'
  ];

  // Git-related files that should be synced when syncGitFolder is true
  private readonly gitFileNames = [
    'HEAD', 'config', 'description', 'FETCH_HEAD', 'ORIG_HEAD', 'MERGE_HEAD',
    'MERGE_MODE', 'MERGE_MSG', 'PACKED_REFS', 'REBASE_HEAD', 'REBASE_MERGE',
    'SQUASH_MSG', 'TAG_EDITMSG', 'COMMIT_EDITMSG', 'MERGE_HEAD', 'CHERRY_PICK_HEAD',
    'index', 'packed-refs', 'shallow', 'FETCH_HEAD', 'ORIG_HEAD', 'MERGE_HEAD',
    'MERGE_MODE', 'MERGE_MSG', 'REBASE_HEAD', 'REBASE_MERGE', 'SQUASH_MSG',
    'TAG_EDITMSG', 'COMMIT_EDITMSG', 'CHERRY_PICK_HEAD', 'BISECT_LOG',
    'BISECT_NAMES', 'BISECT_RUN', 'BISECT_START', 'BISECT_TERMS'
  ];

  private readonly gitDirNames = [
    'objects', 'refs', 'hooks', 'info', 'logs'
  ];

  // Git binary files that are essential for git operations
  private readonly gitBinaryFileNames = [
    'index', 'pack-*.idx', 'pack-*.pack', '*.lock'
  ];

  // Git directories that should be synced completely
  private readonly gitEssentialDirs = [
    'objects', 'refs', 'info'
  ];

  constructor(private gitignoreParser: GitignoreParser, private syncGitFolder: boolean = true) {}

  /**
   * Check if a file is a text file based on its extension or name
   */
  isTextFile(fileName: string): boolean {
    const lowerFileName = fileName.toLowerCase();
    
    // Check if it's a known text file name
    if (this.textFileNames.some(name => lowerFileName === name.toLowerCase())) {
      return true;
    }
    
    // Check file extension
    const ext = path.extname(lowerFileName);
    
    if (this.textFileExtensions.includes(ext)) {
      return true;
    }
    
    if (this.binaryFileExtensions.includes(ext)) {
      return false;
    }
    
    // If no extension or unknown extension, assume it's text
    return ext === '' || !this.binaryFileExtensions.includes(ext);
  }

  /**
   * Scan all text files in a directory recursively, respecting .gitignore
   */
  scanFiles(rootPath: string): string[] {
    if (!fs.existsSync(rootPath)) {
      return [];
    }

    const files: string[] = [];
    const gitignorePatterns = this.gitignoreParser.loadAllGitignores(rootPath);

    const scanDirectory = (dirPath: string) => {
      try {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stats = fs.statSync(itemPath);
          
          if (stats.isDirectory()) {
            // Special handling for .git directory
            if (item === '.git') {
              if (this.syncGitFolder) {
                this.scanGitDirectory(itemPath, files, rootPath);
              }
              continue;
            }
            
            // Check if directory should be ignored
            const relativeDirPath = this.getRelativePath(rootPath, itemPath);
            if (!this.gitignoreParser.shouldIgnore(relativeDirPath + '/', gitignorePatterns, this.syncGitFolder)) {
              scanDirectory(itemPath);
            }
          } else if (stats.isFile()) {
            // Check if file should be ignored
            const relativeFilePath = this.getRelativePath(rootPath, itemPath);
            if (!this.gitignoreParser.shouldIgnore(relativeFilePath, gitignorePatterns, this.syncGitFolder)) {
              // For .git folder, include both text and binary files
              if (relativeFilePath.startsWith('.git/')) {
                files.push(itemPath);
              } else if (this.isTextFile(item)) {
                files.push(itemPath);
              }
            }
          }
        }
      } catch (error) {
        logger.error(`Error scanning directory ${dirPath}:`, error);
      }
    };

    scanDirectory(rootPath);
    return files;
  }

  /**
   * Scan .git directory for important files
   */
  private scanGitDirectory(gitPath: string, files: string[], rootPath: string): void {
    try {
      // Scan all files in .git root directory
      const gitRootItems = fs.readdirSync(gitPath);
      for (const item of gitRootItems) {
        const itemPath = path.join(gitPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isFile()) {
          // Include all files in .git root (they are all important)
          files.push(itemPath);
        }
      }

      // Scan important git directories more comprehensively
      for (const dirName of this.gitDirNames) {
        const dirPath = path.join(gitPath, dirName);
        if (fs.existsSync(dirPath)) {
          this.scanGitSubDirectory(dirPath, files, rootPath, dirName);
        }
      }
    } catch (error) {
      logger.error(`Error scanning .git directory ${gitPath}:`, error);
    }
  }

  /**
   * Scan git subdirectories (refs, objects, etc.)
   */
  private scanGitSubDirectory(dirPath: string, files: string[], rootPath: string, parentDirName?: string): void {
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          // Recursively scan subdirectories
          this.scanGitSubDirectory(itemPath, files, rootPath, item);
        } else if (stats.isFile()) {
          // Include files based on directory type
          if (this.shouldIncludeGitFile(item, parentDirName)) {
            files.push(itemPath);
          }
        }
      }
    } catch (error) {
      logger.error(`Error scanning git subdirectory ${dirPath}:`, error);
    }
  }

  /**
   * Determine if a git file should be included based on its location and type
   */
  private shouldIncludeGitFile(fileName: string, parentDirName?: string): boolean {
    // Always include files in essential directories (objects, refs, info)
    if (parentDirName && this.gitEssentialDirs.includes(parentDirName)) {
      return true;
    }

    // Always include files in objects subdirectories (like 00, 01, etc.)
    if (parentDirName && parentDirName.match(/^[0-9a-f]{2}$/)) {
      return true;
    }

    // Include specific git files regardless of location
    if (this.gitFileNames.includes(fileName)) {
      return true;
    }

    // Include git binary files that are essential
    for (const pattern of this.gitBinaryFileNames) {
      if (this.matchesPattern(fileName, pattern)) {
        return true;
      }
    }

    // Include files with common text extensions
    const ext = path.extname(fileName.toLowerCase());
    if (this.textFileExtensions.includes(ext)) {
      return true;
    }

    // Include specific git files without extensions
    if (['packed-refs', 'HEAD', 'config', 'description', 'index'].includes(fileName)) {
      return true;
    }

    // For other files, be more conservative
    return false;
  }

  /**
   * Check if a filename matches a pattern (simple wildcard matching)
   */
  private matchesPattern(fileName: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern.startsWith('*') && pattern.endsWith('*')) {
      return fileName.includes(pattern.slice(1, -1));
    }
    if (pattern.startsWith('*')) {
      return fileName.endsWith(pattern.slice(1));
    }
    if (pattern.endsWith('*')) {
      return fileName.startsWith(pattern.slice(0, -1));
    }
    return fileName === pattern;
  }

  /**
   * Get relative path from root directory
   */
  getRelativePath(rootPath: string, filePath: string): string {
    const relativePath = path.relative(rootPath, filePath);
    // Normalize to forward slashes for consistency
    return relativePath.split(path.sep).join('/');
  }
}
