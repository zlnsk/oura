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
import { m3ChartGrid, m3AxisTick, m3TooltipContentStyle } from "./chartTheme";

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
  color = "var(--m3-primary)",
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
          <CartesianGrid {...m3ChartGrid} strokeOpacity={isDark ? 0.5 : 0.6} />
          <XAxis
            dataKey="day"
            tickFormatter={formatDate}
            tick={m3AxisTick}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={domain || ["auto", "auto"]}
            tick={m3AxisTick}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={m3TooltipContentStyle}
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
