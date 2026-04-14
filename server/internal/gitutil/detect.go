package gitutil

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// DetectedRepo represents a git repository found on disk.
type DetectedRepo struct {
	LocalPath      string            `json:"local_path"`
	RemoteURL      string            `json:"remote_url"`
	CurrentBranch  string            `json:"current_branch,omitempty"`
	Remotes        map[string]string `json:"remotes"`
	Description    string            `json:"description,omitempty"`
	DefaultBranch  string            `json:"default_branch,omitempty"`
}

// ScanRepos walks the given root path and returns all git repos found.
// It searches up to `maxDepth` levels deep and skips directories in `skipDirs`.
func ScanRepos(root string, maxDepth int, skipDirs map[string]bool) ([]DetectedRepo, error) {
	var results []DetectedRepo

	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			// Skip unreadable directories
			return filepath.SkipDir
		}

		depth := depthFromRoot(root, path)
		if depth > maxDepth {
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		if !d.IsDir() {
			return nil
		}

		base := d.Name()

		// Skip common non-project directories
		if skipDirs[base] {
			return filepath.SkipDir
		}

		gitPath := filepath.Join(path, ".git")
		if !isGitRepo(gitPath) {
			return nil
		}

		repo, err := extractRepoInfo(path)
		if err != nil {
			// If we can't extract info, still report the path
			results = append(results, DetectedRepo{LocalPath: path})
			return nil
		}

		results = append(results, *repo)

		// Don't descend into .git
		if base == ".git" {
			return filepath.SkipDir
		}

		return nil
	})

	return results, err
}

// isGitRepo checks if the given path is a git directory (bare or worktree).
func isGitRepo(gitPath string) bool {
	info, err := os.Stat(gitPath)
	if err != nil {
		return false
	}
	if info.IsDir() {
		// Regular .git directory
		return true
	}
	// Could be a .git file (worktree or submodule) — read it and check
	if !info.Mode().IsRegular() {
		return false
	}
	data, err := os.ReadFile(gitPath)
	if err != nil {
		return false
	}
	// Worktree .git files contain: gitdir: /path/to/real/.git
	return strings.HasPrefix(string(data), "gitdir:")
}

// extractRepoInfo runs git commands to extract remote and branch info.
func extractRepoInfo(path string) (*DetectedRepo, error) {
	// Get origin remote URL
	originURL, err := runGit(path, "remote", "get-url", "origin")
	if err != nil {
		// No origin — try to get any remote
		allRemotes, _ := runGit(path, "remote")
		if allRemotes == "" {
			return &DetectedRepo{LocalPath: path}, nil
		}
		firstRemote := strings.Split(allRemotes, "\n")[0]
		originURL, _ = runGit(path, "remote", "get-url", firstRemote)
	}

	// Get all remotes
	remotes := make(map[string]string)
	remoteNames, err := runGit(path, "remote")
	if err == nil && remoteNames != "" {
		for _, name := range strings.Split(strings.TrimSpace(remoteNames), "\n") {
			name = strings.TrimSpace(name)
			if name == "" {
				continue
			}
			url, _ := runGit(path, "remote", "get-url", name)
			if url != "" {
				remotes[name] = url
			}
		}
	}

	// Get current branch
	currentBranch, _ := runGit(path, "branch", "--show-current")

	// Get default branch
	defaultBranch, _ := runGit(path, "remote", "show", "origin")
	defaultBranch = parseDefaultBranch(defaultBranch)

	// Derive description from repo name
	repoName := filepath.Base(path)

	return &DetectedRepo{
		LocalPath:     path,
		RemoteURL:     NormalizeURL(originURL),
		CurrentBranch: currentBranch,
		Remotes:       remotes,
		Description:   repoName,
		DefaultBranch: defaultBranch,
	}, nil
}

// runGit executes a git command in the given directory and returns trimmed stdout.
func runGit(workDir string, args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = workDir
	cmd.Stderr = nil // suppress stderr
	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}

// parseDefaultBranch extracts the default branch from `git remote show origin` output.
func parseDefaultBranch(output string) string {
	for _, line := range strings.Split(output, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "HEAD branch:") {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				return strings.TrimSpace(parts[1])
			}
		}
	}
	return ""
}

// depthFromRoot calculates how many levels deep `path` is from `root`.
func depthFromRoot(root, path string) int {
	rel, err := filepath.Rel(root, path)
	if err != nil {
		return 0
	}
	if rel == "." {
		return 0
	}
	return strings.Count(rel, string(filepath.Separator)) + 1
}
