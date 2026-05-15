"use client";

import { useMemo, useState, useRef, useCallback } from "react";
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
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

interface TreeRowProps {
  node: TreeNode;
  depth: number;
  expandedFolders: Set<string>;
  selectedPath: string | null;
  renamingPath: string | null;
  renameValue: string;
  onSelect: (path: string) => void;
  onToggleFolder: (path: string) => void;
  onStartRename: (path: string) => void;
  onRenameChange: (v: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onDownload: (path: string) => void;
  onDelete: (path: string) => void;
}

function TreeRow({
  node,
  depth,
  expandedFolders,
  selectedPath,
  renamingPath,
  renameValue,
  onSelect,
  onToggleFolder,
  onStartRename,
  onRenameChange,
  onCommitRename,
  onCancelRename,
  onDownload,
  onDelete,
}: TreeRowProps) {
  const isExpanded = expandedFolders.has(node.fullPath);
  const isSelected = selectedPath === node.fullPath;
  const isRenaming = renamingPath === node.fullPath;
  return (
    <>
      <div
        className={`sql-files-row${isSelected ? " sql-files-row-selected" : ""}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => {
          if (node.isFolder) onToggleFolder(node.fullPath);
          onSelect(node.fullPath);
        }}
      >
        {node.isFolder ? (
          isExpanded ? (
            <ChevronDown size={11} aria-hidden="true" className="sql-files-chevron" />
          ) : (
            <ChevronRight size={11} aria-hidden="true" className="sql-files-chevron" />
          )
        ) : (
          <span className="sql-files-chevron-spacer" aria-hidden="true" />
        )}
        {node.isFolder ? (
          isExpanded ? (
            <FolderOpen size={12} aria-hidden="true" className="sql-files-icon" />
          ) : (
            <Folder size={12} aria-hidden="true" className="sql-files-icon" />
          )
        ) : (
          <FileText size={12} aria-hidden="true" className="sql-files-icon" />
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
        {!isRenaming && (
          <div className="sql-files-actions">
            {!node.isFolder && (
              <button
                type="button"
                className="sql-files-action-btn"
                title="Download"
                aria-label={`Download ${node.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(node.fullPath);
                }}
              >
                <Download size={11} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              className="sql-files-action-btn"
              title="Rename"
              aria-label={`Rename ${node.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onStartRename(node.fullPath);
              }}
            >
              <Pencil size={11} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="sql-files-action-btn sql-files-action-danger"
              title="Delete"
              aria-label={`Delete ${node.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.fullPath);
              }}
            >
              <Trash2 size={11} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      {node.isFolder && isExpanded &&
        node.children.map((child) => (
          <TreeRow
            key={child.fullPath}
            node={child}
            depth={depth + 1}
            expandedFolders={expandedFolders}
            selectedPath={selectedPath}
            renamingPath={renamingPath}
            renameValue={renameValue}
            onSelect={onSelect}
            onToggleFolder={onToggleFolder}
            onStartRename={onStartRename}
            onRenameChange={onRenameChange}
            onCommitRename={onCommitRename}
            onCancelRename={onCancelRename}
            onDownload={onDownload}
            onDelete={onDelete}
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
}: FilesPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newFolderActive, setNewFolderActive] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [dragging, setDragging] = useState(false);

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

  const handleStartRename = useCallback(
    (path: string) => {
      const lastSlash = path.lastIndexOf("/");
      setRenameValue(lastSlash >= 0 ? path.slice(lastSlash + 1) : path);
      setRenamingPath(path);
    },
    [],
  );

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

  return (
    <div
      className={`sql-files${dragging ? " sql-files-dragging" : ""}`}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length > 0) {
          onUpload(e.dataTransfer.files, parentPath);
        }
      }}
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
      <div className="sql-files-tree">
        {newFolderActive && (
          <div
            className="sql-files-row"
            style={{ paddingLeft: 8 }}
          >
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
              onSelect={setSelectedPath}
              onToggleFolder={onToggleFolder}
              onStartRename={handleStartRename}
              onRenameChange={setRenameValue}
              onCommitRename={handleCommitRename}
              onCancelRename={handleCancelRename}
              onDownload={onDownload}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
