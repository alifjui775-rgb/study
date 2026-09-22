import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { markdownToSafeHtml } from "@/lib/markdown";
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
  content?: string | null;
  className?: string;
}

/**
 * Renders Markdown (GFM + KaTeX) as sanitized HTML.
 *
 * Scope: used only for the `explanation` field. `LatexRenderer` remains the
 * renderer for questions, stems, and options.
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = useMemo(() => markdownToSafeHtml(content), [content]);

  if (!html) return null;

  return (
    <div
      className={cn("prose dark:prose-invert max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
