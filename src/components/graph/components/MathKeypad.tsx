import React from "react";

interface MathKeypadProps {
  onInsertSymbol: (symbol: string) => void;
  onBackspace?: () => void;
  onClear?: () => void;
}

interface KeyConfig {
  label: string;
  value: string;
  accent?: boolean;
}

const KEYPAD_KEYS: KeyConfig[] = [
  // Pair 1: Variables
  { label: "x", value: "x" },
  { label: "y", value: "y" },

  // Pair 2: Numbers
  { label: "7", value: "7" },
  { label: "8", value: "8" },

  // Pair 3: Numbers
  { label: "9", value: "9" },
  { label: "0", value: "0" },

  // Pair 4: Numbers
  { label: "4", value: "4" },
  { label: "5", value: "5" },

  // Pair 5: Numbers / Decimal
  { label: "6", value: "6" },
  { label: ".", value: "." },

  // Pair 6: Numbers
  { label: "1", value: "1" },
  { label: "2", value: "2" },

  // Pair 7: Numbers / Equal
  { label: "3", value: "3" },
  { label: "=", value: "=" },

  // Pair 8: Basic Ops
  { label: "+", value: "+" },
  { label: "−", value: "-" },

  // Pair 9: Basic Ops
  { label: "×", value: "*" },
  { label: "÷", value: "/" },

  // Pair 10: Powers & Roots
  { label: "^", value: "^" },
  { label: "√", value: "sqrt(", accent: true },

  // Pair 11: Parentheses
  { label: "(", value: "(" },
  { label: ")", value: ")" },

  // Pair 12: Constants
  { label: "π", value: "pi", accent: true },
  { label: "e", value: "e", accent: true },

  // Pair 13: Trig
  { label: "sin", value: "sin(", accent: true },
  { label: "cos", value: "cos(", accent: true },

  // Pair 14: Trig & Abs
  { label: "tan", value: "tan(", accent: true },
  { label: "abs", value: "abs(", accent: true },

  // Pair 15: Logarithms
  { label: "ln", value: "log(", accent: true },
  { label: "log", value: "log10(", accent: true },

  // Pair 16: Extra Parameters
  { label: "a", value: "a" },
  { label: "b", value: "b" },
];

export const MathKeypad: React.FC<MathKeypadProps> = ({ onInsertSymbol }) => {
  return (
    <div className="gc-keypad">
      {KEYPAD_KEYS.map((k, idx) => (
        <button
          key={`${k.label}-${idx}`}
          type="button"
          className={`gc-key ${k.accent ? "accent" : ""}`}
          onClick={() => onInsertSymbol(k.value)}
        >
          {k.label}
        </button>
      ))}
    </div>
  );
};
