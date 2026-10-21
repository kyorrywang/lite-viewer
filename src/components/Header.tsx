import React, { useEffect, useRef, useState } from "react";
import {
  FolderOpen,
  FileText,
  GitBranch,
  RefreshCw,
  Code2,
  BookOpen,
  PanelLeftClose,
  PanelLeft,
  History,
  Folder,
  X,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";

export const Header: React.FC = () => {
  const {
    rootPath,
    gitRoot,
    gitCommits,
    viewMode,
    isDirty,
    sidebarOpen,
    isLoading,
    recentFolders,
    setViewMode,
    toggleSidebar,
    pickFolder,
    pickFile,
    refreshGit,
    openFolder,
    removeRecentFolder,
    clearRecentFolders,
  } = useAppStore();

  const [showHistory, setShowHistory] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  // Close history dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    if (showHistory) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showHistory]);

  return (
    <header className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-3 select-none text-xs text-zinc-300">
      {/* Left: Sidebar toggle, App Logo, Version */}
      <div className="flex items-center gap-2 overflow-hidden">
        <button
          onClick={toggleSidebar}
          title={sidebarOpen ? "收起侧边栏" : "展开侧边栏"}
          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
        </button>

        <div className="flex items-center gap-1.5 font-semibold text-zinc-100 mr-2 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
          <span>LiteViewer</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-blue-400 border border-zinc-700/60 leading-none">
            v0.4.0
          </span>
          {isDirty && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-amber-400"
              title="当前文件有未保存修改"
            />
          )}
        </div>
      </div>

      {/* Middle: Mode Switch Tabs */}
      <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
        {gitRoot && (
          <button
            onClick={() => setViewMode("git")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
              viewMode === "git"
                ? "bg-zinc-800 text-blue-400 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <GitBranch size={13} />
            <span>Git Graph</span>
            {gitCommits.length > 0 && (
              <span className="bg-zinc-700/60 text-zinc-300 text-[10px] px-1.5 py-0.2 rounded-full">
                {gitCommits.length}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setViewMode("code")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
            viewMode === "code"
              ? "bg-zinc-800 text-blue-400 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Code2 size={13} />
          <span>代码浏览</span>
        </button>

        <button
          onClick={() => setViewMode("markdown")}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-medium ${
            viewMode === "markdown"
              ? "bg-zinc-800 text-blue-400 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <BookOpen size={13} />
          <span>Markdown</span>
          {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {gitRoot && viewMode === "git" && (
          <button
            onClick={refreshGit}
            disabled={isLoading}
            title="刷新 Git 历史"
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">刷新</span>
          </button>
        )}

        {/* History Dropdown */}
        <div className="relative" ref={historyRef}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            title="打开历史目录"
            className={`flex items-center gap-1 px-2.5 py-1 rounded border transition-colors ${
              showHistory
                ? "bg-zinc-800 border-zinc-700 text-white"
                : "border-transparent bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white"
            }`}
          >
            <History size={13} className="text-zinc-400" />
            <span>历史</span>
            {recentFolders.length > 0 && (
              <span className="text-[10px] bg-zinc-700/80 text-zinc-300 px-1 rounded-full font-mono">
                {recentFolders.length}
              </span>
            )}
          </button>

          {showHistory && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-2xl py-1 z-50 overflow-hidden text-xs">
              <div className="px-3 py-1.5 border-b border-zinc-800 flex items-center justify-between text-zinc-400">
                <span className="font-semibold text-zinc-200">最近打开的目录</span>
                {recentFolders.length > 0 && (
                  <button
                    onClick={clearRecentFolders}
                    className="text-[11px] hover:text-red-400 text-zinc-500 transition-colors"
                  >
                    清空历史
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto py-1">
                {recentFolders.length === 0 ? (
                  <div className="p-4 text-center text-zinc-500">
                    暂无打开历史
                  </div>
                ) : (
                  recentFolders.map((folder) => {
                    const base = folder.split(/[\/\\]/).filter(Boolean).pop() || folder;
                    const isCurrent = rootPath === folder;
                    return (
                      <div
                        key={folder}
                        onClick={() => {
                          openFolder(folder);
                          setShowHistory(false);
                        }}
                        className={`group px-3 py-1.5 flex items-center justify-between cursor-pointer transition-colors ${
                          isCurrent
                            ? "bg-blue-600/20 text-blue-300"
                            : "hover:bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Folder size={14} className="text-blue-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate text-zinc-200 text-xs">
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
                          title="从历史记录移除"
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-opacity ml-2 shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={pickFile}
          title="打开文件 (关联或独立查看)"
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
        >
          <FileText size={13} />
          <span>打开文件</span>
        </button>

        <button
          onClick={pickFolder}
          title="打开文件夹或 Git 仓库"
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
        >
          <FolderOpen size={13} />
          <span>打开目录</span>
        </button>
      </div>
    </header>
  );
};
