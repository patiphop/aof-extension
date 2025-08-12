const WebSocket = require('ws');

// Test client for faizSync Server
class TestClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.clientId = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        console.log('✅ Connected to server');
        resolve();
      });

      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log('📨 Received:', message.type);
        
        if (message.type === 'CONNECTED') {
          this.clientId = message.payload.clientId;
          console.log('🆔 Client ID:', this.clientId);
        }
      });

      this.ws.on('close', () => {
        console.log('🔌 Disconnected from server');
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      });
    });
  }

  sendFile(relativePath, content) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ Not connected');
      return;
    }

    const message = {
      type: 'SYNC_FILE',
      payload: {
        relativePath,
        fileContent: content
      }
    };

    this.ws.send(JSON.stringify(message));
    console.log(`📤 Sent file: ${relativePath}`);
  }

  deleteFile(relativePath) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ Not connected');
      return;
    }

    const message = {
      type: 'DELETE_FILE',
      payload: {
        relativePath
      }
    };

    this.ws.send(JSON.stringify(message));
    console.log(`🗑️  Sent delete: ${relativePath}`);
  }

  clearFolder() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ Not connected');
      return;
    }

    const message = {
      type: 'CLEAR_FOLDER'
    };

    this.ws.send(JSON.stringify(message));
    console.log('🧹 Sent clear folder');
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Test the server
async function testServer() {
  const client = new TestClient('ws://localhost:1420');
  
  try {
    console.log('🚀 Testing faizSync Server...');
    
    // Connect to server
    await client.connect();
    
    // Wait a bit for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test file sync
    console.log('\n📁 Testing file sync...');
    client.sendFile('test.txt', 'Hello from test client!');
    
    // Wait and test another file
    await new Promise(resolve => setTimeout(resolve, 1000));
    client.sendFile('src/main.js', 'console.log("Hello World!");');
    
    // Wait and test file deletion
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('\n🗑️  Testing file deletion...');
    client.deleteFile('test.txt');
    
    // Wait and test folder clear
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('\n🧹 Testing folder clear...');
    client.clearFolder();
    
    // Wait and disconnect
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('\n👋 Disconnecting...');
    client.disconnect();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    client.disconnect();
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testServer();
}

module.exports = TestClient;
