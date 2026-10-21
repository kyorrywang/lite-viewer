import React, { useMemo } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FileCode,
  FileText,
  Search,
  File,
  GitCommit,
  AlertCircle,
  FolderPlus,
  RefreshCw,
  Eye,
  History,
  X,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { FileEntry, GitChangedFile } from "../types";

interface TreeNodeProps {
  entry: FileEntry;
  depth: number;
  gitRoot: string | null;
  gitChangeMap: Map<string, GitChangedFile>;
  gitChangedDirSet: Set<string>;
  gitIgnoredSet: Set<string>;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  entry,
  depth,
  gitRoot,
  gitChangeMap,
  gitChangedDirSet,
  gitIgnoredSet,
}) => {
  const {
    currentFilePath,
    expandedPaths,
    loadingPaths,
    folderChildren,
    toggleFolder,
    selectFile,
  } = useAppStore();

  const isExpanded = !!expandedPaths[entry.path];
  const isLoading = !!loadingPaths[entry.path];
  const isSelected = currentFilePath === entry.path;
  const children = folderChildren[entry.path] || [];

  // Relative path against gitRoot for git status matching
  const relPath = useMemo(() => {
    if (!gitRoot) return "";
    const normP = entry.path.replace(/\\/g, "/");
    const normRoot = gitRoot.replace(/\\/g, "/");
    if (normP.startsWith(normRoot)) {
      return normP.substring(normRoot.length).replace(/^\/+/, "");
    }
    return "";
  }, [entry.path, gitRoot]);

  // Check if ignored by git
  const isIgnored = useMemo(() => {
    if (!relPath || gitIgnoredSet.size === 0) return false;
    if (gitIgnoredSet.has(relPath)) return true;
    const parts = relPath.split("/");
    let acc = "";
    for (let i = 0; i < parts.length - 1; i++) {
      acc = acc ? `${acc}/${parts[i]}` : parts[i];
      if (gitIgnoredSet.has(acc)) return true;
    }
    return false;
  }, [relPath, gitIgnoredSet]);

  // Check direct git change for files
  const gitChange = !entry.is_dir && relPath ? gitChangeMap.get(relPath) : undefined;

  // Check if folder contains any changed children
  const hasChangedChildren = entry.is_dir && relPath ? gitChangedDirSet.has(relPath) : false;

  const isDotFile = entry.name.startsWith(".");

  const getFileIcon = () => {
    if (entry.is_dir) {
      if (isIgnored) {
        return <Folder size={14} className="text-zinc-600 shrink-0" />;
      }
      return isExpanded ? (
        <FolderOpen size={14} className="text-blue-400 shrink-0" />
      ) : (
        <Folder size={14} className="text-blue-400 shrink-0" />
      );
    }

    if (isIgnored) {
      return <File size={14} className="text-zinc-600 shrink-0" />;
    }

    const ext = entry.ext.toLowerCase();
    if (ext === "md" || ext === "markdown") {
      return <FileText size={14} className="text-emerald-400 shrink-0" />;
    }
    if (
      ["ts", "tsx", "js", "jsx", "rs", "py", "json", "toml", "css", "html", "yaml", "yml"].includes(
        ext
      )
    ) {
      return <FileCode size={14} className="text-amber-400 shrink-0" />;
    }
    return <File size={14} className="text-zinc-400 shrink-0" />;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (entry.is_dir) {
      toggleFolder(entry.path);
    } else {
      selectFile(entry.path);
    }
  };

  // Determine text styling and badge based on Git Status
  let textStyle = "text-zinc-300";
  let statusBadge: React.ReactNode = null;

  if (isIgnored) {
    textStyle = "text-zinc-500 opacity-60";
    statusBadge = (
      <span className="text-[10px] text-zinc-600 px-1 font-mono shrink-0">
        ignored
      </span>
    );
  } else if (gitChange) {
    if (gitChange.status === "M") {
      textStyle = "text-amber-400 font-medium";
      statusBadge = (
        <span className="text-[10px] font-bold text-amber-400 px-1 rounded bg-amber-950/60 border border-amber-800/60 font-mono shrink-0">
          M
        </span>
      );
    } else if (gitChange.status === "?" || gitChange.status === "A") {
      textStyle = "text-emerald-400 font-medium";
      statusBadge = (
        <span className="text-[10px] font-bold text-emerald-400 px-1 rounded bg-emerald-950/60 border border-emerald-800/60 font-mono shrink-0">
          {gitChange.status === "?" ? "U" : "A"}
        </span>
      );
    } else if (gitChange.status === "D") {
      textStyle = "text-red-400 line-through";
      statusBadge = (
        <span className="text-[10px] font-bold text-red-400 px-1 rounded bg-red-950/60 border border-red-800/60 font-mono shrink-0">
          D
        </span>
      );
    }
  } else if (hasChangedChildren) {
    statusBadge = (
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="包含改动文件" />
    );
  }

  return (
    <div>
      {/* Node row */}
      <div
        onClick={handleClick}
        style={{ paddingLeft: `${depth * 14 + 6}px` }}
        className={`flex items-center gap-1.5 py-1 pr-2 rounded-sm cursor-pointer transition-colors text-[12px] group ${
          isSelected
            ? "bg-blue-600/20 text-blue-200 font-medium border-l-2 border-l-blue-500"
            : `hover:bg-zinc-900/90 ${textStyle}`
        }`}
        title={`${entry.path}${isIgnored ? " (已忽略)" : ""}`}
      >
        {/* Chevron for folder */}
        {entry.is_dir ? (
          <span className="w-3.5 h-3.5 flex items-center justify-center text-zinc-500 group-hover:text-zinc-300">
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        ) : (
          <span className="w-3.5" />
        )}

        {getFileIcon()}

        <span className={`truncate flex-1 font-mono text-[12px] ${isDotFile ? "opacity-80" : ""}`}>
          {entry.name}
        </span>

        {statusBadge}
      </div>

      {/* Children if folder and expanded */}
      {entry.is_dir && isExpanded && (
        <div>
          {isLoading ? (
            <div
              style={{ paddingLeft: `${(depth + 1) * 14 + 18}px` }}
              className="py-1 text-[11px] text-zinc-500 flex items-center gap-1.5"
            >
              <RefreshCw size={11} className="animate-spin text-zinc-500" />
              <span>加载中...</span>
            </div>
          ) : children.length === 0 ? (
            <div
              style={{ paddingLeft: `${(depth + 1) * 14 + 18}px` }}
              className="py-1 text-[11px] text-zinc-600 italic"
            >
              空目录
            </div>
          ) : (
            children.map((child) => (
              <TreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                gitRoot={gitRoot}
                gitChangeMap={gitChangeMap}
                gitChangedDirSet={gitChangedDirSet}
                gitIgnoredSet={gitIgnoredSet}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const {
    sidebarOpen,
    sidebarWidth,
    rootPath,
    rootEntries,
    currentFilePath,
    currentFileName,
    searchQuery,
    gitRoot,
    gitStatus,
    recentFolders,
    folderChildren,
    pickFolder,
    openFolder,
    removeRecentFolder,
    setSearchQuery,
    setViewMode,
    selectFile,
  } = useAppStore();

  // Git Status Lookups
  const gitChangeMap = useMemo(() => {
    const map = new Map<string, GitChangedFile>();
    if (!gitStatus) return map;
    for (const f of gitStatus.files) {
      const p = f.path.replace(/\\/g, "/").replace(/^\/+/, "");
      map.set(p, f);
    }
    return map;
  }, [gitStatus]);

  const gitChangedDirSet = useMemo(() => {
    const set = new Set<string>();
    if (!gitStatus) return set;
    for (const f of gitStatus.files) {
      const p = f.path.replace(/\\/g, "/").replace(/^\/+/, "");
      const parts = p.split("/");
      let acc = "";
      for (let i = 0; i < parts.length - 1; i++) {
        acc = acc ? `${acc}/${parts[i]}` : parts[i];
        set.add(acc);
      }
    }
    return set;
  }, [gitStatus]);

  const gitIgnoredSet = useMemo(() => {
    const set = new Set<string>();
    if (!gitStatus) return set;
    for (const ig of gitStatus.ignored_paths) {
      const p = ig.replace(/\\/g, "/").replace(/^\/+/, "");
      set.add(p);
      if (p.endsWith("/")) {
        set.add(p.slice(0, -1));
      }
    }
    return set;
  }, [gitStatus]);

  // Search filter across loaded entries
  const flatSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const results: FileEntry[] = [];

    const searchList = (list: FileEntry[]) => {
      for (const item of list) {
        if (item.name.toLowerCase().includes(q)) {
          results.push(item);
        }
        if (item.is_dir && folderChildren[item.path]) {
          searchList(folderChildren[item.path]);
        }
      }
    };

    searchList(rootEntries);
    return results;
  }, [searchQuery, rootEntries, folderChildren]);

  if (!sidebarOpen) return null;

  const rootName = rootPath ? rootPath.split(/[\/\\]/).filter(Boolean).pop() : null;
  const isOutsideRoot =
    currentFilePath && rootPath && !currentFilePath.startsWith(rootPath);
  const uncommittedCount = gitStatus?.files.length || 0;

  return (
    <aside
      style={{ width: `${sidebarWidth}px` }}
      className="bg-zinc-950 flex flex-col shrink-0 select-none text-xs"
    >
      {/* Directory Title / Actions Header */}
      <div className="h-9 px-3 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between text-zinc-300">
        <div className="flex items-center gap-1.5 truncate">
          <Folder size={13} className="text-blue-400 shrink-0" />
          <span className="font-semibold text-zinc-200 truncate" title={rootPath || "未打开目录"}>
            {rootName || "未打开目录"}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {rootPath && (
            <button
              onClick={() => openFolder(rootPath)}
              title="刷新目录树"
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200"
            >
              <RefreshCw size={12} />
            </button>
          )}
          <button
            onClick={pickFolder}
            title="选择打开工程目录"
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200"
          >
            <FolderPlus size={13} />
          </button>
        </div>
      </div>

      {/* Temporary preview badge if viewing a file outside root directory */}
      {(isOutsideRoot || (!rootPath && currentFilePath)) && (
        <div className="px-2.5 py-1.5 bg-blue-950/40 border-b border-blue-900/40 flex items-center justify-between text-[11px] text-blue-300">
          <div className="flex items-center gap-1.5 truncate">
            <Eye size={12} className="text-blue-400 shrink-0" />
            <span className="truncate" title={currentFilePath!}>
              临时预览: {currentFileName}
            </span>
          </div>
        </div>
      )}

      {/* Search box */}
      <div className="p-2 border-b border-zinc-800/80">
        <div className="relative flex items-center">
          <Search size={12} className="absolute left-2.5 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="在目录树中搜索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded pl-7 pr-2 py-1 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-[11px]"
          />
        </div>
      </div>

      {/* File Tree Container */}
      <div className="flex-1 overflow-y-auto p-1 py-1.5 space-y-0.5">
        {!rootPath ? (
          <div className="p-4 flex flex-col items-center">
            <p className="text-zinc-500 text-xs text-center">暂未打开工程目录</p>
            <button
              onClick={pickFolder}
              className="mt-3 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] inline-flex items-center gap-1.5 font-medium transition-colors"
            >
              <FolderPlus size={12} />
              <span>打开目录</span>
            </button>

            {/* Recent Folders History in empty state */}
            {recentFolders.length > 0 && (
              <div className="w-full mt-6 border-t border-zinc-800/80 pt-3">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 mb-2 px-1">
                  <History size={12} />
                  <span>打开历史：</span>
                </div>
                <div className="space-y-1">
                  {recentFolders.map((folder) => {
                    const base = folder.split(/[\/\\]/).filter(Boolean).pop() || folder;
                    return (
                      <div
                        key={folder}
                        onClick={() => openFolder(folder)}
                        className="group flex items-center justify-between p-1.5 rounded hover:bg-zinc-900 cursor-pointer transition-colors text-left"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <Folder size={13} className="text-blue-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-zinc-200 truncate text-[11px]">
                              {base}
                            </div>
                            <div className="text-[10px] text-zinc-500 truncate font-mono">
                              {folder}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeRecentFolder(folder);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-zinc-500 rounded"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : flatSearchResults !== null ? (
          /* Search results */
          flatSearchResults.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 text-xs">没有匹配的文件</div>
          ) : (
            flatSearchResults.map((entry) => (
              <div
                key={entry.path}
                onClick={() => selectFile(entry.path)}
                className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer ${
                  currentFilePath === entry.path
                    ? "bg-blue-600/20 text-blue-300 font-medium"
                    : "text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                {entry.is_dir ? (
                  <Folder size={13} className="text-blue-400" />
                ) : (
                  <FileText size={13} className="text-emerald-400" />
                )}
                <span className="truncate">{entry.name}</span>
              </div>
            ))
          )
        ) : rootEntries.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-xs">当前目录下无文件</div>
        ) : (
          /* Hierarchical Directory Tree with Git status */
          rootEntries.map((entry) => (
            <TreeNode
              key={entry.path}
              entry={entry}
              depth={0}
              gitRoot={gitRoot}
              gitChangeMap={gitChangeMap}
              gitChangedDirSet={gitChangedDirSet}
              gitIgnoredSet={gitIgnoredSet}
            />
          ))
        )}
      </div>

      {/* Bottom Git Status Bar */}
      {gitStatus && (
        <div
          onClick={() => setViewMode("git")}
          className="p-2 border-t border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 cursor-pointer flex items-center justify-between transition-colors shrink-0"
          title="点击进入 Git 历史"
        >
          <div className="flex items-center gap-1.5 text-zinc-400">
            <GitCommit size={14} className="text-blue-400" />
            <span className="font-mono text-[11px] text-zinc-300">
              {gitStatus.branch}
            </span>
          </div>

          {uncommittedCount > 0 ? (
            <div className="flex items-center gap-1 text-amber-400 text-[11px]">
              <AlertCircle size={12} />
              <span>{uncommittedCount} 改动</span>
            </div>
          ) : (
            <span className="text-emerald-500 text-[10px]">工作区干净</span>
          )}
        </div>
      )}
    </aside>
  );
};
