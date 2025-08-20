import * as vscode from 'vscode';
import { SyncManager } from './services/SyncManager';
import { WebViewProvider } from './webview/WebViewProvider';
import { logger } from './utils/Logger';
import { quietLoggingConfig } from './config/logging';

let syncManager: SyncManager | null = null;
let webViewProvider: WebViewProvider | null = null;

export function activate(context: vscode.ExtensionContext) {
  // Set up logger for extension mode with quiet config
  logger.setExtensionMode(true);
  logger.setConfig(quietLoggingConfig);
  
  logger.extension('faizSync Extension is now active!');

  // Register commands
  const startSyncCmd = vscode.commands.registerCommand('faizsync.startSync', async () => {
    await startSync();
  });

  const stopSyncCmd = vscode.commands.registerCommand('faizsync.stopSync', async () => {
    await stopSync();
  });

  const openWebViewCmd = vscode.commands.registerCommand('faizsync.openWebView', () => {
    openWebView();
  });

  context.subscriptions.push(startSyncCmd, stopSyncCmd, openWebViewCmd);
}

export function deactivate() {
  if (syncManager) {
    syncManager.stopSync();
  }
}

/**
 * Start the sync process
 */
async function startSync(): Promise<void> {
  if (syncManager && syncManager.isSyncing()) {
    vscode.window.showInformationMessage('Sync is already active!');
    return;
  }

  try {
    // Prompt user to select local folder
    const folderUri = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select folder to sync'
    });

    if (!folderUri || folderUri.length === 0) {
      vscode.window.showErrorMessage('No folder selected.');
      return;
    }

    const localFolderPath = folderUri[0].fsPath;

    // Create sync manager with git folder sync enabled by default
    syncManager = new SyncManager(localFolderPath, true);

    // Set up event listeners
    setupSyncEventListeners();

    // Start sync
    await syncManager.startSync();

    vscode.window.showInformationMessage(`Sync started for folder: ${localFolderPath} (including .git folder)`);

    // Set up file watchers
    setupFileWatchers(localFolderPath);

  } catch (error) {
    logger.error('Error starting sync:', error);
    vscode.window.showErrorMessage(`Failed to start sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Stop the sync process
 */
async function stopSync(): Promise<void> {
  if (!syncManager || !syncManager.isSyncing()) {
    vscode.window.showInformationMessage('No active sync to stop.');
    return;
  }

  try {
    await syncManager.stopSync();
    syncManager = null;
    vscode.window.showInformationMessage('Sync stopped.');
  } catch (error) {
    logger.error('Error stopping sync:', error);
    vscode.window.showErrorMessage(`Failed to stop sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Open the WebView
 */
function openWebView(): void {
  if (!webViewProvider) {
    webViewProvider = new WebViewProvider();
  }

  webViewProvider.show();
}

/**
 * Set up event listeners for sync manager
 */
function setupSyncEventListeners(): void {
  if (!syncManager) return;

  syncManager.on('syncStarted', () => {
    vscode.window.showInformationMessage('Sync started successfully');
  });

  syncManager.on('syncStopped', () => {
    vscode.window.showInformationMessage('Sync stopped');
  });

  syncManager.on('connected', () => {
    vscode.window.showInformationMessage('Connected to sync server');
  });

  syncManager.on('disconnected', (code: number, reason: string) => {
    vscode.window.showWarningMessage(`Disconnected from sync server: ${reason}`);
  });

  syncManager.on('error', (error: Error) => {
    vscode.window.showErrorMessage(`Sync error: ${error.message}`);
  });

  syncManager.on('fileUpdated', (relativePath: string) => {
    vscode.window.showInformationMessage(`File updated from server: ${relativePath}`);
  });

  syncManager.on('fileDeleted', (relativePath: string) => {
    vscode.window.showInformationMessage(`File deleted from server: ${relativePath}`);
  });

  syncManager.on('folderCleared', () => {
    vscode.window.showInformationMessage('Server folder cleared');
  });
}

/**
 * Set up file watchers for VSCode workspace
 */
function setupFileWatchers(localFolderPath: string): void {
  if (!syncManager) return;

  // Watch for file saves
  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
  
  fileWatcher.onDidChange(async (uri) => {
    if (uri.fsPath.startsWith(localFolderPath)) {
      syncManager!.syncFile(uri.fsPath);
    }
  });

  fileWatcher.onDidCreate(async (uri) => {
    if (uri.fsPath.startsWith(localFolderPath)) {
      syncManager!.syncFile(uri.fsPath);
    }
  });

  fileWatcher.onDidDelete(async (uri) => {
    if (uri.fsPath.startsWith(localFolderPath)) {
      syncManager!.deleteFile(uri.fsPath);
    }
  });
}
