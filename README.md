# My Sync Extension

This is a prototype VSCode Extension that syncs a local folder on macOS (client)
with a Windows machine (server) over a LAN using WebSocket.

## Overview

- `server.js` (Node.js + WebSocket) runs on the Windows machine.
- `extension.js` is the VSCode Extension (macOS side) that sends files to the server.
- Uses simple timestamp checking for conflict detection.

## Requirements

- Node.js installed on the Windows machine (Server)
- Visual Studio Code on the macOS machine (Client)

## How to Build & Run

1. **Install dependencies**:
   ```bash
   cd my-sync-extension
   npm install
   ```

2. **Start the server (Windows)**:
   ```bash
   npm run start-server
   ```
   - This will run `server.js` on port 3000.

3. **Install the extension (macOS)**:
   - From VSCode, open this folder (my-sync-extension).
   - Press `F5` in VSCode to run the extension in a new Extension Development Host.
   - Alternatively, package the extension with `vsce` or another method if desired.

4. **Activate the extension**:
   - In the new VSCode window (Extension Development Host), open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).
   - Run `My Sync Extension: Start Sync`.
   - Select the folder you wish to sync.
   - Enter the server address (e.g., `192.168.1.10:3000`).

5. **Test the sync**:
   - Any file saved in the chosen folder on macOS will be sent to Windows server.
   - If the server or another client updates the file, you will receive those updates in macOS.

## Notes

- This example uses a simple timestamp-based conflict check.
- A more sophisticated approach (CRDT, OT) would be needed for real-time concurrent editing.
- The folder `synced-folder` is generated on the Windows side to store synced files.
- `.gitignore` is set to ignore `node_modules` and `synced-folder`.

Enjoy coding!
#   a o f - e x t e n s i o n  
 