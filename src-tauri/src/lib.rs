use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

fn create_hidden_command(program: &str) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PathInfo {
    pub path: String,
    pub is_dir: bool,
    pub file_name: String,
    pub git_root: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub ext: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitCommitItem {
    pub hash: String,
    pub short_hash: String,
    pub parents: Vec<String>,
    pub author_name: String,
    pub author_email: String,
    pub author_timestamp: i64,
    pub date: String,
    pub ref_names: Vec<String>,
    pub subject: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitChangedFile {
    pub path: String,
    pub status: String,
    pub staged: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitStatusResult {
    pub branch: String,
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub files: Vec<GitChangedFile>,
    pub ignored_paths: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommitFileStat {
    pub path: String,
    pub additions: i32,
    pub deletions: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitCommitDetail {
    pub hash: String,
    pub full_message: String,
    pub stats_summary: String,
    pub files: Vec<CommitFileStat>,
}

#[tauri::command]
fn get_cli_arg() -> Option<String> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 {
        let candidate = &args[1];
        if !candidate.starts_with("--") {
            let p = Path::new(candidate);
            if p.exists() {
                return Some(candidate.to_string());
            }
        }
    }
    None
}

#[tauri::command]
fn pick_folder() -> Option<String> {
    rfd::FileDialog::new()
        .pick_folder()
        .map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn pick_file() -> Option<String> {
    rfd::FileDialog::new()
        .add_filter("All Files / Markdown", &["*", "md", "markdown", "txt"])
        .pick_file()
        .map(|p| p.to_string_lossy().to_string())
}

fn find_git_root(path: &Path) -> Option<String> {
    let check_dir = if path.is_file() {
        path.parent()?
    } else {
        path
    };

    let output = create_hidden_command("git")
        .args(["-C", &check_dir.to_string_lossy(), "rev-parse", "--show-toplevel"])
        .output()
        .ok()?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !stdout.is_empty() {
            return Some(stdout.replace('/', "\\"));
        }
    }
    None
}

#[tauri::command]
fn get_path_info(target_path: String) -> Result<PathInfo, String> {
    let path = Path::new(&target_path);
    if !path.exists() {
        return Err(format!("Path does not exist: {}", target_path));
    }

    let is_dir = path.is_dir();
    let file_name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| target_path.clone());

    let git_root = find_git_root(path);

    Ok(PathInfo {
        path: target_path,
        is_dir,
        file_name,
        git_root,
    })
}

#[tauri::command]
fn read_dir(dir_path: String) -> Result<Vec<FileEntry>, String> {
    let path = Path::new(&dir_path);
    if !path.is_dir() {
        return Err("Not a directory".into());
    }

    let mut entries = Vec::new();
    let read_res = fs::read_dir(path).map_err(|e| e.to_string())?;

    for item in read_res.flatten() {
        let p = item.path();
        let name = item.file_name().to_string_lossy().to_string();

        // Only filter out the internal .git metadata folder
        if name == ".git" {
            continue;
        }

        let is_dir = p.is_dir();
        let ext = p
            .extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_default();

        entries.push(FileEntry {
            name,
            path: p.to_string_lossy().to_string(),
            is_dir,
            ext,
        });
    }

    // Sort folders first, then alphabetical
    entries.sort_by(|a, b| {
        if a.is_dir != b.is_dir {
            b.is_dir.cmp(&a.is_dir)
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    Ok(entries)
}

#[tauri::command]
fn read_file(file_path: String) -> Result<String, String> {
    let bytes = fs::read(&file_path).map_err(|e| e.to_string())?;
    // Return string lossy or normal
    Ok(String::from_utf8_lossy(&bytes).to_string())
}

#[tauri::command]
fn write_file(file_path: String, content: String) -> Result<(), String> {
    fs::write(&file_path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_git_status(repo_path: String) -> Result<GitStatusResult, String> {
    let output = create_hidden_command("git")
        .args(["-C", &repo_path, "status", "--porcelain=v1", "-b", "--ignored=traditional"])
        .output()
        .map_err(|e| format!("Failed to run git status: {}", e))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(err.to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut lines = stdout.lines();

    let mut branch = String::from("HEAD");
    let mut upstream = None;
    let mut ahead = 0;
    let mut behind = 0;
    let mut files = Vec::new();
    let mut ignored_paths = Vec::new();

    if let Some(header) = lines.next() {
        // e.g. ## main...origin/main [ahead 1, behind 2]
        if let Some(branch_part) = header.strip_prefix("## ") {
            let parts: Vec<&str> = branch_part.split("...").collect();
            if !parts.is_empty() {
                branch = parts[0].trim().to_string();
            }
            if parts.len() > 1 {
                let rest = parts[1];
                if let Some(bracket_idx) = rest.find(" [") {
                    upstream = Some(rest[..bracket_idx].trim().to_string());
                    let tracking_info = &rest[bracket_idx..];
                    if let Some(ahead_idx) = tracking_info.find("ahead ") {
                        let sub = &tracking_info[ahead_idx + 6..];
                        let num_str: String = sub.chars().take_while(|c| c.is_ascii_digit()).collect();
                        ahead = num_str.parse().unwrap_or(0);
                    }
                    if let Some(behind_idx) = tracking_info.find("behind ") {
                        let sub = &tracking_info[behind_idx + 7..];
                        let num_str: String = sub.chars().take_while(|c| c.is_ascii_digit()).collect();
                        behind = num_str.parse().unwrap_or(0);
                    }
                } else {
                    upstream = Some(rest.trim().to_string());
                }
            }
        }
    }

    for line in lines {
        if line.len() < 3 {
            continue;
        }
        let index_status = &line[0..1];
        let worktree_status = &line[1..2];
        let file_path = line[3..].trim().to_string();

        if index_status == "!" && worktree_status == "!" {
            ignored_paths.push(file_path);
            continue;
        }

        let is_staged = index_status != " " && index_status != "?";
        let status = if index_status != " " && index_status != "?" {
            index_status.to_string()
        } else {
            worktree_status.to_string()
        };

        files.push(GitChangedFile {
            path: file_path,
            status,
            staged: is_staged,
        });
    }

    Ok(GitStatusResult {
        branch,
        upstream,
        ahead,
        behind,
        files,
        ignored_paths,
    })
}

#[tauri::command]
fn get_git_log(repo_path: String, limit: Option<usize>) -> Result<Vec<GitCommitItem>, String> {
    let limit_num = limit.unwrap_or(60);
    // Use %x1f (Unit Separator) and %x1e (Record Separator)
    let format_str = "%H%x1f%h%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%ad%x1f%D%x1f%s%x1e";
    let limit_arg = format!("-n{}", limit_num);

    let output = create_hidden_command("git")
        .args([
            "-C",
            &repo_path,
            "log",
            &limit_arg,
            &format!("--pretty=format:{}", format_str),
            "--date=iso",
        ])
        .output()
        .map_err(|e| format!("Failed to run git log: {}", e))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(err.to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut commits = Vec::new();

    for record in stdout.split('\x1e') {
        let trimmed = record.trim();
        if trimmed.is_empty() {
            continue;
        }

        let fields: Vec<&str> = trimmed.split('\x1f').collect();
        if fields.len() >= 9 {
            let hash = fields[0].to_string();
            let short_hash = fields[1].to_string();
            let parents = fields[2]
                .split_whitespace()
                .map(|s| s.to_string())
                .collect();
            let author_name = fields[3].to_string();
            let author_email = fields[4].to_string();
            let author_timestamp = fields[5].parse::<i64>().unwrap_or(0);
            let date = fields[6].to_string();

            let ref_names = if !fields[7].trim().is_empty() {
                fields[7]
                    .split(',')
                    .map(|r| r.trim().replace("HEAD -> ", "").replace("HEAD", "").trim().to_string())
                    .filter(|r| !r.is_empty())
                    .collect()
            } else {
                Vec::new()
            };

            let subject = fields[8].to_string();

            commits.push(GitCommitItem {
                hash,
                short_hash,
                parents,
                author_name,
                author_email,
                author_timestamp,
                date,
                ref_names,
                subject,
            });
        }
    }

    Ok(commits)
}

#[tauri::command]
fn get_commit_detail(repo_path: String, hash: String) -> Result<GitCommitDetail, String> {
    // 1. Get full commit message
    let msg_output = create_hidden_command("git")
        .args(["-C", &repo_path, "show", "-s", "--format=%B", &hash])
        .output()
        .map_err(|e| format!("Failed to get commit message: {}", e))?;

    let full_message = String::from_utf8_lossy(&msg_output.stdout).trim().to_string();

    // 2. Get stats summary (e.g. 3 files changed, 10 insertions(+), 2 deletions(-))
    let summary_output = create_hidden_command("git")
        .args(["-C", &repo_path, "show", "--shortstat", "--format=", &hash])
        .output()
        .map_err(|e| format!("Failed to get commit summary: {}", e))?;

    let stats_summary = String::from_utf8_lossy(&summary_output.stdout).trim().to_string();

    // 3. Get changed files with numstat
    let numstat_output = create_hidden_command("git")
        .args(["-C", &repo_path, "show", "--numstat", "--format=", &hash])
        .output()
        .map_err(|e| format!("Failed to get commit numstat: {}", e))?;

    let numstat_str = String::from_utf8_lossy(&numstat_output.stdout);
    let mut files = Vec::new();

    for line in numstat_str.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 3 {
            let additions = parts[0].parse::<i32>().unwrap_or(0);
            let deletions = parts[1].parse::<i32>().unwrap_or(0);
            let path = parts[2..].join(" ");
            files.push(CommitFileStat {
                path,
                additions,
                deletions,
            });
        }
    }

    Ok(GitCommitDetail {
        hash,
        full_message,
        stats_summary,
        files,
    })
}

#[tauri::command]
fn get_file_diff(
    repo_path: String,
    hash: Option<String>,
    file_path: String,
    staged: Option<bool>,
) -> Result<String, String> {
    let mut cmd = create_hidden_command("git");
    cmd.args(["-C", &repo_path]);

    if let Some(h) = hash {
        // Show commit diff for this file
        cmd.args(["show", &h, "--", &file_path]);
    } else {
        // Uncommitted changes diff
        if staged.unwrap_or(false) {
            cmd.args(["diff", "--cached", "--", &file_path]);
        } else {
            cmd.args(["diff", "--", &file_path]);
        }
    }

    let output = cmd.output().map_err(|e| format!("Diff error: {}", e))?;
    let diff = String::from_utf8_lossy(&output.stdout).to_string();

    if diff.is_empty() {
        // Maybe it's untracked file, try reading content
        let full_p = Path::new(&repo_path).join(&file_path);
        if full_p.is_file() {
            if let Ok(content) = fs::read_to_string(&full_p) {
                let mut fake_diff = format!("--- /dev/null\n+++ b/{}\n", file_path);
                for line in content.lines() {
                    fake_diff.push('+');
                    fake_diff.push_str(line);
                    fake_diff.push('\n');
                }
                return Ok(fake_diff);
            }
        }
    }

    Ok(diff)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_cli_arg,
            pick_folder,
            pick_file,
            get_path_info,
            read_dir,
            read_file,
            write_file,
            get_git_status,
            get_git_log,
            get_commit_detail,
            get_file_diff
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
