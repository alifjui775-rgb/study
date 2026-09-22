import { useEffect } from "react";
import { useRouteError, Link, useLocation } from "react-router-dom";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { isChunkLoadError, handleChunkLoadError, forceCacheBustReload } from "@/lib/chunk-error";

export default function GlobalErrorBoundary() {
  const error = useRouteError();
  const location = useLocation();

  useEffect(() => {
    if (error) {
      console.error("[GlobalErrorBoundary] caught error:", error);
    }
    if (isChunkLoadError(error)) {
      handleChunkLoadError(error);
    }
  }, [error, location.pathname]);

  if (isChunkLoadError(error)) {
    const alreadyReloaded = sessionStorage.getItem("vite_chunk_reload");
    if (alreadyReloaded) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2 font-bengali">লোডিং সমস্যা</h1>
              <p className="text-muted-foreground text-sm font-bengali">
                পেজ লোড করতে সমস্যা হয়েছে। পেজ রিফ্রেশ করার চেষ্টা করুন।
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => forceCacheBustReload()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors font-bengali"
              >
                <RefreshCw className="h-4 w-4" />
                রিফ্রেশ করুন
              </button>
              <Link
                to="/"
                onClick={() => forceCacheBustReload()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-accent transition-colors font-bengali"
              >
                <Home className="h-4 w-4" />
                হোমে যান
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "statusText" in error
        ? String((error as any).statusText || (error as any).data || "Route Error")
        : String(error ?? "অপ্রত্যাশিত সমস্যা ঘটেছে।");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2 font-bengali">কিছু ভুল হয়েছে</h1>
          <p className="text-muted-foreground text-sm font-bengali">
            অপ্রত্যাশিত সমস্যা ঘটেছে। আবার চেষ্টা করুন।
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => forceCacheBustReload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors font-bengali"
          >
            <RefreshCw className="h-4 w-4" />
            রিফ্রেশ করুন
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-accent transition-colors font-bengali"
          >
            <Home className="h-4 w-4" />
            হোমে যান
          </Link>
        </div>

        {Boolean(error) && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-left border border-border text-xs overflow-auto max-h-40">
            <p className="font-mono text-destructive break-words">{errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
