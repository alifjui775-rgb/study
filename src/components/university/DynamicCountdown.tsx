// =============================================================================
// DynamicCountdown — Exam countdown with circular SVG progress rings
// =============================================================================

import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import type { UnitWithDetails } from "@/lib/university-types";

interface Props {
  units: UnitWithDetails[];
  universityNameBn: string;
}

type CountdownEvent = {
  label: string;
  unitName: string;
  datetime: Date;
};

const formatUnitName = (name: string): string => {
  let clean = name.trim();
  if (clean.startsWith('"') && clean.endsWith('"')) {
    clean = clean.slice(1, -1);
  }

  const lower = clean.toLowerCase();
  const isInstitute =
    lower.includes("আইবিএ") ||
    lower.includes("iba") ||
    lower.includes("আইআইটি") ||
    lower.includes("iit") ||
    lower.includes("আইইআর") ||
    lower.includes("ier") ||
    lower.includes("ইনস্টিটিউট") ||
    lower.includes("institute");

  if (isInstitute) {
    return `"${clean}"`;
  }

  if (clean.includes("ইউনিট")) {
    return clean;
  }
  return `"${clean}"  ইউনিট`;
};

const TimeCircle = ({ unit, value, max }: { unit: string; value: string; max: number }) => {
  const numValue = parseInt(value, 10);
  const progress = isNaN(numValue) ? 1 : 1 - numValue / max;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference * progress;

  return (
    <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 shrink-0">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle
          className="text-muted/50 dark:text-muted/20"
          strokeWidth="6"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
        />
        <circle
          className="text-primary"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
          style={{
            strokeDashoffset: offset,
            transition: unit === "সেকেন্ড" ? "none" : "stroke-dashoffset 0.5s ease-out",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-lg sm:text-xl md:text-2xl font-bold text-foreground tabular-nums">
          {value}
        </div>
        <div className="text-[10px] sm:text-xs text-muted-foreground font-bengali">{unit}</div>
      </div>
    </div>
  );
};

export default function DynamicCountdown({ units, universityNameBn }: Props) {
  const { slug: universitySlug } = useParams<{ slug: string }>();

  const events = useMemo<CountdownEvent[]>(() => {
    const collected: CountdownEvent[] = [];
    units.forEach((unit) => {
      const uLabel = formatUnitName(unit.unit_name_bn);
      if (unit.exam_schedule) {
        const d = new Date(unit.exam_schedule.exam_datetime);
        const displayName = unit.unit_slug === universitySlug ? "" : uLabel;
        collected.push({ label: displayName, unitName: displayName, datetime: d });
      }
    });
    collected.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
    return collected;
  }, [units, universitySlug]);

  const nearest = events[0] || null;

  const [timeLeft, setTimeLeft] = useState({
    days: "--",
    hours: "--",
    minutes: "--",
    seconds: "--",
  });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!nearest) {
      setExpired(true);
      return;
    }

    const tick = () => {
      const diff = nearest.datetime.getTime() - Date.now();
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft({ days: "00", hours: "00", minutes: "00", seconds: "00" });
        return;
      }
      setTimeLeft({
        days: String(Math.floor(diff / 86400000)).padStart(2, "0"),
        hours: String(Math.floor((diff % 86400000) / 3600000)).padStart(2, "0"),
        minutes: String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0"),
        seconds: String(Math.floor((diff % 60000) / 1000)).padStart(2, "0"),
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nearest]);

  const formatDate = (d: Date) =>
    d.toLocaleDateString("bn-BD", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  if (!nearest) return null;

  return (
    <div className="w-full border border-border bg-card rounded-2xl p-4 sm:p-6 shadow-lg">
      <div className="text-center p-2 sm:p-4 rounded-2xl bg-card">
        <div className="text-lg font-bold mb-3 text-foreground font-bengali">
          🎓 {universityNameBn} {nearest.unitName ? `(${nearest.unitName})` : ""} পরীক্ষার কাউন্টডাউন
          <div className="font-normal text-sm mt-1 text-muted-foreground">
            {formatDate(nearest.datetime)}
          </div>
        </div>

        {expired ? (
          <div className="text-xl text-destructive font-bold mt-2.5 font-bengali">সময় শেষ!</div>
        ) : (
          <div className="flex gap-2 sm:gap-4 justify-center flex-nowrap">
            <TimeCircle unit="দিন" value={timeLeft.days} max={365} />
            <TimeCircle unit="ঘন্টা" value={timeLeft.hours} max={24} />
            <TimeCircle unit="মিনিট" value={timeLeft.minutes} max={60} />
            <TimeCircle unit="সেকেন্ড" value={timeLeft.seconds} max={60} />
          </div>
        )}
      </div>
    </div>
  );
}
