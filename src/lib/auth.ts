import { useSyncExternalStore } from "react";
import { API_URL } from "./api";

// ---------------------------------------------------------------------------
// Django-style token auth. Superuser gate for /admin.
//
// Expected backend endpoints (DRF conventions):
//   POST  {API_URL}/auth/login/     { username, password } -> { token, user:{is_superuser,...} }
//   GET   {API_URL}/auth/users/me/  Authorization: Token <token> -> { is_superuser, ... }
//   POST  {API_URL}/auth/logout/    (optional)
//
// If your backend uses different paths, override with VITE_AUTH_LOGIN_PATH etc.
// ---------------------------------------------------------------------------

const LOGIN_PATH = (import.meta.env.VITE_AUTH_LOGIN_PATH as string | undefined) || "/auth/login/";
const ME_PATH = (import.meta.env.VITE_AUTH_ME_PATH as string | undefined) || "/auth/users/me/";
const LOGOUT_PATH = (import.meta.env.VITE_AUTH_LOGOUT_PATH as string | undefined) || "/auth/logout/";

const TOKEN_KEY = "apex.admin.token";
const USER_KEY = "apex.admin.user";

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
    /* ignore storage errors */
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
    () => ({ token: null, user: null }),
  );
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_URL}${LOGIN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    let msg = "Invalid credentials";
    try {
      const b = await res.json();
      msg = b.detail || b.non_field_errors?.[0] || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const data = (await res.json()) as {
    token?: string;
    key?: string;
    auth_token?: string;
    user?: AuthUser;
    is_superuser?: boolean;
  };
  const token = data.token || data.key || data.auth_token;
  if (!token) throw new Error("No token in login response");

  let user: AuthUser | null = data.user ?? null;
  if (!user || user.is_superuser === undefined) {
    // Fetch current user to confirm is_superuser
    try {
      const meRes = await fetch(`${API_URL}${ME_PATH}`, {
        headers: {
          Authorization: `Token ${token}`,
          Accept: "application/json",
        },
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
      await fetch(`${API_URL}${LOGOUT_PATH}`, {
        method: "POST",
        headers: { Authorization: `Token ${token}` },
      });
    } catch {
      /* ignore */
    }
  }
}
