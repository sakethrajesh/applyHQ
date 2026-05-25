import { Eye, EyeOff, Link2 } from "lucide-react";
import { useState } from "react";
import { API_BASE, clearAuthCookies, postAuthCookies } from "./api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-xl shadow-md">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Link2 className="size-5" />
          </div>
          <CardTitle className="font-serif text-2xl">Connect to Overleaf</CardTitle>
          <CardDescription>
            Paste only the <strong>Value</strong> from{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              overleaf_session2
            </code>{" "}
            — not the name, not{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              overleaf_session2=
            </code>
            . Sent to your API only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>DevTools</span>
            <Badge variant="outline">Inspect</Badge>
            <span>→</span>
            <Badge variant="outline">Application</Badge>
            <span>→</span>
            <Badge variant="outline">Cookies</Badge>
            <span>→</span>
            <Badge variant="outline">overleaf.com</Badge>
            <span>→</span>
            <Badge>overleaf_session2</Badge>
          </div>

          {envConfigured && (
            <Alert>
              <AlertDescription>
                The API also has cookies in its environment — paste here to
                override without restarting the server.
              </AlertDescription>
            </Alert>
          )}

          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Open{" "}
              <a
                href="https://www.overleaf.com"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                overleaf.com
              </a>{" "}
              while logged in.
            </li>
            <li>
              DevTools (<kbd className="rounded border px-1 text-xs">F12</kbd>) →
              Application → Cookies → overleaf.com.
            </li>
            <li>
              Select <code className="text-xs">overleaf_session2</code> and copy
              the <strong className="text-foreground">Value</strong> column only.
            </li>
          </ol>

          <div className="space-y-2">
            <Label htmlFor="session-token">Session token</Label>
            <Textarea
              id="session-token"
              rows={3}
              placeholder="Paste token value only"
              value={cookies}
              onChange={(e) => setCookies(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              data-1p-ignore
              className={showValue ? "" : "font-mono text-transparent caret-foreground shadow-[inset_0_0_0_9999px_var(--color-muted)]"}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button onClick={connect} disabled={busy}>
            {busy ? "Connecting…" : "Connect"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowValue((v) => !v)}
          >
            {showValue ? (
              <>
                <EyeOff className="size-4" /> Hide
              </>
            ) : (
              <>
                <Eye className="size-4" /> Show
              </>
            )}
          </Button>
        </CardFooter>
        <p className="px-6 pb-6 text-xs text-muted-foreground">
          Revoke by logging out of Overleaf. API base:{" "}
          <code className="rounded bg-muted px-1">{API_BASE}</code>
          {API_BASE === "/api" ? " (Docker OK)" : ""}
        </p>
      </Card>
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
