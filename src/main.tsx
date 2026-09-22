import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./globals.css";
import { handleChunkLoadError, cleanupCacheBustQuery } from "@/lib/chunk-error";

// Strip temporary _cb cache-busting parameter if present after recovery reload
cleanupCacheBustQuery();

// Auto-recover seamlessly from stale chunk/deployment errors on cPanel
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  handleChunkLoadError("vite:preloadError");
});

window.addEventListener("unhandledrejection", (event) => {
  if (handleChunkLoadError(event.reason)) {
    event.preventDefault();
  }
});

window.addEventListener("error", (event) => {
  if (handleChunkLoadError(event.error || event.message)) {
    event.preventDefault();
  }
});

// Inject dynamic theme colors and metadata from environment variables
const siteName = import.meta.env.VITE_SITE_NAME || "MNR Study";
const siteSlogan = import.meta.env.VITE_SITE_SLOGAN || "আপনার চূড়ান্ত পরীক্ষার প্রস্তুতি সঙ্গী";
const faviconUrl = import.meta.env.VITE_FAVICON_URL || "/favicon.svg";

// Update Title
document.title = `${siteName} — ${siteSlogan}`;

// Update Favicon
const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
if (link) {
  link.href = faviconUrl;
} else {
  const newLink = document.createElement("link");
  newLink.rel = "icon";
  newLink.href = faviconUrl;
  document.head.appendChild(newLink);
}

const style = document.createElement("style");
style.textContent = `
  :root {
    --color-primary: ${import.meta.env.VITE_PRIMARY_COLOR || "#22c55e"};
    --color-primary-shift: ${import.meta.env.VITE_PRIMARY_SHIFT_COLOR || "#86efac"};
    --color-secondary: ${import.meta.env.VITE_SECONDARY_COLOR || "#f3f4f6"};
  }
  .dark {
    --color-primary: ${import.meta.env.VITE_PRIMARY_DARK_COLOR || "#22c55e"};
    --color-primary-shift: ${import.meta.env.VITE_PRIMARY_DARK_SHIFT_COLOR || "#86efac"};
    --color-secondary: ${import.meta.env.VITE_SECONDARY_DARK_COLOR || "#1f2937"};
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
);
