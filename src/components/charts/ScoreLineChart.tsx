"use client";

import { memo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatDate } from "@/lib/utils";
import { useTheme } from "@/components/layout/ThemeProvider";

interface ScoreLineChartProps {
  data: object[];
  dataKey?: string;
  color?: string;
  gradientId?: string;
  title?: string;
  height?: number;
  domain?: [number, number];
  unit?: string;
}

export const ScoreLineChart = memo(function ScoreLineChart({
  data,
  dataKey = "score",
  color = "#0c93e9",
  gradientId = "scoreGradient",
  title,
  height = 280,
  domain,
  unit = "",
}: ScoreLineChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="premium-card p-6">
      {title && (
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "#ffffff" : "#000000"}
            strokeOpacity={isDark ? 0.08 : 0.04}
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tickFormatter={formatDate}
            tick={{ fontSize: 10, fill: isDark ? "#525868" : "#a0a7b5" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={domain || ["auto", "auto"]}
            tick={{ fontSize: 10, fill: isDark ? "#525868" : "#a0a7b5" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#1a1a24" : "#ffffff",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb"}`,
              borderRadius: "12px",
              boxShadow: isDark
                ? "0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)"
                : "0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)",
              padding: "12px 16px",
            }}
            labelFormatter={(label) => formatDate(label as string)}
            formatter={(value: number) => [`${value}${unit}`, title || dataKey]}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            connectNulls
            activeDot={{
              r: 4,
              fill: color,
              stroke: "none",
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
