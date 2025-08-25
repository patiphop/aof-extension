# 🔄 Bidirectional File Synchronization Examples

คู่มือการใช้งานและตัวอย่างการทำงานของ faizSync Extension ที่รองรับการ sync แบบ bidirectional

## 🎯 Overview

faizSync Extension รองรับการ synchronize ไฟล์แบบ bidirectional หมายความว่า:
- **Client → Server**: การเปลี่ยนแปลงใน VSCode จะถูกส่งไปยัง server ทันที
- **Server → Client**: การเปลี่ยนแปลงบน server จะถูกส่งกลับไปยัง client ทั้งหมด
- **Real-time**: การ sync เกิดขึ้นแบบ real-time ไม่ต้องรอ manual sync

## 🏗️ Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│ VSCode Client A │ ◄─────────────► │                 │
│                 │                 │                 │
│ File: main.ts   │                 │  WebSocket      │
│ Content: "Hello"│                 │    Server       │
└─────────────────┘                 │  Port: 1420    │
                                    │                 │
                                    │  File Watcher   │
                                    │  + File Store   │
┌─────────────────┐    WebSocket    │                 │
│ VSCode Client B │ ◄─────────────► │  ./synced-files/│
│                 │                 │                 │
│ File: main.ts   │                 │                 │
│ Content: "Hello"│                 │                 │
└─────────────────┘                 └─────────────────┘
```

## 📝 Example Scenarios

### Scenario 1: File Creation (Client → Server → Other Clients)

#### Step 1: Client A สร้างไฟล์ใหม่
```typescript
// Client A สร้างไฟล์ src/main.ts
console.log('Hello World');
```

#### Step 2: Extension ส่งไฟล์ไปยัง Server
```typescript
// SyncManager.syncFile() ถูกเรียก
syncManager.syncFile('/path/to/src/main.ts');

// WebSocketClient ส่ง message
webSocketClient.sendFile('src/main.ts', 'console.log("Hello World");');
```

#### Step 3: Server รับไฟล์และ broadcast
```typescript
// Server รับ message
{
  type: 'SYNC_FILE',
  payload: {
    relativePath: 'src/main.ts',
    fileContent: 'console.log("Hello World");'
  }
}

// Server บันทึกไฟล์และ broadcast
this.broadcastToOthers(clientId, {
  type: 'FILE_UPDATED',
  payload: {
    relativePath: 'src/main.ts',
    fileContent: 'console.log("Hello World");'
  }
});
```

#### Step 4: Client B รับการอัปเดท
```typescript
// Client B รับ message
{
  type: 'FILE_UPDATED',
  payload: {
    relativePath: 'src/main.ts',
    fileContent: 'console.log("Hello World");'
  }
}

// SyncManager สร้างไฟล์ใน local
this.handleFileUpdate({
  relativePath: 'src/main.ts',
  fileContent: 'console.log("Hello World");'
});
```

### Scenario 2: File Modification (Server → All Clients)

#### Step 1: Server ไฟล์ถูกแก้ไขโดยตรง
```bash
# แก้ไขไฟล์บน server
echo 'console.log("Updated Hello World");' > ./synced-files/src/main.ts
```

#### Step 2: File Watcher ตรวจจับการเปลี่ยนแปลง
```typescript
// FileManager ตรวจจับ file change
this.fileWatcher = fs.watch(this.baseDir, { recursive: true }, (eventType, filename) => {
  if (eventType === 'change') {
    this.handleFileChanged(relativePath);
  }
});
```

#### Step 3: Server broadcast การเปลี่ยนแปลง
```typescript
// FileManager emit event
this.emit('fileChanged', { 
  relativePath, 
  content, 
  version: fileInfo.version 
});

// SyncServer รับ event และ broadcast
this.fileManager.on('fileChanged', (data) => {
  this.broadcastToAll({
    type: 'FILE_CHANGED',
    payload: {
      relativePath: data.relativePath,
      fileContent: data.content,
      version: data.version
    }
  });
});
```

#### Step 4: ทั้งหมด Clients รับการอัปเดท
```typescript
// Client A และ B รับ message
{
  type: 'FILE_CHANGED',
  payload: {
    relativePath: 'src/main.ts',
    fileContent: 'console.log("Updated Hello World");',
    version: 2
  }
}

// SyncManager อัปเดทไฟล์ local
this.handleFileChanged({
  relativePath: 'src/main.ts',
  fileContent: 'console.log("Updated Hello World");',
  version: 2
});
```

### Scenario 3: File Deletion (Client → Server → All Clients)

#### Step 1: Client A ลบไฟล์
```typescript
// ไฟล์ src/main.ts ถูกลบใน VSCode
// Extension ตรวจจับการลบไฟล์
fileWatcher.onDidDelete(async (uri) => {
  if (uri.fsPath.startsWith(localFolderPath)) {
    syncManager.deleteFile(uri.fsPath);
  }
});
```

#### Step 2: Extension ส่ง delete message
```typescript
// WebSocketClient ส่ง delete message
webSocketClient.sendDeleteFile('src/main.ts');

// Message ที่ส่ง
{
  type: 'DELETE_FILE',
  payload: {
    relativePath: 'src/main.ts'
  }
}
```

#### Step 3: Server ลบไฟล์และ broadcast
```typescript
// Server รับ delete message
this.handleFileDelete(clientId, message);

// ลบไฟล์จาก local storage
await this.fileManager.deleteFile(relativePath);

// Broadcast ไปยัง clients อื่น
this.broadcastToOthers(clientId, {
  type: 'FILE_DELETED',
  payload: { relativePath }
});
```

#### Step 4: Client B รับ delete notification
```typescript
// Client B รับ message
{
  type: 'FILE_DELETED',
  payload: {
    relativePath: 'src/main.ts'
  }
}

// SyncManager ลบไฟล์ใน local
this.handleFileDelete({
  relativePath: 'src/main.ts'
});
```

## 🔄 Conflict Resolution

### Version Control System

ทุกไฟล์มี version number เพื่อป้องกันการสูญเสียข้อมูล:

```typescript
interface FileInfo {
  relativePath: string;
  content: string;
  lastModified: number;
  lastClientId: string;
  version: number;  // ← Version number
}
```

### Conflict Detection

เมื่อเกิด conflict ระบบจะแสดง warning:

```typescript
// ใน SyncManager.handleFileChanged()
if (fs.existsSync(localFilePath)) {
  const localContent = fs.readFileSync(localFilePath, 'utf8');
  
  // ตรวจสอบ conflict
  if (localContent !== fileContent) {
    logger.warn(`Potential conflict detected for ${relativePath}. Local and server versions differ.`);
    // ปัจจุบัน server version จะชนะ
    // ในอนาคตจะมีการ implement conflict resolution
  }
}
```

### Conflict Example

```typescript
// Client A แก้ไขไฟล์
// Content: "Hello from Client A"

// Client B แก้ไขไฟล์พร้อมกัน
// Content: "Hello from Client B"

// Server รับ Client A ก่อน
// Version: 2, Content: "Hello from Client A"

// Client B ส่งการเปลี่ยนแปลง
// Server ตรวจพบ conflict
// Warning: "Potential conflict detected for main.ts"

// Server version ชนะ (Client A)
// Client B รับการอัปเดทและเห็น "Hello from Client A"
```

## 📊 Message Flow Diagram

```
Client A                    Server                    Client B
   │                         │                         │
   │ 1. Edit file           │                         │
   │ 2. Save file           │                         │
   │ 3. Send SYNC_FILE      │                         │
   │─────────────────────────▶                         │
   │                         │ 4. Save file           │
   │                         │ 5. Broadcast           │
   │                         │    FILE_UPDATED        │
   │                         │─────────────────────────▶
   │                         │                         │ 6. Update local file
   │                         │                         │ 7. Show notification
   │                         │                         │
   │                         │                         │
   │                         │ 8. File changed on     │
   │                         │    server               │
   │                         │ 9. File watcher        │
   │                         │    detects change       │
   │                         │ 10. Broadcast          │
   │                         │    FILE_CHANGED        │
   │◀─────────────────────────│                         │
   │ 11. Update local file   │                         │
   │ 12. Show notification   │                         │
   │                         │                         │◀─────────────────────────
   │                         │                         │ 13. Update local file
   │                         │                         │ 14. Show notification
```

## 🧪 Testing Bidirectional Sync

### Test Setup

1. **Start Server**
   ```bash
   cd server
   npm start
   ```

2. **Open Two VSCode Windows**
   - Window A: Extension A
   - Window B: Extension B

3. **Start Sync in Both**
   - Command Palette → "Start faizSync"
   - Select same folder in both

### Test Cases

#### Test 1: File Creation
1. ใน Window A สร้างไฟล์ `test.txt`
2. ตรวจสอบว่าไฟล์ปรากฏใน Window B
3. ตรวจสอบ server logs

#### Test 2: File Modification
1. ใน Window A แก้ไขไฟล์ `test.txt`
2. ตรวจสอบว่าเนื้อหาเปลี่ยนใน Window B
3. ตรวจสอบ version number

#### Test 3: File Deletion
1. ใน Window A ลบไฟล์ `test.txt`
2. ตรวจสอบว่าไฟล์หายไปจาก Window B
3. ตรวจสอบ server logs

#### Test 4: Server File Change
1. แก้ไขไฟล์โดยตรงใน server directory
2. ตรวจสอบว่าไฟล์เปลี่ยนในทั้งสอง Windows
3. ตรวจสอบ file watcher logs

## 🔧 Configuration

### Server Configuration

```typescript
// server/src/SyncServer.ts
constructor(port: number = 1420) {
  const baseDir = '/Users/patiphopungudchuak/Documents/workspaces/sync-local-files';
  this.fileManager = new FileManager(baseDir);
  // ...
}
```

### Client Configuration

```typescript
// src/services/SyncManager.ts
constructor(localFolderPath: string) {
  // ...
  this.webSocketClient = new WebSocketClient('ws://192.168.1.105:1420');
  // ...
}
```

### File Watching

```typescript
// server/src/FileManager.ts
startWatching(): void {
  this.fileWatcher = fs.watch(this.baseDir, { recursive: true }, (eventType, filename) => {
    // Handle file changes
  });
}
```

## 📈 Performance Considerations

### Batch Operations

สำหรับการ sync ไฟล์จำนวนมาก:

```typescript
// Future enhancement
interface BatchSyncMessage {
  type: 'BATCH_SYNC';
  payload: {
    files: Array<{
      relativePath: string;
      fileContent: string;
    }>;
  };
}
```

### Connection Pooling

```typescript
// WebSocket connection management
class ConnectionPool {
  private connections: Map<string, WebSocket> = new Map();
  
  addConnection(clientId: string, ws: WebSocket): void {
    this.connections.set(clientId, ws);
  }
  
  broadcast(message: any): void {
    this.connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }
}
```

## 🚀 Future Enhancements

### 1. Conflict Resolution UI
```typescript
interface ConflictResolution {
  type: 'CONFLICT_RESOLUTION';
  payload: {
    relativePath: string;
    localVersion: string;
    serverVersion: string;
    mergeOptions: string[];
  };
}
```

### 2. File History
```typescript
interface FileHistory {
  relativePath: string;
  versions: Array<{
    version: number;
    content: string;
    timestamp: number;
    clientId: string;
  }>;
}
```

### 3. Selective Sync
```typescript
interface SyncConfig {
  includePatterns: string[];
  excludePatterns: string[];
  maxFileSize: number;
  syncInterval: number;
}
```

---

**faizSync Extension** - Making bidirectional synchronization simple and reliable! 🔄

สำหรับคำถามเพิ่มเติมหรือต้องการความช่วยเหลือ กรุณาติดต่อทีมพัฒนา
