import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import {
  FileEntry,
  GitCommitDetail,
  GitCommitItem,
  GitStatusResult,
  PathInfo,
} from "../types";

export type ViewMode = "git" | "code" | "markdown";
export type MarkdownMode = "preview" | "raw" | "split";

interface AppState {
  rootPath: string | null;
  gitRoot: string | null;
  currentFilePath: string | null;
  currentFileName: string | null;
  fileContent: string;
  originalContent: string;
  isDirty: boolean;

  viewMode: ViewMode;
  markdownMode: MarkdownMode;
  sidebarOpen: boolean;
  searchQuery: string;

  // Tree state
  rootEntries: FileEntry[];
  folderChildren: Record<string, FileEntry[]>;
  expandedPaths: Record<string, boolean>;
  loadingPaths: Record<string, boolean>;

  // Git state
  gitCommits: GitCommitItem[];
  gitStatus: GitStatusResult | null;
  selectedCommit: GitCommitItem | null;
  commitDetail: GitCommitDetail | null;
  diffFile: string | null;
  diffContent: string | null;

  isLoading: boolean;
  statusMessage: string | null;

  // Actions
  init: () => Promise<void>;
  openFolder: (folderPath: string) => Promise<void>;
  previewFile: (filePath: string) => Promise<void>;
  pickFolder: () => Promise<void>;
  pickFile: () => Promise<void>;
  toggleFolder: (folderPath: string) => Promise<void>;
  selectFile: (filePath: string) => Promise<void>;
  setFileContent: (content: string) => void;
  saveCurrentFile: () => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
  setMarkdownMode: (mode: MarkdownMode) => void;
  setSearchQuery: (query: string) => void;
  toggleSidebar: () => void;
  refreshGit: () => Promise<void>;
  selectCommit: (commit: GitCommitItem) => Promise<void>;
  showDiff: (filePath: string, hash?: string, staged?: boolean) => Promise<void>;
  closeDiff: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  rootPath: null,
  gitRoot: null,
  currentFilePath: null,
  currentFileName: null,
  fileContent: "",
  originalContent: "",
  isDirty: false,

  viewMode: "markdown",
  markdownMode: "preview",
  sidebarOpen: true,
  searchQuery: "",

  rootEntries: [],
  folderChildren: {},
  expandedPaths: {},
  loadingPaths: {},

  gitCommits: [],
  gitStatus: null,
  selectedCommit: null,
  commitDetail: null,
  diffFile: null,
  diffContent: null,

  isLoading: false,
  statusMessage: null,

  init: async () => {
    try {
      const cliArg = await invoke<string | null>("get_cli_arg");
      if (cliArg) {
        const info = await invoke<PathInfo>("get_path_info", { targetPath: cliArg });
        if (info.is_dir) {
          await get().openFolder(info.path);
        } else {
          // It's a file, preview it without changing left tree
          await get().previewFile(info.path);
        }
      }
    } catch (err) {
      console.error("Init error:", err);
    }
  },

  openFolder: async (folderPath: string) => {
    set({ isLoading: true, statusMessage: "正在打开目录..." });
    try {
      const info = await invoke<PathInfo>("get_path_info", { targetPath: folderPath });
      const entries = await invoke<FileEntry[]>("read_dir", { dirPath: folderPath });

      set({
        rootPath: folderPath,
        gitRoot: info.git_root,
        rootEntries: entries,
        folderChildren: {},
        expandedPaths: {},
        loadingPaths: {},
      });

      if (info.git_root) {
        await get().refreshGit();
        set({ viewMode: "git" });
      } else {
        set({ viewMode: "code" });
      }
    } catch (err: any) {
      console.error("Failed to open folder:", err);
    } finally {
      set({ isLoading: false, statusMessage: null });
    }
  },

  toggleFolder: async (folderPath: string) => {
    const { expandedPaths, folderChildren, loadingPaths } = get();
    const isExpanded = !!expandedPaths[folderPath];

    if (isExpanded) {
      // Collapse
      set({
        expandedPaths: { ...expandedPaths, [folderPath]: false },
      });
      return;
    }

    // Expand
    set({
      expandedPaths: { ...expandedPaths, [folderPath]: true },
    });

    // Load children if not cached yet
    if (!folderChildren[folderPath]) {
      set({ loadingPaths: { ...loadingPaths, [folderPath]: true } });
      try {
        const children = await invoke<FileEntry[]>("read_dir", { dirPath: folderPath });
        set((s) => ({
          folderChildren: { ...s.folderChildren, [folderPath]: children },
          loadingPaths: { ...s.loadingPaths, [folderPath]: false },
        }));
      } catch (err) {
        console.error("Failed to read folder children:", err);
        set((s) => ({
          loadingPaths: { ...s.loadingPaths, [folderPath]: false },
        }));
      }
    }
  },

  previewFile: async (filePath: string) => {
    // Open a file as a temporary preview, without touching the current rootPath or tree!
    await get().selectFile(filePath);
  },

  pickFolder: async () => {
    try {
      const folder = await invoke<string | null>("pick_folder");
      if (folder) {
        await get().openFolder(folder);
      }
    } catch (err) {
      console.error("Pick folder error:", err);
    }
  },

  pickFile: async () => {
    try {
      const file = await invoke<string | null>("pick_file");
      if (file) {
        // Preview file without modifying left directory
        await get().previewFile(file);
      }
    } catch (err) {
      console.error("Pick file error:", err);
    }
  },

  selectFile: async (filePath: string) => {
    set({ isLoading: true });
    try {
      const content = await invoke<string>("read_file", { filePath });
      const sep = filePath.includes("/") ? "/" : "\\";
      const fileName = filePath.substring(filePath.lastIndexOf(sep) + 1);
      const isMd = fileName.toLowerCase().endsWith(".md") || fileName.toLowerCase().endsWith(".markdown");

      set({
        currentFilePath: filePath,
        currentFileName: fileName,
        fileContent: content,
        originalContent: content,
        isDirty: false,
        viewMode: isMd ? "markdown" : "code",
      });
    } catch (err: any) {
      console.error("Failed to read file:", err);
      set({ statusMessage: `无法读取文件: ${err?.message || err}` });
    } finally {
      set({ isLoading: false });
    }
  },

  setFileContent: (content: string) => {
    const isDirty = content !== get().originalContent;
    set({ fileContent: content, isDirty });
  },

  saveCurrentFile: async () => {
    const { currentFilePath, fileContent } = get();
    if (!currentFilePath) return;

    try {
      await invoke("write_file", { filePath: currentFilePath, content: fileContent });
      set({ originalContent: fileContent, isDirty: false, statusMessage: "文件已保存" });
      setTimeout(() => set({ statusMessage: null }), 2000);
    } catch (err: any) {
      console.error("Save error:", err);
      set({ statusMessage: `保存失败: ${err?.message || err}` });
    }
  },

  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
  setMarkdownMode: (mode: MarkdownMode) => set({ markdownMode: mode }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  refreshGit: async () => {
    const gitRoot = get().gitRoot;
    if (!gitRoot) return;

    try {
      const [status, commits] = await Promise.all([
        invoke<GitStatusResult>("get_git_status", { repoPath: gitRoot }),
        invoke<GitCommitItem[]>("get_git_log", { repoPath: gitRoot, limit: 100 }),
      ]);

      set({
        gitStatus: status,
        gitCommits: commits,
      });

      // Default select first commit if none selected
      if (!get().selectedCommit && commits.length > 0) {
        await get().selectCommit(commits[0]);
      }
    } catch (err) {
      console.error("Refresh git error:", err);
    }
  },

  selectCommit: async (commit: GitCommitItem) => {
    const gitRoot = get().gitRoot;
    if (!gitRoot) return;

    set({ selectedCommit: commit, diffFile: null, diffContent: null });
    try {
      const detail = await invoke<GitCommitDetail>("get_commit_detail", {
        repoPath: gitRoot,
        hash: commit.hash,
      });
      set({ commitDetail: detail });
    } catch (err) {
      console.error("Get commit detail error:", err);
    }
  },

  showDiff: async (filePath: string, hash?: string, staged?: boolean) => {
    const gitRoot = get().gitRoot;
    if (!gitRoot) return;

    try {
      const diff = await invoke<string>("get_file_diff", {
        repoPath: gitRoot,
        hash: hash || null,
        filePath,
        staged: staged || false,
      });
      set({
        diffFile: filePath,
        diffContent: diff,
      });
    } catch (err) {
      console.error("Show diff error:", err);
    }
  },

  closeDiff: () => set({ diffFile: null, diffContent: null }),
}));
