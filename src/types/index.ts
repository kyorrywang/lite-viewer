export interface PathInfo {
  path: string;
  is_dir: boolean;
  file_name: string;
  git_root: string | null;
}

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  ext: string;
}

export interface GitCommitItem {
  hash: string;
  short_hash: string;
  parents: string[];
  author_name: string;
  author_email: string;
  author_timestamp: number;
  date: string;
  ref_names: string[];
  subject: string;
}

export interface GitChangedFile {
  path: string;
  status: string;
  staged: boolean;
}

export interface GitStatusResult {
  branch: string;
  upstream?: string;
  ahead: number;
  behind: number;
  files: GitChangedFile[];
  ignored_paths: string[];
}

export interface CommitFileStat {
  path: string;
  additions: number;
  deletions: number;
}

export interface GitCommitDetail {
  hash: string;
  full_message: string;
  stats_summary: string;
  files: CommitFileStat[];
}
