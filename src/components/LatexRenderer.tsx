import React, { useEffect, useRef } from "react";
import "katex/dist/katex.min.css";
// @ts-expect-error - KaTeX auto-render types not available
import renderMathInElement from "katex/dist/contrib/auto-render";

interface LatexRendererProps {
  html: string;
  className?: string;
}

export default function LatexRenderer({ html, className }: LatexRendererProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = html;

      renderMathInElement(containerRef.current, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true },
        ],
        throwOnError: false,
      });
    }
  }, [html]);

  return <span ref={containerRef} className={className} />;
}
