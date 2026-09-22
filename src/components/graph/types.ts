import type { EvalFunction } from "mathjs";

export interface EquationItem {
  id: string;
  expression: string;
  color: string;
  visible: boolean;
  showDerivative: boolean;
  error?: string | null;
  latex?: string;
  compiledFn?: EvalFunction | null;
}

export interface Parameter {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  isAnimating?: boolean;
}

export type ParameterMap = Record<string, number>;

export interface Viewport2D {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface CrosshairPoint {
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  color: string;
  eqId: string;
  latex: string;
}
