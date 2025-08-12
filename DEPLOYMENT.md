# 🚀 faizSync Extension - Deployment Guide

คู่มือการติดตั้งและใช้งาน faizSync Extension พร้อม WebSocket Server สำหรับการ sync ไฟล์แบบ real-time

## 📋 Overview

faizSync Extension ประกอบด้วย 2 ส่วนหลัก:
1. **VSCode Extension** (Client) - ติดตั้งใน VSCode ของแต่ละ developer
2. **WebSocket Server** - รันบน server เพื่อจัดการการ sync ไฟล์

## 🏗️ Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│ VSCode Client 1 │ ◄─────────────► │                 │
└─────────────────┘                 │                 │
                                    │  WebSocket      │
┌─────────────────┐    WebSocket    │    Server       │
│ VSCode Client 2 │ ◄─────────────► │  Port: 1420    │
└─────────────────┘                 │                 │
                                    │                 │
┌─────────────────┐    WebSocket    │  File Storage   │
│ VSCode Client N │ ◄─────────────► │ ./synced-files/ │
└─────────────────┘                 └─────────────────┘
```

## 🚀 Step 1: Deploy WebSocket Server

### Option A: Local Development Server

1. **Navigate to server directory**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build server**
   ```bash
   npm run build
   ```

4. **Start server**
   ```bash
   npm start
   ```

   หรือใช้ startup script:
   ```bash
   ./start.sh
   ```

### Option B: Production Server

1. **SSH to your server**
   ```bash
   ssh user@your-server-ip
   ```

2. **Clone repository**
   ```bash
   git clone <your-repo-url>
   cd faizsync-extension/server
   ```

3. **Install dependencies**
   ```bash
   npm install --production
   ```

4. **Build server**
   ```bash
   npm run build
   ```

5. **Start with PM2 (recommended)**
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name "faizsync-server"
   pm2 save
   pm2 startup
   ```

### Option C: Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY dist ./dist
   EXPOSE 1420
   CMD ["node", "dist/server.js"]
   ```

2. **Build and run**
   ```bash
   docker build -t faizsync-server .
   docker run -d -p 1420:1420 --name faizsync-server faizsync-server
   ```

## 🔧 Server Configuration

### Environment Variables

```bash
# Server port (default: 1420)
export PORT=1420

# File storage directory (default: ./synced-files)
export SYNC_DIR=/path/to/sync/directory
```

### Firewall Configuration

```bash
# Ubuntu/Debian
sudo ufw allow 1420

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=1420/tcp
sudo firewall-cmd --reload
```

### Nginx Reverse Proxy (Optional)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /ws {
        proxy_pass http://localhost:1420;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 📱 Step 2: Install VSCode Extension

### Option A: Development Installation

1. **Open VSCode in project root**
   ```bash
   code .
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build extension**
   ```bash
   npm run compile
   ```

4. **Press F5 to run extension in new VSCode window**

### Option B: Package and Install

1. **Build extension**
   ```bash
   npm run compile
   ```

2. **Package extension**
   ```bash
   npm run build
   ```

3. **Install .vsix file**
   - VSCode → Extensions → Install from VSIX
   - Select the generated .vsix file

### Option C: Install from Source

1. **Clone repository**
   ```bash
   git clone <your-repo-url>
   cd faizsync-extension
   ```

2. **Install and build**
   ```bash
   npm install
   npm run compile
   ```

3. **Press F5 to run**

## 🔌 Step 3: Configure Extension

### Update Server Address

หาก server ไม่ได้รันที่ `192.168.1.105:1420` ให้แก้ไขในไฟล์:

```typescript
// src/services/WebSocketClient.ts
constructor(url: string) {
  super();
  this.url = url; // เปลี่ยนเป็น server address ของคุณ
}
```

### Extension Settings

ใน VSCode สามารถตั้งค่า extension ได้:

1. **Open Command Palette** (`Ctrl+Shift+P`)
2. **Type**: "Preferences: Open Settings (JSON)"
3. **Add configuration**:

```json
{
  "faizsync.serverUrl": "ws://your-server-ip:1420",
  "faizsync.autoSync": true,
  "faizsync.syncInterval": 5000
}
```

## 🧪 Testing the Setup

### Test Server

1. **Start server**
   ```bash
   cd server
   npm start
   ```

2. **Test with client**
   ```bash
   node test-client.js
   ```

### Test Extension

1. **Open VSCode with extension**
2. **Command Palette** → "Start faizSync"
3. **Select folder to sync**
4. **Check WebView dashboard**

## 📊 Monitoring

### Server Status

```bash
# Check if server is running
curl -I http://localhost:1420

# Check server logs
pm2 logs faizsync-server

# Server statistics
# (implement HTTP endpoint for stats)
```

### Client Connections

Server จะแสดง log เมื่อ client เชื่อมต่อ:

```
faizSync Server started on port 1420
Client connected: abc123-def456 (Total: 1)
Client connected: ghi789-jkl012 (Total: 2)
Client disconnected: abc123-def456 (Total: 1)
```

## 🐛 Troubleshooting

### Common Issues

#### Server Won't Start
```bash
# Check if port is in use
lsof -i :1420

# Check Node.js version
node --version  # Should be 18+

# Check dependencies
npm list
```

#### Extension Can't Connect
```bash
# Test WebSocket connection
wscat -c ws://your-server:1420

# Check firewall
sudo ufw status

# Check server logs
pm2 logs faizsync-server
```

#### Files Not Syncing
- ตรวจสอบว่าไฟล์ไม่ถูก ignore โดย .gitignore
- ตรวจสอบว่าไฟล์เป็น text file (ไม่ใช่ binary)
- ตรวจสอบ server logs สำหรับ error

### Debug Mode

```bash
# Server debug
DEBUG=* npm start

# Extension debug
# Press F5 in VSCode and check Debug Console
```

## 🔒 Security Considerations

### Network Security
- ใช้ firewall เพื่อจำกัดการเข้าถึง port 1420
- ใช้ VPN สำหรับ remote access
- จำกัดการเข้าถึงเฉพาะ IP ที่อนุญาต

### File Security
- ตรวจสอบสิทธิ์การเข้าถึงไฟล์ใน sync directory
- ไม่ sync ไฟล์ที่มีข้อมูลสำคัญ (passwords, keys)
- ใช้ .gitignore เพื่อ exclude ไฟล์ที่ไม่ต้องการ

### Authentication (Future Enhancement)
```typescript
// Add authentication to server
interface AuthMessage {
  type: 'AUTH';
  payload: {
    token: string;
    clientId: string;
  };
}
```

## 📈 Performance Optimization

### Server Optimization
```typescript
// Increase ping interval for better performance
private startPingInterval(): void {
  this.pingInterval = setInterval(() => {
    // ... ping logic
  }, 60000); // 60 seconds instead of 30
}
```

### Client Optimization
```typescript
// Batch file updates
private batchUpdate(files: string[]): void {
  // Send multiple files in one message
  this.webSocketClient.send({
    type: 'BATCH_SYNC',
    payload: { files }
  });
}
```

## 🚀 Production Deployment Checklist

- [ ] Server running on production machine
- [ ] Firewall configured
- [ ] Domain/DNS configured (if using)
- [ ] SSL certificate (if using HTTPS)
- [ ] Monitoring and logging set up
- [ ] Backup strategy for synced files
- [ ] Extension packaged and distributed
- [ ] Documentation updated
- [ ] Team trained on usage

## 📞 Support

หากมีปัญหาหรือต้องการความช่วยเหลือ:

1. **Check logs** - Server และ Extension logs
2. **Review configuration** - Server address, ports, firewall
3. **Test connectivity** - WebSocket connection test
4. **Check dependencies** - Node.js version, npm packages

---

**faizSync Extension** - Making file synchronization simple and reliable! 🔄

สำหรับคำถามเพิ่มเติมหรือต้องการความช่วยเหลือ กรุณาติดต่อทีมพัฒนา
