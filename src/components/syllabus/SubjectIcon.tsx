import { useState } from "react";
import { BookOpen } from "lucide-react";

interface SubjectIconProps {
  url?: string | null;
  className?: string;
  fallbackIconSize?: string;
}

/**
 * Renders a discipline icon, degrading gracefully to a muted BookOpen tile when
 * the URL is missing or fails to load (404 / malformed), so rows keep their
 * alignment instead of showing a broken image or an empty gap.
 */
export function SubjectIcon({
  url,
  className = "h-5 w-5 rounded object-cover shrink-0",
  fallbackIconSize = "h-3 w-3",
}: SubjectIconProps) {
  const [hasError, setHasError] = useState(false);

  if (url && !hasError) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        className={className}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className={`${className} bg-muted flex items-center justify-center shrink-0`}>
      <BookOpen className={`${fallbackIconSize} text-muted-foreground`} />
    </div>
  );
}
