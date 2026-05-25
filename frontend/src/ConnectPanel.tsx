import { useState } from "react";
import { clearAuthCookies, postAuthCookies } from "./api";

const STORAGE_KEY = "resume_overleaf_cookies";

export function getStoredCookies(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeCookies(value: string) {
  sessionStorage.setItem(STORAGE_KEY, value);
}

export function clearStoredCookies() {
  sessionStorage.removeItem(STORAGE_KEY);
}

type Props = {
  onConnected: () => void;
  envConfigured?: boolean;
};

export function ConnectPanel({ onConnected, envConfigured }: Props) {
  const [cookies, setCookies] = useState(getStoredCookies() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showValue, setShowValue] = useState(false);

  async function connect() {
    const trimmed = cookies.trim();
    if (!trimmed) {
      setError("Paste your Overleaf session token first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await postAuthCookies(trimmed);
      storeCookies(trimmed);
      onConnected();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect to Overleaf");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="connect-screen">
      <div className="connect-card">
        <h2>Connect to Overleaf</h2>
        <p className="connect-lead">
          Paste only the <strong>Value</strong> from{" "}
          <code className="inline-code">overleaf_session2</code> — not the Name,
          not <code className="inline-code">overleaf_session2=</code>. Sent to your
          local API only.
        </p>

        <p className="connect-path-label">DevTools path</p>
        <nav className="connect-path" aria-label="DevTools navigation">
          <span>Inspect</span>
          <span className="connect-path-sep" aria-hidden>
            →
          </span>
          <span>Application</span>
          <span className="connect-path-sep" aria-hidden>
            →
          </span>
          <span>Cookies</span>
          <span className="connect-path-sep" aria-hidden>
            →
          </span>
          <span>overleaf.com</span>
          <span className="connect-path-sep" aria-hidden>
            →
          </span>
          <span className="connect-path-target">overleaf_session2</span>
        </nav>

        {envConfigured && (
          <p className="connect-note">
            The API also has cookies in its environment — you can paste here to
            override without restarting the server.
          </p>
        )}

        <ol className="connect-steps">
          <li>
            Open{" "}
            <a href="https://www.overleaf.com" target="_blank" rel="noreferrer">
              overleaf.com
            </a>{" "}
            and make sure you are logged in.
          </li>
          <li>
            Right-click the page → <strong>Inspect</strong> (or press{" "}
            <kbd>F12</kbd> / <kbd>⌘⌥I</kbd> on Mac).
          </li>
          <li>
            Open the <strong>Application</strong> tab (Chrome/Edge) or{" "}
            <strong>Storage</strong> tab (Firefox).
          </li>
          <li>
            In the left sidebar: <strong>Cookies</strong> →{" "}
            <strong>overleaf.com</strong>.
          </li>
          <li>
            In the cookie table, click{" "}
            <code className="inline-code">overleaf_session2</code>.
          </li>
          <li>
            Copy the <strong>Value</strong> column (the long string on the right).
            Do not copy <strong>Name</strong>.
          </li>
        </ol>

        <label className="field connect-field">
          <span>Session token</span>
          <textarea
            className={`connect-input ${showValue ? "" : "is-masked"}`}
            rows={3}
            placeholder="Paste token value only"
            value={cookies}
            onChange={(e) => setCookies(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            data-1p-ignore
          />
        </label>

        <div className="connect-actions">
          <button
            type="button"
            className="primary-btn"
            onClick={connect}
            disabled={busy}
          >
            {busy ? "Connecting…" : "Connect"}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setShowValue((v) => !v)}
          >
            {showValue ? "Hide" : "Show"} value
          </button>
        </div>

        {error && <div className="banner error">{error}</div>}

        <p className="connect-foot muted">
          Equivalent to a logged-in browser session. Revoke anytime by logging out
          of Overleaf or clearing cookies in Overleaf account settings.
        </p>
      </div>
    </div>
  );
}

export async function restoreSessionFromStorage(
  onConnected: () => void,
): Promise<boolean> {
  const stored = getStoredCookies();
  if (!stored?.trim()) return false;
  try {
    await postAuthCookies(stored);
    onConnected();
    return true;
  } catch {
    clearStoredCookies();
    return false;
  }
}

export async function disconnectOverleaf() {
  clearStoredCookies();
  try {
    await clearAuthCookies();
  } catch {
    /* ignore */
  }
}
