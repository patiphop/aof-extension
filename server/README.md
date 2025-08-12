# 🔄 faizSync Server

WebSocket server for handling real-time file synchronization between multiple VSCode clients.

## ✨ Features

- **Multi-client Support**: Handle multiple VSCode extensions simultaneously
- **Real-time Sync**: Instant file synchronization between clients
- **File Management**: Store and manage synced files locally
- **Health Monitoring**: Ping/pong mechanism to detect inactive clients
- **Error Handling**: Graceful error handling and client disconnection
- **Statistics**: Real-time server statistics and monitoring

## 🏗️ Architecture

```
server/
├── src/
│   ├── server.ts           # Main server entry point
│   ├── SyncServer.ts       # WebSocket server implementation
│   ├── FileManager.ts      # File storage and management
│   └── types.ts            # TypeScript type definitions
├── tests/                  # Unit tests
├── dist/                   # Compiled JavaScript
└── package.json            # Dependencies and scripts
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Navigate to server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the server**
   ```bash
   npm run build
   ```

4. **Start the server**
   ```bash
   npm start
   ```

### Development Mode

```bash
npm run dev
```

### Testing

```bash
npm test
npm run test:coverage
```

## 📖 Usage

### Starting the Server

The server will start on port 1420 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=3000 npm start
```

### Server Endpoints

- **WebSocket**: `ws://localhost:1420`
- **Default Port**: 1420
- **File Storage**: `./synced-files/` (configurable)

### Message Protocol

The server handles the following message types:

#### Client → Server
- `SYNC_FILE` - Sync a file to the server
- `DELETE_FILE` - Delete a file from the server
- `CLEAR_FOLDER` - Clear all synced files
- `PING` - Health check

#### Server → Client
- `CONNECTED` - Welcome message with client ID
- `FILE_SYNCED` - File sync confirmation
- `FILE_DELETED_CONFIRMED` - File deletion confirmation
- `FOLDER_CLEARED_CONFIRMED` - Folder clear confirmation
- `FILE_UPDATED` - File update broadcast to other clients
- `FILE_DELETED` - File deletion broadcast to other clients
- `FOLDER_CLEARED` - Folder clear broadcast to other clients
- `ERROR` - Error message
- `PONG` - Ping response

## 🔧 Configuration

### Environment Variables

- `PORT` - Server port (default: 1420)
- `SYNC_DIR` - Directory for storing synced files (default: ./synced-files)

### File Storage

Files are stored in the `./synced-files/` directory by default. The server maintains a map of all synced files with metadata:

- File content
- Last modification time
- Last client ID that synced the file

## 📊 Monitoring

### Server Statistics

The server provides real-time statistics:

```typescript
const stats = server.getStats();
console.log(stats);
// Output:
// {
//   port: 1420,
//   clientCount: 3,
//   fileCount: 15,
//   baseDir: './synced-files'
// }
```

### Client Health

- **Ping Interval**: 30 seconds
- **Inactive Detection**: Clients that don't respond to ping are automatically disconnected
- **Connection Logging**: All client connections and disconnections are logged

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Coverage

Tests cover:
- Server initialization and shutdown
- Client connection handling
- Message processing
- File operations
- Error handling

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Change port
   PORT=3000 npm start
   ```

2. **Permission Denied**
   ```bash
   # Check if port requires elevated privileges
   sudo npm start
   ```

3. **Client Connection Issues**
   - Verify WebSocket URL: `ws://localhost:1420`
   - Check firewall settings
   - Ensure server is running

### Debug Mode

Enable debug logging by setting the log level:

```bash
DEBUG=* npm start
```

## 🔒 Security Considerations

- **No Authentication**: The server currently has no authentication mechanism
- **File Access**: All connected clients can access all synced files
- **Network Security**: Use firewall rules to restrict access to trusted networks
- **File Validation**: No file content validation is performed

## 🚀 Deployment

### Production Deployment

1. **Build the server**
   ```bash
   npm run build
   ```

2. **Start with PM2**
   ```bash
   pm2 start dist/server.js --name "faizsync-server"
   ```

3. **Use reverse proxy (nginx)**
   ```nginx
   location /ws {
       proxy_pass http://localhost:1420;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 1420
CMD ["node", "dist/server.js"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

---

**faizSync Server** - Powering real-time file synchronization! 🔄
