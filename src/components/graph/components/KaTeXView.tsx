import React, { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface KaTeXViewProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export const KaTeXView: React.FC<KaTeXViewProps> = ({
  latex,
  displayMode = false,
  className = "",
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(latex || "", containerRef.current, {
          displayMode,
          throwOnError: false,
          output: "htmlAndMathml",
        });
      } catch (err) {
        if (containerRef.current) {
          containerRef.current.textContent = latex;
        }
      }
    }
  }, [latex, displayMode]);

  return <span ref={containerRef} className={`inline-block ${className}`} />;
};
