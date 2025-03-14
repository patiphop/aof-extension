# My Sync Extension (Version 0.0.6)

This VSCode Extension syncs files from a chosen folder on macOS (Client) to a
Windows machine (Server) over a LAN, with proper subfolder handling. It also
ignores the following paths:
- Any folder/file under `node_modules`
- Any folder/file under `.git`
- Any `.png` files

Additionally, it provides a "Stop Sync" command that clears all data on the
server side.

## Main Features

1. **Full subfolder sync**: Files are stored with the same subfolder structure on both client and server.
2. **Path normalization**: Uses forward slashes in messages to avoid unwanted concatenations. Converts back to OS-specific separators when writing files.
3. **Ignore certain files**:
   - Skips any files or folders under `node_modules`.
   - Skips any `.png` files.
   - Skips any `.git` folders.
4. **Stop Sync Command**:
   - Removes all files in `synced-folder` on the server when invoked.
   - Closes the WebSocket connection on the client.

## Setup Instructions

1. **Install Dependencies**  
   On both Windows and macOS side (in the `my-sync-extension` folder):
   ```
   npm install
   ```
   This installs required libraries (`ws` and `chokidar`).

2. **Run the Server (Windows)**  
   ```
   npm run start-server
   ```
   This executes `server.js`, starting a WebSocket server on ws://192.168.1.105:1420.

3. **Install the Extension (macOS)**  
   - Open `my-sync-extension` folder in VSCode.
   - Press `F5` or use the Command Palette (`Cmd+Shift+P`) with "Debug: Start Debugging" to launch an Extension Development Host.

4. **Start Sync (macOS)**  
   - In the new Extension Development Host window, open the Command Palette and select:
     - `My Sync Extension: Start Sync`
   - Choose a local folder to sync.
   - The extension automatically connects to `ws://192.168.1.105:1420`.
   - It uploads all files, ignoring `.png`, `node_modules`, and `.git`.

5. **Stop Sync**  
   - Use `My Sync Extension: Stop Sync` from the Command Palette.
   - This will clear the `synced-folder` on the server and close the connection.

6. **Editing flow**:
   - **Edit in client**: When you save a file in the chosen folder (that isn't ignored), it's uploaded to the server.  
   - **Edit in server**: If the file is changed in `synced-folder` (or created/deleted), the server notifies the client and the local file is updated/removed accordingly.

7. **Test**  
   - Save any file in the chosen folder on macOS (outside ignored patterns). It uploads to Windows.
   - If a file changes or is deleted on the server side, the server notifies macOS to update or remove the local file.

## Notes

- No complex conflict handling; the newest file overwrites the older copy.
- If the server or user deletes a file in `synced-folder`, the extension removes it locally (unless it's a .png or inside a .git folder, which are ignored).
- Ensure Windows has IP 192.168.1.105 in your LAN or adjust code accordingly.
- Path normalization ensures subfolders are preserved correctly between client and server.
