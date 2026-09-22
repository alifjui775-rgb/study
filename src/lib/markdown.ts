import { marked } from "marked";
import markedKatex from "marked-katex-extension";
import DOMPurify from "dompurify";

// Register the KaTeX extension once. Math is rendered to HTML at parse time
// using the locally installed katex (0.18.4), so the exact same output is
// reused by both the React renderer and the print/export string builder — no
// CDN dependency, no version skew, and no client-side auto-render pass.
marked.use(
  markedKatex({
    throwOnError: false,
    output: "htmlAndMathml",
    nonStandard: false,
  }),
);

// Tag inline images so the print stylesheet's `.qimg` rule applies. DOMPurify
// hooks are global to the instance, so guard against duplicate registration.
let imgHookInstalled = false;
function ensureImgHook() {
  if (imgHookInstalled) return;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "IMG") {
      node.setAttribute("class", "qimg");
    }
  });
  imgHookInstalled = true;
}

/**
 * Parse Markdown to sanitized HTML with KaTeX math baked in.
 *
 * - GFM enabled (tables, strikethrough, autolinks)
 * - `breaks: true` turns single newlines into `<br>` so successive formulas /
 *   lines do not collapse into one paragraph
 * - Sanitized with DOMPurify using the HTML + MathML + SVG profiles, so inline
 *   HTML (`<u>`, `<img>`) and KaTeX output survive while scripts/event handlers
 *   are stripped. `style`/`class` attributes are preserved for KaTeX.
 */
export function markdownToSafeHtml(md: string | null | undefined): string {
  if (!md) return "";

  ensureImgHook();

  const raw = marked.parse(md, { async: false, breaks: true, gfm: true });

  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true, mathMl: true, svg: true },
  });
}
