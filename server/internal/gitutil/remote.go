package gitutil

import (
	"net/url"
	"strings"
)

// NormalizeURL converts a git remote URL into a canonical form for comparison.
// It handles both HTTPS and SSH URLs, stripping .git suffixes and normalizing
// the scheme so the same repo accessed via different protocols compares equal.
//
// Examples:
//
//	https://github.com/org/repo.git    → github.com/org/repo
//	git@github.com:org/repo.git        → github.com/org/repo
//	ssh://git@github.com/org/repo.git → github.com/org/repo
func NormalizeURL(raw string) string {
	if raw == "" {
		return ""
	}

	// Strip trailing .git
	raw = strings.TrimSuffix(raw, ".git")

	// Handle SSH URLs: git@host:path → https://host/path
	if strings.HasPrefix(raw, "git@") {
		parts := strings.SplitN(raw, ":", 2)
		if len(parts) == 2 {
			userHost := parts[0]
			path := parts[1]
			host := userHost
			if idx := strings.Index(host, "@"); idx >= 0 {
				host = host[idx+1:]
			}
			raw = "https://" + host + "/" + path
		}
	}

	// Handle ssh:// URLs
	if strings.HasPrefix(raw, "ssh://") {
		raw = strings.Replace(raw, "ssh://", "https://", 1)
		// Remove user@ from ssh URLs
		raw = strings.Replace(raw, "git@", "", 1)
	}

	// Handle git:// protocol
	if strings.HasPrefix(raw, "git://") {
		raw = strings.Replace(raw, "git://", "https://", 1)
	}

	// Parse as URL to clean up
	u, err := url.Parse(raw)
	if err != nil {
		// If it doesn't parse, return as-is (might be a raw path)
		return strings.ToLower(strings.TrimSpace(raw))
	}

	// Build canonical form: host + path, lowercase
	canonical := strings.ToLower(u.Host)
	if u.Path != "" {
		canonical += u.Path
	}

	// Strip leading slash if present
	canonical = strings.TrimPrefix(canonical, "/")

	return canonical
}
