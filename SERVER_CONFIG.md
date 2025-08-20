# Server Configuration

## Sync Directory Configuration

The faizSync server has been configured to use a hardcoded sync directory for the host machine.

### Sync Directory Path

**Host Machine Sync Directory:**
```
/Users/patiphopungudchuak/Documents/workspaces/sync-local-files
```

### Configuration Changes

The following files have been modified to use the hardcoded path:

1. **`server/src/SyncServer.ts`**
   - Changed `baseDir` from environment variable to hardcoded path
   - Removed dependency on `BASE_DIR` environment variable

2. **`server/src/server.ts`**
   - Removed `BASE_DIR` environment variable handling
   - Updated logging to show hardcoded path

### Benefits

1. **Consistency**: All server instances will use the same sync directory
2. **Simplicity**: No need to configure environment variables
3. **Reliability**: Eliminates configuration errors
4. **Easy Setup**: Just start the server and it's ready to use

### Usage

#### Starting the Server

```bash
cd server
npm run build
npm start
```

The server will automatically:
- Create the sync directory if it doesn't exist
- Start watching for file changes in the sync directory
- Accept connections from VS Code extension clients

#### Server Output

When the server starts, you'll see:
```
[SERVER] faizSync Server is running...
[SERVER] - Port: 1420
[SERVER] - WebSocket URL: ws://localhost:1420
[SERVER] - BaseDir: /Users/patiphopungudchuak/Documents/workspaces/sync-local-files
[SERVER] - Press Ctrl+C to stop the server
```

### File Operations

#### Manual File Management

You can manually add files to the sync directory:

```bash
# Add a test file
echo "Hello World" > /Users/patiphopungudchuak/Documents/workspaces/sync-local-files/hello.txt

# Create a subdirectory
mkdir -p /Users/patiphopungudchuak/Documents/workspaces/sync-local-files/project/src

# Add files to subdirectory
echo "console.log('Hello');" > /Users/patiphopungudchuak/Documents/workspaces/sync-local-files/project/src/index.js
```

#### Automatic File Watching

The server automatically detects:
- File creation in the sync directory
- File modifications
- File deletions
- Directory changes

All changes are broadcast to connected VS Code extension clients in real-time.

### Client Connection

VS Code extension clients should connect to:
- **WebSocket URL**: `ws://localhost:1420`
- **Default Port**: 1420 (configurable via `PORT` environment variable)

### Environment Variables

The following environment variables are still supported:

- **`PORT`**: Server port (default: 1420)
- **`LOG_LEVEL`**: Logging level (default: INFO)

### Troubleshooting

#### Directory Permissions

If you encounter permission issues:

```bash
# Check directory permissions
ls -la /Users/patiphopungudchuak/Documents/workspaces/sync-local-files

# Fix permissions if needed
chmod 755 /Users/patiphopungudchuak/Documents/workspaces/sync-local-files
```

#### Directory Creation

The server automatically creates the sync directory if it doesn't exist. If you need to create it manually:

```bash
mkdir -p /Users/patiphopungudchuak/Documents/workspaces/sync-local-files
```

#### Port Conflicts

If port 1420 is already in use:

```bash
# Use a different port
PORT=1421 npm start
```

### Security Considerations

1. **File Access**: The sync directory is accessible to all users on the system
2. **Network Access**: The server accepts connections from any IP address
3. **File Permissions**: Ensure appropriate file permissions for sensitive data

### Performance Notes

1. **File Watching**: The server watches the entire sync directory recursively
2. **Memory Usage**: Large numbers of files may increase memory usage
3. **Network**: File content is transmitted over WebSocket connections

### Migration from Environment Variables

If you were previously using the `BASE_DIR` environment variable:

1. **Old Configuration**:
   ```bash
   BASE_DIR=/path/to/sync npm start
   ```

2. **New Configuration**:
   - No environment variable needed
   - Server uses hardcoded path automatically

### Future Considerations

For production deployments, consider:
1. **Configuration File**: Adding support for configuration files
2. **Multiple Directories**: Supporting multiple sync directories
3. **Access Control**: Implementing authentication and authorization
4. **Backup**: Setting up automatic backups of the sync directory
