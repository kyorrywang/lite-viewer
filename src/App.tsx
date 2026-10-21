import React, { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { GitView } from "./components/GitView";
import { MarkdownView } from "./components/MarkdownView";
import { CodeView } from "./components/CodeView";
import { useAppStore } from "./store/useAppStore";

export const App: React.FC = () => {
  const { init, viewMode, statusMessage, gitRoot, currentFilePath, fileContent } =
    useAppStore();

  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const linesCount = fileContent ? fileContent.split("\n").length : 0;
  const charsCount = fileContent ? fileContent.length : 0;

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1500);
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
