// NOTE: This project uses Tailwind CSS v4.
// All theme configuration (colors, keyframes, animations) is defined in src/globals.css
// under the @theme block. This file is kept for tooling compatibility only.
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
};

export default config;
