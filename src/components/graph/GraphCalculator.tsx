import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { EquationItem, Parameter } from "./types";
import { parseEquation } from "./utils/mathParser";
import { EquationList } from "./components/EquationList";
import { ParameterSliders } from "./components/ParameterSliders";
import { MathKeypad } from "./components/MathKeypad";
import { Graph2DCanvas } from "./components/Graph2DCanvas";
import { useTheme } from "next-themes";
import "./graph-calculator.css";

const INITIAL_2D_EQUATIONS: Omit<EquationItem, "error" | "latex" | "compiledFn">[] = [
  {
    id: "eq-1",
    expression: "y = x^2 - 3",
    color: "rgb(0, 200, 120)",
    visible: true,
    showDerivative: false,
  },
];

export const GraphCalculator: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const [equations2D, setEquations2D] =
    useState<Omit<EquationItem, "error" | "latex" | "compiledFn">[]>(INITIAL_2D_EQUATIONS);

  // Debounced raw expression state for performance
  const [rawEquations2D, setRawEquations2D] = useState(equations2D);

  // Active inputs & keypad focus
  const [activeInputId, setActiveInputId] = useState<string | null>("eq-1");
  const activeInputRef = useRef<HTMLInputElement | null>(null);

  // Panel drawer collapse state
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // Dynamic parameters state
  const [parameters, setParameters] = useState<Record<string, Parameter>>({
    a: { name: "a", value: 2, min: -10, max: 10, step: 0.1, isAnimating: false },
    b: { name: "b", value: 1.5, min: -10, max: 10, step: 0.1, isAnimating: false },
  });

  const isDarkMode = theme === "dark";

  // Debounce expression updates (~150ms)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUpdateExpression = useCallback(
    (id: string, expression: string) => {
      setRawEquations2D((prev) =>
        prev.map((eq) => (eq.id === id ? { ...eq, expression } : eq)),
      );

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        setEquations2D((prev) => prev.map((eq) => (eq.id === id ? { ...eq, expression } : eq)));
      }, 150);
    },
    [],
  );

  // Parse equations reactively
  const parsedEquations = useMemo(() => {
    return rawEquations2D.map((eq) => {
      const parsed = parseEquation(eq.expression);
      return {
        ...eq,
        error: parsed.error,
        latex: parsed.latex,
        compiledFn: parsed.compiledFn,
        freeVariables: parsed.freeVariables,
      };
    });
  }, [rawEquations2D]);

  // Sync parameter list with free variables detected in active equations
  useEffect(() => {
    const allFreeVars = new Set<string>();
    for (const eq of parsedEquations) {
      if (eq.visible && !eq.error) {
        for (const v of eq.freeVariables) {
          allFreeVars.add(v);
        }
      }
    }

    setParameters((prev) => {
      const updated = { ...prev };
      for (const v of allFreeVars) {
        if (!updated[v]) {
          updated[v] = {
            name: v,
            value: 1,
            min: -10,
            max: 10,
            step: 0.1,
            isAnimating: false,
          };
        }
      }
      return updated;
    });
  }, [parsedEquations]);

  // Derived scope map { a: 2, b: 1.5 }
  const parameterScope = useMemo(() => {
    const map: Record<string, number> = {};
    for (const key of Object.keys(parameters)) {
      map[key] = parameters[key].value;
    }
    return map;
  }, [parameters]);

  // Equation actions
  const handleUpdateColor = (id: string, color: string) => {
    setRawEquations2D((prev) => prev.map((eq) => (eq.id === id ? { ...eq, color } : eq)));
  };

  const handleToggleVisibility = (id: string) => {
    setRawEquations2D((prev) =>
      prev.map((eq) => (eq.id === id ? { ...eq, visible: !eq.visible } : eq)),
    );
  };

  const handleToggleDerivative = (id: string) => {
    setRawEquations2D((prev) =>
      prev.map((eq) => (eq.id === id ? { ...eq, showDerivative: !eq.showDerivative } : eq)),
    );
  };

  const handleDeleteEquation = (id: string) => {
    setRawEquations2D((prev) => prev.filter((eq) => eq.id !== id));
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleAddEquation = () => {
    const newId = `eq-${Date.now()}`;

    const newEq = {
      id: newId,
      expression: "y = sin(x)",
      color: "#2563eb",
      visible: true,
      showDerivative: false,
    };

    setRawEquations2D((prev) => [...prev, newEq]);
    setActiveInputId(newId);
  };

  // Parameter Actions
  const handleUpdateParamValue = (name: string, value: number) => {
    setParameters((prev) => ({
      ...prev,
      [name]: { ...prev[name], value },
    }));
  };

  const handleUpdateParamRange = (name: string, min: number, max: number, step: number) => {
    setParameters((prev) => ({
      ...prev,
      [name]: { ...prev[name], min, max, step },
    }));
  };

  const handleToggleParamAnimation = (name: string) => {
    setParameters((prev) => ({
      ...prev,
      [name]: { ...prev[name], isAnimating: !prev[name].isAnimating },
    }));
  };

  const handleResetParam = (name: string) => {
    setParameters((prev) => ({
      ...prev,
      [name]: { ...prev[name], value: 1, isAnimating: false },
    }));
  };

  // Keypad insertion at cursor focus position
  const handleFocusInput = (id: string, ref: HTMLInputElement) => {
    setActiveInputId(id);
    activeInputRef.current = ref;
  };

  const handleInsertSymbol = (symbol: string) => {
    if (!activeInputId || !activeInputRef.current) {
      if (rawEquations2D.length > 0) {
        setActiveInputId(rawEquations2D[0].id);
      }
      return;
    }

    const input = activeInputRef.current;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;

    const val = input.value;
    const newVal = val.substring(0, start) + symbol + val.substring(end);

    handleUpdateExpression(activeInputId, newVal);

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 10);
  };

  const activeParametersList = useMemo(() => {
    return Object.values(parameters);
  }, [parameters]);

  return (
    <div className="gc-root" data-gc-theme={isDarkMode ? "dark" : "light"}>
      {/* Hidden SEO header */}
      <div className="gc-seo">
        <h1>Free Online Graphing Calculator — 2D &amp; 3D Graph Plotter</h1>
        <p>
          Examora's free online graphing calculator lets you plot 2D and 3D graphs, functions,
          equations and surfaces directly in your browser.
        </p>
      </div>

      {/* Main Body */}
      <div className="gc-body">
        {/* Sidebar Panel */}
        <div className={`gc-panel ${isPanelCollapsed ? "collapsed" : ""}`}>
          {/* Panel Head */}
          <div className="gc-panel-head">
            <span className="gc-panel-title">Equations</span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button type="button" className="gc-add" onClick={handleAddEquation}>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add
              </button>
              <button
                type="button"
                className="gc-iconbtn"
                style={{ width: "32px", height: "32px" }}
                title={isPanelCollapsed ? "Show panel" : "Hide panel"}
                onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Equation List */}
          <EquationList
            equations={parsedEquations}
            activeInputId={activeInputId}
            onUpdateExpression={handleUpdateExpression}
            onUpdateColor={handleUpdateColor}
            onToggleVisibility={handleToggleVisibility}
            onToggleDerivative={handleToggleDerivative}
            onDeleteEquation={handleDeleteEquation}
            onAddEquation={handleAddEquation}
            onFocusInput={handleFocusInput}
          />

          {/* Keypad */}
          <MathKeypad onInsertSymbol={handleInsertSymbol} />
        </div>

        {/* Panel Uncollapse Floating Button when panel is collapsed (Desktop only) */}
        {!isMobile && isPanelCollapsed && (
          <button
            type="button"
            className="gc-iconbtn hidden sm:inline-flex absolute top-3 left-3 z-30 shadow-md"
            title="Expand panel"
            onClick={() => setIsPanelCollapsed(false)}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}

        {/* Stage Canvas */}
        <div className="gc-stage">
          <Graph2DCanvas
            equations={parsedEquations}
            parameters={parameterScope}
            isDarkMode={isDarkMode}
            isPanelCollapsed={isPanelCollapsed}
            onExpandPanel={() => setIsPanelCollapsed(false)}
          />
        </div>
      </div>
    </div>
  );
};
