import { Loader2, RefreshCw, Unplug } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchAuthConfig,
  fetchDefaultProject,
  fetchParsedResume,
  fetchProjects,
  fetchResumeFiles,
  refreshOverleafSession,
} from "./api";
import {
  ConnectPanel,
  disconnectOverleaf,
  restoreSessionFromStorage,
} from "./ConnectPanel";
import { CopyButton } from "./CopyButton";
import { FileListSkeleton, LoadingPanel, type LoadPhase } from "./LoadingPanel";
import type { ParsedResume, Project, TexFile } from "./types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function App() {
  const [connected, setConnected] = useState(false);
  const [authHint, setAuthHint] = useState<string | null>(null);
  const [envConfigured, setEnvConfigured] = useState(false);
  const [booting, setBooting] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [files, setFiles] = useState<TexFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [loadPhase, setLoadPhase] = useState<LoadPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resumeCache = useRef(new Map<string, ParsedResume>());
  const clearResumeCache = useCallback(() => {
    resumeCache.current.clear();
  }, []);

  const activeProject = projects.find((p) => p.id === projectId);
  const busy = loadPhase !== null;

  const loadFiles = useCallback(
    async (pid: string, bust: number) => {
      const f = await fetchResumeFiles(pid, bust);
      setFiles(f);
      setSelectedPath((prev) =>
        f.some((x) => x.path === prev) ? prev : (f[0]?.path ?? ""),
      );
      return f;
    },
    [],
  );

  const loadResume = useCallback(
    async (pid: string, path: string, cacheBust?: number) => {
      const key = `${pid}:${path}`;
      if (cacheBust == null) {
        const cached = resumeCache.current.get(key);
        if (cached) {
          setResume(cached);
          return cached;
        }
      }
      const r = await fetchParsedResume(pid, path, cacheBust);
      resumeCache.current.set(key, r);
      setResume(r);
      return r;
    },
    [],
  );

  const loadProjects = useCallback(async () => {
    setError(null);
    setLoadPhase("projects");
    try {
      const [list, defaults] = await Promise.all([
        fetchProjects(),
        fetchDefaultProject(),
      ]);
      setProjects(list);
      const saved = localStorage.getItem("resume_project_id");
      const initial =
        saved && list.some((p) => p.id === saved)
          ? saved
          : (defaults.project_id && list.some((p) => p.id === defaults.project_id)
              ? defaults.project_id
              : (list[0]?.id ?? ""));
      if (!initial) {
        setError(
          list.length
            ? "Could not pick a project."
            : "No Overleaf projects found. Check your session token.",
        );
        return;
      }
      setProjectId(initial);

      setLoadPhase("files");
      const f = await loadFiles(initial, Date.now());
      const path = f[0]?.path ?? "";
      if (!path) {
        setResume(null);
        setError("No resume .tex files found in this project.");
        return;
      }
      setLoadPhase("resume");
      await loadResume(initial, path, Date.now());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not reach API. Run: pants run src/python/api:server",
      );
    } finally {
      setLoadPhase(null);
    }
  }, [loadFiles, loadResume]);

  const refreshAll = useCallback(async () => {
    setError(null);
    setLoadPhase("refresh");
    const bust = Date.now();
    try {
      clearResumeCache();
      await refreshOverleafSession();
      setLoadPhase("projects");
      const list = await fetchProjects(bust);
      setProjects(list);

      const pid =
        projectId && list.some((p) => p.id === projectId)
          ? projectId
          : (localStorage.getItem("resume_project_id") ??
            (await fetchDefaultProject()).project_id ??
            list[0]?.id ??
            "");

      if (pid && pid !== projectId) {
        setProjectId(pid);
      }

      const activeId = pid || projectId;
      if (!activeId) {
        setLoadPhase(null);
        return;
      }

      setLoadPhase("files");
      const f = await loadFiles(activeId, bust);
      const path =
        selectedPath && f.some((x) => x.path === selectedPath)
          ? selectedPath
          : (f[0]?.path ?? "");
      if (path) {
        setLoadPhase("resume");
        await loadResume(activeId, path, bust);
      } else {
        setResume(null);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Refresh failed. Is the API running?",
      );
    } finally {
      setLoadPhase(null);
    }
  }, [projectId, selectedPath, loadFiles, loadResume, clearResumeCache]);

  const handleConnected = useCallback(() => {
    skipProjectEffect.current = true;
    setConnected(true);
    setError(null);
    loadProjects();
  }, [loadProjects]);

  const handleDisconnect = useCallback(async () => {
    await disconnectOverleaf();
    clearResumeCache();
    setConnected(false);
    setProjects([]);
    setProjectId("");
    setFiles([]);
    setSelectedPath("");
    setResume(null);
    setAuthHint(null);
    setEnvConfigured(false);
    setLoadPhase(null);
    setError(null);
  }, [clearResumeCache]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const auth = await fetchAuthConfig();
        if (cancelled) return;
        setAuthHint(auth.hint);
        setEnvConfigured(auth.env_configured);
        if (auth.configured) {
          skipProjectEffect.current = true;
          setConnected(true);
          await loadProjects();
          return;
        }
        const restored = await restoreSessionFromStorage(() => {
          if (!cancelled) setConnected(true);
        });
        if (cancelled) return;
        if (restored) {
          skipProjectEffect.current = true;
          setAuthHint("Using cookies pasted in this app session");
          await loadProjects();
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Could not reach API. Run: pants run src/python/api:server",
          );
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProjects]);

  const loadProjectData = useCallback(
    async (pid: string, preferredPath?: string) => {
      if (!pid) return;
      setError(null);
      localStorage.setItem("resume_project_id", pid);
      setResume(null);
      const bust = Date.now();
      setLoadPhase("files");
      try {
        const f = await loadFiles(pid, bust);
        const path =
          preferredPath && f.some((x) => x.path === preferredPath)
            ? preferredPath
            : (f[0]?.path ?? "");
        if (!path) {
          setResume(null);
          setError("No resume .tex files found in this project.");
          return;
        }
        setLoadPhase("resume");
        await loadResume(pid, path, bust);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to load project",
        );
      } finally {
        setLoadPhase(null);
      }
    },
    [loadFiles, loadResume],
  );

  const skipProjectEffect = useRef(true);

  useEffect(() => {
    if (!connected || !projectId) return;
    if (skipProjectEffect.current) {
      skipProjectEffect.current = false;
      return;
    }
    void loadProjectData(projectId);
  }, [projectId, connected, loadProjectData]);

  const handleProjectChange = useCallback(
    (pid: string) => {
      skipProjectEffect.current = true;
      setProjectId(pid);
      void loadProjectData(pid);
    },
    [loadProjectData],
  );

  const handleFileSelect = useCallback(
    (path: string) => {
      if (!projectId || !path) return;
      if (path === selectedPath && resume?.source_path === path) return;
      setSelectedPath(path);
      setError(null);
      const cached = resumeCache.current.get(`${projectId}:${path}`);
      if (cached) {
        setResume(cached);
        return;
      }
      setLoadPhase("resume");
      loadResume(projectId, path)
        .catch((e) => {
          setError(
            e instanceof Error ? e.message : "Failed to parse resume",
          );
        })
        .finally(() => setLoadPhase(null));
    },
    [projectId, loadResume, selectedPath, resume],
  );

  const showLoader = loadPhase !== null;
  const displayPhase: LoadPhase =
    loadPhase === "refresh" ? "files" : (loadPhase ?? "projects");

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <LoadingPanel phase="projects" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen">
        {error && (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}
        <ConnectPanel
          onConnected={handleConnected}
          envConfigured={envConfigured}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary font-serif text-xl text-primary-foreground">
              §
            </span>
            <div>
              <h1 className="font-serif text-lg font-semibold tracking-tight">
                Resume Clipboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Overleaf → parsed sections → one-click copy
              </p>
              {authHint && (
                <p className="mt-0.5 text-xs text-primary">{authHint}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={busy}
            >
              <Unplug className="size-4" />
              Change session
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refreshAll}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {loadPhase === "refresh" ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-0 px-4 py-6 sm:px-6 lg:gap-6">
        <aside
          className={cn(
            "w-full shrink-0 space-y-4 lg:w-64",
            busy && "pointer-events-none opacity-60",
          )}
        >
          <div className="space-y-2">
            <Label>Overleaf project</Label>
            <Select
              value={projectId}
              onValueChange={(v) => {
                if (v) handleProjectChange(v);
              }}
              disabled={!projects.length || busy}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-muted-foreground">Resume files</Label>
            {loadPhase === "files" || loadPhase === "projects" ? (
              <FileListSkeleton />
            ) : (
              <ScrollArea className="h-[min(50vh,420px)]">
                <ul className="space-y-1 pr-3">
                  {files.map((f) => (
                    <li key={f.path}>
                      <Button
                        type="button"
                        variant={f.path === selectedPath ? "secondary" : "ghost"}
                        size="sm"
                        className="h-auto w-full justify-start py-2 text-left font-normal"
                        onClick={() => handleFileSelect(f.path)}
                        disabled={busy}
                      >
                        {f.name}
                      </Button>
                    </li>
                  ))}
                  {!files.length && !busy && (
                    <li className="px-2 py-3 text-sm text-muted-foreground">
                      No resume .tex files found
                    </li>
                  )}
                </ul>
              </ScrollArea>
            )}
          </div>
        </aside>

        <main className="relative min-w-0 flex-1">
          {showLoader && (
            <div className="absolute inset-0 z-20 flex items-start justify-center bg-background/80 p-6 backdrop-blur-sm">
              <LoadingPanel
                phase={displayPhase}
                projectName={activeProject?.name}
              />
            </div>
          )}

          {resume && (
            <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
              <div className="space-y-8 pb-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-2xl font-semibold tracking-tight">
                      {resume.display_name}
                    </h2>
                    <Badge variant="outline" className="mt-2 font-mono text-xs">
                      {resume.source_path}
                    </Badge>
                  </div>
                  <CopyButton text={resume.heading_all} label="Copy heading" />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Heading</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {resume.heading_name && (
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm">{resume.heading_name}</p>
                        <CopyButton text={resume.heading_name} />
                      </div>
                    )}
                    {resume.heading_contact && (
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm">{resume.heading_contact}</p>
                        <CopyButton text={resume.heading_contact} />
                      </div>
                    )}
                    {resume.heading_meta && (
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-muted-foreground">
                          {resume.heading_meta}
                        </p>
                        <CopyButton text={resume.heading_meta} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {resume.sections.map((section) => (
                  <section key={section.title} className="space-y-3">
                    <h3 className="font-serif text-lg font-medium">
                      {section.title}
                    </h3>
                    {section.entries.map((entry, i) => (
                      <Card key={`${section.title}-${i}`}>
                        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 pb-2">
                          <div>
                            <CardTitle className="text-base">
                              {entry.organization}
                            </CardTitle>
                            <CardDescription>
                              {entry.role}
                              {entry.dates ? ` · ${entry.dates}` : ""}
                              {entry.location ? ` · ${entry.location}` : ""}
                            </CardDescription>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            {entry.bullets.length > 0 && (
                              <CopyButton
                                text={entry.bullets
                                  .map((b) => {
                                    const s = b.trim();
                                    if (!s) return "";
                                    return s.startsWith("-") ? s : `- ${s}`;
                                  })
                                  .filter(Boolean)
                                  .join("\n")}
                                label="Copy bullets"
                              />
                            )}
                            <CopyButton
                              text={entry.full_block}
                              label="Copy all"
                            />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <p className="font-mono text-xs text-muted-foreground">
                            {entry.header_line}
                          </p>
                          {entry.bullets.map((b, j) => (
                            <p key={j} className="text-sm leading-relaxed">
                              <span className="mr-2 select-none text-muted-foreground">-</span>
                              {b}
                            </p>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                    {section.lines.map((line, i) => (
                      <Card key={`line-${i}`}>
                        <CardContent className="flex items-center justify-between gap-3 py-4">
                          <p className="text-sm">{line}</p>
                          <CopyButton text={line} />
                        </CardContent>
                      </Card>
                    ))}
                  </section>
                ))}
              </div>
            </ScrollArea>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
