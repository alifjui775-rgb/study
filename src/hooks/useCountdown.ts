import { useState, useEffect, useRef } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  completed: boolean;
}

const calculateTimeLeft = (targetDate: string | null): TimeLeft => {
  if (!targetDate) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, completed: false };
  }

  const difference = +new Date(targetDate) - +new Date();
  let timeLeft: TimeLeft = {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    completed: difference <= 0,
  };

  if (difference > 0) {
    timeLeft = {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      completed: false,
    };
  }

  return timeLeft;
};

export const useCountdown = (targetDate: string | null) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetDate));
  const animationFrameId = useRef<number>(0);

  useEffect(() => {
    const updateCountdown = () => {
      const newTimeLeft = calculateTimeLeft(targetDate);
      setTimeLeft(newTimeLeft);
      if (!newTimeLeft.completed) {
        animationFrameId.current = requestAnimationFrame(updateCountdown);
      }
    };

    animationFrameId.current = requestAnimationFrame(updateCountdown);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [targetDate]);

  return timeLeft;
};

export const formatCountdown = (timeLeft: TimeLeft) => {
  if (timeLeft.completed) {
    return "পরীক্ষা হয়ে গেছে";
  }
  if (timeLeft.days > 0) {
    return `${String(timeLeft.days).padStart(2, "0")}d ${String(timeLeft.hours).padStart(
      2,
      "0",
    )}h ${String(timeLeft.minutes).padStart(2, "0")}m ${String(timeLeft.seconds).padStart(
      2,
      "0",
    )}s`;
  }
  if (timeLeft.hours > 0) {
    return `${String(timeLeft.hours).padStart(2, "0")}h ${String(timeLeft.minutes).padStart(
      2,
      "0",
    )}m ${String(timeLeft.seconds).padStart(2, "0")}s`;
  }
  if (timeLeft.minutes > 0) {
    return `${String(timeLeft.minutes).padStart(2, "0")}m ${String(timeLeft.seconds).padStart(
      2,
      "0",
    )}s`;
  }
  if (timeLeft.seconds > 0) {
    return `${String(timeLeft.seconds).padStart(2, "0")}s`;
  }
  return "সময় শেষ";
};

export const getStatusColor = (timeLeft: TimeLeft) => {
  if (timeLeft.completed) {
    return "text-red-500 dark:text-red-400";
  }
  return "";
};
