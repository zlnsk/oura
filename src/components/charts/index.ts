"use client";

import { lazy } from "react";

export const LazyScoreLineChart = lazy(() =>
  import("./ScoreLineChart").then((m) => ({ default: m.ScoreLineChart }))
);

export const LazyMultiLineChart = lazy(() =>
  import("./MultiLineChart").then((m) => ({ default: m.MultiLineChart }))
);

export const LazyBarChartComponent = lazy(() =>
  import("./BarChartComponent").then((m) => ({ default: m.BarChartComponent }))
);

export const LazyIntradayChart = lazy(() =>
  import("./IntradayChart").then((m) => ({ default: m.IntradayChart }))
);

export const LazyDualIntradayChart = lazy(() =>
  import("./DualIntradayChart").then((m) => ({ default: m.DualIntradayChart }))
);

export const LazySleepStagesChart = lazy(() =>
  import("./SleepStagesChart").then((m) => ({ default: m.SleepStagesChart }))
);
