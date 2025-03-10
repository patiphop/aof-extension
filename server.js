const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Folder to store synced files on Windows (Server) side
const SERVER_FOLDER = path.join(__dirname, 'synced-folder');

// Create folder if it doesn't exist
if (!fs.existsSync(SERVER_FOLDER)) {
  fs.mkdirSync(SERVER_FOLDER, { recursive: true });
}

// Store file timestamps: key = relative file path, value = lastModified timestamp
let fileTimestamps = {};

// Create WebSocket server
const wss = new WebSocket.Server({ port: 3000 }, () => {
  console.log('WebSocket Server is running on ws://localhost:3000');
});

wss.on('connection', (ws) => {
  console.log('[Server] Client connected');

  ws.on('message', async (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === 'SYNC_FILE') {
        const { relativePath, fileContent, lastModified } = data.payload;
        const serverFilePath = path.join(SERVER_FOLDER, relativePath);

        // Check conflict: if server is newer, send CONFLICT
        const existingTimestamp = fileTimestamps[relativePath];
        if (existingTimestamp && existingTimestamp > lastModified) {
          ws.send(JSON.stringify({
            type: 'CONFLICT',
            payload: {
              relativePath,
              serverTimestamp: existingTimestamp,
              clientTimestamp: lastModified
            }
          }));
          return;
        }

        // Write file to server
        fs.mkdirSync(path.dirname(serverFilePath), { recursive: true });
        fs.writeFileSync(serverFilePath, fileContent, 'utf8');
        fileTimestamps[relativePath] = lastModified;

        // Broadcast update to all clients
        broadcastFileUpdate(relativePath, lastModified, fileContent);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('[Server] Client disconnected');
  });

  function broadcastFileUpdate(relativePath, lastModified, fileContent) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'FILE_UPDATED',
          payload: { relativePath, lastModified, fileContent }
        }));
      }
    });
  }
});
