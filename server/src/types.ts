export interface SyncMessage {
  type: string;
  payload?: any;
}

export interface FileSyncMessage extends SyncMessage {
  type: 'SYNC_FILE';
  payload: {
    relativePath: string;
    fileContent: string;
  };
}

export interface DeleteFileMessage extends SyncMessage {
  type: 'DELETE_FILE';
  payload: {
    relativePath: string;
  };
}

export interface ClearFolderMessage extends SyncMessage {
  type: 'CLEAR_FOLDER';
}

export interface FileUpdateMessage extends SyncMessage {
  type: 'FILE_UPDATED';
  payload: {
    relativePath: string;
    fileContent: string;
  };
}

export interface FileDeleteMessage extends SyncMessage {
  type: 'FILE_DELETED';
  payload: {
    relativePath: string;
  };
}

export interface FolderClearedMessage extends SyncMessage {
  type: 'FOLDER_CLEARED';
}

export interface ClientInfo {
  id: string;
  ws: any;
  isAlive: boolean;
  lastPing: number;
  folderPath?: string;
}

export interface FileInfo {
  relativePath: string;
  content: string;
  lastModified: number;
  lastClientId: string;
  version: number;
}

export interface FileCreatedMessage extends SyncMessage {
  type: 'FILE_CREATED';
  payload: {
    relativePath: string;
    fileContent: string;
    version: number;
  };
}

export interface FileChangedMessage extends SyncMessage {
  type: 'FILE_CHANGED';
  payload: {
    relativePath: string;
    fileContent: string;
    version: number;
  };
}
