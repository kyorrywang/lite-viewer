import React from "react";
import {
  FolderOpen,
  FileText,
  GitBranch,
  RefreshCw,
  Code2,
  BookOpen,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";

export const Header: React.FC = () => {
  const {
    rootPath,
    currentFileName,
    gitRoot,
    gitCommits,
    viewMode,
    isDirty,
    sidebarOpen,
    isLoading,
    setViewMode,
    toggleSidebar,
    pickFolder,
    pickFile,
    refreshGit,
  } = useAppStore();

  return (
    <header className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-3 select-none text-xs text-zinc-300">
      {/* Left: Sidebar toggle, App Logo, Breadcrumb */}
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
        </div>

        {/* Path / Current file indicator */}
        <div className="flex items-center gap-1.5 text-zinc-400 truncate text-[11px]">
          {rootPath && (
            <span
              className="truncate max-w-[200px] hover:text-zinc-200 cursor-pointer"
              title={rootPath}
            >
              {rootPath.split(/[\/\\]/).pop()}
            </span>
          )}
          {currentFileName && (
            <>
              <span className="text-zinc-600">/</span>
              <span
                className={`truncate font-medium ${
                  isDirty ? "text-amber-400" : "text-zinc-200"
                }`}
                title={currentFileName}
              >
                {currentFileName}
                {isDirty && <span className="ml-1 text-amber-400">*</span>}
              </span>
            </>
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
