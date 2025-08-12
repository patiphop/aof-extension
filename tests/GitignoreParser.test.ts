import { describe, it, expect, beforeEach } from 'vitest';
import { GitignoreParser } from '../src/utils/GitignoreParser';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('GitignoreParser', () => {
  let tempDir: string;
  let parser: GitignoreParser;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitignore-test-'));
    parser = new GitignoreParser();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('parseGitignore', () => {
    it('should parse basic gitignore patterns', () => {
      const gitignoreContent = `
        node_modules/
        *.log
        .env
        dist/
        *.png
        *.jpg
      `;
      
      const patterns = parser.parseGitignore(gitignoreContent);
      
      expect(patterns).toContain('node_modules/');
      expect(patterns).toContain('*.log');
      expect(patterns).toContain('.env');
      expect(patterns).toContain('dist/');
      expect(patterns).toContain('*.png');
      expect(patterns).toContain('*.jpg');
    });

    it('should ignore empty lines and comments', () => {
      const gitignoreContent = `
        # This is a comment
        
        node_modules/
        # Another comment
        *.log
      `;
      
      const patterns = parser.parseGitignore(gitignoreContent);
      
      expect(patterns).toContain('node_modules/');
      expect(patterns).toContain('*.log');
      expect(patterns).not.toContain('# This is a comment');
      expect(patterns).not.toContain('# Another comment');
      expect(patterns).not.toContain('');
    });

    it('should handle negated patterns', () => {
      const gitignoreContent = `
        *.log
        !important.log
        node_modules/
        !node_modules/special-package/
      `;
      
      const patterns = parser.parseGitignore(gitignoreContent);
      
      expect(patterns).toContain('*.log');
      expect(patterns).toContain('!important.log');
      expect(patterns).toContain('node_modules/');
      expect(patterns).toContain('!node_modules/special-package/');
    });
  });

  describe('loadGitignoreFromPath', () => {
    it('should load gitignore file from path', () => {
      const gitignorePath = path.join(tempDir, '.gitignore');
      const gitignoreContent = 'node_modules/\n*.log\n';
      fs.writeFileSync(gitignorePath, gitignoreContent);
      
      const patterns = parser.loadGitignoreFromPath(tempDir);
      
      expect(patterns).toContain('node_modules/');
      expect(patterns).toContain('*.log');
    });

    it('should return empty array if gitignore file does not exist', () => {
      const patterns = parser.loadGitignoreFromPath(tempDir);
      
      expect(patterns).toEqual([]);
    });
  });

  describe('shouldIgnore', () => {
    it('should ignore files matching patterns', () => {
      const patterns = ['node_modules/', '*.log', '.env'];
      
      expect(parser.shouldIgnore('node_modules/package.json', patterns)).toBe(true);
      expect(parser.shouldIgnore('app.log', patterns)).toBe(true);
      expect(parser.shouldIgnore('.env', patterns)).toBe(true);
      expect(parser.shouldIgnore('src/main.ts', patterns)).toBe(false);
    });

    it('should handle negated patterns', () => {
      const patterns = ['*.log', '!important.log'];
      
      expect(parser.shouldIgnore('app.log', patterns)).toBe(true);
      expect(parser.shouldIgnore('important.log', patterns)).toBe(false);
    });

    it('should handle directory patterns', () => {
      const patterns = ['dist/', 'build/'];
      
      expect(parser.shouldIgnore('dist/index.js', patterns)).toBe(true);
      expect(parser.shouldIgnore('build/package.json', patterns)).toBe(true);
      expect(parser.shouldIgnore('src/index.js', patterns)).toBe(false);
    });
  });

  describe('loadAllGitignores', () => {
    it('should load gitignore from root and subdirectories', () => {
      // Create root .gitignore
      const rootGitignore = path.join(tempDir, '.gitignore');
      fs.writeFileSync(rootGitignore, 'node_modules/\n*.log\n');
      
      // Create subdirectory .gitignore
      const subDir = path.join(tempDir, 'src');
      fs.mkdirSync(subDir);
      const subGitignore = path.join(subDir, '.gitignore');
      fs.writeFileSync(subGitignore, '*.tmp\n');
      
      const allPatterns = parser.loadAllGitignores(tempDir);
      
      expect(allPatterns).toContain('node_modules/');
      expect(allPatterns).toContain('*.log');
      expect(allPatterns).toContain('*.tmp');
    });
  });
});
