# 🔄 faizSync Extension

A powerful VSCode extension for real-time file synchronization with WebSocket support, featuring .gitignore parsing, binary file filtering, and a beautiful WebView dashboard.

## ✨ Features

- **🔄 Bidirectional Real-time Sync**: Full two-way synchronization between host and clients
- **📁 File Watcher Integration**: Server detects local file changes and broadcasts to all clients
- **🛡️ Conflict Resolution**: Handles simultaneous file modifications with versioning
- **📋 Gitignore Support**: Automatically respects .gitignore patterns (including subdirectories)
- **🔍 Binary File Filtering**: Only syncs text files, excludes images and binary files
- **👥 Multiple Client Support**: Multiple VSCode instances can sync to the same server
- **📊 WebView Dashboard**: Beautiful interface to monitor sync status and activity
- **⚡ Real-time Updates**: Instant file synchronization across all connected clients
- **🔄 Version Control**: File versioning prevents data loss during conflicts

## 🏗️ Architecture

The extension follows a clean, modular architecture:

```
src/
├── extension.ts              # Main VSCode extension entry point
├── services/
│   ├── SyncManager.ts        # Coordinates file scanning and WebSocket communication
│   └── WebSocketClient.ts    # Handles WebSocket connection and messaging
├── utils/
│   ├── FileScanner.ts        # Scans files and filters binary content
│   └── GitignoreParser.ts    # Parses .gitignore files and patterns
└── webview/
    └── WebViewProvider.ts    # Provides the WebView dashboard interface
```

## 🚀 Installation

### Prerequisites

- Node.js 18+ 
- VSCode 1.74+
- WebSocket server running on `192.168.1.105:1420`

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd faizsync-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run compile
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Package for distribution**
   ```bash
   npm run build
   ```

## 📖 Usage

### Commands

The extension provides three main commands:

1. **Start faizSync** (`faizsync.startSync`)
   - Prompts to select a local folder
   - Establishes WebSocket connection
   - Performs initial sync of all files
   - Sets up file watchers for real-time updates

2. **Stop faizSync** (`faizsync.stopSync`)
   - Stops the sync process
   - Sends clear folder message to server
   - Disconnects from WebSocket

3. **Open faizSync WebView** (`faizsync.openWebView`)
   - Opens the dashboard interface
   - Shows sync status and activity log
   - Provides buttons to control sync

### Bidirectional Sync Flow

The system now supports true bidirectional synchronization:

1. **Client → Server**: When you modify a file in VSCode, it's immediately sent to the server
2. **Server → Client**: When files are modified on the server (or by other clients), all connected clients receive the updates
3. **File Watcher**: The server monitors its local file system and broadcasts changes to all clients
4. **Conflict Resolution**: When simultaneous changes occur, the system uses versioning to prevent data loss

### Example Workflow

```
Client A (VSCode) ←→ Server ←→ Client B (VSCode)
       ↓                    ↓                    ↓
   Edit file.txt    File watcher detects    Receives update
   Save changes      change and broadcasts   Updates local file
   Sends to server   to all clients         Shows notification
```

### Conflict Handling

When multiple clients modify the same file simultaneously:

1. **Version Detection**: Each file change includes a version number
2. **Conflict Warning**: System logs warnings when conflicts are detected
3. **Server Wins**: Currently, server changes take precedence (configurable)
4. **No Data Loss**: All changes are preserved in the versioning system

### File Filtering

The extension automatically filters files based on:

**Text Files (Included):**
- Source code files: `.js`, `.ts`, `.py`, `.java`, `.cpp`, etc.
- Configuration files: `.json`, `.yaml`, `.toml`, `.env`, etc.
- Documentation: `.md`, `.txt`, `.rst`, etc.
- Build files: `Dockerfile`, `Makefile`, `package.json`, etc.

**Binary Files (Excluded):**
- Images: `.png`, `.jpg`, `.gif`, `.svg`, etc.
- Executables: `.exe`, `.dll`, `.so`, `.dylib`, etc.
- Archives: `.zip`, `.tar`, `.rar`, etc.
- Databases: `.db`, `.sqlite`, etc.

### Gitignore Support

The extension respects `.gitignore` patterns:
- Reads `.gitignore` files from root and subdirectories
- Supports negated patterns (e.g., `!important.log`)
- Handles directory patterns (e.g., `node_modules/`)
- Applies patterns recursively

## 🧪 Testing

The project includes comprehensive unit tests:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

- **GitignoreParser**: Tests for pattern parsing and file matching
- **FileScanner**: Tests for file scanning and binary filtering
- **WebSocketClient**: Tests for connection and messaging
- **SyncManager**: Tests for sync coordination and file operations

## 🔧 Development

### Project Structure

```
faizsync-extension/
├── src/                     # TypeScript source code
├── tests/                   # Unit tests
├── dist/                    # Compiled JavaScript (generated)
├── package.json            # Project configuration
├── tsconfig.json           # TypeScript configuration
├── vitest.config.ts        # Test configuration
└── README.md               # This file
```

### Key Components

#### GitignoreParser
- Parses `.gitignore` content into patterns
- Supports negated patterns and directory matching
- Loads patterns from multiple directories

#### FileScanner
- Recursively scans directories
- Filters files based on extensions and names
- Respects gitignore patterns
- Returns only text files

#### WebSocketClient
- Manages WebSocket connection to server
- Handles reconnection with exponential backoff
- Sends structured messages for file operations
- Emits events for connection state changes

#### SyncManager
- Coordinates file scanning and WebSocket communication
- Handles initial sync and real-time updates
- Manages file operations (create, update, delete)
- Emits events for sync state changes

#### WebViewProvider
- Provides beautiful dashboard interface
- Shows sync status and activity log
- Allows user interaction with sync controls
- Uses VSCode theming for consistent appearance

### Building

```bash
# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Lint code
npm run lint
```

## 📋 Requirements

### Functional Requirements

1. **File Synchronization**
   - [x] Read .gitignore files (including subdirectories)
   - [x] Filter binary files and images
   - [x] Sync only text files and source code
   - [x] **🔄 Bidirectional synchronization (Client ↔ Server)**
   - [x] **📁 Server file watcher integration**
   - [x] **🛡️ Conflict resolution with versioning**
   - [x] Real-time file watching

2. **WebSocket Communication**
   - [x] Connect to hardcoded server `192.168.1.105:1420`
   - [x] Support multiple clients
   - [x] Handle connection errors and reconnection
   - [x] **📡 Server-to-client broadcast messaging**
   - [x] **📨 Enhanced message types (FILE_CREATED, FILE_CHANGED, FILE_DELETED)**
   - [x] Structured message protocol

3. **User Interface**
   - [x] VSCode commands for sync control
   - [x] WebView dashboard with status monitoring
   - [x] Activity log and error reporting
   - [x] **🔔 Real-time sync notifications**
   - [x] User-friendly notifications

4. **Git Integration**
   - [x] Parse and respect .gitignore patterns
   - [x] Support for git history synchronization
   - [x] Handle git-related file operations

### Technical Requirements

1. **Architecture**
   - [x] Clean, modular design
   - [x] One class per file
   - [x] Separation of concerns
   - [x] Event-driven communication

2. **Testing**
   - [x] Comprehensive unit tests
   - [x] Test coverage for all components
   - [x] Mocked dependencies
   - [x] TDD approach

3. **Build System**
   - [x] TypeScript compilation
   - [x] VSCode extension packaging
   - [x] Development and production builds
   - [x] Linting and formatting

## 🐛 Troubleshooting

### Common Issues

1. **Connection Failed**
   - Ensure WebSocket server is running on `192.168.1.105:1420`
   - Check network connectivity
   - Verify firewall settings

2. **Files Not Syncing**
   - Check if files are in .gitignore
   - Verify files are text-based (not binary)
   - Ensure files are within the selected sync folder

3. **Extension Not Loading**
   - Check VSCode version compatibility
   - Verify TypeScript compilation
   - Check extension logs in VSCode

### Logging Configuration

The extension uses a configurable logging system to reduce log noise:

- **Quiet Mode** (Default): Shows only warnings, errors, and connection events
- **Verbose Mode**: Shows all logs including file sync operations
- **Custom Configuration**: Adjust log levels and categories as needed

See [LOGGING.md](./LOGGING.md) for detailed configuration options.

### Debug Mode

Enable debug logging by setting the log level in VSCode:
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "Developer: Set Log Level"
3. Select "Trace" for detailed logging

Or modify the logging configuration in the extension code:
```typescript
logger.setConfig({
  level: LogLevel.DEBUG,
  showFileSync: true,
  showConnection: true,
  showDebug: true
});
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

## 🙏 Acknowledgments

- VSCode Extension API for the development framework
- WebSocket protocol for real-time communication
- Git for the .gitignore specification
- Vitest for the testing framework

---

**faizSync Extension** - Making file synchronization simple and reliable! 🔄
