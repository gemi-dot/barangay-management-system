"use client";

import { useEffect, useState } from "react";

function formatNow(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function DashboardClock() {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const updateClock = () => setNow(formatNow(new Date()));
    updateClock();

    const timer = window.setInterval(() => {
      updateClock();
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return <span suppressHydrationWarning>{now ?? "Loading time..."}</span>;
}
