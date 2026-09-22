import React, { useRef, useEffect, useState, useCallback } from "react";
import type { EquationItem, ParameterMap, Viewport2D, CrosshairPoint } from "../types";
import { render2DCanvas } from "../utils/renderer2D";

interface Graph2DCanvasProps {
  equations: EquationItem[];
  parameters: ParameterMap;
  isDarkMode: boolean;
  isPanelCollapsed?: boolean;
  onExpandPanel?: () => void;
}

const DEFAULT_VIEWPORT: Viewport2D = {
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
};

export const Graph2DCanvas: React.FC<Graph2DCanvasProps> = ({
  equations,
  parameters,
  isDarkMode,
  isPanelCollapsed,
  onExpandPanel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [viewport, setViewport] = useState<Viewport2D>(DEFAULT_VIEWPORT);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [crosshairPoints, setCrosshairPoints] = useState<CrosshairPoint[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Mouse pan state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; viewport: Viewport2D }>({
    x: 0,
    y: 0,
    viewport: DEFAULT_VIEWPORT,
  });

  // Touch gesture state (Pinch-to-zoom & Touch Drag)
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartViewportRef = useRef<Viewport2D | null>(null);

  // Render loop callback
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);

    if (width <= 0 || height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const points = render2DCanvas({
      ctx,
      width,
      height,
      viewport,
      equations,
      parameters,
      isDarkMode,
      mousePos,
    });

    setCrosshairPoints(points);
  }, [viewport, equations, parameters, isDarkMode, mousePos]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Window resize observer
  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);

  // Touch Event Listeners for Mobile Drag & Pinch Zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        isDraggingRef.current = true;
        dragStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          viewport: { ...viewport },
        };
        pinchStartDistRef.current = null;
      } else if (e.touches.length === 2) {
        isDraggingRef.current = false;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        pinchStartDistRef.current = dist;
        pinchStartViewportRef.current = { ...viewport };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (!width || !height) return;

      if (e.touches.length === 1 && isDraggingRef.current) {
        const touch = e.touches[0];
        const dx = touch.clientX - dragStartRef.current.x;
        const dy = touch.clientY - dragStartRef.current.y;

        const xSpan = dragStartRef.current.viewport.xMax - dragStartRef.current.viewport.xMin;
        const ySpan = dragStartRef.current.viewport.yMax - dragStartRef.current.viewport.yMin;

        const deltaX = (dx / width) * xSpan;
        const deltaY = (dy / height) * ySpan;

        setViewport({
          xMin: dragStartRef.current.viewport.xMin - deltaX,
          xMax: dragStartRef.current.viewport.xMax - deltaX,
          yMin: dragStartRef.current.viewport.yMin + deltaY,
          yMax: dragStartRef.current.viewport.yMax + deltaY,
        });

        const mouseX = touch.clientX - rect.left;
        const mouseY = touch.clientY - rect.top;
        setMousePos({ x: mouseX, y: mouseY });
      } else if (
        e.touches.length === 2 &&
        pinchStartDistRef.current &&
        pinchStartViewportRef.current
      ) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        if (currentDist <= 0) return;

        const scale = pinchStartDistRef.current / currentDist;
        const initialVp = pinchStartViewportRef.current;

        const midTouchX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const midTouchY = (t1.clientY + t2.clientY) / 2 - rect.top;

        const mathX = initialVp.xMin + (midTouchX / width) * (initialVp.xMax - initialVp.xMin);
        const mathY = initialVp.yMax - (midTouchY / height) * (initialVp.yMax - initialVp.yMin);

        const newXMin = mathX + (initialVp.xMin - mathX) * scale;
        const newXMax = mathX + (initialVp.xMax - mathX) * scale;
        const newYMin = mathY + (initialVp.yMin - mathY) * scale;
        const newYMax = mathY + (initialVp.yMax - mathY) * scale;

        setViewport({
          xMin: newXMin,
          xMax: newXMax,
          yMin: newYMin,
          yMax: newYMax,
        });
      }
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
      pinchStartDistRef.current = null;
      pinchStartViewportRef.current = null;
      setMousePos(null);
      setCrosshairPoints([]);
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchEnd);

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [viewport]);

  // Mouse Pan Interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      viewport: { ...viewport },
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setMousePos({ x: mouseX, y: mouseY });

    if (!isDraggingRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const width = rect.width;
    const height = rect.height;

    const xSpan = dragStartRef.current.viewport.xMax - dragStartRef.current.viewport.xMin;
    const ySpan = dragStartRef.current.viewport.yMax - dragStartRef.current.viewport.yMin;

    const deltaX = (dx / width) * xSpan;
    const deltaY = (dy / height) * ySpan;

    setViewport({
      xMin: dragStartRef.current.viewport.xMin - deltaX,
      xMax: dragStartRef.current.viewport.xMax - deltaX,
      yMin: dragStartRef.current.viewport.yMin + deltaY,
      yMax: dragStartRef.current.viewport.yMax + deltaY,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    setMousePos(null);
    setCrosshairPoints([]);
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.15 : 0.87;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = rect.width;
    const height = rect.height;

    const mathX = viewport.xMin + (mouseX / width) * (viewport.xMax - viewport.xMin);
    const mathY = viewport.yMax - (mouseY / height) * (viewport.yMax - viewport.yMin);

    const zoomX = !e.altKey;
    const zoomY = !e.shiftKey;

    let newXMin = viewport.xMin;
    let newXMax = viewport.xMax;
    let newYMin = viewport.yMin;
    let newYMax = viewport.yMax;

    if (zoomX) {
      newXMin = mathX + (viewport.xMin - mathX) * zoomFactor;
      newXMax = mathX + (viewport.xMax - mathX) * zoomFactor;
    }

    if (zoomY) {
      newYMin = mathY + (viewport.yMin - mathY) * zoomFactor;
      newYMax = mathY + (viewport.yMax - mathY) * zoomFactor;
    }

    setViewport({
      xMin: newXMin,
      xMax: newXMax,
      yMin: newYMin,
      yMax: newYMax,
    });
  };

  // Zoom controls
  const handleZoom = (factor: number) => {
    const xCenter = (viewport.xMin + viewport.xMax) / 2;
    const yCenter = (viewport.yMin + viewport.yMax) / 2;
    const halfX = ((viewport.xMax - viewport.xMin) / 2) * factor;
    const halfY = ((viewport.yMax - viewport.yMin) / 2) * factor;

    setViewport({
      xMin: xCenter - halfX,
      xMax: xCenter + halfX,
      yMin: yCenter - halfY,
      yMax: yCenter + halfY,
    });
  };

  const handleResetView = () => {
    setViewport(DEFAULT_VIEWPORT);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[400px] select-none overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        className="gc-canvas"
        style={{ touchAction: "none", cursor: isDraggingRef.current ? "grabbing" : "grab" }}
      />

      {/* Floating Toolbar Controls */}
      <div className="gc-stage-controls">
        <button
          type="button"
          onClick={() => handleZoom(0.8)}
          className="gc-zoombtn"
          title="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => handleZoom(1.25)}
          className="gc-zoombtn"
          title="Zoom out"
        >
          −
        </button>
        {isMobile && isPanelCollapsed ? (
          <button
            type="button"
            onClick={onExpandPanel}
            className="gc-zoombtn text-primary font-bold"
            title="Expand Equations Panel"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleResetView}
            className="gc-zoombtn"
            style={{ fontSize: "16px" }}
            title="Reset view"
          >
            ⌖
          </button>
        )}
      </div>

      {/* Viewport Info Overlay */}
      <div className="absolute bottom-3 left-4 z-10 px-2.5 py-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded border border-slate-200 dark:border-slate-800">
        x: [{viewport.xMin.toFixed(2)}, {viewport.xMax.toFixed(2)}] | y: [{viewport.yMin.toFixed(2)}
        , {viewport.yMax.toFixed(2)}]
      </div>

      {/* Crosshair Coordinates Tooltip */}
      {crosshairPoints.length > 0 && (
        <div className="absolute top-4 left-4 z-10 p-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 space-y-1 max-w-xs text-xs pointer-events-none">
          {crosshairPoints.map((pt) => (
            <div key={pt.eqId} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: pt.color }}
              />
              <div className="font-mono text-slate-700 dark:text-slate-200 truncate">
                x = {pt.x.toFixed(3)}, y = {pt.y.toFixed(3)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
