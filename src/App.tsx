import React, { useEffect, useState } from "react";
import { Copy, Check, FolderOpen } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { GitView } from "./components/GitView";
import { MarkdownView } from "./components/MarkdownView";
import { CodeView } from "./components/CodeView";
import { useAppStore } from "./store/useAppStore";

export const App: React.FC = () => {
  const {
    init,
    viewMode,
    statusMessage,
    gitRoot,
    currentFilePath,
    fileContent,
    sidebarOpen,
    sidebarWidth,
    setSidebarWidth,
    openFolder,
  } = useAppStore();

  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const [selectionInfo, setSelectionInfo] = useState<{
    chars: number;
    lines: number;
  } | null>(null);

  const linesCount = fileContent ? fileContent.split("\n").length : 0;
  const charsCount = fileContent ? fileContent.length : 0;

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1500);
  };

  const handleOpenFolder = async (targetPath: string, e?: React.MouseEvent) => {
    if (e?.altKey) {
      const dir = targetPath.replace(/[\\\/][^\\\/]*$/, "");
      if (dir) {
        await openFolder(dir);
        return;
      }
    }
    try {
      await invoke("show_in_folder", { path: targetPath });
    } catch (err) {
      console.error("Open in folder error:", err);
    }
  };

  // Monitor text selection across document & editor inputs (VS Code style)
  useEffect(() => {
    const updateSelection = () => {
      let text = "";
      const activeEl = document.activeElement;

      if (
        activeEl &&
        (activeEl instanceof HTMLTextAreaElement ||
          (activeEl instanceof HTMLInputElement && activeEl.type === "text"))
      ) {
        const start = activeEl.selectionStart ?? 0;
        const end = activeEl.selectionEnd ?? 0;
        if (end > start) {
          text = activeEl.value.substring(start, end);
        }
      }

      if (!text) {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) {
          text = sel.toString();
        }
      }

      if (text.length > 0) {
        const lines = text.split("\n").length;
        setSelectionInfo({ chars: text.length, lines });
      } else {
        setSelectionInfo(null);
      }
    };

    document.addEventListener("selectionchange", updateSelection);
    document.addEventListener("mouseup", updateSelection);
    document.addEventListener("keyup", updateSelection);

    return () => {
      document.removeEventListener("selectionchange", updateSelection);
      document.removeEventListener("mouseup", updateSelection);
      document.removeEventListener("keyup", updateSelection);
    };
  }, []);

  const handleSidebarResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSidebar(true);

    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const minW = 160;
      const maxW = Math.max(300, window.innerWidth - 200);
      const newWidth = Math.max(minW, Math.min(startWidth + deltaX, maxW));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsDraggingSidebar(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-200 overflow-hidden font-sans">
      {/* Top Navigation & Controls */}
      <Header />

      {/* Workspace Area: Sidebar + Active View */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        {/* Resizer divider between Sidebar and Workspace */}
        {sidebarOpen && (
          <div
            onMouseDown={handleSidebarResizeStart}
            onDoubleClick={() => setSidebarWidth(260)}
            className={`relative w-[1px] bg-zinc-800 hover:bg-blue-500 transition-colors cursor-col-resize shrink-0 z-20 group ${
              isDraggingSidebar ? "bg-blue-500 shadow-sm shadow-blue-500/50" : ""
            }`}
            title="拖动调整侧边栏宽度 (双击重置为 260px)"
          >
            {/* Wider grab handle area so it's effortless to target */}
            <div className="absolute inset-y-0 -left-1.5 -right-1.5 cursor-col-resize z-10" />
          </div>
        )}

        <main className="flex-1 flex overflow-hidden">
          {viewMode === "git" && <GitView />}
          {viewMode === "markdown" && <MarkdownView />}
          {viewMode === "code" && <CodeView />}
        </main>
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-6 bg-zinc-900 border-t border-zinc-800/80 px-3 flex items-center justify-between text-[11px] text-zinc-500 select-none">
        <div className="flex items-center gap-3 overflow-hidden">
          {gitRoot && (
            <div className="flex items-center gap-1 text-zinc-400 shrink-0">
              <span>Git:</span>
              <span className="text-zinc-300 font-mono">{gitRoot}</span>
              {!currentFilePath && (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => handleCopyPath(gitRoot)}
                    title="复制 Git 根目录路径"
                    className="p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    {copiedPath === gitRoot ? (
                      <Check size={11} className="text-emerald-400" />
                    ) : (
                      <Copy size={11} />
                    )}
                  </button>
                  <button
                    onClick={(e) => handleOpenFolder(gitRoot, e)}
                    title="在系统文件资源管理器中打开 Git 根目录"
                    className="p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    <FolderOpen size={11} />
                  </button>
                </div>
              )}
            </div>
          )}
          {currentFilePath && (
            <div className="flex items-center gap-1 text-zinc-400 truncate">
              <span className="truncate max-w-md font-mono" title={currentFilePath}>
                {currentFilePath}
              </span>
              <button
                onClick={() => handleCopyPath(currentFilePath)}
                title="复制当前文件完整路径"
                className="p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
              >
                {copiedPath === currentFilePath ? (
                  <Check size={11} className="text-emerald-400" />
                ) : (
                  <Copy size={11} />
                )}
              </button>
              <button
                onClick={(e) => handleOpenFolder(currentFilePath, e)}
                title="在文件资源管理器中定位/打开所在文件夹 (Alt+点击在侧边栏打开目录)"
                className="p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
              >
                <FolderOpen size={11} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
          {statusMessage && (
            <span className="text-blue-400 font-medium font-sans">{statusMessage}</span>
          )}
          {currentFilePath ? (
            <div className="flex items-center gap-2 text-zinc-400">
              <span>{linesCount} 行</span>
              <span className="text-zinc-600">•</span>
              <span>{charsCount.toLocaleString()} 字符</span>
              {selectionInfo && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-blue-400 font-medium">
                    已选择 {selectionInfo.chars.toLocaleString()} 个字符
                    {selectionInfo.lines > 1 ? ` (${selectionInfo.lines} 行)` : ""}
                  </span>
                </>
              )}
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-500 font-sans">UTF-8</span>
            </div>
          ) : (
            <span className="text-zinc-600 font-sans">就绪</span>
          )}
        </div>
      </footer>
    </div>
  );
};

export default App;
