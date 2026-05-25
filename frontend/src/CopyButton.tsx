import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      window.setTimeout(() => setState("idle"), 1600);
    } catch {
      setState("error");
      window.setTimeout(() => setState("idle"), 2000);
    }
  }

  return (
    <button
      type="button"
      className={`copy-btn ${state !== "idle" ? state : ""}`}
      onClick={copy}
      aria-label={`Copy ${label}`}
    >
      {state === "copied" ? "Copied" : state === "error" ? "Failed" : label}
    </button>
  );
}
