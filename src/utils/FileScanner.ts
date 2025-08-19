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
    'SQUASH_MSG', 'TAG_EDITMSG', 'COMMIT_EDITMSG', 'MERGE_HEAD', 'CHERRY_PICK_HEAD'
  ];

  private readonly gitDirNames = [
    'objects', 'refs', 'hooks', 'info', 'logs'
  ];

  constructor(private gitignoreParser: GitignoreParser, private syncGitFolder: boolean = false) {}

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
              if (this.isTextFile(item)) {
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
      // Scan git config and other important files
      for (const fileName of this.gitFileNames) {
        const filePath = path.join(gitPath, fileName);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            files.push(filePath);
          }
        }
      }

      // Scan important git directories
      for (const dirName of this.gitDirNames) {
        const dirPath = path.join(gitPath, dirName);
        if (fs.existsSync(dirPath)) {
          this.scanGitSubDirectory(dirPath, files, rootPath);
        }
      }
    } catch (error) {
      logger.error(`Error scanning .git directory ${gitPath}:`, error);
    }
  }

  /**
   * Scan git subdirectories (refs, objects, etc.)
   */
  private scanGitSubDirectory(dirPath: string, files: string[], rootPath: string): void {
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          // Recursively scan subdirectories
          this.scanGitSubDirectory(itemPath, files, rootPath);
        } else if (stats.isFile()) {
          // Only include text files from git directories
          if (this.isGitTextFile(item)) {
            files.push(itemPath);
          }
        }
      }
    } catch (error) {
      logger.error(`Error scanning git subdirectory ${dirPath}:`, error);
    }
  }

  /**
   * Check if a file in .git directory is a text file that should be synced
   */
  private isGitTextFile(fileName: string): boolean {
    const lowerFileName = fileName.toLowerCase();
    
    // Include common git text files
    if (this.gitFileNames.includes(fileName)) {
      return true;
    }
    
    // Include files with common text extensions
    const ext = path.extname(lowerFileName);
    if (this.textFileExtensions.includes(ext)) {
      return true;
    }
    
    // Include specific git files without extensions
    if (['packed-refs', 'HEAD', 'config', 'description'].includes(fileName)) {
      return true;
    }
    
    // Exclude binary files
    if (this.binaryFileExtensions.includes(ext)) {
      return false;
    }
    
    // For git directories, be more conservative - only include known text files
    return false;
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
