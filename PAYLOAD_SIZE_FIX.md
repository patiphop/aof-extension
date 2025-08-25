# Payload Size Fix for faizSync

## Problem Description
The error `RangeError: Max payload size exceeded` occurs when WebSocket messages exceed the default payload size limit. This typically happens when:

1. Large files are being synced
2. Binary files are accidentally included
3. Files with very long content are processed

## Solution Implemented

### 1. WebSocket Server Configuration
- Increased default max payload size from default (64KB) to 100MB
- Added compression for messages larger than 1KB
- Added payload size validation before processing

### 2. File Size Limits
- Added 50MB limit for individual files
- Prevents oversized files from being synced
- Client-side validation before sending

### 3. Configuration System
- Environment variable support for all limits
- Easy adjustment without code changes
- Centralized configuration management

## Configuration Options

### Environment Variables

```bash
# Server Configuration
PORT=1420
BASE_DIR=/Users/patiphopungudchuak/Documents/workspaces/sync-local-files

# Payload and File Size Limits
MAX_PAYLOAD_SIZE=104857600    # 100MB in bytes
MAX_FILE_SIZE=52428800         # 50MB in bytes

# Ping Interval (in milliseconds)
PING_INTERVAL=30000

# Compression Settings
COMPRESSION_ENABLED=true
COMPRESSION_THRESHOLD=1024     # 1KB
COMPRESSION_CONCURRENCY_LIMIT=10
```

### Default Values
- **Max Payload Size**: 100MB
- **Max File Size**: 50MB
- **Compression Threshold**: 1KB
- **Ping Interval**: 30 seconds

## Usage

### 1. Copy Environment File
```bash
cd server
cp env.example .env
```

### 2. Adjust Values (Optional)
Edit `.env` file to adjust limits based on your needs:

```bash
# For larger files
MAX_PAYLOAD_SIZE=209715200    # 200MB
MAX_FILE_SIZE=104857600        # 100MB

# For smaller limits (more restrictive)
MAX_PAYLOAD_SIZE=52428800      # 50MB
MAX_FILE_SIZE=26214400          # 25MB
```

### 3. Restart Server
```bash
npm run build
npm start
```

## Error Handling

### Client-Side Validation
- Files larger than `MAX_FILE_SIZE` are skipped during sync
- Warning messages are logged for oversized files
- Initial sync reports skipped file count

### Server-Side Validation
- Payload size checked before message processing
- File content size validated before saving
- Clear error messages sent back to clients

### Error Messages
```
Server error: File too large: example.txt (52428801 bytes, max: 52428800 bytes)
Server error: Message too large: 104857601 bytes (max: 104857600 bytes)
```

## Monitoring

### Server Statistics
```typescript
const stats = server.getStats();
console.log(`Max Payload: ${stats.maxPayloadSizeMB}MB`);
console.log(`Max File Size: ${stats.maxFileSizeMB}MB`);
```

### Log Messages
```
Max payload size: 100MB
Max file size: 50MB
File too large to sync: large-file.txt (52428801 bytes, max: 52428800 bytes)
```

## Troubleshooting

### Still Getting Payload Size Errors?

1. **Check File Sizes**
   ```bash
   find /path/to/sync/folder -type f -size +50M
   ```

2. **Increase Limits**
   ```bash
   export MAX_PAYLOAD_SIZE=209715200  # 200MB
   export MAX_FILE_SIZE=104857600      # 100MB
   ```

3. **Check for Binary Files**
   - Ensure binary files are excluded from sync
   - Check `.gitignore` patterns
   - Verify file type detection

4. **Monitor Logs**
   ```bash
   # Look for size-related warnings
   grep -i "too large\|oversized" server.log
   ```

### Performance Considerations

- **Large Payload Limits**: May increase memory usage
- **Compression**: Reduces network traffic but increases CPU usage
- **File Size Limits**: Prevents memory issues from huge files

### Recommended Settings

- **Development**: 50MB file, 100MB payload
- **Production**: 100MB file, 200MB payload
- **High-Performance**: 200MB file, 500MB payload

## Code Changes Made

### Files Modified
1. `server/src/SyncServer.ts` - WebSocket configuration and validation
2. `server/src/FileManager.ts` - File size validation
3. `server/src/config.ts` - Configuration system
4. `server/src/server.ts` - Configuration loading
5. `src/services/SyncManager.ts` - Client-side validation
6. `src/services/WebSocketClient.ts` - Error handling

### Key Features Added
- Payload size validation
- File size limits
- Compression support
- Environment configuration
- Better error messages
- Client-side filtering

## Testing

### Test Large Files
```bash
# Create test file
dd if=/dev/zero of=test-large.txt bs=1M count=60

# Try to sync (should be rejected)
# Check logs for appropriate error messages
```

### Test Configuration
```bash
# Test different limits
export MAX_FILE_SIZE=1048576  # 1MB
npm start

# Verify smaller files are accepted, larger ones rejected
```

## Future Improvements

1. **Chunked File Transfer**: Split large files into chunks
2. **Resume Support**: Resume interrupted large file transfers
3. **Progress Indicators**: Show sync progress for large files
4. **Adaptive Limits**: Adjust limits based on available memory
5. **File Type Detection**: Better binary file filtering

