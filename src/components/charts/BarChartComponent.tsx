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
} from "recharts";
import { formatDate } from "@/lib/utils";
import { useTheme } from "@/components/layout/ThemeProvider";
import { m3ChartGrid, m3AxisTick, m3TooltipContentStyle } from "./chartTheme";

interface BarChartComponentProps {
  data: object[];
  dataKey: string;
  color?: string;
  title?: string;
  height?: number;
  unit?: string;
}

export const BarChartComponent = memo(function BarChartComponent({
  data,
  dataKey,
  color = "var(--m3-primary)",
  title,
  height = 280,
  unit = "",
}: BarChartComponentProps) {
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
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
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
          />
          <Tooltip
            contentStyle={m3TooltipContentStyle}
            labelFormatter={(label) => formatDate(label as string)}
            formatter={(value: number) => [`${value}${unit}`, dataKey]}
          />
          <Bar
            dataKey={dataKey}
            fill={color}
            radius={[8, 8, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
