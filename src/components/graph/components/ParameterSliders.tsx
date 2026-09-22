import React, { useEffect, useRef } from "react";
import type { Parameter } from "../types";
import { Play, Pause, RotateCcw, Sliders } from "lucide-react";

interface ParameterSlidersProps {
  parameters: Parameter[];
  onUpdateValue: (name: string, value: number) => void;
  onUpdateRange: (name: string, min: number, max: number, step: number) => void;
  onToggleAnimation: (name: string) => void;
  onResetParameter: (name: string) => void;
}

export const ParameterSliders: React.FC<ParameterSlidersProps> = ({
  parameters,
  onUpdateValue,
  onToggleAnimation,
  onResetParameter,
}) => {
  const animRef = useRef<Record<string, number>>({});

  // Animation loop for animating sliders
  useEffect(() => {
    const animatingParams = parameters.filter((p) => p.isAnimating);
    if (animatingParams.length === 0) return;

    let lastTime = performance.now();
    let frameId: number;

    const animate = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      for (const p of animatingParams) {
        let dir = animRef.current[p.name] || 1;
        let nextVal = p.value + dir * (p.max - p.min) * 0.15 * dt;

        if (nextVal > p.max) {
          nextVal = p.max;
          dir = -1;
        } else if (nextVal < p.min) {
          nextVal = p.min;
          dir = 1;
        }

        animRef.current[p.name] = dir;
        onUpdateValue(p.name, Number(nextVal.toFixed(2)));
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [parameters, onUpdateValue]);

  if (parameters.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
        <Sliders className="w-3.5 h-3.5" />
        <span>Parameters</span>
      </div>

      <div className="space-y-2.5">
        {parameters.map((p) => (
          <div
            key={p.name}
            className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                {p.name} =
              </span>

              <div className="flex items-center gap-1.5">
                {/* Number Input */}
                <input
                  type="number"
                  step={p.step}
                  value={p.value}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) onUpdateValue(p.name, v);
                  }}
                  className="w-20 px-2 py-0.5 text-xs font-mono text-right bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded outline-none focus:ring-1 focus:ring-blue-500"
                />

                {/* Play/Pause Animation */}
                <button
                  type="button"
                  onClick={() => onToggleAnimation(p.name)}
                  className={`p-1 rounded text-xs transition-colors ${
                    p.isAnimating
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                  }`}
                  title={p.isAnimating ? "Pause parameter" : "Animate parameter"}
                >
                  {p.isAnimating ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Reset Parameter */}
                <button
                  type="button"
                  onClick={() => onResetParameter(p.name)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                  title="Reset parameter"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Slider track */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400">{p.min}</span>
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={p.value}
                onChange={(e) => onUpdateValue(p.name, parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-[10px] font-mono text-slate-400">{p.max}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
