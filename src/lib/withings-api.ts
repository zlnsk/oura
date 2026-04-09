// ---------------------------------------------------------------------------
// Withings API client – fetches weight/body composition measurements
// ---------------------------------------------------------------------------

import type { WithingsWeightEntry } from "@/types/oura";
import {
  WITHINGS_CLIENT_ID,
  WITHINGS_CLIENT_SECRET,
  WITHINGS_TOKEN_URL,
} from "@/lib/constants";

const WITHINGS_API_URL = "https://wbsapi.withings.net/measure";

// Withings measure types
const MEASURE_TYPES = {
  WEIGHT: 1,
  FAT_FREE_MASS: 5,
  FAT_RATIO: 6,
  FAT_MASS: 8,
  MUSCLE_MASS: 76,
  HYDRATION: 77,
  BONE_MASS: 88,
} as const;

interface WithingsMeasure {
  value: number;
  type: number;
  unit: number;
}

interface WithingsMeasureGroup {
  grpid: number;
  date: number;
  category: number;
  measures: WithingsMeasure[];
}

interface WithingsResponse {
  status: number;
  body: {
    measuregrps: WithingsMeasureGroup[];
    more: number;
    offset: number;
  };
}

function realValue(measure: WithingsMeasure): number {
  return measure.value * Math.pow(10, measure.unit);
}

function getMeasure(
  measures: WithingsMeasure[],
  type: number
): number | undefined {
  const m = measures.find((m) => m.type === type);
  return m ? realValue(m) : undefined;
}

// ---------------------------------------------------------------------------
// Token refresh – returns new access + refresh tokens, or null on failure
// ---------------------------------------------------------------------------

export interface WithingsTokens {
  access_token: string;
  refresh_token: string;
}

export async function refreshWithingsToken(
  refreshToken: string
): Promise<WithingsTokens | null> {
  if (!WITHINGS_CLIENT_ID || !WITHINGS_CLIENT_SECRET) {
    return null;
  }

  const params = new URLSearchParams({
    action: "requesttoken",
    grant_type: "refresh_token",
    client_id: WITHINGS_CLIENT_ID,
    client_secret: WITHINGS_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  try {
    const response = await fetch(WITHINGS_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) return null;

    const result = await response.json();
    if (result.status !== 0) return null;

    return {
      access_token: result.body.access_token,
      refresh_token: result.body.refresh_token,
    };
  } catch {
    return null;
  }
}

export async function fetchWithingsWeight(
  token: string,
  days: number
): Promise<WithingsWeightEntry[]> {
  const now = Math.floor(Date.now() / 1000);
  const startDate = now - days * 86400;

  const params = new URLSearchParams({
    action: "getmeas",
    category: "1", // real measurements only
    startdate: String(startDate),
    enddate: String(now),
  });

  const response = await fetch(WITHINGS_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Withings API error: ${response.status}`);
  }

  const result: WithingsResponse = await response.json();

  if (result.status !== 0) {
    throw new Error(`Withings API returned status ${result.status}`);
  }

  const groups = result.body?.measuregrps || [];

  // Convert to our format, sorted by date ascending
  const entries = groups
    .filter((g) => g.category === 1) // real measurements only
    .map((g): WithingsWeightEntry | null => {
      const date = new Date(g.date * 1000);
      const day = date.toISOString().slice(0, 10);
      const weight = getMeasure(g.measures, MEASURE_TYPES.WEIGHT);

      if (!weight) return null;

      const fatRatio = getMeasure(g.measures, MEASURE_TYPES.FAT_RATIO);
      const fatMass = getMeasure(g.measures, MEASURE_TYPES.FAT_MASS);
      const muscleMass = getMeasure(g.measures, MEASURE_TYPES.MUSCLE_MASS);
      const boneMass = getMeasure(g.measures, MEASURE_TYPES.BONE_MASS);
      const hydrationKg = getMeasure(g.measures, MEASURE_TYPES.HYDRATION);
      const fatFreeMass = getMeasure(g.measures, MEASURE_TYPES.FAT_FREE_MASS);

      return {
        day,
        weight: Math.round(weight * 100) / 100,
        fat_mass_weight: fatMass != null ? Math.round(fatMass * 100) / 100 : undefined,
        fat_ratio: fatRatio != null ? Math.round(fatRatio * 100) / 100 : undefined,
        muscle_mass: muscleMass != null ? Math.round(muscleMass * 100) / 100 : undefined,
        bone_mass: boneMass != null ? Math.round(boneMass * 100) / 100 : undefined,
        hydration: hydrationKg != null ? Math.round(hydrationKg * 100) / 100 : undefined,
        fat_free_mass: fatFreeMass != null ? Math.round(fatFreeMass * 100) / 100 : undefined,
        water_percentage: (hydrationKg != null && weight) ? Math.round((hydrationKg / weight) * 1000) / 10 : undefined,
        bmi: undefined, // will be computed client-side with user height
        timestamp: date.toISOString(),
      };
    })
    .filter((e): e is WithingsWeightEntry => e !== null)
    .sort((a, b) => a.day.localeCompare(b.day));

  return entries;
}
