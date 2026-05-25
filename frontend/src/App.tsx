import { useCallback, useEffect, useState } from "react";
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
import "./App.css";

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
    async (pid: string, path: string, bust: number) => {
      const r = await fetchParsedResume(pid, path, bust);
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
        saved ?? defaults.project_id ?? (list[0]?.id ?? "");
      setProjectId(initial);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not reach API. Run: pants run src/python/api:server",
      );
      setLoadPhase(null);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setError(null);
    setLoadPhase("refresh");
    const bust = Date.now();
    try {
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
  }, [projectId, selectedPath, loadFiles, loadResume]);

  const handleConnected = useCallback(() => {
    setConnected(true);
    setError(null);
    loadProjects();
  }, [loadProjects]);

  const handleDisconnect = useCallback(async () => {
    await disconnectOverleaf();
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const auth = await fetchAuthConfig();
        if (cancelled) return;
        setAuthHint(auth.hint);
        setEnvConfigured(auth.env_configured);
        if (auth.configured) {
          setConnected(true);
          await loadProjects();
          return;
        }
        const restored = await restoreSessionFromStorage(() => {
          if (!cancelled) setConnected(true);
        });
        if (cancelled) return;
        if (restored) {
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

  useEffect(() => {
    if (!connected || !projectId) return;
    localStorage.setItem("resume_project_id", projectId);
    setError(null);
    setResume(null);
    setLoadPhase("files");
    const bust = Date.now();
    loadFiles(projectId, bust).catch((e) => {
      setError(e instanceof Error ? e.message : "Failed to list files");
      setLoadPhase(null);
    });
  }, [projectId, loadFiles, connected]);

  useEffect(() => {
    if (!connected || !projectId || !selectedPath) {
      return;
    }
    setLoadPhase("resume");
    const bust = Date.now();
    loadResume(projectId, selectedPath, bust)
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to parse resume");
      })
      .finally(() => setLoadPhase(null));
  }, [projectId, selectedPath, loadResume, connected]);

  const showLoader = loadPhase !== null;
  const displayPhase: LoadPhase =
    loadPhase === "refresh" ? "files" : (loadPhase ?? "projects");

  if (booting) {
    return (
      <div className="app booting">
        <LoadingPanel phase="projects" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="app">
        {error && <div className="banner error connect-banner">{error}</div>}
        <ConnectPanel
          onConnected={handleConnected}
          envConfigured={envConfigured}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">§</span>
          <div>
            <h1>Resume Clipboard</h1>
            <p>Overleaf → parsed sections → one-click copy</p>
            {authHint && <p className="auth-hint">{authHint}</p>}
          </div>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="ghost-btn"
            onClick={handleDisconnect}
            disabled={busy}
          >
            Change session
          </button>
          <button
            type="button"
            className={`ghost-btn ${busy ? "is-busy" : ""}`}
            onClick={refreshAll}
            disabled={busy}
            aria-busy={busy}
          >
            {busy && <span className="btn-spinner" aria-hidden />}
            {loadPhase === "refresh" ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error && <div className="banner error">{error}</div>}

      <div className="layout">
        <aside className={`sidebar ${busy ? "is-loading" : ""}`}>
          <label className="field">
            <span>Overleaf project</span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={!projects.length || busy}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <p className="sidebar-label">Resume files</p>
          {loadPhase === "files" || loadPhase === "projects" ? (
            <FileListSkeleton />
          ) : (
            <ul className="file-list">
              {files.map((f) => (
                <li key={f.path}>
                  <button
                    type="button"
                    className={f.path === selectedPath ? "active" : ""}
                    onClick={() => setSelectedPath(f.path)}
                    disabled={busy}
                  >
                    {f.name}
                  </button>
                </li>
              ))}
              {!files.length && !busy && (
                <li className="muted">No resume .tex files found</li>
              )}
            </ul>
          )}
        </aside>

        <main className={`content ${showLoader ? "is-loading" : ""}`}>
          {showLoader && (
            <div className="content-loader-overlay">
              <LoadingPanel
                phase={displayPhase}
                projectName={activeProject?.name}
              />
            </div>
          )}

          {resume && (
            <div className="resume-content">
              <div className="content-head">
                <h2>{resume.display_name}</h2>
                <span className="file-tag">{resume.source_path}</span>
                <CopyButton text={resume.heading_all} label="Copy heading" />
              </div>

              <section className="card-group">
                <div className="card">
                  <div className="card-head">
                    <h3>Heading</h3>
                  </div>
                  <div className="card-body stack">
                    {resume.heading_name && (
                      <div className="row">
                        <p>{resume.heading_name}</p>
                        <CopyButton text={resume.heading_name} />
                      </div>
                    )}
                    {resume.heading_contact && (
                      <div className="row">
                        <p>{resume.heading_contact}</p>
                        <CopyButton text={resume.heading_contact} />
                      </div>
                    )}
                    {resume.heading_meta && (
                      <div className="row">
                        <p>{resume.heading_meta}</p>
                        <CopyButton text={resume.heading_meta} />
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {resume.sections.map((section) => (
                <section key={section.title} className="card-group">
                  <h3 className="section-title">{section.title}</h3>

                  {section.entries.map((entry, i) => (
                    <article key={`${section.title}-${i}`} className="card">
                      <div className="card-head">
                        <div>
                          <strong>{entry.organization}</strong>
                          <span className="meta">
                            {entry.role}
                            {entry.dates ? ` · ${entry.dates}` : ""}
                            {entry.location ? ` · ${entry.location}` : ""}
                          </span>
                        </div>
                        <div className="card-actions">
                          {entry.bullets.length > 0 && (
                            <CopyButton
                              text={
                                entry.bullets_block ??
                                entry.bullets.join("\n")
                              }
                              label="Copy bullets"
                            />
                          )}
                          <CopyButton text={entry.full_block} label="Copy all" />
                        </div>
                      </div>
                      <div className="card-body stack">
                        <p className="mono entry-header">{entry.header_line}</p>
                        {entry.bullets.map((b, j) => (
                          <p key={j} className="bullet-line">
                            {b}
                          </p>
                        ))}
                      </div>
                    </article>
                  ))}

                  {section.lines.map((line, i) => (
                    <article key={`line-${i}`} className="card compact">
                      <div className="row">
                        <p>{line}</p>
                        <CopyButton text={line} />
                      </div>
                    </article>
                  ))}
                </section>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
