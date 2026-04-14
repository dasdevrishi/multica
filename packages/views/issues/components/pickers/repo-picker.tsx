"use client";

import { useState, useCallback } from "react";
import { Check, GitBranch, FolderGit2, Plus, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@multica/ui/components/ui/popover";

// ---------------------------------------------------------------------------
// RepoPicker — multi-select popover for workspace repos
// ---------------------------------------------------------------------------

export interface RepoPickerValue {
  url: string;
  description: string;
  default_branch?: string;
}

export function RepoPicker({
  selected,
  workspaceRepos,
  onChange,
  triggerRender,
}: {
  selected: RepoPickerValue[];
  workspaceRepos: RepoPickerValue[];
  onChange: (repos: RepoPickerValue[]) => void;
  triggerRender?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [descInput, setDescInput] = useState("");

  const selectedUrls = new Set(selected.map((r) => r.url));

  const addRepo = useCallback(() => {
    if (!urlInput.trim()) return;
    const newRepo: RepoPickerValue = {
      url: urlInput.trim(),
      description: descInput.trim(),
    };
    onChange([...selected, newRepo]);
    setUrlInput("");
    setDescInput("");
  }, [urlInput, descInput, selected, onChange]);

  const removeRepo = useCallback(
    (url: string) => {
      onChange(selected.filter((r) => r.url !== url));
    },
    [selected, onChange],
  );

  const toggleWorkspaceRepo = useCallback(
    (repo: RepoPickerValue) => {
      if (selectedUrls.has(repo.url)) {
        onChange(selected.filter((r) => r.url !== repo.url));
      } else {
        onChange([...selected, repo]);
      }
    },
    [selected, selectedUrls, onChange],
  );

  const triggerContent = (
    <>
      <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground truncate max-w-32">
        {selected.length === 0
          ? "No repos"
          : selected.length === 1
            ? extractRepoName(selected[0]!)
            : `${selected.length} repos`}
      </span>
    </>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={triggerRender ? undefined : "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs hover:bg-accent/60 transition-colors cursor-pointer"}
        render={triggerRender}
      >
        {triggerContent}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-0 p-0">
        <div className="p-1">
          {/* Selected repos */}
          {selected.length > 0 && (
            <div className="px-2 py-2 border-b">
              <div className="text-xs font-medium text-muted-foreground mb-1.5">
                Selected ({selected.length})
              </div>
              <div className="space-y-1.5">
                {selected.map((repo) => (
                  <div
                    key={repo.url}
                    className="flex flex-col gap-1 rounded bg-accent/50 px-2 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <FolderGit2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">
                          {extractRepoName(repo)}
                        </div>
                        {repo.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {repo.description}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRepo(repo.url)}
                        className="p-0.5 hover:bg-accent rounded"
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={repo.default_branch || ""}
                      onChange={(e) => {
                        const updated = selected.map((r) =>
                          r.url === repo.url ? { ...r, default_branch: e.target.value || undefined } : r,
                        );
                        onChange(updated);
                      }}
                      placeholder="Default branch (e.g. main, develop)"
                      className="w-full bg-background text-xs placeholder:text-muted-foreground outline-none border rounded px-2 py-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add custom repo */}
          <div className="px-2 py-2 border-b">
            <div className="text-xs font-medium text-muted-foreground mb-1.5">
              Add custom repo
            </div>
            <div className="space-y-1.5">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="w-full bg-transparent text-xs placeholder:text-muted-foreground outline-none border rounded px-2 py-1"
              />
              <input
                type="text"
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                placeholder="Description (optional)"
                className="w-full bg-transparent text-xs placeholder:text-muted-foreground outline-none border rounded px-2 py-1"
              />
              <button
                type="button"
                onClick={addRepo}
                disabled={!urlInput.trim()}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>
          </div>

          {/* Workspace repos */}
          {workspaceRepos.length > 0 && (
            <div className="px-2 py-2">
              <div className="text-xs font-medium text-muted-foreground mb-1.5">
                Workspace repos
              </div>
              <div className="space-y-0.5">
                {workspaceRepos.map((repo) => {
                  const isSelected = selectedUrls.has(repo.url);
                  return (
                    <button
                      key={repo.url}
                      type="button"
                      onClick={() => toggleWorkspaceRepo(repo)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent transition-colors"
                    >
                      <Check
                        className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-foreground" : "text-transparent"}`}
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="font-medium truncate">
                          {extractRepoName(repo)}
                          {repo.default_branch && (
                            <span className="ml-1 text-muted-foreground font-normal">
                              ({repo.default_branch})
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <div className="text-muted-foreground truncate">
                            {repo.description}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function extractRepoName(repo: RepoPickerValue): string {
  if (repo.description) return repo.description;
  try {
    const url = new URL(repo.url);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    if (parts.length >= 1) return String(parts[0]);
  } catch {
    // Not a valid URL
  }
  return repo.url;
}
