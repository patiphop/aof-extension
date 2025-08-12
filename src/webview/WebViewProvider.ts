import * as vscode from 'vscode';
import * as path from 'path';

export class WebViewProvider {
  private static readonly viewType = 'faizsync.webview';
  private panel: vscode.WebviewPanel | undefined;

  constructor() {}

  /**
   * Show the WebView
   */
  show(): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      WebViewProvider.viewType,
      'faizSync Dashboard',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(__dirname, '..', '..', 'media'))
        ]
      }
    );

    this.panel.webview.html = this.getWebviewContent();

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'startSync':
            vscode.commands.executeCommand('faizsync.startSync');
            break;
          case 'stopSync':
            vscode.commands.executeCommand('faizsync.stopSync');
            break;
          case 'refresh':
            this.updateWebview();
            break;
        }
      },
      undefined,
      []
    );

    // Handle panel disposal
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  /**
   * Update the WebView content
   */
  updateWebview(): void {
    if (this.panel) {
      this.panel.webview.html = this.getWebviewContent();
    }
  }

  /**
   * Get the WebView HTML content
   */
  private getWebviewContent(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>faizSync Dashboard</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          
          .container {
            max-width: 800px;
            margin: 0 auto;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          
          .header h1 {
            color: var(--vscode-textLink-foreground);
            margin-bottom: 10px;
          }
          
          .status-card {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
          }
          
          .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
          }
          
          .status-connected {
            background-color: #4CAF50;
          }
          
          .status-disconnected {
            background-color: #f44336;
          }
          
          .status-connecting {
            background-color: #ff9800;
          }
          
          .button-group {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
          }
          
          .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background-color 0.2s;
          }
          
          .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
          }
          
          .btn-primary:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          
          .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
          }
          
          .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
          }
          
          .btn-danger {
            background-color: #f44336;
            color: white;
          }
          
          .btn-danger:hover {
            background-color: #d32f2f;
          }
          
          .info-section {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
          }
          
          .info-section h3 {
            margin-top: 0;
            color: var(--vscode-textLink-foreground);
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
          }
          
          .info-item {
            background-color: var(--vscode-editor-background);
            padding: 15px;
            border-radius: 4px;
            border: 1px solid var(--vscode-panel-border);
          }
          
          .info-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 5px;
          }
          
          .info-value {
            font-size: 16px;
            font-weight: 500;
          }
          
          .log-section {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
          }
          
          .log-section h3 {
            margin-top: 0;
            color: var(--vscode-textLink-foreground);
          }
          
          .log-container {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            height: 200px;
            overflow-y: auto;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 12px;
          }
          
          .log-entry {
            margin-bottom: 5px;
            padding: 2px 0;
          }
          
          .log-entry.info {
            color: var(--vscode-textLink-foreground);
          }
          
          .log-entry.warning {
            color: #ff9800;
          }
          
          .log-entry.error {
            color: #f44336;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔄 faizSync Dashboard</h1>
            <p>Real-time file synchronization with WebSocket support</p>
          </div>
          
          <div class="status-card">
            <h3>Connection Status</h3>
            <div>
              <span class="status-indicator status-disconnected" id="statusIndicator"></span>
              <span id="statusText">Disconnected</span>
            </div>
          </div>
          
          <div class="button-group">
            <button class="btn btn-primary" onclick="startSync()">Start Sync</button>
            <button class="btn btn-danger" onclick="stopSync()">Stop Sync</button>
            <button class="btn btn-secondary" onclick="refresh()">Refresh</button>
          </div>
          
          <div class="info-section">
            <h3>Sync Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Local Folder</div>
                <div class="info-value" id="localFolder">Not selected</div>
              </div>
              <div class="info-item">
                <div class="info-label">Server Address</div>
                <div class="info-value">192.168.1.105:1420</div>
              </div>
              <div class="info-item">
                <div class="info-label">Files Synced</div>
                <div class="info-value" id="filesSynced">0</div>
              </div>
              <div class="info-item">
                <div class="info-label">Last Sync</div>
                <div class="info-value" id="lastSync">Never</div>
              </div>
            </div>
          </div>
          
          <div class="log-section">
            <h3>Activity Log</h3>
            <div class="log-container" id="logContainer">
              <div class="log-entry info">faizSync Dashboard loaded</div>
              <div class="log-entry info">Ready to start synchronization</div>
            </div>
          </div>
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          function startSync() {
            vscode.postMessage({ command: 'startSync' });
            addLogEntry('Starting sync...', 'info');
          }
          
          function stopSync() {
            vscode.postMessage({ command: 'stopSync' });
            addLogEntry('Stopping sync...', 'info');
          }
          
          function refresh() {
            vscode.postMessage({ command: 'refresh' });
            addLogEntry('Refreshing dashboard...', 'info');
          }
          
          function addLogEntry(message, type = 'info') {
            const logContainer = document.getElementById('logContainer');
            const entry = document.createElement('div');
            entry.className = \`log-entry \${type}\`;
            entry.textContent = \`[\${new Date().toLocaleTimeString()}] \${message}\`;
            logContainer.appendChild(entry);
            logContainer.scrollTop = logContainer.scrollHeight;
          }
          
          function updateStatus(connected) {
            const indicator = document.getElementById('statusIndicator');
            const statusText = document.getElementById('statusText');
            
            if (connected) {
              indicator.className = 'status-indicator status-connected';
              statusText.textContent = 'Connected';
            } else {
              indicator.className = 'status-indicator status-disconnected';
              statusText.textContent = 'Disconnected';
            }
          }
          
          function updateInfo(data) {
            if (data.localFolder) {
              document.getElementById('localFolder').textContent = data.localFolder;
            }
            if (data.filesSynced !== undefined) {
              document.getElementById('filesSynced').textContent = data.filesSynced;
            }
            if (data.lastSync) {
              document.getElementById('lastSync').textContent = data.lastSync;
            }
          }
          
          // Listen for messages from the extension
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
              case 'updateStatus':
                updateStatus(message.connected);
                break;
              case 'updateInfo':
                updateInfo(message.data);
                break;
              case 'addLog':
                addLogEntry(message.message, message.type);
                break;
            }
          });
        </script>
      </body>
      </html>
    `;
  }
}
