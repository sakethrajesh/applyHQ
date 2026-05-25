import type { ParsedResume, Project, TexFile } from "./types";

/** Empty string = same origin (Docker nginx /api proxy). Dev: set VITE_API_BASE=http://127.0.0.1:8765 */
const API = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8765";

async function get<T>(path: string, cacheBust?: number): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const url =
    cacheBust != null ? `${API}${path}${sep}_=${cacheBust}` : `${API}${path}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function refreshOverleafSession() {
  const res = await fetch(`${API}/refresh`, { method: "POST" });
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
  const res = await fetch(`${API}/auth/cookies`, {
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
  const res = await fetch(`${API}/auth/cookies`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? res.statusText);
  }
}
