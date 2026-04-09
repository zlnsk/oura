"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { DashboardData } from "@/types/oura";
import { BASE_PATH, CACHE_KEY, STALE_MS } from "@/lib/constants";
import { encryptAndStore, decryptFromStore } from "@/lib/crypto-cache";

interface CacheEntry {
  data: DashboardData;
  days: number;
  timestamp: number;
}

async function readCacheEntry(): Promise<CacheEntry | null> {
  try {
    return await decryptFromStore<CacheEntry>(CACHE_KEY);
  } catch {
    return null;
  }
}

async function writeCache(data: DashboardData, days: number) {
  try {
    const entry: CacheEntry = { data, days, timestamp: Date.now() };
    await encryptAndStore(CACHE_KEY, entry);
  } catch {
    // storage full or unavailable — ignore
  }
}


interface OuraDataContextType {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  days: number;
  setDays: (days: number) => void;
  fetchData: () => Promise<void>;
  lastUpdated: number | null;
  isOffline: boolean;
  isStale: boolean;
}

const defaultData: DashboardData = {
  sleep: [],
  sleepPeriods: [],
  activity: [],
  readiness: [],
  heartRate: [],
  stress: [],
  spo2: [],
  resilience: [],
  cardiovascularAge: [],
  workouts: [],
  sessions: [],
  vo2Max: [],
  sleepTime: [],
  tags: [],
  weight: [],
  personalInfo: null,
};

const OuraDataContext = createContext<OuraDataContextType>({
  data: null,
  loading: false,
  error: null,
  days: 30,
  setDays: () => {},
  fetchData: async () => {},
  lastUpdated: null,
  isOffline: false,
  isStale: false,
});

export function OuraDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const hydratedRef = useRef(false);

  // Track online/offline status
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Load cached data on mount (async for encrypted cache)
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    readCacheEntry().then((entry) => {
      if (entry && entry.days === days) {
        setData({ ...defaultData, ...entry.data });
        setLastUpdated(entry.timestamp);
        setIsStale(Date.now() - entry.timestamp > STALE_MS);
      }
    });
  }, [days]);

  const dataRef = useRef(data);
  dataRef.current = data;

  const fetchData = useCallback(async (retryCount = 0) => {
    const MAX_RETRIES = 2;

    // If offline, serve from cache and mark stale
    if (!navigator.onLine) {
      const entry = await readCacheEntry();
      if (entry) {
        setData({ ...defaultData, ...entry.data });
        setLastUpdated(entry.timestamp);
        setIsStale(true);
      }
      setError("You are offline. Showing cached data.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Fetch Oura and Withings data in parallel
      const [ouraRes, withingsRes] = await Promise.all([
        fetch(`${BASE_PATH}/api/oura/all?days=${days}`),
        fetch(`${BASE_PATH}/api/withings?days=${days}`).catch(() => null),
      ]);

      if (!ouraRes.ok) {
        const json = await ouraRes.json();
        const errMsg = json.error || "Failed to fetch data";
        // Retry on server errors (5xx) or network-related failures
        if (ouraRes.status >= 500 && retryCount < MAX_RETRIES) {
          setLoading(false);
          await new Promise((r) => setTimeout(r, 1000 * (retryCount + 1)));
          return fetchData(retryCount + 1);
        }
        throw new Error(errMsg);
      }
      const json = await ouraRes.json();

      // Merge Withings weight data if available
      let weight: unknown[] = [];
      if (withingsRes && withingsRes.ok) {
        try {
          const withingsJson = await withingsRes.json();
          weight = withingsJson.weight || [];
        } catch {
          // Withings data unavailable — continue without it
        }
      }

      const merged = { ...defaultData, ...json, weight };
      setData(merged);
      await writeCache(merged, days);
      setLastUpdated(Date.now());
      setIsStale(false);
    } catch (err) {
      // Retry on network errors (TypeError: Failed to fetch)
      if (retryCount < MAX_RETRIES && err instanceof TypeError) {
        setLoading(false);
        await new Promise((r) => setTimeout(r, 1000 * (retryCount + 1)));
        return fetchData(retryCount + 1);
      }

      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);

      // Stale-while-revalidate: fall back to cache on fetch failure
      if (!dataRef.current) {
        const entry = await readCacheEntry();
        if (entry) {
          setData({ ...defaultData, ...entry.data });
          setLastUpdated(entry.timestamp);
          setIsStale(true);
        }
      } else {
        setIsStale(true);
      }
    } finally {
      setLoading(false);
    }
  }, [days]);

  // Re-fetch when days changes
  const prevDaysRef = useRef(days);
  useEffect(() => {
    if (prevDaysRef.current !== days) {
      prevDaysRef.current = days;
      fetchData();
    }
  }, [days, fetchData]);

  return (
    <OuraDataContext.Provider
      value={{ data, loading, error, days, setDays, fetchData, lastUpdated, isOffline, isStale }}
    >
      {children}
    </OuraDataContext.Provider>
  );
}

export const useOuraData = () => useContext(OuraDataContext);
