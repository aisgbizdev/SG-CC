import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

declare global {
  interface Window {
    __hideSplash?: () => void;
  }
}

createRoot(document.getElementById("root")!).render(<App />);

requestAnimationFrame(() => {
  window.__hideSplash?.();
});
