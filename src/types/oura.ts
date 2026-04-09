export interface OuraPersonalInfo {
  id: string;
  age: number;
  weight: number;
  height: number;
  biological_sex: string;
  email: string;
}

export interface DailySleep {
  id: string;
  day: string;
  score: number;
  timestamp: string;
  contributors: {
    deep_sleep: number;
    efficiency: number;
    latency: number;
    rem_sleep: number;
    restfulness: number;
    timing: number;
    total_sleep: number;
  };
}

export interface SleepPeriod {
  id: string;
  average_breath: number;
  average_heart_rate: number;
  average_hrv: number;
  awake_time: number;
  bedtime_end: string;
  bedtime_start: string;
  day: string;
  deep_sleep_duration: number;
  efficiency: number;
  latency: number;
  light_sleep_duration: number;
  lowest_heart_rate: number;
  movement_30_sec: string;
  period: number;
  readiness_score_delta: number;
  rem_sleep_duration: number;
  restless_periods: number;
  sleep_phase_5_min: string;
  time_in_bed: number;
  total_sleep_duration: number;
  type: string;
  heart_rate?: {
    interval: number;
    items: number[];
    timestamp: string;
  };
  hrv?: {
    interval: number;
    items: number[];
    timestamp: string;
  };
}

export interface DailyActivity {
  id: string;
  day: string;
  score: number;
  timestamp: string;
  active_calories: number;
  average_met_minutes: number;
  equivalent_walking_distance: number;
  high_activity_met_minutes: number;
  high_activity_time: number;
  inactivity_alerts: number;
  low_activity_met_minutes: number;
  low_activity_time: number;
  medium_activity_met_minutes: number;
  medium_activity_time: number;
  meters_to_target: number;
  non_wear_time: number;
  resting_time: number;
  sedentary_met_minutes: number;
  sedentary_time: number;
  steps: number;
  target_calories: number;
  target_meters: number;
  total_calories: number;
  met?: {
    interval: number;
    items: number[];
    timestamp: string;
  };
  class_5_min?: string;
  contributors: {
    meet_daily_targets: number;
    move_every_hour: number;
    recovery_time: number;
    stay_active: number;
    training_frequency: number;
    training_volume: number;
  };
}

export interface DailyReadiness {
  id: string;
  day: string;
  score: number;
  timestamp: string;
  temperature_deviation: number;
  temperature_trend_deviation: number;
  contributors: {
    activity_balance: number;
    body_temperature: number;
    hrv_balance: number;
    previous_day_activity: number;
    previous_night: number;
    recovery_index: number;
    resting_heart_rate: number;
    sleep_balance: number;
  };
}

export interface HeartRateEntry {
  bpm: number;
  source: string;
  timestamp: string;
}

export interface DailyStress {
  id: string;
  day: string;
  day_summary: string;
  stress_high: number;
  recovery_high: number;
  daytime_recovery: number;
}

export interface DailySpO2 {
  id: string;
  day: string;
  spo2_percentage: {
    average: number;
  };
}

export interface DailyResilience {
  id: string;
  day: string;
  level: string;
  contributors: {
    sleep_recovery: number;
    daytime_recovery: number;
    stress: number;
  };
}

export interface DailyCardiovascularAge {
  id: string;
  day: string;
  vascular_age: number;
}

export interface Workout {
  id: string;
  activity: string;
  calories: number;
  day: string;
  distance: number;
  end_datetime: string;
  intensity: string;
  label: string | null;
  source: string;
  start_datetime: string;
  average_heart_rate?: number;
  max_heart_rate?: number;
  average_speed?: number; // m/s
  max_speed?: number; // m/s
  heart_rate?: {
    interval: number;
    items: number[];
    timestamp: string;
  };
  speed?: {
    interval: number;
    items: number[];
    timestamp: string;
  };
  met?: {
    interval: number;
    items: number[];
    timestamp: string;
  };
}

export interface Session {
  id: string;
  day: string;
  start_datetime: string;
  end_datetime: string;
  type: string;
  heart_rate: {
    interval: number;
    items: number[];
    timestamp: string;
  } | null;
  hrv: {
    interval: number;
    items: number[];
    timestamp: string;
  } | null;
  mood: string | null;
}

export interface Vo2Max {
  id: string;
  day: string;
  vo2_max: number;
}

export interface SleepTime {
  id: string;
  day: string;
  optimal_bedtime: {
    day_tz: number;
    end_offset: number;
    start_offset: number;
  };
  recommendation: string;
  status: string;
}

export interface Tag {
  id: string;
  day: string;
  text: string;
  timestamp: string;
  tag_type_code: string;
}

export interface WithingsWeightEntry {
  day: string;
  weight: number; // kg
  fat_mass_weight?: number; // kg
  fat_ratio?: number; // %
  muscle_mass?: number; // kg
  bone_mass?: number; // kg
  hydration?: number; // kg
  fat_free_mass?: number; // kg
  water_percentage?: number; // %
  bmi?: number;
  timestamp: string;
}

export interface OuraApiResponse<T> {
  data: T[];
  next_token: string | null;
}

export interface DashboardData {
  sleep: DailySleep[];
  sleepPeriods: SleepPeriod[];
  activity: DailyActivity[];
  readiness: DailyReadiness[];
  heartRate: HeartRateEntry[];
  stress: DailyStress[];
  spo2: DailySpO2[];
  resilience: DailyResilience[];
  cardiovascularAge: DailyCardiovascularAge[];
  workouts: Workout[];
  sessions: Session[];
  vo2Max: Vo2Max[];
  sleepTime: SleepTime[];
  tags: Tag[];
  weight: WithingsWeightEntry[];
  personalInfo: OuraPersonalInfo | null;
}
