const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

// Folder to store synced files on Windows (Server) side
const SERVER_FOLDER = path.join(__dirname, 'synced-folder');

// Create folder if it doesn't exist
if (!fs.existsSync(SERVER_FOLDER)) {
  fs.mkdirSync(SERVER_FOLDER, { recursive: true });
}

// Create WebSocket server on fixed port 1420
const wss = new WebSocket.Server({ port: 1420 }, () => {
  console.log('WebSocket Server is running on ws://192.168.1.105:1420');
});

/**
 * Broadcast a file update to all connected clients
 * @param {string} relativePath - The relative path (using forward slashes) of the file
 * @param {string} fileContent - The file content or '' if deleted
 */
function broadcastFileUpdate(relativePath, fileContent) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'FILE_UPDATED',
        payload: {
          // Keep relativePath in a normalized "forward slash" format
          relativePath,
          fileContent
        }
      }));
    }
  });
}

/**
 * Broadcast that the folder has been cleared
 */
function broadcastCleared() {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'FOLDER_CLEARED' }));
    }
  });
}

wss.on('connection', (ws) => {
  console.log('[Server] Client connected');

  // Handle incoming messages from the client
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === 'SYNC_FILE') {
        // Write or update a file
        const { relativePath, fileContent } = data.payload;
        // Convert forward slashes back to local path separators if needed
        const serverFilePath = path.join(SERVER_FOLDER, ...relativePath.split('/'));

        fs.mkdirSync(path.dirname(serverFilePath), { recursive: true });
        fs.writeFileSync(serverFilePath, fileContent, 'utf8');

        // Broadcast to all clients that this file has been updated
        broadcastFileUpdate(relativePath, fileContent);
      }
      else if (data.type === 'CLEAR_FOLDER') {
        // Remove all data in synced-folder
        try {
          fs.rmSync(SERVER_FOLDER, { recursive: true, force: true });
          fs.mkdirSync(SERVER_FOLDER, { recursive: true });
          broadcastCleared();
          console.log('[Server] synced-folder cleared by client request');
        } catch (error) {
          console.error('Error clearing synced-folder:', error);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('[Server] Client disconnected');
  });
});

/**
 * Watch the SERVER_FOLDER for changes using chokidar.
 * We'll ignore node_modules, .png files, and .git folders.
 */
const watcher = chokidar.watch(SERVER_FOLDER, {
  ignoreInitial: true,
  persistent: true,
  ignored: [
    '**/node_modules/**',
    '**/*.png',
    '**/.git/**'
  ]
});

watcher
  .on('change', (filePath) => {
    // A file was modified
    const relativePathRaw = path.relative(SERVER_FOLDER, filePath);
    // Normalize to forward slashes so the client code sees consistent paths
    const relativePath = relativePathRaw.split(path.sep).join('/');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    broadcastFileUpdate(relativePath, fileContent);
    console.log('[Server] Detected change:', relativePath);
  })
  .on('add', (filePath) => {
    // A new file was added
    const relativePathRaw = path.relative(SERVER_FOLDER, filePath);
    const relativePath = relativePathRaw.split(path.sep).join('/');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    broadcastFileUpdate(relativePath, fileContent);
    console.log('[Server] New file added:', relativePath);
  })
  .on('unlink', (filePath) => {
    // A file was deleted
    const relativePathRaw = path.relative(SERVER_FOLDER, filePath);
    const relativePath = relativePathRaw.split(path.sep).join('/');
    // Send empty content to indicate deletion
    broadcastFileUpdate(relativePath, '');
    console.log('[Server] File deleted:', relativePath);
  });
