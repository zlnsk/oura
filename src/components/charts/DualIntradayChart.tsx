"use client";

import { memo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { useTheme } from "@/components/layout/ThemeProvider";
import { COLORS } from "@/lib/constants";
import { m3ChartGrid, m3AxisTick, m3TooltipContentStyle } from "./chartTheme";

interface DualIntradayChartProps {
  data: { time: string; hr?: number; hrv?: number; met?: number }[];
  title?: string;
  height?: number;
  avgHR?: number;
  avgHRV?: number;
}

export const DualIntradayChart = memo(function DualIntradayChart({
  data,
  title,
  height = 250,
  avgHR,
  avgHRV,
}: DualIntradayChartProps) {
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
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            {avgHR != null && (
              <span>Avg HR: <span className="font-medium" style={{ color: COLORS.heartRate }}>{avgHR} bpm</span></span>
            )}
            {avgHRV != null && (
              <span>Avg HRV: <span className="font-medium" style={{ color: COLORS.hrv }}>{avgHRV} ms</span></span>
            )}
          </div>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <defs>
            <linearGradient id="dualHRGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.heartRate} stopOpacity={0.12} />
              <stop offset="100%" stopColor={COLORS.heartRate} stopOpacity={0} />
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
            yAxisId="hr"
            tick={m3AxisTick}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <YAxis
            yAxisId="hrv"
            orientation="right"
            tick={m3AxisTick}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{ ...m3TooltipContentStyle, padding: "10px 14px", fontSize: 12 }}
            formatter={(value: number, name: string) => {
              if (name === "hr") return [`${value} bpm`, "Heart Rate"];
              if (name === "hrv") return [`${value} ms`, "HRV"];
              return [value, name];
            }}
          />
          {avgHR != null && (
            <ReferenceLine
              yAxisId="hr"
              y={avgHR}
              stroke={COLORS.heartRate}
              strokeDasharray="4 4"
              strokeOpacity={0.4}
            />
          )}
          {avgHRV != null && (
            <ReferenceLine
              yAxisId="hrv"
              y={avgHRV}
              stroke={COLORS.hrv}
              strokeDasharray="4 4"
              strokeOpacity={0.4}
            />
          )}
          <Area
            yAxisId="hr"
            type="monotone"
            dataKey="hr"
            stroke={COLORS.heartRate}
            strokeWidth={2}
            fill="url(#dualHRGrad)"
            dot={false}
            activeDot={{ r: 4, fill: COLORS.heartRate, stroke: "none" }}
            connectNulls
          />
          <Line
            yAxisId="hrv"
            type="monotone"
            dataKey="hrv"
            stroke={COLORS.hrv}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: COLORS.hrv, stroke: "none" }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});
