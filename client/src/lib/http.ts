import axios from "axios";

function resolveBaseURL(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  if (!configured) return "/";
  if (typeof window === "undefined") return configured;
  try {
    const base = new URL(configured);
    const baseIsLocalhost = base.hostname === "localhost" || base.hostname === "127.0.0.1";
    const pageIsLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (baseIsLocalhost && !pageIsLocalhost) return "/";
  } catch {
    return "/";
  }
  return configured;
}

const baseURL = resolveBaseURL();

export const http = axios.create({
  baseURL,
  withCredentials: true,
});

export default http;
