import { createContext, useContext, type ReactNode, useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn, getStoredAuthToken, setStoredAuthToken, clearStoredAuthToken } from "./queryClient";
import { useLocation } from "wouter";

type AuthUser = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  companyId: number | null;
  isActive: boolean;
  profileCompleted: boolean;
  avatarUrl: string | null;
};

type LoginResponse = AuthUser & {
  token: string;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);
const TRUSTED_PARENT_ORIGINS = [
  "http://localhost:3000",
  "https://core-sg.vercel.app",
];

function isEmbeddedIframe() {
  if (typeof window === "undefined") return false;
  return window.parent !== window;
}

function postAuthMessageToParent(message: Record<string, unknown>) {
  if (typeof window === "undefined" || window.parent === window) return;

  for (const origin of TRUSTED_PARENT_ORIGINS) {
    window.parent.postMessage(message, origin);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const [bridgeReady, setBridgeReady] = useState(() => !isEmbeddedIframe() || !!getStoredAuthToken());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleMessage = (event: MessageEvent) => {
      if (!TRUSTED_PARENT_ORIGINS.includes(event.origin)) {
        return;
      }

      const data = event.data;
      if (!data || typeof data !== "object" || data.type !== "SGCC_AUTH_TOKEN") {
        return;
      }

      const token = typeof data.token === "string" ? data.token : "";
      if (!token) {
        console.warn("[SGCC] Parent sent SGCC_AUTH_TOKEN without token payload.");
        setBridgeReady(true);
        return;
      }

      console.info("[SGCC] Received auth token from parent bridge.");
      setStoredAuthToken(token);
      setBridgeReady(true);
      queryClient.invalidateQueries();
    };

    window.addEventListener("message", handleMessage);

    if (isEmbeddedIframe() && !getStoredAuthToken()) {
      console.info("[SGCC] No local auth token found, requesting token from parent.");
      postAuthMessageToParent({ type: "SGCC_REQUEST_AUTH" });

      const timer = window.setTimeout(() => {
        console.warn("[SGCC] Parent auth token was not received before timeout.");
        setBridgeReady(true);
      }, 1500);

      return () => {
        window.removeEventListener("message", handleMessage);
        window.clearTimeout(timer);
      };
    }

    setBridgeReady(true);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: Infinity,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ username, password, rememberMe }: { username: string; password: string; rememberMe?: boolean }) => {
      const res = await apiRequest("POST", "/api/auth/login", { username, password, rememberMe });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      postAuthMessageToParent({ type: "SGCC_LOGOUT" });
      postAuthMessageToParent({ type: "SGCC_AUTH_TOKEN", token: null });
      clearStoredAuthToken();
      queryClient.clear();
      setLocation("/login");
    },
  });

  const login = async (username: string, password: string, rememberMe?: boolean) => {
    await loginMutation.mutateAsync({ username, password, rememberMe });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading: isLoading || !bridgeReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus digunakan di dalam AuthProvider");
  return ctx;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    superadmin: "Superadmin",
    owner: "Owner",
    du: "Direktur Utama",
    dk: "Direktur Kepatuhan",
  };
  return labels[role] || role;
}
