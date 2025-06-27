import React from "react";
import { motion } from "framer-motion";

interface HoldToConfirmButtonProps {
  onHold: () => void;
  children: React.ReactNode;
  className?: string;
  holdTime?: number;
}

export function HoldToConfirmButton({ onHold, children, className = "", holdTime = 1200 }: HoldToConfirmButtonProps) {
  const [isHolding, setIsHolding] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const interval = React.useRef<NodeJS.Timeout | null>(null);

  function startHold() {
    setIsHolding(true);
    let start = Date.now();
    interval.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(elapsed / holdTime, 1));
      if (elapsed >= holdTime) {
        if (interval.current) clearInterval(interval.current);
        setIsHolding(false);
        setProgress(0);
        onHold();
      }
    }, 16);
  }

  function stopHold() {
    setIsHolding(false);
    setProgress(0);
    if (interval.current) clearInterval(interval.current);
  }

  return (
    <motion.button
      type="button"
      className={
        "relative overflow-hidden border border-red-600 bg-red-600 text-white font-semibold px-4 py-2 rounded transition-colors duration-200 hover:bg-red-700 active:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-400 " +
        className
      }
      onPointerDown={startHold}
      onPointerUp={stopHold}
      onPointerLeave={stopHold}
      onPointerCancel={stopHold}
      style={{ position: "relative", minWidth: 120 }}
    >
      <motion.div
        className="absolute left-0 top-0 h-full bg-red-200 z-0 rounded"
        initial={{ width: 0 }}
        animate={{ width: isHolding ? `${progress * 100}%` : 0 }}
        transition={{ ease: "linear", duration: 0.05 }}
        style={{ pointerEvents: "none" }}
      />
      <span className="relative z-10 select-none">
        {isHolding ? (
          <span className="animate-pulse text-red-800 font-bold">Hold to confirm…</span>
        ) : (
          children
        )}
      </span>
    </motion.button>
  );
}
