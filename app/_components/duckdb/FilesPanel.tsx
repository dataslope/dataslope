"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import { AlertDialog } from "@base-ui-components/react/alert-dialog";
import { ContextMenu } from "@base-ui-components/react/context-menu";
import { Dialog } from "@base-ui-components/react/dialog";
import {
  Upload,
  Download,
  Trash2,
  Pencil,
  FolderPlus,
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Info,
} from "lucide-react";

export interface VirtualFile {
  /** Slash-separated path, e.g. "data/sales.csv". The leading "/" is
   *  implicit — paths are always relative to the virtual filesystem root. */
  path: string;
  /** Size in bytes (0 for folders). */
  size: number;
  /** Folders are tracked as zero-byte entries so the tree can hold
   *  empty directories. */
  isFolder: boolean;
}

interface TreeNode {
  name: string;
  fullPath: string;
  isFolder: boolean;
  size: number;
  children: TreeNode[];
}

interface FilesPanelProps {
  files: VirtualFile[];
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onUpload: (files: FileList, parentPath: string) => void;
  onDownload: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (path: string, newName: string) => void;
  onCreateFolder: (parentPath: string, name: string) => void;
  onMove: (sourcePath: string, destFolderPath: string) => void;
}

function buildTree(files: VirtualFile[]): TreeNode {
  const root: TreeNode = {
    name: "",
    fullPath: "",
    isFolder: true,
    size: 0,
    children: [],
  };
  const folderMap = new Map<string, TreeNode>();
  folderMap.set("", root);

  for (const file of files) {
    const segments = file.path.split("/").filter(Boolean);
    let parent = root;
    let cur = "";
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      cur = cur ? `${cur}/${seg}` : seg;
      const isLast = i === segments.length - 1;
      const isLeafFolder = isLast && file.isFolder;
      const isLeafFile = isLast && !file.isFolder;
      let node = folderMap.get(cur);
      if (!node) {
        node = {
          name: seg,
          fullPath: cur,
          isFolder: !isLeafFile,
          size: isLeafFile ? file.size : 0,
          children: [],
        };
        parent.children.push(node);
        if (node.isFolder || isLeafFolder) folderMap.set(cur, node);
      }
      parent = node;
    }
  }

  const sortRec = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortRec);
  };
  sortRec(root);
  return root;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

interface PendingDelete {
  path: string;
  isFolder: boolean;
  childCount: number;
}

interface InfoTarget {
  path: string;
  isFolder: boolean;
  size: number;
  childCount: number;
}

interface TreeRowProps {
  node: TreeNode;
  depth: number;
  expandedFolders: Set<string>;
  selectedPath: string | null;
  renamingPath: string | null;
  renameValue: string;
  dropTargetPath: string | null;
  onSelect: (path: string) => void;
  onToggleFolder: (path: string) => void;
  onStartRename: (path: string) => void;
  onRenameChange: (v: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onDownload: (path: string) => void;
  onRequestDelete: (node: TreeNode) => void;
  onRequestInfo: (node: TreeNode) => void;
  onDragStart: (path: string) => void;
  onDragEnd: () => void;
  onDragOverFolder: (path: string) => void;
  onDragLeaveFolder: (path: string) => void;
  onDropOnFolder: (path: string) => void;
}

function TreeRow({
  node,
  depth,
  expandedFolders,
  selectedPath,
  renamingPath,
  renameValue,
  dropTargetPath,
  onSelect,
  onToggleFolder,
  onStartRename,
  onRenameChange,
  onCommitRename,
  onCancelRename,
  onDownload,
  onRequestDelete,
  onRequestInfo,
  onDragStart,
  onDragEnd,
  onDragOverFolder,
  onDragLeaveFolder,
  onDropOnFolder,
}: TreeRowProps) {
  const isExpanded = expandedFolders.has(node.fullPath);
  const isSelected = selectedPath === node.fullPath;
  const isRenaming = renamingPath === node.fullPath;
  const isDropTarget = dropTargetPath === node.fullPath;
  const rowClass = [
    "sql-files-row",
    isSelected && "sql-files-row-selected",
    isDropTarget && "sql-files-row-drop-target",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger
          render={(triggerProps) => (
            <div
              {...triggerProps}
              className={rowClass}
              style={{ paddingLeft: 8 + depth * 14 }}
              draggable={!isRenaming}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", node.fullPath);
                onDragStart(node.fullPath);
              }}
              onDragEnd={() => onDragEnd()}
              onDragOver={(e) => {
                if (!node.isFolder) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                onDragOverFolder(node.fullPath);
              }}
              onDragLeave={() => {
                if (node.isFolder) onDragLeaveFolder(node.fullPath);
              }}
              onDrop={(e) => {
                if (!node.isFolder) return;
                e.preventDefault();
                e.stopPropagation();
                onDropOnFolder(node.fullPath);
              }}
              onClick={() => {
                if (node.isFolder) onToggleFolder(node.fullPath);
                onSelect(node.fullPath);
              }}
            >
              {node.isFolder ? (
                isExpanded ? (
                  <ChevronDown
                    size={11}
                    aria-hidden="true"
                    className="sql-files-chevron"
                  />
                ) : (
                  <ChevronRight
                    size={11}
                    aria-hidden="true"
                    className="sql-files-chevron"
                  />
                )
              ) : (
                <span
                  className="sql-files-chevron-spacer"
                  aria-hidden="true"
                />
              )}
              {node.isFolder ? (
                isExpanded ? (
                  <FolderOpen
                    size={12}
                    aria-hidden="true"
                    className="sql-files-icon"
                  />
                ) : (
                  <Folder
                    size={12}
                    aria-hidden="true"
                    className="sql-files-icon"
                  />
                )
              ) : (
                <FileText
                  size={12}
                  aria-hidden="true"
                  className="sql-files-icon"
                />
              )}
              {isRenaming ? (
                <input
                  type="text"
                  className="sql-files-rename-input"
                  value={renameValue}
                  autoFocus
                  onChange={(e) => onRenameChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCommitRename();
                    if (e.key === "Escape") onCancelRename();
                  }}
                  onBlur={onCommitRename}
                />
              ) : (
                <span className="sql-files-name" title={node.fullPath}>
                  {node.name}
                </span>
              )}
              {!isRenaming && !node.isFolder && (
                <span className="sql-files-size">{formatSize(node.size)}</span>
              )}
            </div>
          )}
        />
        <ContextMenu.Portal>
          <ContextMenu.Positioner sideOffset={4}>
            <ContextMenu.Popup className="bui-popup examples-dropdown sql-files-ctx-menu">
              {!node.isFolder && (
                <ContextMenu.Item
                  className="example-item"
                  onClick={() => onDownload(node.fullPath)}
                >
                  <Download size={12} aria-hidden="true" />
                  <div className="ex-title">Download</div>
                </ContextMenu.Item>
              )}
              <ContextMenu.Item
                className="example-item"
                onClick={() => onStartRename(node.fullPath)}
              >
                <Pencil size={12} aria-hidden="true" />
                <div className="ex-title">Rename</div>
              </ContextMenu.Item>
              <ContextMenu.Item
                className="example-item"
                onClick={() => onRequestInfo(node)}
              >
                <Info size={12} aria-hidden="true" />
                <div className="ex-title">
                  {node.isFolder ? "Folder info" : "File info"}
                </div>
              </ContextMenu.Item>
              <div className="sql-files-ctx-sep" role="separator" />
              <ContextMenu.Item
                className="example-item sql-files-ctx-danger"
                onClick={() => onRequestDelete(node)}
              >
                <Trash2 size={12} aria-hidden="true" />
                <div className="ex-title">Delete</div>
              </ContextMenu.Item>
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>
      {node.isFolder &&
        isExpanded &&
        node.children.map((child) => (
          <TreeRow
            key={child.fullPath}
            node={child}
            depth={depth + 1}
            expandedFolders={expandedFolders}
            selectedPath={selectedPath}
            renamingPath={renamingPath}
            renameValue={renameValue}
            dropTargetPath={dropTargetPath}
            onSelect={onSelect}
            onToggleFolder={onToggleFolder}
            onStartRename={onStartRename}
            onRenameChange={onRenameChange}
            onCommitRename={onCommitRename}
            onCancelRename={onCancelRename}
            onDownload={onDownload}
            onRequestDelete={onRequestDelete}
            onRequestInfo={onRequestInfo}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOverFolder={onDragOverFolder}
            onDragLeaveFolder={onDragLeaveFolder}
            onDropOnFolder={onDropOnFolder}
          />
        ))}
    </>
  );
}

export function FilesPanel({
  files,
  expandedFolders,
  onToggleFolder,
  onUpload,
  onDownload,
  onDelete,
  onRename,
  onCreateFolder,
  onMove,
}: FilesPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newFolderActive, setNewFolderActive] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const [infoTarget, setInfoTarget] = useState<InfoTarget | null>(null);
  const [externalDragging, setExternalDragging] = useState(false);
  const [internalDragPath, setInternalDragPath] = useState<string | null>(null);
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);
  const dragCounterRef = useRef(0);

  const tree = useMemo(() => buildTree(files), [files]);

  // Determine the parent path where new items should land. If a folder
  // is selected, uploads/new folders go inside it; if a file is selected,
  // they land alongside it; otherwise they land at the root.
  const parentPath = useMemo(() => {
    if (!selectedPath) return "";
    const node = files.find((f) => f.path === selectedPath);
    if (node?.isFolder) return selectedPath;
    const lastSlash = selectedPath.lastIndexOf("/");
    return lastSlash >= 0 ? selectedPath.slice(0, lastSlash) : "";
  }, [selectedPath, files]);

  const countDescendants = useCallback(
    (path: string) => {
      const prefix = `${path}/`;
      return files.filter((f) => f.path.startsWith(prefix)).length;
    },
    [files],
  );

  const handleStartRename = useCallback((path: string) => {
    const lastSlash = path.lastIndexOf("/");
    setRenameValue(lastSlash >= 0 ? path.slice(lastSlash + 1) : path);
    setRenamingPath(path);
  }, []);

  const handleCommitRename = useCallback(() => {
    if (!renamingPath) return;
    const trimmed = renameValue.trim();
    if (trimmed && !trimmed.includes("/")) {
      const lastSlash = renamingPath.lastIndexOf("/");
      const newPath =
        lastSlash >= 0
          ? `${renamingPath.slice(0, lastSlash + 1)}${trimmed}`
          : trimmed;
      if (newPath !== renamingPath) {
        onRename(renamingPath, newPath);
      }
    }
    setRenamingPath(null);
    setRenameValue("");
  }, [renamingPath, renameValue, onRename]);

  const handleCancelRename = useCallback(() => {
    setRenamingPath(null);
    setRenameValue("");
  }, []);

  const handleCommitNewFolder = useCallback(() => {
    const trimmed = newFolderName.trim();
    if (trimmed && !trimmed.includes("/")) {
      onCreateFolder(parentPath, trimmed);
    }
    setNewFolderActive(false);
    setNewFolderName("");
  }, [newFolderName, parentPath, onCreateFolder]);

  const handleRequestDelete = useCallback(
    (node: TreeNode) => {
      setPendingDelete({
        path: node.fullPath,
        isFolder: node.isFolder,
        childCount: node.isFolder ? countDescendants(node.fullPath) : 0,
      });
    },
    [countDescendants],
  );

  const handleConfirmDelete = useCallback(() => {
    if (pendingDelete) onDelete(pendingDelete.path);
    setPendingDelete(null);
  }, [pendingDelete, onDelete]);

  const handleRequestInfo = useCallback(
    (node: TreeNode) => {
      setInfoTarget({
        path: node.fullPath,
        isFolder: node.isFolder,
        size: node.size,
        childCount: node.isFolder ? countDescendants(node.fullPath) : 0,
      });
    },
    [countDescendants],
  );

  // ─── Drag-and-drop wiring ───────────────────────────────────────────
  // External drops (OS file drops) are accepted at the panel level. The
  // dragCounter pattern keeps the `external dragging` UI from flickering
  // as the cursor crosses nested child elements.
  const handlePanelDragEnter = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    setExternalDragging(true);
  }, []);

  const handlePanelDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setExternalDragging(false);
    }
  }, []);

  const handlePanelDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handlePanelDrop = useCallback(
    (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      dragCounterRef.current = 0;
      setExternalDragging(false);
      if (e.dataTransfer.files.length > 0) {
        onUpload(e.dataTransfer.files, parentPath);
      }
    },
    [onUpload, parentPath],
  );

  const handleInternalDragStart = useCallback((path: string) => {
    setInternalDragPath(path);
  }, []);

  const handleInternalDragEnd = useCallback(() => {
    setInternalDragPath(null);
    setDropTargetPath(null);
  }, []);

  const handleDragOverFolder = useCallback(
    (path: string) => {
      if (!internalDragPath) return;
      // Block dropping an entry into itself or into one of its own
      // descendants (would create a cycle / orphan).
      if (path === internalDragPath) return;
      if (path.startsWith(`${internalDragPath}/`)) return;
      setDropTargetPath(path);
    },
    [internalDragPath],
  );

  const handleDragLeaveFolder = useCallback((path: string) => {
    setDropTargetPath((prev) => (prev === path ? null : prev));
  }, []);

  const handleDropOnFolder = useCallback(
    (path: string) => {
      if (!internalDragPath) return;
      if (path === internalDragPath) return;
      if (path.startsWith(`${internalDragPath}/`)) return;
      onMove(internalDragPath, path);
      setInternalDragPath(null);
      setDropTargetPath(null);
    },
    [internalDragPath, onMove],
  );

  // Drop on empty area or root = move to root
  const handleRootDrop = useCallback(
    (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes("Files")) return;
      if (!internalDragPath) return;
      e.preventDefault();
      // Only fire if the drop landed on the bare tree container (not on
      // a child row that already handled it).
      if (e.target !== e.currentTarget) return;
      onMove(internalDragPath, "");
      setInternalDragPath(null);
      setDropTargetPath(null);
    },
    [internalDragPath, onMove],
  );

  return (
    <div
      className={`sql-files${externalDragging ? " sql-files-dragging" : ""}`}
      onDragEnter={handlePanelDragEnter}
      onDragOver={handlePanelDragOver}
      onDragLeave={handlePanelDragLeave}
      onDrop={handlePanelDrop}
    >
      <div className="sql-files-toolbar">
        <button
          type="button"
          className="sql-files-toolbar-btn"
          title="Upload files"
          aria-label="Upload files"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={12} aria-hidden="true" />
          <span>Upload</span>
        </button>
        <button
          type="button"
          className="sql-files-toolbar-btn"
          title="New folder"
          aria-label="New folder"
          onClick={() => {
            setNewFolderActive(true);
            setNewFolderName("");
          }}
        >
          <FolderPlus size={12} aria-hidden="true" />
          <span>New folder</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sql-files-hidden-input"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onUpload(e.target.files, parentPath);
              e.target.value = "";
            }
          }}
        />
      </div>
      {parentPath && (
        <div className="sql-files-target-hint">
          Adding to: <strong>{parentPath}/</strong>
        </div>
      )}
      <div
        className="sql-files-tree"
        onDragOver={(e) => {
          if (internalDragPath && !e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }
        }}
        onDrop={handleRootDrop}
      >
        {newFolderActive && (
          <div className="sql-files-row" style={{ paddingLeft: 8 }}>
            <span className="sql-files-chevron-spacer" aria-hidden="true" />
            <Folder size={12} aria-hidden="true" className="sql-files-icon" />
            <input
              type="text"
              className="sql-files-rename-input"
              value={newFolderName}
              autoFocus
              placeholder="folder name"
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCommitNewFolder();
                if (e.key === "Escape") {
                  setNewFolderActive(false);
                  setNewFolderName("");
                }
              }}
              onBlur={handleCommitNewFolder}
            />
          </div>
        )}
        {tree.children.length === 0 && !newFolderActive ? (
          <div className="sql-files-empty">
            No files yet.
            <br />
            <span className="sql-files-empty-hint">
              Drop files here or click Upload to add them.
            </span>
          </div>
        ) : (
          tree.children.map((child) => (
            <TreeRow
              key={child.fullPath}
              node={child}
              depth={0}
              expandedFolders={expandedFolders}
              selectedPath={selectedPath}
              renamingPath={renamingPath}
              renameValue={renameValue}
              dropTargetPath={dropTargetPath}
              onSelect={setSelectedPath}
              onToggleFolder={onToggleFolder}
              onStartRename={handleStartRename}
              onRenameChange={setRenameValue}
              onCommitRename={handleCommitRename}
              onCancelRename={handleCancelRename}
              onDownload={onDownload}
              onRequestDelete={handleRequestDelete}
              onRequestInfo={handleRequestInfo}
              onDragStart={handleInternalDragStart}
              onDragEnd={handleInternalDragEnd}
              onDragOverFolder={handleDragOverFolder}
              onDragLeaveFolder={handleDragLeaveFolder}
              onDropOnFolder={handleDropOnFolder}
            />
          ))
        )}
      </div>

      <AlertDialog.Root
        open={pendingDelete !== null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="confirm-backdrop" />
          <AlertDialog.Popup className="confirm-popup">
            <AlertDialog.Title className="confirm-title">
              Delete {pendingDelete?.isFolder ? "folder" : "file"}?
            </AlertDialog.Title>
            <AlertDialog.Description className="confirm-desc">
              {pendingDelete?.isFolder ? (
                <>
                  This will permanently delete <strong>{pendingDelete?.path}</strong>
                  {pendingDelete && pendingDelete.childCount > 0 ? (
                    <>
                      {" "}and the {pendingDelete.childCount} item
                      {pendingDelete.childCount === 1 ? "" : "s"} it
                      contains
                    </>
                  ) : (
                    ""
                  )}
                  . This action can&rsquo;t be undone.
                </>
              ) : (
                <>
                  This will permanently delete{" "}
                  <strong>{pendingDelete?.path}</strong>. This action
                  can&rsquo;t be undone.
                </>
              )}
            </AlertDialog.Description>
            <div className="confirm-actions">
              <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                Cancel
              </AlertDialog.Close>
              <AlertDialog.Close
                className="confirm-btn confirm-btn-danger"
                onClick={handleConfirmDelete}
              >
                Delete
              </AlertDialog.Close>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <Dialog.Root
        open={infoTarget !== null}
        onOpenChange={(next) => {
          if (!next) setInfoTarget(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="confirm-backdrop" />
          <Dialog.Popup className="confirm-popup sql-files-info-popup">
            <Dialog.Title className="confirm-title">
              {infoTarget?.isFolder ? "Folder info" : "File info"}
            </Dialog.Title>
            <div className="sql-files-info-grid">
              <div className="sql-files-info-label">Name</div>
              <div className="sql-files-info-value">
                {infoTarget?.path.split("/").pop()}
              </div>
              <div className="sql-files-info-label">Path</div>
              <div className="sql-files-info-value sql-files-info-path">
                {infoTarget?.path}
              </div>
              <div className="sql-files-info-label">Kind</div>
              <div className="sql-files-info-value">
                {infoTarget?.isFolder ? "Folder" : "File"}
              </div>
              {infoTarget?.isFolder ? (
                <>
                  <div className="sql-files-info-label">Contents</div>
                  <div className="sql-files-info-value">
                    {infoTarget.childCount} item
                    {infoTarget.childCount === 1 ? "" : "s"}
                  </div>
                </>
              ) : (
                <>
                  <div className="sql-files-info-label">Size</div>
                  <div className="sql-files-info-value">
                    {formatSize(infoTarget?.size ?? 0)}
                  </div>
                </>
              )}
            </div>
            <div className="confirm-actions">
              <Dialog.Close className="confirm-btn confirm-btn-secondary">
                Close
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
