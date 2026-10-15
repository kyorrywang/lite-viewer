import React, { useState } from "react";
import {
  GitCommit,
  GitBranch,
  Cloud,
  Copy,
  Clock,
  User,
  FileText,
  FileDiff,
  X,
  Search,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { formatRelativeTime } from "../utils/formatTime";

export const GitView: React.FC = () => {
  const {
    gitCommits,
    gitStatus,
    selectedCommit,
    commitDetail,
    diffFile,
    diffContent,
    selectCommit,
    showDiff,
    closeDiff,
  } = useAppStore();

  const [filterText, setFilterText] = useState("");
  const [viewingUncommitted, setViewingUncommitted] = useState(false);

  const filteredCommits = gitCommits.filter((c) => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    return (
      c.subject.toLowerCase().includes(q) ||
      c.author_name.toLowerCase().includes(q) ||
      c.short_hash.toLowerCase().includes(q) ||
      c.ref_names.some((r) => r.toLowerCase().includes(q))
    );
  });

  const hasUncommitted = gitStatus && gitStatus.files.length > 0;

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
  };

  const renderBadge = (ref: string) => {
    const isRemote = ref.includes("/") || ref.startsWith("origin/");
    if (isRemote) {
      return (
        <span
          key={ref}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-purple-950/80 text-purple-300 border border-purple-800/60 font-medium"
        >
          <Cloud size={11} className="text-purple-400" />
          <span>{ref}</span>
        </span>
      );
    }
    return (
      <span
        key={ref}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-blue-950/80 text-blue-300 border border-blue-800/60 font-medium"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
        <span>{ref}</span>
      </span>
    );
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-zinc-950 select-none text-xs">
      {/* Left Pane: Commit Graph List */}
      <div className="w-1/2 min-w-[340px] max-w-[580px] border-r border-zinc-800/80 flex flex-col">
        {/* Graph Header */}
        <div className="h-10 px-3 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between text-zinc-300">
          <div className="flex items-center gap-2 font-medium">
            <GitBranch size={14} className="text-blue-400" />
            <span>Graph</span>
            <span className="text-[11px] text-zinc-500">
              ({gitCommits.length} commits)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <Search size={12} className="absolute left-2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="过滤提交..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-36 bg-zinc-950 border border-zinc-800 rounded pl-6 pr-2 py-0.5 text-zinc-200 placeholder-zinc-500 text-[11px] focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Commit List Container */}
        <div className="flex-1 overflow-y-auto">
          {/* Uncommitted / Working Tree Changes if any */}
          {hasUncommitted && (
            <div
              onClick={() => {
                setViewingUncommitted(true);
                closeDiff();
              }}
              className={`flex items-center gap-2.5 px-3 py-2 border-b border-zinc-800/50 cursor-pointer transition-colors ${
                viewingUncommitted
                  ? "bg-blue-600/20 text-blue-200 font-medium border-l-2 border-l-blue-500"
                  : "text-zinc-300 hover:bg-zinc-900"
              }`}
            >
              {/* Node indicator */}
              <div className="w-5 flex items-center justify-center shrink-0">
                <div className="w-3 h-3 rounded-full border-2 border-dashed border-blue-400" />
              </div>

              <div className="flex-1 min-w-0 flex items-center justify-between">
                <div className="truncate font-medium text-zinc-200">
                  工作区未提交改动 ({gitStatus.files.length} 个文件)
                </div>
                {gitStatus.branch && renderBadge(gitStatus.branch)}
              </div>
            </div>
          )}

          {/* Commits */}
          {filteredCommits.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              {gitCommits.length === 0 ? "暂无 Git 提交记录" : "未找到匹配的提交"}
            </div>
          ) : (
            filteredCommits.map((commit, index) => {
              const isSelected =
                !viewingUncommitted && selectedCommit?.hash === commit.hash;
              const hasBranches = commit.ref_names.length > 0;

              return (
                <div
                  key={commit.hash}
                  onClick={() => {
                    setViewingUncommitted(false);
                    selectCommit(commit);
                  }}
                  className={`group flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors relative border-b border-zinc-900/40 ${
                    isSelected
                      ? "bg-blue-600/20 text-blue-100 font-medium border-l-2 border-l-blue-500"
                      : "text-zinc-300 hover:bg-zinc-900/90"
                  }`}
                  title={`${commit.subject} (${commit.author_name}, ${commit.date})`}
                >
                  {/* Visual Node & Connecting Vertical Line */}
                  <div className="w-5 flex items-center justify-center shrink-0 relative self-stretch">
                    {/* Vertical line connecting top */}
                    {index > 0 && (
                      <div className="absolute top-0 bottom-1/2 w-[2px] bg-blue-500/50 -translate-x-[0.5px]" />
                    )}
                    {/* Vertical line connecting bottom */}
                    {index < filteredCommits.length - 1 && (
                      <div className="absolute top-1/2 bottom-0 w-[2px] bg-blue-500/50 -translate-x-[0.5px]" />
                    )}

                    {/* Commit node dot */}
                    <div
                      className={`relative z-10 w-2.5 h-2.5 rounded-full transition-transform ${
                        isSelected
                          ? "bg-blue-400 ring-4 ring-blue-500/30 scale-125"
                          : "bg-blue-500 group-hover:scale-110"
                      }`}
                    />
                  </div>

                  {/* Subject and Badges */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="truncate flex-1 text-zinc-200">
                      {commit.subject}
                    </span>

                    {/* Branch / Tag Badges */}
                    {hasBranches && (
                      <div className="flex items-center gap-1 shrink-0">
                        {commit.ref_names.map((ref) => renderBadge(ref))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Commit Detail & Changed Files */}
      <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
        {viewingUncommitted && gitStatus ? (
          /* Uncommitted changes view */
          <div className="flex-1 flex flex-col p-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <FileDiff size={16} className="text-amber-400" />
                <h3 className="font-semibold text-zinc-100 text-sm">
                  工作区改动 ({gitStatus.files.length} 个文件)
                </h3>
              </div>
              <div className="text-zinc-400 text-[11px]">
                分支: <span className="font-mono text-zinc-200">{gitStatus.branch}</span>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              {gitStatus.files.map((file) => (
                <div
                  key={file.path}
                  onClick={() => showDiff(file.path, undefined, file.staged)}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                    diffFile === file.path
                      ? "bg-blue-600/20 border border-blue-500/40 text-blue-200"
                      : "bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`font-mono text-[11px] px-1.5 py-0.5 rounded font-bold ${
                        file.status === "M"
                          ? "bg-amber-950 text-amber-400 border border-amber-800/50"
                          : file.status === "A" || file.status === "?"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                          : "bg-red-950 text-red-400 border border-red-800/50"
                      }`}
                    >
                      {file.status === "?" ? "UNT" : file.status}
                    </span>
                    <span className="truncate">{file.path}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {file.staged ? "已暂存" : "未暂存"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : selectedCommit ? (
          /* Normal Commit Details (Matches reference screenshot) */
          <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-3">
            {/* Author row */}
            <div className="flex items-center gap-2 text-zinc-400 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-zinc-200">
                <User size={14} className="text-blue-400" />
                <span>{selectedCommit.author_name}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>
                  {formatRelativeTime(
                    selectedCommit.date,
                    selectedCommit.author_timestamp
                  )}
                </span>
              </div>
            </div>

            {/* Commit Message */}
            <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800/70">
              <h2 className="font-semibold text-zinc-100 text-sm whitespace-pre-wrap leading-relaxed">
                {commitDetail?.full_message || selectedCommit.subject}
              </h2>
            </div>

            {/* Stats summary row */}
            {commitDetail && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {commitDetail.stats_summary ? (
                  <div className="text-zinc-300 font-medium">
                    {commitDetail.stats_summary.includes("changed") ? (
                      commitDetail.stats_summary
                        .split(",")
                        .map((part, i) => {
                          const p = part.trim();
                          if (p.includes("insertion")) {
                            return (
                              <span key={i} className="text-emerald-400 ml-1 font-semibold">
                                {p}
                              </span>
                            );
                          }
                          if (p.includes("deletion")) {
                            return (
                              <span key={i} className="text-red-400 ml-1 font-semibold">
                                {p}
                              </span>
                            );
                          }
                          return <span key={i}>{p}</span>;
                        })
                    ) : (
                      <span>{commitDetail.stats_summary}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-zinc-400">
                    {commitDetail.files.length} 个变更文件
                  </span>
                )}
              </div>
            )}

            {/* Branch badges row */}
            {selectedCommit.ref_names.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedCommit.ref_names.map((ref) => renderBadge(ref))}
              </div>
            )}

            {/* Hash & Copy */}
            <div className="flex items-center gap-2 text-zinc-400 pt-1 border-t border-zinc-800/80">
              <div className="flex items-center gap-1 font-mono text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                <GitCommit size={12} className="text-blue-400" />
                <span>{selectedCommit.short_hash}</span>
                <button
                  onClick={() => copyHash(selectedCommit.hash)}
                  title="复制完整 Commit Hash"
                  className="ml-1 hover:text-white p-0.5 rounded"
                >
                  <Copy size={11} />
                </button>
              </div>
            </div>

            {/* Changed Files list */}
            {commitDetail && commitDetail.files.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="text-[11px] font-semibold text-zinc-400 pb-1">
                  变更文件列表 ({commitDetail.files.length}):
                </div>
                {commitDetail.files.map((file) => (
                  <div
                    key={file.path}
                    onClick={() => showDiff(file.path, selectedCommit.hash)}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                      diffFile === file.path
                        ? "bg-blue-600/20 border border-blue-500/40 text-blue-200"
                        : "bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText size={13} className="text-zinc-400 shrink-0" />
                      <span className="truncate">{file.path}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                      {file.additions > 0 && (
                        <span className="text-emerald-400">+{file.additions}</span>
                      )}
                      {file.deletions > 0 && (
                        <span className="text-red-400">-{file.deletions}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            请在左侧选择一个提交查看详情
          </div>
        )}

        {/* Diff Viewer Drawer / Panel */}
        {diffFile && diffContent !== null && (
          <div className="h-2/3 border-t-2 border-zinc-700 bg-zinc-950 flex flex-col">
            <div className="h-9 px-3 bg-zinc-900 flex items-center justify-between border-b border-zinc-800 text-xs">
              <div className="flex items-center gap-2 font-medium text-zinc-200 truncate">
                <FileDiff size={14} className="text-blue-400" />
                <span className="truncate font-mono">{diffFile}</span>
              </div>
              <button
                onClick={closeDiff}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-2 font-mono text-[11px] leading-5 select-text bg-[#141416]">
              {diffContent.split("\n").map((line, idx) => {
                let lineClass = "text-zinc-300";
                if (line.startsWith("+") && !line.startsWith("+++")) {
                  lineClass = "bg-emerald-950/40 text-emerald-300";
                } else if (line.startsWith("-") && !line.startsWith("---")) {
                  lineClass = "bg-red-950/40 text-red-300";
                } else if (line.startsWith("@@")) {
                  lineClass = "text-blue-400/80 bg-blue-950/20";
                }

                return (
                  <div key={idx} className={`px-2 py-0.5 whitespace-pre ${lineClass}`}>
                    {line || " "}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
