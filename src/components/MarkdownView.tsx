import React, { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import Prism from "../utils/prismSetup";
import {
  Eye,
  Edit3,
  Columns,
  Save,
  Check,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";

export const MarkdownView: React.FC = () => {
  const {
    currentFilePath,
    fileContent,
    isDirty,
    markdownMode,
    fileScrollPositions,
    saveScrollPosition,
    setFileContent,
    saveCurrentFile,
    setMarkdownMode,
  } = useAppStore();

  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isRestoringScroll = useRef(false);

  // Configure marked with Prism syntax highlighting
  const htmlContent = useMemo(() => {
    try {
      marked.use({
        gfm: true,
        breaks: true,
        renderer: {
          code({ text, lang }) {
            const rawLang = (lang || "").trim();
            const language = rawLang.split(/\s+/)[0] || "plaintext";
            const grammar = Prism.languages[language] || Prism.languages.plaintext;
            const highlighted = grammar
              ? Prism.highlight(text, grammar, language)
              : text
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;");

            const langClass = language ? `language-${language}` : "";
            return `<pre class="${langClass}"><code class="${langClass}">${highlighted}</code></pre>`;
          },
        },
      });
      return marked.parse(fileContent) as string;
    } catch (err) {
      return `<p class="text-red-400">Markdown 渲染出错: ${err}</p>`;
    }
  }, [fileContent]);

  // Restore scroll position when switching file or rendering content
  useEffect(() => {
    if (!currentFilePath) return;
    const targetScroll = fileScrollPositions[currentFilePath] ?? 0;

    isRestoringScroll.current = true;
    const rafId = requestAnimationFrame(() => {
      if (previewRef.current) {
        previewRef.current.scrollTop = targetScroll;
      }
      if (textareaRef.current) {
        textareaRef.current.scrollTop = targetScroll;
      }
      // Double rAF ensures syntax-highlighted / layout-rendered heights are accounted for
      requestAnimationFrame(() => {
        if (previewRef.current) {
          previewRef.current.scrollTop = targetScroll;
        }
        if (textareaRef.current) {
          textareaRef.current.scrollTop = targetScroll;
        }
        setTimeout(() => {
          isRestoringScroll.current = false;
        }, 80);
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, [currentFilePath, htmlContent, markdownMode]);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    if (isRestoringScroll.current) return;
    if (currentFilePath) {
      saveScrollPosition(currentFilePath, e.currentTarget.scrollTop);
    }
  };

  const handleSave = async () => {
    await saveCurrentFile();
    setSaveNotice("已保存");
    setTimeout(() => setSaveNotice(null), 2000);
  };

  // Global Ctrl+S handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveCurrentFile]);

  // Line & Word counts
  const linesCount = fileContent.split("\n").length;
  const wordCount = fileContent.trim() ? fileContent.trim().length : 0;

  if (!currentFilePath && !fileContent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-xs">
        <FileText size={36} className="text-zinc-600 mb-2" />
        <p>未打开任何 Markdown 文件</p>
        <p className="text-zinc-600 mt-1">
          可从左侧文件树选择 .md 文件，或点击上方“打开文件”
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950 text-xs select-none">
      {/* Top Toolbar */}
      <div className="h-10 px-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-zinc-300 shrink-0">
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-zinc-950 p-0.5 rounded border border-zinc-800">
            <button
              onClick={() => setMarkdownMode("preview")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                markdownMode === "preview"
                  ? "bg-zinc-800 text-blue-400 font-medium"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="纯浏览预览模式"
            >
              <Eye size={13} />
              <span>预览</span>
            </button>

            <button
              onClick={() => setMarkdownMode("raw")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                markdownMode === "raw"
                  ? "bg-zinc-800 text-blue-400 font-medium"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="查看原始源码并编辑"
            >
              <Edit3 size={13} />
              <span>源码编辑</span>
            </button>

            <button
              onClick={() => setMarkdownMode("split")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                markdownMode === "split"
                  ? "bg-zinc-800 text-blue-400 font-medium"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="双栏：左编辑、右实时预览"
            >
              <Columns size={13} />
              <span>双栏</span>
            </button>
          </div>

          {/* Unsaved indicator */}
          {isDirty && (
            <div className="flex items-center gap-1 text-amber-400 text-[11px] ml-2 font-medium">
              <AlertTriangle size={12} />
              <span>未保存改动</span>
            </div>
          )}

          {/* Save success notice */}
          {saveNotice && (
            <span className="text-emerald-400 text-[11px] ml-2 flex items-center gap-1 font-medium">
              <Check size={12} />
              {saveNotice}
            </span>
          )}
        </div>

        {/* Right: Stats & Save Button */}
        <div className="flex items-center gap-3">
          <div className="text-[11px] text-zinc-500 font-mono hidden sm:inline">
            {linesCount} 行 • {wordCount} 字符
          </div>

          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-all ${
              isDirty
                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/30"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            }`}
            title="快捷键: Ctrl + S"
          >
            <Save size={13} />
            <span>保存</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Pane (shown in 'raw' or 'split' mode) */}
        {(markdownMode === "raw" || markdownMode === "split") && (
          <div
            className={`flex flex-col bg-[#161618] ${
              markdownMode === "split" ? "w-1/2 border-r border-zinc-800" : "flex-1"
            }`}
          >
            <textarea
              ref={textareaRef}
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              onScroll={handleScroll}
              placeholder="编写或查看 Markdown 源码 (支持 Ctrl+S 保存)..."
              spellCheck={false}
              className="flex-1 w-full p-4 bg-transparent text-zinc-200 font-mono text-[13px] leading-relaxed resize-none focus:outline-none select-text"
            />
          </div>
        )}

        {/* Preview Pane (shown in 'preview' or 'split' mode) */}
        {(markdownMode === "preview" || markdownMode === "split") && (
          <div
            ref={previewRef}
            onScroll={handleScroll}
            className={`flex-1 overflow-y-auto p-6 select-text bg-[#18181b] ${
              markdownMode === "split" ? "w-1/2" : "w-full"
            }`}
          >
            <div
              className="markdown-body max-w-4xl mx-auto"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
