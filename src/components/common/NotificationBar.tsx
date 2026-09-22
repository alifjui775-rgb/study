import { useState } from "react";
import { X } from "lucide-react";

export const NotificationBar = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="ntfC">
      <div className="ntfT">
        <div className="ntfA">
          <span className="text-center sm:text-left">
            ভর্তি পরীক্ষার নির্ভুল আপডেট সবার আগে পেতে যুক্ত থাকতে পারেন{" "}
            <a
              className="font-semibold underline sm:no-underline"
              href="https://t.me/Study_on_Telegram"
              target="_blank"
              rel="noopener noreferrer"
            >
              টেলিগ্রাম চ্যানেলে
            </a>
          </span>
          <a href="https://t.me/Study_on_Telegram" target="_blank" rel="noopener noreferrer">
            Join
          </a>
        </div>
      </div>
      <label
        aria-label="Close"
        className="c"
        onClick={() => setIsVisible(false)}
        style={{ cursor: "pointer" }}
      >
        <X size={18} />
      </label>
    </div>
  );
};

export default NotificationBar;
