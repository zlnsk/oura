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
  ReferenceLine,
} from "recharts";
import { useTheme } from "@/components/layout/ThemeProvider";
import { m3ChartGrid, m3AxisTick, m3TooltipContentStyle } from "./chartTheme";

interface IntradayChartProps {
  data: { time: string; value: number }[];
  title?: string;
  height?: number;
  color?: string;
  unit?: string;
  avgValue?: number;
  gradientId?: string;
  domain?: [number, number];
}

export const IntradayChart = memo(function IntradayChart({
  data,
  title,
  height = 200,
  color = "#f43f5e",
  unit = "",
  avgValue,
  gradientId = "intradayGrad",
  domain,
}: IntradayChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (data.length === 0) {
    return (
      <div className="premium-card p-6">
        {title && (
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">
            {title}
          </h3>
        )}
        <div className="flex items-center justify-center h-[120px] text-sm text-gray-400 dark:text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="premium-card p-6">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </h3>
          {avgValue !== undefined && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Avg: <span className="font-medium" style={{ color }}>{avgValue}{unit}</span>
            </span>
          )}
        </div>
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
            dataKey="time"
            tick={m3AxisTick}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            tick={m3AxisTick}
            axisLine={false}
            tickLine={false}
            domain={domain || ["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{ ...m3TooltipContentStyle, padding: "10px 14px", fontSize: 12 }}
            formatter={(value: number) => [`${value}${unit}`, ""]}
            labelFormatter={(label) => `${label}`}
          />
          {avgValue !== undefined && (
            <ReferenceLine
              y={avgValue}
              stroke={color}
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: "none" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
