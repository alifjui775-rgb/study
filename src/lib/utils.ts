import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskRollNumber(roll: string | undefined | null): string {
  if (!roll) return "N/A";
  if (roll.length <= 4) return roll;
  return roll.slice(0, 2) + "**" + roll.slice(-2);
}

/**
 * Sanitizes input file URL string.
 * If the input contains an HTML iframe tag (e.g. pasted embed code from Canva/Drive),
 * extracts and returns ONLY the URL inside the src="..." attribute.
 */
export function sanitizeFileUrl(input: string | undefined | null): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (/<iframe/i.test(trimmed)) {
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return trimmed;
}
