"use client";

import { useState } from "react";
import { FolderSearch, Plus, GitBranch, Globe } from "lucide-react";
import { Input } from "@multica/ui/components/ui/input";
import { Button } from "@multica/ui/components/ui/button";
import { Card, CardContent } from "@multica/ui/components/ui/card";
import { Checkbox } from "@multica/ui/components/ui/checkbox";
import { toast } from "sonner";
import { api } from "@multica/core/api";
import { useWorkspaceStore } from "@multica/core/workspace";
import type { DetectedRepo, WorkspaceRepo } from "@multica/core/types";

interface RepoScannerProps {}

export function RepoScanner(_props: RepoScannerProps) {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const updateWorkspace = useWorkspaceStore((s) => s.updateWorkspace);

  const [folderPath, setFolderPath] = useState("");
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState<DetectedRepo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const existingUrls = new Set((workspace?.repos ?? []).map((r) => r.url));

  const handleScan = async () => {
    if (!folderPath.trim()) {
      toast.error("Please enter a folder path");
      return;
    }

    setScanning(true);
    setDetected([]);
    setSelected(new Set());

    try {
      const res = await api.scanRepos(folderPath.trim());
      // Filter out already-registered repos
      const newRepos = res.detected.filter(
        (r) => r.remote_url && !existingUrls.has(r.remote_url)
      );
      setDetected(newRepos);
      if (newRepos.length === 0) {
        toast.info("No new repositories found");
      } else {
        toast.success(`Found ${newRepos.length} new repo(s)`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to scan folder");
      setDetected([]);
    } finally {
      setScanning(false);
    }
  };

  const toggleSelect = (remoteUrl: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(remoteUrl)) {
        next.delete(remoteUrl);
      } else {
        next.add(remoteUrl);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(detected.map((r) => r.remote_url)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const handleAddSelected = async () => {
    if (!workspace || selected.size === 0) return;

    setSaving(true);
    try {
      const newRepos: WorkspaceRepo[] = detected
        .filter((r) => selected.has(r.remote_url))
        .map((r) => ({
          url: r.remote_url,
          description: r.description || r.local_path.split("/").pop() || "",
          default_branch: r.default_branch || undefined,
        }));

      const currentRepos = workspace.repos ?? [];
      const updated = await api.updateWorkspace(workspace.id, {
        repos: [...currentRepos, ...newRepos],
      });
      updateWorkspace(updated);

      toast.success(`Added ${newRepos.length} repo(s) to workspace`);
      setDetected([]);
      setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add repos");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          value={folderPath}
          onChange={(e) => setFolderPath(e.target.value)}
          placeholder="/path/to/your/project/folder"
          className="text-sm flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleScan();
          }}
        />
        <Button
          size="sm"
          onClick={handleScan}
          disabled={scanning || !folderPath.trim()}
        >
          <FolderSearch className="h-3.5 w-3.5" />
          {scanning ? "Scanning..." : "Scan"}
        </Button>
      </div>

      {detected.length > 0 && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {detected.length} repo(s) found — select the ones to add
              </p>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={selectAll} className="h-6 text-xs">
                  Select all
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll} className="h-6 text-xs">
                  Deselect all
                </Button>
              </div>
            </div>

            {detected.map((repo) => (
              <div
                key={repo.remote_url}
                className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-accent/50"
              >
                <Checkbox
                  checked={selected.has(repo.remote_url)}
                  onCheckedChange={() => toggleSelect(repo.remote_url)}
                  className="mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{repo.description || repo.remote_url}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {repo.remote_url}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {repo.current_branch || "—"}
                    </span>
                    <span className="font-mono truncate" title={repo.local_path}>
                      {repo.local_path}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <Button
              size="sm"
              onClick={handleAddSelected}
              disabled={selected.size === 0 || saving}
            >
              <Plus className="h-3 w-3" />
              {saving ? "Adding..." : `Add ${selected.size} repo(s)`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
