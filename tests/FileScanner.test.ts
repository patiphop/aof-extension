import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileScanner } from '../src/utils/FileScanner';
import { GitignoreParser } from '../src/utils/GitignoreParser';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('FileScanner', () => {
  let tempDir: string;
  let scanner: FileScanner;
  let gitignoreParser: GitignoreParser;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filescanner-test-'));
    gitignoreParser = new GitignoreParser();
    scanner = new FileScanner(gitignoreParser, false);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('isTextFile', () => {
    it('should identify text files correctly', () => {
      expect(scanner.isTextFile('file.txt')).toBe(true);
      expect(scanner.isTextFile('file.md')).toBe(true);
      expect(scanner.isTextFile('file.js')).toBe(true);
      expect(scanner.isTextFile('file.ts')).toBe(true);
      expect(scanner.isTextFile('file.py')).toBe(true);
      expect(scanner.isTextFile('file.json')).toBe(true);
      expect(scanner.isTextFile('file.xml')).toBe(true);
      expect(scanner.isTextFile('file.yml')).toBe(true);
      expect(scanner.isTextFile('file.yaml')).toBe(true);
      expect(scanner.isTextFile('file.css')).toBe(true);
      expect(scanner.isTextFile('file.html')).toBe(true);
    });

    it('should identify binary files correctly', () => {
      expect(scanner.isTextFile('file.png')).toBe(false);
      expect(scanner.isTextFile('file.jpg')).toBe(false);
      expect(scanner.isTextFile('file.jpeg')).toBe(false);
      expect(scanner.isTextFile('file.gif')).toBe(false);
      expect(scanner.isTextFile('file.bmp')).toBe(false);
      expect(scanner.isTextFile('file.pdf')).toBe(false);
      expect(scanner.isTextFile('file.exe')).toBe(false);
      expect(scanner.isTextFile('file.dll')).toBe(false);
      expect(scanner.isTextFile('file.so')).toBe(false);
      expect(scanner.isTextFile('file.dylib')).toBe(false);
    });

    it('should handle files without extensions', () => {
      expect(scanner.isTextFile('Dockerfile')).toBe(true);
      expect(scanner.isTextFile('Makefile')).toBe(true);
      expect(scanner.isTextFile('README')).toBe(true);
      expect(scanner.isTextFile('LICENSE')).toBe(true);
    });
  });

  describe('scanFiles', () => {
    it('should scan all text files in directory', () => {
      // Create test files
      fs.writeFileSync(path.join(tempDir, 'file1.txt'), 'content1');
      fs.writeFileSync(path.join(tempDir, 'file2.js'), 'content2');
      fs.writeFileSync(path.join(tempDir, 'file3.png'), 'binary content');
      
      const files = scanner.scanFiles(tempDir);
      
      expect(files).toHaveLength(2);
      expect(files.map(f => path.basename(f))).toContain('file1.txt');
      expect(files.map(f => path.basename(f))).toContain('file2.js');
      expect(files.map(f => path.basename(f))).not.toContain('file3.png');
    });

    it('should respect gitignore patterns', () => {
      // Create .gitignore
      fs.writeFileSync(path.join(tempDir, '.gitignore'), 'node_modules/\n*.log\n');
      
      // Create test files
      fs.writeFileSync(path.join(tempDir, 'file1.txt'), 'content1');
      fs.writeFileSync(path.join(tempDir, 'file2.log'), 'content2');
      
      // Create node_modules directory
      const nodeModulesDir = path.join(tempDir, 'node_modules');
      fs.mkdirSync(nodeModulesDir);
      fs.writeFileSync(path.join(nodeModulesDir, 'package.json'), '{}');
      
      const files = scanner.scanFiles(tempDir);
      
      expect(files).toHaveLength(2); // .gitignore and file1.txt
      expect(files.map(f => path.basename(f))).toContain('file1.txt');
      expect(files.map(f => path.basename(f))).toContain('.gitignore');
      expect(files.map(f => path.basename(f))).not.toContain('file2.log');
      expect(files.map(f => path.basename(f))).not.toContain('package.json');
    });

    it('should scan subdirectories recursively', () => {
      // Create subdirectory structure
      const subDir = path.join(tempDir, 'src');
      fs.mkdirSync(subDir);
      const subSubDir = path.join(subDir, 'components');
      fs.mkdirSync(subSubDir);
      
      // Create files in different levels
      fs.writeFileSync(path.join(tempDir, 'root.txt'), 'root content');
      fs.writeFileSync(path.join(subDir, 'main.ts'), 'main content');
      fs.writeFileSync(path.join(subSubDir, 'component.tsx'), 'component content');
      
      const files = scanner.scanFiles(tempDir);
      
      expect(files).toHaveLength(3);
      expect(files.map(f => path.basename(f))).toContain('root.txt');
      expect(files.map(f => path.basename(f))).toContain('main.ts');
      expect(files.map(f => path.basename(f))).toContain('component.tsx');
    });

    it('should handle empty directory', () => {
      const files = scanner.scanFiles(tempDir);
      expect(files).toHaveLength(0);
    });

    it('should handle non-existent directory', () => {
      const nonExistentDir = path.join(tempDir, 'non-existent');
      const files = scanner.scanFiles(nonExistentDir);
      expect(files).toHaveLength(0);
    });
  });

  describe('getRelativePath', () => {
    it('should return relative path from root', () => {
      const rootPath = '/path/to/root';
      const filePath = '/path/to/root/src/main.ts';
      
      const relativePath = scanner.getRelativePath(rootPath, filePath);
      expect(relativePath).toBe('src/main.ts');
    });

    it('should handle files in root directory', () => {
      const rootPath = '/path/to/root';
      const filePath = '/path/to/root/package.json';
      
      const relativePath = scanner.getRelativePath(rootPath, filePath);
      expect(relativePath).toBe('package.json');
    });
  });

  describe('Git folder scanning', () => {
    it('should not scan .git folder when syncGitFolder is false', () => {
      scanner = new FileScanner(gitignoreParser, false);
      
      // Create .git folder structure
      const gitDir = path.join(tempDir, '.git');
      fs.mkdirSync(gitDir);
      fs.writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/main');
      fs.writeFileSync(path.join(gitDir, 'config'), '[core]\nrepositoryformatversion = 0');
      
      const files = scanner.scanFiles(tempDir);
      const gitFiles = files.filter(f => f.includes('.git'));
      
      expect(gitFiles).toHaveLength(0);
    });

    it('should scan .git folder when syncGitFolder is true', () => {
      scanner = new FileScanner(gitignoreParser, true);
      
      // Create .git folder structure
      const gitDir = path.join(tempDir, '.git');
      fs.mkdirSync(gitDir);
      fs.writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/main');
      fs.writeFileSync(path.join(gitDir, 'config'), '[core]\nrepositoryformatversion = 0');
      
      const files = scanner.scanFiles(tempDir);
      const gitFiles = files.filter(f => f.includes('.git'));
      
      expect(gitFiles.length).toBeGreaterThan(0);
      expect(gitFiles.some(f => f.includes('HEAD'))).toBe(true);
      expect(gitFiles.some(f => f.includes('config'))).toBe(true);
    });

    it('should scan git subdirectories when syncGitFolder is true', () => {
      scanner = new FileScanner(gitignoreParser, true);
      
      // Create .git folder structure with subdirectories
      const gitDir = path.join(tempDir, '.git');
      fs.mkdirSync(gitDir);
      
      // Create refs directory
      const refsDir = path.join(gitDir, 'refs');
      fs.mkdirSync(refsDir);
      const headsDir = path.join(refsDir, 'heads');
      fs.mkdirSync(headsDir);
      fs.writeFileSync(path.join(headsDir, 'main'), 'abc123');
      
      // Create objects directory
      const objectsDir = path.join(gitDir, 'objects');
      fs.mkdirSync(objectsDir);
      fs.writeFileSync(path.join(objectsDir, 'packed-refs'), 'abc123 refs/heads/main');
      
      const files = scanner.scanFiles(tempDir);
      const gitFiles = files.filter(f => f.includes('.git'));
      
      expect(gitFiles.length).toBeGreaterThan(0);
      expect(gitFiles.some(f => f.includes('packed-refs'))).toBe(true);
    });

    it('should not include binary files from .git directory', () => {
      scanner = new FileScanner(gitignoreParser, true);
      
      // Create .git folder structure
      const gitDir = path.join(tempDir, '.git');
      fs.mkdirSync(gitDir);
      
      // Create text file
      fs.writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/main');
      
      // Create binary file (simulated)
      const binaryData = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // PNG header
      fs.writeFileSync(path.join(gitDir, 'binary.dat'), binaryData);
      
      const files = scanner.scanFiles(tempDir);
      const gitFiles = files.filter(f => f.includes('.git'));
      
      expect(gitFiles.some(f => f.includes('HEAD'))).toBe(true);
      expect(gitFiles.some(f => f.includes('binary.dat'))).toBe(false);
    });
  });
});
