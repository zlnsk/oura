"use client";

import { memo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatDate } from "@/lib/utils";
import { useTheme } from "@/components/layout/ThemeProvider";
import { m3ChartGrid, m3AxisTick, m3TooltipContentStyle } from "./chartTheme";

interface LineConfig {
  key: string;
  color: string;
  name: string;
}

interface MultiLineChartProps {
  data: object[];
  lines: LineConfig[];
  title?: string;
  height?: number;
  unit?: string;
}

export const MultiLineChart = memo(function MultiLineChart({
  data,
  lines,
  title,
  height = 280,
  unit = "",
}: MultiLineChartProps) {
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
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
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
            formatter={(value: number, name: string) => [`${value}${unit}`, name]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
          />
          {lines.map(({ key, color, name }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              strokeWidth={2}
              name={name}
              dot={false}
              connectNulls
              activeDot={{ r: 4, fill: color, stroke: "none" }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
