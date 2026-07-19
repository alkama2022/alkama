import { useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// Djoser JWT auth.
//
// Endpoints (mounted at /auth/ in your Django urls.py):
//   POST  /auth/jwt/create/   { username, password } -> { access, refresh }
//   GET   /auth/users/me/     Authorization: Bearer <access>  -> { is_superuser, ... }
//   POST  /auth/jwt/destroy/  Authorization: Bearer <access>  (blacklist / logout)
//
// Override any path via .env:
//   VITE_AUTH_LOGIN_PATH   (full URL or path)
//   VITE_AUTH_ME_PATH
//   VITE_AUTH_LOGOUT_PATH
// ---------------------------------------------------------------------------

const env = (k: string) => (import.meta.env[k] as string | undefined) || undefined;

// Paths can be full URLs (when auth is not under /api/) or relative paths
const LOGIN_URL = env("VITE_AUTH_LOGIN_PATH") ?? "http://localhost:8000/auth/jwt/create/";
const ME_URL = env("VITE_AUTH_ME_PATH") ?? "http://localhost:8000/auth/users/me/";
const LOGOUT_URL = env("VITE_AUTH_LOGOUT_PATH") ?? "http://localhost:8000/auth/jwt/destroy/";

const TOKEN_KEY = "khal.admin.token";
const USER_KEY = "khal.admin.user";

export type AuthUser = {
  id?: number;
  username?: string;
  email?: string;
  is_superuser?: boolean;
  is_staff?: boolean;
};

type AuthState = { token: string | null; user: AuthUser | null };

const listeners = new Set<() => void>();
let state: AuthState = readInitial();

// Stable SSR snapshot — same object reference every time, stops the infinite loop
const SSR_SNAPSHOT: AuthState = { token: null, user: null };

function readInitial(): AuthState {
  if (typeof window === "undefined") return { token: null, user: null };
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    return { token, user: userRaw ? (JSON.parse(userRaw) as AuthUser) : null };
  } catch {
    return { token: null, user: null };
  }
}

function setState(next: AuthState) {
  state = next;
  try {
    if (next.token) localStorage.setItem(TOKEN_KEY, next.token);
    else localStorage.removeItem(TOKEN_KEY);
    if (next.user) localStorage.setItem(USER_KEY, JSON.stringify(next.user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function getToken(): string | null {
  return state.token;
}
export function getUser(): AuthUser | null {
  return state.user;
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => SSR_SNAPSHOT, // stable reference — no infinite loop
  );
}

/** Build the Authorization header value — Bearer for JWT, Token for DRF token auth */
export function authHeader(token: string): string {
  return `Bearer ${token}`;
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const res = await fetch(LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    let msg = `Login failed (${res.status} at ${LOGIN_URL})`;
    try {
      const b = await res.json();
      // djoser returns { detail: "..." } or { non_field_errors: [...] }
      const detail = b.detail || b.non_field_errors?.[0] || b.username?.[0] || b.password?.[0];
      if (detail) msg = detail;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const data = (await res.json()) as {
    access?: string; // JWT access token (djoser)
    refresh?: string; // JWT refresh token
    token?: string; // DRF simple token fallback
    key?: string; // dj-rest-auth fallback
    auth_token?: string;
    user?: AuthUser;
    is_superuser?: boolean;
  };

  const token = data.access || data.token || data.key || data.auth_token;
  if (!token) throw new Error("No access token in login response. Check your auth backend.");

  // Fetch /auth/users/me/ to get is_superuser etc.
  let user: AuthUser | null = data.user ?? null;
  if (!user || user.is_superuser === undefined) {
    try {
      const meRes = await fetch(ME_URL, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (meRes.ok) user = (await meRes.json()) as AuthUser;
    } catch {
      /* ignore */
    }
  }
  if (!user) user = { username, is_superuser: data.is_superuser };

  setState({ token, user });
  return user;
}

export async function logout(): Promise<void> {
  const token = state.token;
  setState({ token: null, user: null });
  if (token) {
    try {
      await fetch(LOGOUT_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
    } catch {
      /* ignore */
    }
  }
}
