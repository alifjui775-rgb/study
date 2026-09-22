import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/bn";

dayjs.extend(utc);
dayjs.locale("bn");

export const formatDate = (date: string | Date | null | undefined, format = "DD MMMM, YYYY") => {
  if (!date) return "";
  return dayjs(date).format(format);
};

export const formatDateTime = (
  date: string | Date | null | undefined,
  format = "DD MMM YYYY, hh:mm A",
) => {
  if (!date) return "";
  return dayjs(date).format(format);
};

/**
 * Takes a raw local datetime string from `<input type="datetime-local">` (e.g. "2025-10-28T12:00")
 * and converts the user's local time to a standard UTC string before saving to Supabase.
 */
export function toUTCISOString(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  const trimmed = dateString.trim();
  if (trimmed === "") return null;

  // Parse using local time, then convert to UTC ISO string
  const d = dayjs(trimmed);
  if (!d.isValid()) return null;
  return d.toISOString();
}

/**
 * Takes a UTC ISO timestamp from Supabase and converts it to local datetime format (YYYY-MM-DDThh:mm)
 * in the user's local timezone.
 */
export function fromUTCtoLocal(utcString: string | null | undefined): string {
  if (!utcString) return "";
  try {
    const d = dayjs(utcString);
    if (!d.isValid()) return "";
    return d.format("YYYY-MM-DDTHH:mm");
  } catch {
    return "";
  }
}

/**
 * Converts English digits in a string or number to Bengali digits.
 */
export function toBanglaNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = value.toString();
  const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return str.replace(/\d/g, (d) => banglaDigits[parseInt(d)]);
}

export const formatDateBn = (date: string | Date | null | undefined, format = "DD MMMM, YYYY") => {
  if (!date) return "";
  const formatted = formatDate(date, format);
  return toBanglaNumber(formatted);
};

export const formatDateTimeBn = (
  date: string | Date | null | undefined,
  format = "DD MMM YYYY, hh:mm A",
) => {
  if (!date) return "";
  const formatted = formatDateTime(date, format);
  return toBanglaNumber(formatted);
};

/**
 * Converts a datetime string to Bengali time format (e.g. "সকাল ১০:০০টা").
 */
export const formatTimeBn = (date: string | Date | null | undefined): string => {
  if (!date) return "";
  const d = dayjs(date);
  if (!d.isValid()) return "";
  const hour = d.hour();
  const minute = d.minute();
  const pad = (n: number) => String(n).padStart(2, "0");

  let period: string;
  if (hour >= 5 && hour < 12) period = "সকাল";
  else if (hour >= 12 && hour < 15) period = "দুপুর";
  else if (hour >= 15 && hour < 18) period = "বিকাল";
  else period = "রাত";

  const h12 = hour % 12 || 12;
  const timeStr = minute > 0 ? `${pad(h12)}:${pad(minute)}` : `${pad(h12)}`;
  return `${period} ${toBanglaNumber(timeStr)}টা`;
};

// Keep aliases for backward compatibility with existing components
export const toBSTISOString = toUTCISOString;
export const fromUTCtoBSTLocal = fromUTCtoLocal;

export default dayjs;
