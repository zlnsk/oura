"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

export function ScoreRing({
  score,
  size = 96,
  strokeWidth = 6,
  label,
  className,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  // Animate the ring fill on mount / score change
  const [animatedOffset, setAnimatedOffset] = useState(circumference);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    // Small delay for the animation to be visible after mount
    const timer = setTimeout(() => {
      setAnimatedOffset(offset);
      setDisplayScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [offset, score, circumference]);

  const getColor = (s: number) => {
    if (s >= 85) return "#10b981";
    if (s >= 70) return "#f59e0b";
    return "#f43f5e";
  };

  const getGlow = (s: number) => {
    if (s >= 85) return "rgba(16, 185, 129, 0.25)";
    if (s >= 70) return "rgba(245, 158, 11, 0.25)";
    return "rgba(244, 63, 94, 0.25)";
  };

  const color = getColor(score);
  const glowColor = getGlow(score);

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          role="img"
          aria-label={`Score: ${score} out of 100`}
        >
          {/* Glow filter */}
          <defs>
            <filter id={`glow-${score}-${size}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-100 dark:text-white/5"
          />
          {/* Animated progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animatedOffset}
            filter={`url(#glow-${score}-${size})`}
            style={{
              transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
              filter: `drop-shadow(0 0 4px ${glowColor})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-xl font-bold tracking-tight"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {displayScore}
          </span>
        </div>
      </div>
      {label && (
        <div className="mt-2 text-center">
          <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {label}
          </p>
        </div>
      )}
    </div>
  );
}
