import React, { useEffect, useMemo, useRef, useState } from "react";
import Prism from "../utils/prismSetup";
import { Copy, Check, FileCode, Edit3, Save } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

export const CodeView: React.FC = () => {
  const {
    currentFilePath,
    currentFileName,
    fileContent,
    isDirty,
    fileScrollPositions,
    saveScrollPosition,
    setFileContent,
    saveCurrentFile,
  } = useAppStore();

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isRestoringScroll = useRef(false);

  // Determine prism language
  const language = useMemo(() => {
    if (!currentFileName) return "plaintext";
    const ext = currentFileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "ts":
      case "tsx":
        return "typescript";
      case "js":
      case "jsx":
        return "javascript";
      case "rs":
        return "rust";
      case "py":
        return "python";
      case "json":
        return "json";
      case "css":
        return "css";
      case "html":
      case "xml":
      case "svg":
        return "markup";
      case "toml":
        return "toml";
      case "yaml":
      case "yml":
        return "yaml";
      case "sh":
      case "bash":
      case "zsh":
        return "bash";
      case "sql":
        return "sql";
      case "go":
        return "go";
      case "c":
      case "h":
        return "c";
      case "cpp":
      case "hpp":
      case "cc":
        return "cpp";
      case "md":
      case "markdown":
        return "markdown";
      case "diff":
      case "patch":
        return "diff";
      default:
        return "plaintext";
    }
  }, [currentFileName]);

  const highlightedHtml = useMemo(() => {
    if (!fileContent) return "";
    const grammar = Prism.languages[language] || Prism.languages.plaintext;
    try {
      return Prism.highlight(fileContent, grammar, language);
    } catch {
      return fileContent;
    }
  }, [fileContent, language]);

  // Restore scroll position when switching file or toggling mode
  useEffect(() => {
    if (!currentFilePath) return;
    const targetScroll = fileScrollPositions[currentFilePath] ?? 0;

    isRestoringScroll.current = true;
    const rafId = requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = targetScroll;
      }
      if (textareaRef.current) {
        textareaRef.current.scrollTop = targetScroll;
      }
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = targetScroll;
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
  }, [currentFilePath, highlightedHtml, isEditing]);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    if (isRestoringScroll.current) return;
    if (currentFilePath) {
      saveScrollPosition(currentFilePath, e.currentTarget.scrollTop);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    await saveCurrentFile();
    setSaveNotice("已保存");
    setTimeout(() => setSaveNotice(null), 2000);
  };

  // Ctrl+S handler
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

  if (!currentFilePath && !fileContent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-xs select-none">
        <FileCode size={36} className="text-zinc-600 mb-2" />
        <p>未打开任何代码文件</p>
        <p className="text-zinc-600 mt-1">
          可从左侧文件树选择文件，或点击上方“打开文件”
        </p>
      </div>
    );
  }

  const lines = fileContent.split("\n");

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950 text-xs">
      {/* Code Header Toolbar */}
      <div className="h-9 px-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-zinc-300 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="font-mono text-zinc-300 font-medium">{currentFileName}</span>
          <span className="bg-zinc-800 text-blue-400 text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold">
            {language}
          </span>
          {isDirty && (
            <span className="text-amber-400 text-[11px] font-medium">* 未保存</span>
          )}
          {saveNotice && (
            <span className="text-emerald-400 text-[11px] flex items-center gap-1 font-medium">
              <Check size={12} />
              {saveNotice}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
              isEditing
                ? "bg-blue-600/20 border-blue-500 text-blue-300"
                : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            }`}
          >
            <Edit3 size={12} />
            <span>{isEditing ? "阅读模式" : "编辑模式"}</span>
          </button>

          {isEditing && (
            <button
              onClick={handleSave}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                isDirty
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              <Save size={12} />
              <span>保存</span>
            </button>
          )}

          <button
            onClick={copyCode}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald-400" />
                <span className="text-emerald-400">已复制</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>复制代码</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Content Area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto bg-[#141416]"
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            onScroll={handleScroll}
            spellCheck={false}
            className="w-full h-full p-4 bg-transparent text-zinc-200 font-mono text-[12px] leading-relaxed resize-none focus:outline-none select-text"
          />
        ) : (
          <div className="flex p-3 font-mono text-[12px] leading-relaxed select-text min-w-full w-max">
            {/* Line numbers */}
            <div className="select-none text-zinc-600 text-right pr-4 border-r border-zinc-800/80 shrink-0">
              {lines.map((_, idx) => (
                <div key={idx}>{idx + 1}</div>
              ))}
            </div>

            {/* Syntax Highlighted Code */}
            <pre className="pl-4 m-0 overflow-visible text-zinc-200 bg-transparent">
              <code
                className={`language-${language}`}
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
