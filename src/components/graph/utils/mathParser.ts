import * as math from "mathjs";
import type { EvalFunction, MathNode } from "mathjs";

const RESERVED_SYMBOLS = new Set([
  "x",
  "y",
  "z",
  "pi",
  "PI",
  "e",
  "E",
  "i",
  "I",
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "atan2",
  "sinh",
  "cosh",
  "tanh",
  "sec",
  "csc",
  "cot",
  "log",
  "log10",
  "log2",
  "ln",
  "sqrt",
  "cbrt",
  "abs",
  "exp",
  "min",
  "max",
  "ceil",
  "floor",
  "round",
  "sign",
  "mod",
  "pow",
  "true",
  "false",
  "null",
  "undefined",
  "NaN",
  "Infinity",
]);

export interface ParsedEquationResult {
  lhs: string;
  rhs: string;
  astNode: MathNode | null;
  compiledFn: EvalFunction | null;
  latex: string;
  error: string | null;
  freeVariables: string[];
}

/**
  Normalizes and parses an expression string into AST, LaTeX, compiled evaluator, and free parameters.
 */
export function parseEquation(expressionStr: string): ParsedEquationResult {
  const trimmed = expressionStr.trim();
  if (!trimmed) {
    return {
      lhs: "y",
      rhs: "",
      astNode: null,
      compiledFn: null,
      latex: "",
      error: null,
      freeVariables: [],
    };
  }

  let lhs = "y";
  let rhs = trimmed;

  // Split by '=' if present
  if (trimmed.includes("=")) {
    const parts = trimmed.split("=");
    lhs = parts[0].trim();
    rhs = parts.slice(1).join("=").trim();
  }

  if (!rhs) {
    return {
      lhs,
      rhs: "",
      astNode: null,
      compiledFn: null,
      latex: `${lhs} =`,
      error: "Missing right-hand side expression",
      freeVariables: [],
    };
  }

  try {
    // Parse expression into AST using mathjs
    const astNode = math.parse(rhs);
    const compiledFn = astNode.compile();

    // Generate LaTeX string
    let latexRhs = "";
    try {
      latexRhs = astNode.toTex({ parenthesis: "keep" });
    } catch {
      latexRhs = rhs;
    }

    const latex = lhs ? `${lhs} = ${latexRhs}` : latexRhs;

    // Detect free variables
    const freeVariables = extractFreeVariables(astNode);

    return {
      lhs,
      rhs,
      astNode,
      compiledFn,
      latex,
      error: null,
      freeVariables,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Syntax error in expression";
    return {
      lhs,
      rhs,
      astNode: null,
      compiledFn: null,
      latex: trimmed,
      error: message,
      freeVariables: [],
    };
  }
}

/**
  Traverses mathjs AST node to find all free variable symbols (excluding functions and reserved constants).
 */
export function extractFreeVariables(node: MathNode): string[] {
  const vars = new Set<string>();

  node.traverse((n: MathNode, path: string, parent: MathNode | null) => {
    if (n.type === "SymbolNode") {
      const symbolNode = n as unknown as { name: string };
      const name = symbolNode.name;

      // Don't count symbol if it's the function name of a FunctionNode (e.g. sin in sin(x))
      const isFnName =
        parent &&
        parent.type === "FunctionNode" &&
        (parent as unknown as { fn: { name?: string } }).fn?.name === name;

      if (!isFnName && !RESERVED_SYMBOLS.has(name)) {
        vars.add(name);
      }
    }
  });

  return Array.from(vars).sort();
}

/**
  Evaluates a compiled mathjs function safely with scope dictionary.
 */
export function evaluateSafe(compiledFn: EvalFunction, scope: Record<string, number>): number {
  try {
    const res = compiledFn.evaluate(scope);

    if (typeof res === "number") {
      return Number.isFinite(res) ? res : NaN;
    }

    if (res && typeof res === "object" && "re" in res && "im" in res) {
      // Complex number: only return real part if imaginary part is negligible
      const complex = res as { re: number; im: number };
      if (Math.abs(complex.im) < 1e-9) {
        return Number.isFinite(complex.re) ? complex.re : NaN;
      }
      return NaN;
    }

    if (typeof res === "boolean") {
      return res ? 1 : 0;
    }

    return NaN;
  } catch {
    return NaN;
  }
}

/**
  Computes numerical derivative f'(x) using central finite difference: (f(x+h) - f(x-h)) / (2h).
 */
export function evaluateDerivativeSafe(
  compiledFn: EvalFunction,
  scope: Record<string, number>,
  xVal: number,
  h = 1e-5,
): number {
  const y1 = evaluateSafe(compiledFn, { ...scope, x: xVal + h });
  const y2 = evaluateSafe(compiledFn, { ...scope, x: xVal - h });

  if (Number.isNaN(y1) || Number.isNaN(y2)) {
    return NaN;
  }

  const deriv = (y1 - y2) / (2 * h);
  return Number.isFinite(deriv) ? deriv : NaN;
}
