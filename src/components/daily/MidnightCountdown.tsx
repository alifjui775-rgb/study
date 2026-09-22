import { useState, useEffect } from "react";
import { Timer } from "lucide-react";
import dayjs from "@/lib/date-utils";

const toBengaliDigits = (value: number) =>
  String(value)
    .padStart(2, "0")
    .replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

export default function MidnightCountdown() {
  const [remainingSecs, setRemainingSecs] = useState(() =>
    Math.max(0, dayjs().endOf("day").diff(dayjs(), "second")),
  );

  useEffect(() => {
    const tick = () => setRemainingSecs(Math.max(0, dayjs().endOf("day").diff(dayjs(), "second")));
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = Math.floor(remainingSecs / 3600);
  const minutes = Math.floor((remainingSecs % 3600) / 60);
  const seconds = remainingSecs % 60;

  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-primary">
      <Timer className="h-5 w-5 shrink-0 animate-pulse" />
      <p className="text-sm sm:text-base font-semibold tabular-nums">
        আজকের সময় বাকি:{" "}
        <span className="sm:hidden">
          {toBengaliDigits(hours)} ঘ {toBengaliDigits(minutes)} মি {toBengaliDigits(seconds)} সে
        </span>
        <span className="hidden sm:inline">
          {toBengaliDigits(hours)} ঘন্টা {toBengaliDigits(minutes)} মিনিট {toBengaliDigits(seconds)}{" "}
          সেকেন্ড
        </span>
      </p>
    </div>
  );
}
