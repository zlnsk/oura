// Shared M3-aligned chart styling tokens for Recharts components.
// Colors resolve at render via CSS custom properties so they track light/dark.

export const m3ChartGrid = {
  strokeDasharray: "3 3",
  stroke: "var(--m3-outline-variant)",
  vertical: false,
} as const;

export const m3AxisTick = {
  fontSize: 10,
  fill: "var(--m3-on-surface-variant)",
} as const;

export const m3TooltipContentStyle = {
  backgroundColor: "var(--m3-surface-container-high)",
  border: "1px solid var(--m3-outline-variant)",
  borderRadius: "var(--m3-shape-md, 12px)",
  boxShadow: "var(--m3-elev-2)",
  color: "var(--m3-on-surface)",
  padding: "12px 16px",
} as const;
