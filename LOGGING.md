# 📝 Logging Configuration

คู่มือการตั้งค่า logging สำหรับ faizSync Extension

## 🎯 Overview

faizSync Extension ใช้ Logger system ที่สามารถปรับ log level และ filter log ได้ เพื่อลด log ที่ไม่จำเป็นและแสดงเฉพาะข้อมูลที่สำคัญ

## 🔧 Log Levels

### LogLevel.ERROR (0)
- แสดงเฉพาะ error messages
- เหมาะสำหรับ production environment

### LogLevel.WARN (1)
- แสดง warning และ error messages
- เหมาะสำหรับ quiet mode

### LogLevel.INFO (2)
- แสดง info, warning และ error messages
- Default setting

### LogLevel.DEBUG (3)
- แสดงทุก messages รวมถึง debug
- เหมาะสำหรับ development และ troubleshooting

## 📋 Logging Categories

### Error Logs
```typescript
logger.error('Connection failed:', error);
```
- แสดง error messages เสมอ
- ไม่สามารถปิดได้

### Warning Logs
```typescript
logger.warn('Unknown message type:', message.type);
```
- แสดงเมื่อ log level >= WARN

### Info Logs
```typescript
logger.info('Server started on port 1420');
```
- แสดงเมื่อ log level >= INFO

### Debug Logs
```typescript
logger.debug('Message received:', message);
```
- แสดงเมื่อ log level >= DEBUG และ showDebug = true

### Extension Logs
```typescript
logger.extension('Extension activated');
```
- แสดงเฉพาะใน extension mode
- ใช้สำหรับ extension-specific events

### Server Logs
```typescript
logger.server('Server started');
```
- แสดงเฉพาะใน server mode
- ใช้สำหรับ server-specific events

### Sync Logs
```typescript
logger.sync('File synced: example.txt');
```
- แสดง file sync events
- สามารถปิดได้ด้วย showFileSync = false

### Connection Logs
```typescript
logger.connection('Client connected: abc123');
```
- แสดง connection events
- สามารถปิดได้ด้วย showConnection = false

## ⚙️ Configuration

### Default Configuration
```typescript
const defaultLoggingConfig = {
  level: LogLevel.INFO,
  showFileSync: true,
  showConnection: true,
  showDebug: false
};
```

### Quiet Configuration (แนะนำ)
```typescript
const quietLoggingConfig = {
  level: LogLevel.WARN,
  showFileSync: false,
  showConnection: true,
  showDebug: false
};
```

### Verbose Configuration
```typescript
const verboseLoggingConfig = {
  level: LogLevel.DEBUG,
  showFileSync: true,
  showConnection: true,
  showDebug: true
};
```

## 🚀 การใช้งาน

### ใน Extension
```typescript
import { logger } from './utils/Logger';
import { quietLoggingConfig } from './config/logging';

// Set up logger
logger.setExtensionMode(true);
logger.setConfig(quietLoggingConfig);

// Use logger
logger.extension('Extension started');
logger.sync('File synced');
logger.error('Error occurred:', error);
```

### ใน Server
```typescript
import { logger } from './utils/Logger';
import { defaultLoggingConfig } from './config/logging';

// Set up logger
logger.setExtensionMode(false);
logger.setConfig(defaultLoggingConfig);

// Use logger
logger.server('Server started');
logger.connection('Client connected');
logger.error('Server error:', error);
```

## 🔄 การเปลี่ยน Configuration

### เปลี่ยนเป็น Quiet Mode
```typescript
logger.setConfig({
  level: LogLevel.WARN,
  showFileSync: false,
  showConnection: true,
  showDebug: false
});
```

### เปลี่ยนเป็น Verbose Mode
```typescript
logger.setConfig({
  level: LogLevel.DEBUG,
  showFileSync: true,
  showConnection: true,
  showDebug: true
});
```

### ปิด File Sync Logs
```typescript
logger.setConfig({
  showFileSync: false
});
```

### ปิด Connection Logs
```typescript
logger.setConfig({
  showConnection: false
});
```

## 📊 Log Output Examples

### Quiet Mode Output
```
[WARN] Unknown message type: UNKNOWN
[ERROR] Connection failed: ECONNREFUSED
[CONNECTION] Client connected: abc123
[CONNECTION] Client disconnected: abc123
```

### Verbose Mode Output
```
[INFO] faizSync Extension is now active!
[CONNECTION] Connected to sync server
[SYNC] Initial sync complete. Synced 15 files.
[SYNC] File synced: src/main.ts
[SYNC] File updated from server: src/utils.ts
[DEBUG] Message from client abc123: SYNC_FILE
[INFO] Server started on port 1420
```

## 🎯 Best Practices

1. **ใช้ Quiet Mode ใน Production**
   - ลด log noise
   - แสดงเฉพาะ error และ connection events

2. **ใช้ Verbose Mode สำหรับ Debugging**
   - แสดงทุก events
   - ช่วยในการ troubleshoot

3. **ปิด File Sync Logs เมื่อไม่ต้องการ**
   - ลด log spam จาก file operations
   - เหลือเฉพาะ connection และ error logs

4. **ใช้ Error Logs สำหรับ Critical Issues**
   - แสดงเสมอไม่ว่าจะตั้งค่า log level อย่างไร
   - ใช้สำหรับ error handling

## 🔧 Environment Variables

สามารถใช้ environment variables เพื่อตั้งค่า log level:

```bash
# Set log level
export FAIZSYNC_LOG_LEVEL=WARN

# Disable file sync logs
export FAIZSYNC_SHOW_FILE_SYNC=false

# Enable debug mode
export FAIZSYNC_DEBUG=true
```

---

**faizSync Extension** - Making logging simple and configurable! 📝
