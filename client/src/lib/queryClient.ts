import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const AUTH_TOKEN_KEY = "sgcc_token";
let inMemoryAuthToken: string | null = null;

export const apiUrl = (path: string) => {
  if (/^https?:\/\//.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
};

export function getStoredAuthToken() {
  if (inMemoryAuthToken) return inMemoryAuthToken;
  if (typeof window === "undefined") return null;
  try {
    inMemoryAuthToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    inMemoryAuthToken = null;
  }
  return inMemoryAuthToken;
}

export function setStoredAuthToken(token: string) {
  inMemoryAuthToken = token;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // Ignore storage failures inside embedded contexts and rely on memory fallback.
  }
}

export function clearStoredAuthToken() {
  inMemoryAuthToken = null;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Ignore storage failures inside embedded contexts.
  }
}

function buildHeaders(headers?: HeadersInit) {
  const token = getStoredAuthToken();
  return {
    ...(headers || {}),
    ...(token ? {
      Authorization: `Bearer ${token}`,
      "X-SGCC-Token": token,
    } : {}),
  };
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(apiUrl(url), {
    method,
    headers: buildHeaders(data ? { "Content-Type": "application/json" } : undefined),
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(apiUrl(queryKey.join("/") as string), {
      headers: buildHeaders(),
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
