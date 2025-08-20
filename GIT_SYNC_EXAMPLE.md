# Git Folder Sync Example

This document demonstrates how to use the git folder sync feature in faizSync extension.

## Prerequisites

1. Install the faizSync extension in VS Code
2. Start the faizSync server (see server documentation)
3. Have a git repository with multiple branches

## Git Folder Sync Feature

The extension now supports syncing the `.git` folder by default, enabling complete git functionality including branch switching on the host machine. Git folder sync is automatically enabled for all sync operations.

### What gets synced from .git folder:

#### Essential Git Files (Root Directory)
- **Git configuration files**: `HEAD`, `config`, `description`
- **Reference files**: `packed-refs`, `FETCH_HEAD`, `ORIG_HEAD`
- **Index file**: `index` (binary file essential for git status)
- **Merge and rebase files**: `MERGE_HEAD`, `REBASE_HEAD`, `MERGE_MSG`, etc.
- **Bisect files**: `BISECT_LOG`, `BISECT_NAMES`, `BISECT_RUN`, etc.

#### Git Directories (Complete Sync)
- **`objects/`** - Complete git object database (commits, trees, blobs)
- **`refs/`** - All branch and tag references
- **`info/`** - Git repository information
- **`hooks/`** - Git hooks (text files only)
- **`logs/`** - Git operation logs

#### Binary Files Included
- **Index files**: `index` (essential for `git status`)
- **Pack files**: `pack-*.idx`, `pack-*.pack` (compressed objects)
- **Lock files**: `*.lock` (for git operations)
- **All object files**: Complete git object database

### What's excluded:

- **Temporary files**: Files created during git operations that are automatically cleaned up
- **Large log files**: Very large log files that might impact performance
- **System-specific files**: Files that are machine-specific

### Enhanced Git Functionality

With the enhanced git folder sync, you can now:

1. **Use `git status`** - Index file is synced, so git status works correctly
2. **Switch branches** - All branch references are synced
3. **View commit history** - Object database is synced
4. **Use git commands** - Most git commands work as expected
5. **View file changes** - Git can track changes properly
6. **Merge and rebase** - Git operation files are synced

This comprehensive syncing ensures that git operations work seamlessly across all connected machines.

## Usage Steps

### 1. Start Sync (Git Folder Sync is Automatic)

1. Open VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) to open command palette
3. Type "faizSync: Start Sync" and select it
4. Choose the folder containing your git repository
5. Sync will automatically include the .git folder for complete git functionality

### 2. Switch Branches on Host Machine

Once sync is active:

1. On the host machine, open terminal in the synced folder
2. Switch to a different branch:
   ```bash
   git checkout feature-branch
   ```
3. The branch change will be synced to all connected clients
4. On client machines, you can now switch to the same branch:
   ```bash
   git checkout feature-branch
   ```

### 3. Verify Sync Status

- Check the VS Code status bar for sync status
- Open the WebView dashboard to see sync activity
- Monitor the output panel for sync logs

## Example Scenarios

### Scenario 1: Development Team Collaboration

**Setup:**
- Developer A: Host machine with git repository
- Developer B: Client machine connected via faizSync

**Workflow:**
1. Developer A starts sync (git folder sync is automatic)
2. Developer B connects and receives all project files + git metadata
3. Developer A switches to `feature/login` branch
4. Developer B can now switch to the same branch and see all changes
5. Both developers can work on the same branch simultaneously

### Scenario 2: Code Review Process

**Setup:**
- Reviewer: Host machine with main repository
- Author: Client machine with feature branch

**Workflow:**
1. Reviewer starts sync (git folder sync is automatic)
2. Author connects and syncs their feature branch
3. Reviewer can switch to author's branch to review code
4. Changes are synced in real-time during review process

## Important Notes

### Performance Considerations

- Git folder sync includes only essential text files
- Binary files (objects, packs) are excluded to maintain performance
- Large repositories may take longer for initial sync

### Security Considerations

- Git folder sync includes sensitive information like git config
- Ensure you trust all connected clients
- Consider using git folder sync only in trusted environments

### Limitations

- Git folder sync does not include the entire git history
- Some git operations may still require manual intervention
- Very large repositories may experience performance issues

## Troubleshooting

### Sync Not Working

1. Git folder sync is automatically enabled - no configuration needed
2. Verify server is running and accessible
3. Check network connectivity between host and clients
4. Review extension logs for error messages

### Branch Switching Issues

1. Git folder sync is automatically enabled for all sync operations
2. Check if .git folder exists in the synced directory
3. Verify git is properly installed on both machines
4. Try restarting the sync process

### Performance Issues

1. Consider disabling git folder sync for very large repositories
2. Check network bandwidth between machines
3. Monitor system resources during sync
4. Review sync logs for performance bottlenecks

## Configuration

### Extension Settings

The extension respects the following settings:

- `faizsync.serverUrl`: WebSocket server URL (default: ws://localhost:1420)
- Git folder sync is automatically enabled by default

### Server Configuration

The server supports the following environment variables:

- `PORT`: Server port (default: 1420)
- `BASE_DIR`: Base directory for synced files (default: ./synced-files)
- `LOG_LEVEL`: Logging level (default: INFO)
