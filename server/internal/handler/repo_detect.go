package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/multica-ai/multica/server/internal/gitutil"
)

// ScanReposRequest is the request body for scanning a folder for git repos.
type ScanReposRequest struct {
	Path string `json:"path"`
}

// ScanReposResponse is the response from scanning a folder.
type ScanReposResponse struct {
	Detected []gitutil.DetectedRepo `json:"detected"`
}

// ScanRepos scans a given folder path for git repositories.
// POST /api/daemon/scan-repos
func (h *Handler) ScanRepos(w http.ResponseWriter, r *http.Request) {
	var req ScanReposRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Path == "" {
		writeError(w, http.StatusBadRequest, "path is required")
		return
	}

	slog.Info("scanning for git repos", "path", req.Path)

	// Default skip directories
	skipDirs := map[string]bool{
		".git":         true,
		"node_modules": true,
		".trash":       true,
		".cache":       true,
		"vendor":       true,
		".venv":        true,
		"__pycache__":  true,
		".next":        true,
		".turbo":       true,
		"dist":         true,
		"build":        true,
		".output":      true,
	}

	detected, err := gitutil.ScanRepos(req.Path, 4, skipDirs)
	if err != nil {
		slog.Warn("error scanning repos", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to scan directory")
		return
	}

	writeJSON(w, http.StatusOK, ScanReposResponse{Detected: detected})
}
