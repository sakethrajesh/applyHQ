import type { ParsedResume, Project, TexFile } from "./types";

/**
 * Local dev: .env.development sets VITE_API_BASE=http://127.0.0.1:8765
 * Docker build: Dockerfile sets VITE_API_BASE=/api (nginx proxy)
 * Use `||` not `??` — empty string must not fall through to localhost:8765 in the browser.
 */
export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.trim() || "/api";

const API = API_BASE;

const FETCH_TIMEOUT_MS = 45_000;

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error(
        `API request timed out after ${FETCH_TIMEOUT_MS / 1000}s (API base: ${API}).`,
      );
    }
    if (e instanceof TypeError) {
      throw new Error(
        `Could not reach API at ${API}. Is the server running?`,
      );
    }
    throw e;
  } finally {
    window.clearTimeout(timer);
  }
}

async function get<T>(path: string, cacheBust?: number): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const url =
    cacheBust != null ? `${API}${path}${sep}_=${cacheBust}` : `${API}${path}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function refreshOverleafSession() {
  const res = await fetchWithTimeout(`${API}/refresh`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? res.statusText);
  }
}

export function fetchProjects(cacheBust?: number) {
  return get<Project[]>("/projects", cacheBust);
}

export function fetchResumeFiles(projectId: string, cacheBust?: number) {
  return get<TexFile[]>(`/projects/${projectId}/files`, cacheBust);
}

export function fetchParsedResume(
  projectId: string,
  path: string,
  cacheBust?: number,
) {
  return get<ParsedResume>(
    `/projects/${projectId}/parse?path=${encodeURIComponent(path)}`,
    cacheBust,
  );
}

export function fetchDefaultProject() {
  return get<{ project_id: string | null }>("/config/default-project");
}

export interface AuthConfig {
  configured: boolean;
  source: "session" | "env" | null;
  env_configured: boolean;
  session_configured: boolean;
  manual_cookies_configured: boolean;
  hint: string;
}

export function fetchAuthConfig() {
  return get<AuthConfig>("/config/auth");
}

export async function postAuthCookies(cookies: string) {
  const res = await fetchWithTimeout(`${API}/auth/cookies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cookies }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? res.statusText);
  }
  return res.json() as Promise<{ status: string; auth_mode: string }>;
}

export async function clearAuthCookies() {
  const res = await fetchWithTimeout(`${API}/auth/cookies`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? res.statusText);
  }
}
