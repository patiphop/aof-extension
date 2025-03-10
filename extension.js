const vscode = require('vscode');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

let ws = null;
let isSyncing = false;
let clientFileTimestamps = {};

function activate(context) {
  let disposable = vscode.commands.registerCommand('mySyncExtension.startSync', async () => {
    if (isSyncing) {
      vscode.window.showInformationMessage('Already syncing!');
      return;
    }

    // Prompt user for local folder
    const folderUri = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select folder to sync'
    });
    if (!folderUri || folderUri.length === 0) {
      return;
    }
    const localFolder = folderUri[0].fsPath;

    // Prompt user for server host (e.g. "192.168.1.10:3000")
    const serverHost = await vscode.window.showInputBox({
      placeHolder: 'Enter server host (e.g. 192.168.1.10:3000 or localhost:3000)'
    });
    if (!serverHost) {
      return;
    }

    // Connect WebSocket
    const wsUrl = `ws://${serverHost}`;
    ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      vscode.window.showInformationMessage(`Connected to Server: ${wsUrl}`);
      isSyncing = true;

      // Initial sync (upload all local files to server)
      initialSync(localFolder);

      // Set up listeners for file saves
      setupVSCodeListeners(localFolder);
    });

    ws.on('message', (message) => {
      handleServerMessage(message, localFolder);
    });

    ws.on('close', () => {
      vscode.window.showWarningMessage('Disconnected from Server');
      isSyncing = false;
      ws = null;
    });

    ws.on('error', (err) => {
      vscode.window.showErrorMessage(`WS error: ${err.message}`);
      isSyncing = false;
      ws = null;
    });
  });

  context.subscriptions.push(disposable);
}

function deactivate() {
  if (ws) {
    ws.close();
  }
}

function initialSync(localFolder) {
  const allFiles = getAllFiles(localFolder);
  allFiles.forEach((filePath) => {
    const relativePath = path.relative(localFolder, filePath);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lastModified = fs.statSync(filePath).mtimeMs;
    clientFileTimestamps[relativePath] = lastModified;
    sendFileToServer(relativePath, fileContent, lastModified);
  });
  vscode.window.showInformationMessage(`Initial sync completed. Total files: ${allFiles.length}`);
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

function sendFileToServer(relativePath, fileContent, lastModified) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }
  ws.send(JSON.stringify({
    type: 'SYNC_FILE',
    payload: {
      relativePath,
      fileContent,
      lastModified
    }
  }));
}

function setupVSCodeListeners(localFolder) {
  vscode.workspace.onDidSaveTextDocument((document) => {
    if (!document || !document.fileName) return;
    const filePath = document.fileName;
    if (!filePath.startsWith(localFolder)) return;

    const relativePath = path.relative(localFolder, filePath);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lastModified = Date.now();
    const knownTimestamp = clientFileTimestamps[relativePath] || 0;

    // Conflict check (simple timestamp check)
    if (lastModified < knownTimestamp) {
      vscode.window.showErrorMessage(`Conflict detected in ${relativePath}. Please resolve before saving again.`);
      return;
    }

    clientFileTimestamps[relativePath] = lastModified;
    sendFileToServer(relativePath, fileContent, lastModified);
  });
}

function handleServerMessage(message, localFolder) {
  let data;
  try {
    data = JSON.parse(message);
  } catch (e) {
    console.error('Invalid JSON from server:', message);
    return;
  }

  switch (data.type) {
    case 'FILE_UPDATED': {
      const { relativePath, lastModified, fileContent } = data.payload;
      const knownTimestamp = clientFileTimestamps[relativePath] || 0;
      if (lastModified > knownTimestamp) {
        const localFilePath = path.join(localFolder, relativePath);
        fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
        fs.writeFileSync(localFilePath, fileContent, 'utf8');
        clientFileTimestamps[relativePath] = lastModified;
        vscode.window.showInformationMessage(`File updated from Server: ${relativePath}`);
      }
      break;
    }

    case 'CONFLICT': {
      const { relativePath } = data.payload;
      vscode.window.showErrorMessage(
        `[Conflict] The file '${relativePath}' is newer on Server! Please pull or merge before saving.`
      );
      break;
    }

    default:
      console.log('Unknown message type:', data.type);
  }
}

module.exports = {
  activate,
  deactivate
};
