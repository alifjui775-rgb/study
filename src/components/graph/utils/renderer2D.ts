import type { EquationItem, ParameterMap, Viewport2D, CrosshairPoint } from "../types";
import { evaluateSafe, evaluateDerivativeSafe } from "./mathParser";

export interface Render2DOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  viewport: Viewport2D;
  equations: EquationItem[];
  parameters: ParameterMap;
  isDarkMode: boolean;
  mousePos?: { x: number; y: number } | null;
}

export function calculateNiceStep(range: number, targetTicks = 10): number {
  const rawStep = range / targetTicks;
  const exponent = Math.floor(Math.log10(rawStep));
  const fraction = rawStep / Math.pow(10, exponent);

  let niceFraction = 1;
  if (fraction < 1.5) niceFraction = 1;
  else if (fraction < 3) niceFraction = 2;
  else if (fraction < 7) niceFraction = 5;
  else niceFraction = 10;

  return niceFraction * Math.pow(10, exponent);
}

export function render2DCanvas(options: Render2DOptions): CrosshairPoint[] {
  const { ctx, width, height, viewport, equations, parameters, isDarkMode, mousePos } = options;

  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.scale(dpr, dpr);

  // Background
  const bgColor = isDarkMode ? "#0f172a" : "#ffffff";
  const gridColorMajor = isDarkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.1)";
  const gridColorMinor = isDarkMode ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)";
  const axisColor = isDarkMode ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.75)";
  const textColor = isDarkMode ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)";

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Coordinate transforms
  const xSpan = viewport.xMax - viewport.xMin;
  const ySpan = viewport.yMax - viewport.yMin;

  const mathToScreenX = (x: number) => ((x - viewport.xMin) / xSpan) * width;
  const mathToScreenY = (y: number) => ((viewport.yMax - y) / ySpan) * height;
  const screenToMathX = (sx: number) => viewport.xMin + (sx / width) * xSpan;
  const screenToMathY = (sy: number) => viewport.yMax - (sy / height) * ySpan;

  // Grid steps
  const xStep = calculateNiceStep(xSpan, Math.max(5, Math.floor(width / 90)));
  const yStep = calculateNiceStep(ySpan, Math.max(5, Math.floor(height / 90)));

  // Minor sub-grid lines
  const drawSubGrid = (step: number) => {
    const subStep = step / 5;
    const firstSubX = Math.ceil(viewport.xMin / subStep) * subStep;
    ctx.strokeStyle = gridColorMinor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = firstSubX; x <= viewport.xMax; x += subStep) {
      const sx = mathToScreenX(x);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
    }
    const firstSubY = Math.ceil(viewport.yMin / subStep) * subStep;
    for (let y = firstSubY; y <= viewport.yMax; y += subStep) {
      const sy = mathToScreenY(y);
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
    }
    ctx.stroke();
  };

  drawSubGrid(xStep);

  // Major grid lines & Axis Labels
  ctx.strokeStyle = gridColorMajor;
  ctx.lineWidth = 1;
  ctx.fillStyle = textColor;
  ctx.font = "11px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const xAxisScreenY = mathToScreenY(0);
  const yAxisScreenX = mathToScreenX(0);

  // Label offsets ensuring text doesn't overflow edge
  const labelY = Math.min(Math.max(xAxisScreenY + 14, 16), height - 12);
  const labelX = Math.min(Math.max(yAxisScreenX - 16, 20), width - 20);

  // Draw Vertical Grid Lines & X Labels
  const firstX = Math.ceil(viewport.xMin / xStep) * xStep;
  ctx.beginPath();
  for (let x = firstX; x <= viewport.xMax; x += xStep) {
    if (Math.abs(x) < 1e-9) continue; // Skip 0 axis line
    const sx = mathToScreenX(x);
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, height);

    // Format label nicely
    const labelStr = Number(x.toFixed(4)).toString();
    ctx.fillText(labelStr, sx, labelY);
  }
  ctx.stroke();

  // Draw Horizontal Grid Lines & Y Labels
  ctx.textAlign = "right";
  const firstY = Math.ceil(viewport.yMin / yStep) * yStep;
  ctx.beginPath();
  for (let y = firstY; y <= viewport.yMax; y += yStep) {
    if (Math.abs(y) < 1e-9) continue; // Skip 0 axis line
    const sy = mathToScreenY(y);
    ctx.moveTo(0, sy);
    ctx.lineTo(width, sy);

    const labelStr = Number(y.toFixed(4)).toString();
    ctx.fillText(labelStr, labelX, sy);
  }
  ctx.stroke();

  // Main Axes (X and Y)
  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 2;
  ctx.beginPath();

  // X Axis
  if (xAxisScreenY >= 0 && xAxisScreenY <= height) {
    ctx.moveTo(0, xAxisScreenY);
    ctx.lineTo(width, xAxisScreenY);
  }

  // Y Axis
  if (yAxisScreenX >= 0 && yAxisScreenX <= width) {
    ctx.moveTo(yAxisScreenX, 0);
    ctx.lineTo(yAxisScreenX, height);
  }
  ctx.stroke();

  // Origin label '0'
  if (xAxisScreenY >= 0 && xAxisScreenY <= height && yAxisScreenX >= 0 && yAxisScreenX <= width) {
    ctx.textAlign = "right";
    ctx.fillText("0", yAxisScreenX - 6, xAxisScreenY + 14);
  }

  // Curve Plotting
  const pixelStep = 1; // 1px sampling resolution
  const crosshairPoints: CrosshairPoint[] = [];
  const mouseMathX = mousePos ? screenToMathX(mousePos.x) : null;

  for (const eq of equations) {
    if (!eq.visible || !eq.compiledFn || eq.error) continue;

    ctx.strokeStyle = eq.color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.beginPath();

    let isDrawing = false;
    let prevScreenY: number | null = null;

    for (let px = 0; px <= width; px += pixelStep) {
      const xVal = screenToMathX(px);
      const scope = { ...parameters, x: xVal };
      const yVal = evaluateSafe(eq.compiledFn, scope);

      if (Number.isNaN(yVal)) {
        isDrawing = false;
        prevScreenY = null;
        continue;
      }

      const sy = mathToScreenY(yVal);

      // Check for extreme vertical jumps (asymptotes like tan(x))
      if (prevScreenY !== null && Math.abs(sy - prevScreenY) > height * 2) {
        ctx.stroke();
        ctx.beginPath();
        isDrawing = false;
      }

      if (!isDrawing) {
        ctx.moveTo(px, sy);
        isDrawing = true;
      } else {
        ctx.lineTo(px, sy);
      }

      prevScreenY = sy;
    }
    ctx.stroke();

    // Render Derivative Overlay f'(x) if enabled
    if (eq.showDerivative) {
      ctx.strokeStyle = eq.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();

      let isDrawingDeriv = false;
      let prevDerivSy: number | null = null;

      for (let px = 0; px <= width; px += pixelStep * 2) {
        const xVal = screenToMathX(px);
        const scope = { ...parameters, x: xVal };
        const dyVal = evaluateDerivativeSafe(eq.compiledFn, scope, xVal);

        if (Number.isNaN(dyVal)) {
          isDrawingDeriv = false;
          prevDerivSy = null;
          continue;
        }

        const sy = mathToScreenY(dyVal);
        if (prevDerivSy !== null && Math.abs(sy - prevDerivSy) > height * 2) {
          ctx.stroke();
          ctx.beginPath();
          isDrawingDeriv = false;
        }

        if (!isDrawingDeriv) {
          ctx.moveTo(px, sy);
          isDrawingDeriv = true;
        } else {
          ctx.lineTo(px, sy);
        }
        prevDerivSy = sy;
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Capture point at mouse hover location
    if (mouseMathX !== null && mousePos) {
      const scope = { ...parameters, x: mouseMathX };
      const mouseMathY = evaluateSafe(eq.compiledFn, scope);

      if (!Number.isNaN(mouseMathY)) {
        const pointSy = mathToScreenY(mouseMathY);
        if (pointSy >= 0 && pointSy <= height) {
          crosshairPoints.push({
            x: mouseMathX,
            y: mouseMathY,
            screenX: mousePos.x,
            screenY: pointSy,
            color: eq.color,
            eqId: eq.id,
            latex: eq.latex || eq.expression,
          });
        }
      }
    }
  }

  // Draw Hover Crosshair and Point Indicators
  if (
    mousePos &&
    mousePos.x >= 0 &&
    mousePos.x <= width &&
    mousePos.y >= 0 &&
    mousePos.y <= height
  ) {
    ctx.strokeStyle = isDarkMode ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.25)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(mousePos.x, 0);
    ctx.lineTo(mousePos.x, height);
    ctx.stroke();

    // Points on curves
    for (const pt of crosshairPoints) {
      ctx.fillStyle = pt.color;
      ctx.strokeStyle = bgColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(pt.screenX, pt.screenY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
  return crosshairPoints;
}
