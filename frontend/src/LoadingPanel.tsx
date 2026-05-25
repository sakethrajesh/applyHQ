import { Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
  const activeIdx = phase === "refresh" ? -1 : phaseIndex(phase);

  return (
    <Card className="mx-auto w-full max-w-lg border-dashed shadow-sm" role="status" aria-live="polite">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="size-7 animate-spin" aria-hidden />
        </div>
        <CardTitle className="font-serif text-xl">
          {phase === "refresh" ? "Refreshing project" : "Loading project"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {projectName
            ? `Syncing “${projectName}” from Overleaf`
            : "Fetching your latest resume from Overleaf"}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <ol className="space-y-2">
          {STEPS.map((step, i) => {
            const done = phase === "refresh" ? false : i < activeIdx;
            const active =
              phase === "refresh" ? i === 0 : i === activeIdx;
            return (
              <li
                key={step.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
                  done && "border-primary/20 bg-primary/5",
                  active && "border-primary bg-primary/10 font-medium",
                  !done && !active && "border-transparent text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                    done && "border-primary bg-primary text-primary-foreground",
                    active && "border-primary",
                  )}
                  aria-hidden
                >
                  {done ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span>{step.label}</span>
                {active && (
                  <Badge variant="secondary" className="ml-auto">
                    Active
                  </Badge>
                )}
              </li>
            );
          })}
        </ol>
        <div className="space-y-3" aria-hidden>
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export function FileListSkeleton() {
  return (
    <ul className="space-y-2" aria-hidden>
      {[72, 88, 64, 80].map((w, i) => (
        <li key={i}>
          <Skeleton className="h-9 rounded-md" style={{ width: `${w}%` }} />
        </li>
      ))}
    </ul>
  );
}
