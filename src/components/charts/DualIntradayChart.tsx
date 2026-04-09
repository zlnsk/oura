"use client";

import { memo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useTheme } from "@/components/layout/ThemeProvider";

interface DualIntradayChartProps {
  data: { time: string; hr?: number; met?: number }[];
  title?: string;
  height?: number;
}

export const DualIntradayChart = memo(function DualIntradayChart({
  data,
  title,
  height = 250,
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

  const hrValues = data.map((d) => d.hr).filter((v): v is number => v != null);
  const avgHR = hrValues.length > 0 ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length) : null;
  const avgMET = (() => {
    const metValues = data.map((d) => d.met).filter((v): v is number => v != null);
    return metValues.length > 0 ? Math.round(metValues.reduce((a, b) => a + b, 0) / metValues.length * 10) / 10 : null;
  })();

  return (
    <div className="premium-card p-6">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </h3>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            {avgHR !== null && (
              <span>Avg HR: <span className="font-medium text-rose-500">{avgHR} bpm</span></span>
            )}
            {avgMET !== null && (
              <span>Avg MET: <span className="font-medium text-amber-500">{avgMET}</span></span>
            )}
          </div>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "#ffffff" : "#000000"}
            strokeOpacity={isDark ? 0.08 : 0.04}
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: isDark ? "#525868" : "#a0a7b5" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            yAxisId="hr"
            tick={{ fontSize: 10, fill: isDark ? "#525868" : "#a0a7b5" }}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <YAxis
            yAxisId="met"
            orientation="right"
            tick={{ fontSize: 10, fill: isDark ? "#525868" : "#a0a7b5" }}
            axisLine={false}
            tickLine={false}
            domain={[0, 10]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#1a1a24" : "#ffffff",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb"}`,
              borderRadius: "12px",
              boxShadow: isDark
                ? "0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)"
                : "0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)",
              padding: "10px 14px",
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => {
              if (name === "hr") return [`${value} bpm`, "Heart Rate"];
              if (name === "met") return [`${value}`, "MET"];
              return [value, name];
            }}
          />
          <Legend
            verticalAlign="top"
            height={28}
            formatter={(value: string) => {
              if (value === "hr") return "Heart Rate";
              if (value === "met") return "MET";
              return value;
            }}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Bar
            yAxisId="met"
            dataKey="met"
            fill="#f59e0b"
            fillOpacity={0.35}
            radius={[8, 8, 0, 0]}
          />
          <Line
            yAxisId="hr"
            type="monotone"
            dataKey="hr"
            stroke="#f43f5e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#f43f5e", stroke: "none" }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});
