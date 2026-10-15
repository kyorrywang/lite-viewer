import React, { useEffect } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { GitView } from "./components/GitView";
import { MarkdownView } from "./components/MarkdownView";
import { CodeView } from "./components/CodeView";
import { useAppStore } from "./store/useAppStore";

export const App: React.FC = () => {
  const { init, viewMode, statusMessage, gitRoot, currentFilePath } =
    useAppStore();

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
        <div className="flex items-center gap-3">
          {gitRoot && (
            <span className="text-zinc-400">
              Git: <span className="text-zinc-300 font-mono">{gitRoot}</span>
            </span>
          )}
          {currentFilePath && (
            <span className="truncate max-w-sm text-zinc-400">
              {currentFilePath}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {statusMessage && (
            <span className="text-blue-400 font-medium">{statusMessage}</span>
          )}
          <span>LiteViewer v0.1.0</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
