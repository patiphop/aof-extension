const vscode = require('vscode');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

let ws = null;
let isSyncing = false;
let localFolderPath = '';

function activate(context) {
  // Command: Start Sync
  const startSyncCmd = vscode.commands.registerCommand('mySyncExtension.startSync', async () => {
    if (isSyncing) {
      vscode.window.showInformationMessage('Already syncing!');
      return;
    }

    // Prompt user to select local folder
    const folderUri = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select folder to sync'
    });
    if (!folderUri || folderUri.length === 0) {
      vscode.window.showErrorMessage('No folder selected.');
      return;
    }
    localFolderPath = folderUri[0].fsPath;

    // Use fixed host: 192.168.1.105:1420
    const wsUrl = 'ws://192.168.1.105:1420';
    ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      vscode.window.showInformationMessage(`Connected to server: ${wsUrl}`);
      isSyncing = true;

      // Initial sync (upload all local files)
      initialSync(localFolderPath);

      // Listen for file saves in VSCode
      setupVSCodeListeners(localFolderPath);
    });

    ws.on('message', (message) => {
      handleServerMessage(message);
    });

    ws.on('close', () => {
      vscode.window.showWarningMessage('Disconnected from server');
      isSyncing = false;
      ws = null;
    });

    ws.on('error', (err) => {
      vscode.window.showErrorMessage(`WS error: ${err.message}`);
      isSyncing = false;
      ws = null;
    });
  });

  // Command: Stop Sync
  const stopSyncCmd = vscode.commands.registerCommand('mySyncExtension.stopSync', () => {
    if (!isSyncing) {
      vscode.window.showInformationMessage('Not currently syncing.');
      return;
    }
    // Send CLEAR_FOLDER message to server
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'CLEAR_FOLDER' }));
      vscode.window.showInformationMessage('Requested server to clear synced-folder.');
    }
    // Close connection
    if (ws) {
      ws.close();
      ws = null;
    }
    isSyncing = false;
    vscode.window.showInformationMessage('Sync stopped.');
  });

  context.subscriptions.push(startSyncCmd, stopSyncCmd);
}

function deactivate() {
  if (ws) {
    ws.close();
  }
}

/**
 * Upload all local files (recursive) to the server, ignoring node_modules, .png, .git folders.
 * Normalizes paths to forward slash format for consistency.
 */
function initialSync(localFolder) {
  const allFiles = getAllFiles(localFolder);
  allFiles.forEach((filePath) => {
    const relativePath = path.relative(localFolder, filePath);
    // Convert OS-specific separators to forward slashes
    const forwardSlashPath = relativePath.split(path.sep).join('/');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    sendFileToServer(forwardSlashPath, fileContent);
  });
  vscode.window.showInformationMessage(`Initial sync complete. Total files: ${allFiles.length}`);
}

/**
 * Recursively get all files from the given directory,
 * ignoring node_modules folders, .png files, and .git folders.
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  for (let file of files) {
    if (file === 'node_modules' || file === '.git') {
      // Skip these folders entirely
      continue;
    }
    const fullPath = path.join(dirPath, file);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      // If the file is .png, skip it
      if (file.toLowerCase().endsWith('.png')) {
        continue;
      }
      arrayOfFiles.push(fullPath);
    }
  }
  return arrayOfFiles;
}

/**
 * Send a file to the server over WebSocket, with relativePath in forward slash format
 */
function sendFileToServer(relativePath, fileContent) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }
  ws.send(JSON.stringify({
    type: 'SYNC_FILE',
    payload: {
      relativePath,
      fileContent
    }
  }));
}

/**
 * Listen for file saves in VSCode. Whenever a file is saved, upload it to the server,
 * ignoring .png, node_modules, and .git folders.
 */
function setupVSCodeListeners(localFolder) {
  vscode.workspace.onDidSaveTextDocument((document) => {
    if (!document || !document.fileName) return;
    const filePath = document.fileName;
    if (!filePath.startsWith(localFolder)) return;

    // If inside node_modules or .git, or is .png, skip
    const lowerCasePath = filePath.toLowerCase();
    if (
      lowerCasePath.includes(`${path.sep}node_modules${path.sep}`) ||
      lowerCasePath.includes(`${path.sep}.git${path.sep}`) ||
      lowerCasePath.endsWith('.png')
    ) {
      return;
    }

    // Build relative path, normalized to forward slashes
    const relativePathRaw = path.relative(localFolder, filePath);
    const forwardSlashPath = relativePathRaw.split(path.sep).join('/');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    sendFileToServer(forwardSlashPath, fileContent);
  });
}

/**
 * Handle messages from the server (when a file is updated on server side).
 */
function handleServerMessage(message) {
  let data;
  try {
    data = JSON.parse(message);
  } catch (e) {
    console.error('Invalid JSON from server:', message);
    return;
  }

  // If the server cleared the folder
  if (data.type === 'FOLDER_CLEARED') {
    vscode.window.showInformationMessage('Server folder cleared. Sync stopped or re-initialize if needed.');
    return;
  }

  if (data.type === 'FILE_UPDATED') {
    const { relativePath, fileContent } = data.payload;
    updateLocalFile(relativePath, fileContent);
  }
}

/**
 * Overwrite or create local file with the new content from the server.
 * If fileContent is empty, remove the local file.
 * Convert relativePath from forward slash to local OS path for writing.
 */
function updateLocalFile(relativePath, fileContent) {
  // If .png or .git, skip
  const lowerCasePath = relativePath.toLowerCase();
  if (lowerCasePath.endsWith('.png') || lowerCasePath.includes('.git/')) {
    return;
  }

  // Convert forward slashes to OS-specific path separators
  const localFilePath = path.join(localFolderPath, ...relativePath.split('/'));

  if (fileContent === '') {
    // Means the file was deleted on server
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
      vscode.window.showInformationMessage(`File deleted from server: ${relativePath}`);
    }
    return;
  }

  fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
  fs.writeFileSync(localFilePath, fileContent, 'utf8');
  vscode.window.showInformationMessage(`File updated from server: ${relativePath}`);
}

module.exports = {
  activate,
  deactivate
};
