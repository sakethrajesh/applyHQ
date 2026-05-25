export type LoadPhase = "projects" | "files" | "resume" | "refresh";

const STEPS: { id: LoadPhase; label: string }[] = [
  { id: "projects", label: "Connect to Overleaf" },
  { id: "files", label: "Load project files" },
  { id: "resume", label: "Parse resume" },
];

const PHASE_ORDER: LoadPhase[] = ["projects", "files", "resume"];

function phaseIndex(phase: LoadPhase): number {
  if (phase === "refresh") return 0;
  return PHASE_ORDER.indexOf(phase);
}

export function LoadingPanel({
  phase,
  projectName,
}: {
  phase: LoadPhase;
  projectName?: string;
}) {
  const activeIdx =
    phase === "refresh" ? -1 : phaseIndex(phase);

  return (
    <div className="loading-panel" role="status" aria-live="polite">
      <div className="loading-hero">
        <div className="loading-orbit" aria-hidden>
          <span className="orbit-ring" />
          <span className="orbit-core">§</span>
        </div>
        <div className="loading-copy">
          <h2 className="loading-title">
            {phase === "refresh" ? "Refreshing project" : "Loading project"}
          </h2>
          <p className="loading-sub">
            {projectName
              ? `Syncing “${projectName}” from Overleaf`
              : "Fetching your latest resume from Overleaf"}
          </p>
        </div>
      </div>

      <ol className="loading-steps">
        {STEPS.map((step, i) => {
          const done = phase === "refresh" ? false : i < activeIdx;
          const active =
            phase === "refresh"
              ? i === 0
              : i === activeIdx;
          return (
            <li
              key={step.id}
              className={`loading-step ${done ? "done" : ""} ${active ? "active" : ""}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="step-marker" aria-hidden>
                {done ? "✓" : active ? <span className="step-pulse" /> : ""}
              </span>
              <span className="step-label">{step.label}</span>
            </li>
          );
        })}
      </ol>

      <div className="skeleton-stack" aria-hidden>
        <div className="skeleton-card">
          <div className="sk-line sk-title" />
          <div className="sk-line sk-wide" />
          <div className="sk-line sk-medium" />
        </div>
        <div className="skeleton-card">
          <div className="sk-line sk-title" />
          <div className="sk-line sk-full" />
          <div className="sk-line sk-full" />
          <div className="sk-line sk-medium" />
        </div>
        <div className="skeleton-card">
          <div className="sk-line sk-title" />
          <div className="sk-line sk-full" />
          <div className="sk-line sk-full" />
        </div>
      </div>
    </div>
  );
}

export function FileListSkeleton() {
  return (
    <ul className="file-list file-list-skeleton" aria-hidden>
      {[72, 88, 64, 80].map((w, i) => (
        <li key={i}>
          <div className="sk-file" style={{ width: `${w}%` }} />
        </li>
      ))}
    </ul>
  );
}
