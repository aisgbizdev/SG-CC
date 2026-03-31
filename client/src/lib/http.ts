import axios from "axios";

const baseURL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "") || "/";

export const http = axios.create({
  baseURL,
  withCredentials: true,
});

export default http;
