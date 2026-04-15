"use client";

import { memo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatDate } from "@/lib/utils";
import { useTheme } from "@/components/layout/ThemeProvider";
import { m3ChartGrid, m3AxisTick, m3TooltipContentStyle } from "./chartTheme";
import { COLORS } from "@/lib/constants";
import type { SleepPeriod } from "@/types/oura";

interface SleepStagesChartProps {
  data: SleepPeriod[];
  title?: string;
  height?: number;
}

export const SleepStagesChart = memo(function SleepStagesChart({
  data,
  title = "Sleep Stages",
  height = 320,
}: SleepStagesChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const chartData = data.map((s) => ({
    day: s.day,
    deep: Math.round(s.deep_sleep_duration / 60),
    rem: Math.round(s.rem_sleep_duration / 60),
    light: Math.round(s.light_sleep_duration / 60),
    awake: Math.round(s.awake_time / 60),
  }));

  return (
    <div className="premium-card p-6">
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid {...m3ChartGrid} strokeOpacity={isDark ? 0.5 : 0.6} />
          <XAxis
            dataKey="day"
            tickFormatter={formatDate}
            tick={m3AxisTick}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={m3AxisTick}
            axisLine={false}
            tickLine={false}
            label={{ value: "Minutes", angle: -90, position: "insideLeft", style: m3AxisTick }}
          />
          <Tooltip
            contentStyle={m3TooltipContentStyle}
            labelFormatter={(label) => formatDate(label as string)}
            formatter={(value: number, name: string) => [`${value} min`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="deep" name="Deep" stackId="a" fill={COLORS.deep} radius={[0, 0, 0, 0]} />
          <Bar dataKey="rem" name="REM" stackId="a" fill={COLORS.rem} />
          <Bar dataKey="light" name="Light" stackId="a" fill={COLORS.light} />
          <Bar dataKey="awake" name="Awake" stackId="a" fill={COLORS.awake} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
