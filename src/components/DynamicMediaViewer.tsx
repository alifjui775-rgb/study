import { useMemo } from "react";
import { sanitizeFileUrl } from "@/lib/utils";
import { ExternalLink, Compass, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DynamicMediaViewerProps {
  fileUrl: string;
}

export function DynamicMediaViewer({ fileUrl }: DynamicMediaViewerProps) {
  const cleanUrl = useMemo(() => sanitizeFileUrl(fileUrl), [fileUrl]);

  // Extract clean path without query/hash for extension check
  const urlPath = useMemo(() => {
    try {
      const parsed = new URL(cleanUrl);
      return parsed.pathname.toLowerCase();
    } catch {
      return cleanUrl.split("?")[0].split("#")[0].toLowerCase();
    }
  }, [cleanUrl]);

  // Type Detections
  const isImage = useMemo(() => {
    return /\.(png|jpe?g|webp|gif|svg)$/i.test(urlPath);
  }, [urlPath]);

  const isDirectPdf = useMemo(() => {
    return /\.pdf$/i.test(urlPath);
  }, [urlPath]);

  const isGoogleDrive = useMemo(() => {
    return cleanUrl.includes("drive.google.com") || cleanUrl.includes("docs.google.com");
  }, [cleanUrl]);

  const isCanva = useMemo(() => {
    return cleanUrl.includes("canva.com");
  }, [cleanUrl]);

  // Formatted Embed URLs
  const formattedGoogleDriveUrl = useMemo(() => {
    if (!isGoogleDrive) return cleanUrl;
    if (cleanUrl.includes("/preview")) return cleanUrl;

    // Replace /view or /edit or /sharing with /preview
    let formatted = cleanUrl.replace(/\/(edit|view)(\?.*)?$/, "/preview");
    if (!formatted.includes("/preview") && formatted.includes("/file/d/")) {
      formatted = formatted.replace(/\/file\/d\/([^/]+)\/.*$/, "/file/d/$1/preview");
    }
    return formatted;
  }, [cleanUrl, isGoogleDrive]);

  const formattedCanvaUrl = useMemo(() => {
    if (!isCanva) return cleanUrl;
    if (cleanUrl.includes("embed")) return cleanUrl;
    return cleanUrl.includes("?") ? `${cleanUrl}&embed` : `${cleanUrl}?embed`;
  }, [cleanUrl, isCanva]);

  // Hostname for external badge
  const hostname = useMemo(() => {
    try {
      return new URL(cleanUrl).hostname.replace(/^www\./, "");
    } catch {
      return "external-link";
    }
  }, [cleanUrl]);

  if (!cleanUrl) {
    return (
      <div className="w-full p-8 text-center text-muted-foreground font-bengali">
        কোনো ফাইল লিংক প্রদান করা হয়নি।
      </div>
    );
  }

  // 1. Render Image
  if (isImage) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center p-4 md:p-6 bg-card border border-border rounded-2xl md:rounded-3xl overflow-hidden shadow-xs">
        <img
          src={cleanUrl}
          alt="File Preview"
          className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-xs"
          loading="lazy"
        />
      </div>
    );
  }

  // 2. Render Google Drive
  if (isGoogleDrive) {
    return (
      <div className="w-full max-w-4xl mx-auto min-h-[500px] h-[75vh] md:h-[80vh] rounded-2xl md:rounded-3xl overflow-hidden border border-border shadow-xs bg-card">
        <iframe
          src={formattedGoogleDriveUrl}
          className="w-full h-full border-none"
          title="Google Drive Previewer"
          allow="autoplay"
        />
      </div>
    );
  }

  // 3. Render Canva
  if (isCanva) {
    return (
      <div className="w-full max-w-4xl mx-auto min-h-[500px] h-[75vh] md:h-[80vh] rounded-2xl md:rounded-3xl overflow-hidden border border-border shadow-xs bg-card">
        <iframe
          src={formattedCanvaUrl}
          className="w-full h-full border-none"
          title="Canva Presentation Viewer"
          allow="fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  // 4. Render Direct PDF
  if (isDirectPdf) {
    return (
      <div className="w-full max-w-4xl mx-auto min-h-[500px] h-[75vh] md:h-[80vh] rounded-2xl md:rounded-3xl overflow-hidden border border-border shadow-xs bg-card">
        <iframe src={cleanUrl} className="w-full h-full border-none" title="PDF Document Viewer" />
      </div>
    );
  }

  // 5. Fallback External Link (Telegram, Facebook, Custom Link) -> Return null as header already has download/open link button
  return null;
}

// Alias export for compatibility
export const DynamicFileViewer = DynamicMediaViewer;
