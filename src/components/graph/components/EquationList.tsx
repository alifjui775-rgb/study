import React, { useState } from "react";
import type { EquationItem } from "../types";
import { AlertCircle } from "lucide-react";

interface EquationListProps {
  equations: EquationItem[];
  activeInputId: string | null;
  onUpdateExpression: (id: string, expression: string) => void;
  onUpdateColor: (id: string, color: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleDerivative: (id: string) => void;
  onDeleteEquation: (id: string) => void;
  onAddEquation: () => void;
  onFocusInput: (id: string, ref: HTMLInputElement) => void;
}

const PRESET_COLORS = [
  "rgb(0, 200, 120)",
  "#2563eb",
  "#dc2626",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#db2777",
];

export const EquationList: React.FC<EquationListProps> = ({
  equations,
  activeInputId,
  onUpdateExpression,
  onUpdateColor,
  onToggleVisibility,
  onToggleDerivative,
  onDeleteEquation,
  onFocusInput,
}) => {
  const [openColorPickerId, setOpenColorPickerId] = useState<string | null>(null);

  return (
    <div className="gc-eqlist">
      {equations.map((eq) => (
        <div key={eq.id} className="gc-eq">
          {/* Swatch / Dot */}
          <div className="relative shrink-0">
            <div
              className="gc-eq-swatch"
              title="Change color / toggle visibility"
              onClick={() => setOpenColorPickerId(openColorPickerId === eq.id ? null : eq.id)}
            >
              <span
                className="gc-eq-dot"
                style={{
                  background: eq.visible ? eq.color : "transparent",
                  borderColor: eq.color,
                  opacity: eq.visible ? 1 : 0.4,
                }}
              />
            </div>

            {/* Color options popover */}
            {openColorPickerId === eq.id && (
              <div className="absolute top-6 left-0 z-30 p-1.5 bg-white dark:bg-slate-800 rounded shadow-lg border border-slate-200 dark:border-slate-700 flex gap-1">
                {PRESET_COLORS.map((c) => (
                  <span
                    key={c}
                    style={{ backgroundColor: c }}
                    className="w-4 h-4 rounded-full cursor-pointer hover:scale-110"
                    onClick={() => {
                      onUpdateColor(eq.id, c);
                      setOpenColorPickerId(null);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Main Area */}
          <div className="gc-eq-main">
            <div className="gc-eq-inputrow">
              <input
                className="gc-eq-input"
                spellCheck={false}
                autoComplete="off"
                placeholder="y = x^2 - 3"
                value={eq.expression}
                onChange={(e) => onUpdateExpression(eq.id, e.target.value)}
                onFocus={(e) => onFocusInput(eq.id, e.target)}
              />

              {/* Error Message */}
              {eq.error && (
                <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span className="truncate">{eq.error}</span>
                </div>
              )}
            </div>

            {/* Derivative checkbox */}
            <label className="gc-extend">
              <input
                type="checkbox"
                checked={eq.showDerivative}
                onChange={() => onToggleDerivative(eq.id)}
              />
              <span className="gc-extend-box" />
              Show derivative f′(x)
            </label>
          </div>

          {/* Delete Button */}
          {equations.length > 1 && (
            <button
              type="button"
              className="gc-eq-del"
              title="Delete"
              onClick={() => onDeleteEquation(eq.id)}
            >
              ×
            </button>
          )}
        </div>
      ))}

      {/* Hint Box */}
      <div className="gc-hint">
        একাধিক equation যোগ করো। যেমন <code>x^2</code>, <code>sin(x)</code>, <code>1/x</code>,{" "}
        <code>2^x</code>, <code>abs(x)</code>।{" "}
        <b style={{ color: "var(--gc-text)" }}>
          x ছাড়া অন্য letter (যেমন <code>a</code>, <code>k</code>) লিখলে স্লাইডার আসবে
        </b>{" "}
        — যেমন <code>y = a·sin(b·x)</code>।{" "}
        <b style={{ color: "var(--gc-text)" }}>derivative f′(x)</b> চেক করলে ঢালের লেখচিত্র (dashed)
        দেখাবে। চাকা ঘুরিয়ে zoom, ড্র্যাগ করে pan; <code>Shift</code>+scroll = শুধু x, <code>Alt</code>
        +scroll = শুধু y।
      </div>
    </div>
  );
};
