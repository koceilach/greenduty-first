"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  CloudRain,
  Droplets,
  Loader2,
  LocateFixed,
  Radar,
  Sprout,
  ThermometerSun,
  Wind,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

type YieldPredictorProps = {
  sectionId?: string;
  className?: string;
};

type CropKey = "wheat" | "corn" | "tomatoes";
type AlertLevel = "critical" | "warning" | "info" | "good";

type OpenMeteoResponse = {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation?: number[];
    rain?: number[];
    wind_speed_10m?: number[];
    relative_humidity_2m?: number[];
    soil_temperature_6cm?: number[];
    soil_temperature_0cm?: number[];
    soil_moisture_0_to_1cm?: number[];
    soil_moisture_1_to_3cm?: number[];
    soil_moisture_3_to_9cm?: number[];
  };
};

type TrendPoint = {
  hour: string;
  temperature: number;
  precipitation: number;
  soilTemperature: number;
  soilMoisture: number;
  windSpeed: number;
  humidity: number;
};

type WeatherSnapshot = {
  latitude: number;
  longitude: number;
  trend24h: TrendPoint[];
  currentTemperature: number;
  currentSoilTemperature: number;
  currentSoilMoisture: number;
  minTemperature24h: number;
  maxTemperature24h: number;
  rainSum24h: number;
  maxWind24h: number;
  updatedAt: Date;
};

type SmartAlert = {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
};

type CropProfile = {
  label: string;
  moistureTargetMin: number;
  frostThreshold: number;
  heatThreshold: number;
  optimalSoilTemp: [number, number];
};

const DAILY_FIELDS =
  "sunrise,sunset,wind_speed_10m_max,rain_sum,wind_direction_10m_dominant";
const HOURLY_FIELDS =
  "temperature_2m,apparent_temperature,pressure_msl,wind_speed_10m,wind_speed_80m,wind_speed_120m,snow_depth,snowfall,rain,wind_direction_10m,wind_direction_80m,wind_direction_120m,wind_direction_180m,precipitation,relative_humidity_2m,soil_temperature_6cm,soil_temperature_18cm,soil_temperature_0cm,soil_temperature_54cm,soil_moisture_0_to_1cm,soil_moisture_3_to_9cm,soil_moisture_1_to_3cm";

const CROP_PROFILES: Record<CropKey, CropProfile> = {
  wheat: {
    label: "Wheat",
    moistureTargetMin: 24,
    frostThreshold: 2,
    heatThreshold: 33,
    optimalSoilTemp: [10, 18],
  },
  corn: {
    label: "Corn",
    moistureTargetMin: 28,
    frostThreshold: 5,
    heatThreshold: 36,
    optimalSoilTemp: [16, 24],
  },
  tomatoes: {
    label: "Tomatoes",
    moistureTargetMin: 34,
    frostThreshold: 7,
    heatThreshold: 34,
    optimalSoilTemp: [18, 26],
  },
};

const ALERT_STYLES: Record<
  AlertLevel,
  { shell: string; badge: string; glow: string; text: string }
> = {
  critical: {
    shell:
      "border-red-300/90 bg-red-50/95 text-red-900 shadow-[0_0_0_1px_rgba(239,68,68,0.08)]",
    badge: "bg-red-100 text-red-700",
    glow: "shadow-[0_12px_30px_rgba(239,68,68,0.16)]",
    text: "Critical",
  },
  warning: {
    shell:
      "border-amber-300/90 bg-amber-50/95 text-amber-900 shadow-[0_0_0_1px_rgba(245,158,11,0.08)]",
    badge: "bg-amber-100 text-amber-700",
    glow: "shadow-[0_12px_30px_rgba(245,158,11,0.16)]",
    text: "Warning",
  },
  info: {
    shell:
      "border-sky-300/90 bg-sky-50/95 text-sky-900 shadow-[0_0_0_1px_rgba(14,165,233,0.08)]",
    badge: "bg-sky-100 text-sky-700",
    glow: "shadow-[0_12px_30px_rgba(14,165,233,0.14)]",
    text: "Info",
  },
  good: {
    shell:
      "border-emerald-300/90 bg-emerald-50/95 text-emerald-900 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]",
    badge: "bg-emerald-100 text-emerald-700",
    glow: "shadow-[0_12px_30px_rgba(16,185,129,0.16)]",
    text: "Healthy",
  },
};

const formatTemp = (value: number) => `${value.toFixed(1)}°C`;
const formatMoisture = (value: number) => `${value.toFixed(1)}%`;
const formatHour = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getArrayNumber = (array: unknown, index: number): number | null => {
  if (!Array.isArray(array) || index < 0 || index >= array.length) return null;
  const value = array[index];
  const normalized = typeof value === "number" ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : null;
};

const clampMoisturePercent = (value: number | null): number => {
  if (value === null) return 0;
  if (value <= 1) return Math.max(0, Math.min(100, value * 100));
  return Math.max(0, Math.min(100, value));
};

const moistureColor = (value: number) => {
  if (value < 20) return "#ef4444";
  if (value < 40) return "#f59e0b";
  return "#10b981";
};

const buildOpenMeteoUrl = (latitude: number, longitude: number) => {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", latitude.toFixed(5));
  url.searchParams.set("longitude", longitude.toFixed(5));
  url.searchParams.set("daily", DAILY_FIELDS);
  url.searchParams.set("hourly", HOURLY_FIELDS);
  url.searchParams.set("timezone", "auto");
  return url.toString();
};

const mapToWeatherSnapshot = (
  payload: OpenMeteoResponse,
  latitude: number,
  longitude: number
): WeatherSnapshot => {
  const hourly = payload.hourly;
  const times = hourly?.time ?? [];

  if (!times.length) {
    throw new Error("Weather data is unavailable for this location.");
  }

  const now = Date.now();
  let startIndex = times.findIndex((time) => new Date(time).getTime() >= now);
  if (startIndex === -1) {
    startIndex = Math.max(0, times.length - 24);
  }

  const trend24h: TrendPoint[] = [];

  for (let i = 0; i < 24; i += 1) {
    const idx = startIndex + i;
    if (idx >= times.length) break;

    const temperature = getArrayNumber(hourly?.temperature_2m, idx) ?? 0;
    const precipitation =
      getArrayNumber(hourly?.precipitation, idx) ??
      getArrayNumber(hourly?.rain, idx) ??
      0;
    const soilTemperature =
      getArrayNumber(hourly?.soil_temperature_6cm, idx) ??
      getArrayNumber(hourly?.soil_temperature_0cm, idx) ??
      temperature;
    const moistureRaw =
      getArrayNumber(hourly?.soil_moisture_0_to_1cm, idx) ??
      getArrayNumber(hourly?.soil_moisture_1_to_3cm, idx) ??
      getArrayNumber(hourly?.soil_moisture_3_to_9cm, idx);

    trend24h.push({
      hour: formatHour(times[idx]),
      temperature,
      precipitation,
      soilTemperature,
      soilMoisture: clampMoisturePercent(moistureRaw),
      windSpeed: getArrayNumber(hourly?.wind_speed_10m, idx) ?? 0,
      humidity: getArrayNumber(hourly?.relative_humidity_2m, idx) ?? 0,
    });
  }

  if (!trend24h.length) {
    throw new Error("Unable to build a 24-hour forecast window.");
  }

  const current = trend24h[0];
  const temperatures = trend24h.map((item) => item.temperature);
  const rainSum24h = trend24h.reduce((sum, item) => sum + item.precipitation, 0);

  return {
    latitude,
    longitude,
    trend24h,
    currentTemperature: current.temperature,
    currentSoilTemperature: current.soilTemperature,
    currentSoilMoisture: current.soilMoisture,
    minTemperature24h: Math.min(...temperatures),
    maxTemperature24h: Math.max(...temperatures),
    rainSum24h,
    maxWind24h: Math.max(...trend24h.map((item) => item.windSpeed)),
    updatedAt: new Date(),
  };
};

const deriveAlerts = (snapshot: WeatherSnapshot, crop: CropKey): SmartAlert[] => {
  const profile = CROP_PROFILES[crop];
  const alerts: SmartAlert[] = [];

  const moistureDelta = profile.moistureTargetMin - snapshot.currentSoilMoisture;
  if (moistureDelta >= 10) {
    alerts.push({
      id: "critical-dry",
      level: "critical",
      title: "Critical soil dryness",
      message: `Soil moisture is ${formatMoisture(snapshot.currentSoilMoisture)}. ${profile.label} should stay above ${profile.moistureTargetMin}%. Irrigate now.`,
    });
  } else if (moistureDelta > 0) {
    alerts.push({
      id: "warning-dry",
      level: "warning",
      title: "Irrigation recommended",
      message: `${profile.label} moisture target is ${profile.moistureTargetMin}%. Current level is ${formatMoisture(snapshot.currentSoilMoisture)}.`,
    });
  }

  if (snapshot.minTemperature24h <= profile.frostThreshold) {
    alerts.push({
      id: "frost",
      level: "warning",
      title: "Frost exposure risk",
      message: `Forecast low is ${formatTemp(snapshot.minTemperature24h)}. ${profile.label} protection is advised tonight.`,
    });
  }

  if (snapshot.maxTemperature24h >= profile.heatThreshold) {
    alerts.push({
      id: "heat",
      level: "warning",
      title: "Heat stress window",
      message: `Forecast peak is ${formatTemp(snapshot.maxTemperature24h)}. Add shade and split watering cycles for ${profile.label}.`,
    });
  }

  if (snapshot.maxWind24h >= 40) {
    alerts.push({
      id: "wind",
      level: "info",
      title: "Strong wind expected",
      message: `Wind may reach ${snapshot.maxWind24h.toFixed(0)} km/h. Secure young plants and lightweight structures.`,
    });
  }

  if (snapshot.rainSum24h >= 20) {
    alerts.push({
      id: "rain",
      level: "info",
      title: "Heavy rain signal",
      message: `${snapshot.rainSum24h.toFixed(1)} mm precipitation expected in 24h. Reduce manual irrigation and check drainage.`,
    });
  }

  if (!alerts.length) {
    alerts.push({
      id: "stable",
      level: "good",
      title: "Stable crop conditions",
      message: `${profile.label} conditions are balanced for the next 24 hours. Keep your current field routine.`,
    });
  }

  return alerts;
};

const deriveInsights = (snapshot: WeatherSnapshot, crop: CropKey) => {
  const profile = CROP_PROFILES[crop];
  const [soilMin, soilMax] = profile.optimalSoilTemp;
  const soil = snapshot.currentSoilTemperature;
  const insights: string[] = [];

  if (soil < soilMin) {
    insights.push(
      `Soil temperature is ${formatTemp(soil)}. ${profile.label} roots are below the ideal range (${soilMin}°C-${soilMax}°C). Consider mulching or warmer irrigation windows.`
    );
  } else if (soil > soilMax) {
    insights.push(
      `Soil temperature is ${formatTemp(soil)}, above the ideal ${profile.label} range (${soilMin}°C-${soilMax}°C). Light shading can reduce root stress.`
    );
  } else {
    insights.push(
      `Current soil temperature is ${formatTemp(soil)}, which is generally favorable for ${profile.label.toLowerCase()} growth activity.`
    );
  }

  if (snapshot.currentSoilMoisture < profile.moistureTargetMin) {
    insights.push(
      `Soil moisture is below optimal. Consider staged irrigation cycles to restore moisture toward ${profile.moistureTargetMin}% without runoff.`
    );
  } else {
    insights.push(
      `Moisture is in a workable zone for ${profile.label.toLowerCase()}. Keep intervals consistent to maintain yield quality.`
    );
  }

  insights.push(
    `24h profile: ${formatTemp(snapshot.minTemperature24h)} to ${formatTemp(snapshot.maxTemperature24h)}, with ${snapshot.rainSum24h.toFixed(1)} mm expected rain.`
  );

  return insights;
};

const getPosition = (): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported on this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 120000,
    });
  });

const fetchWeather = async (latitude: number, longitude: number) => {
  const response = await fetch(buildOpenMeteoUrl(latitude, longitude), {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Open-Meteo request failed. Please retry.");
  }

  const payload = (await response.json()) as OpenMeteoResponse;
  return mapToWeatherSnapshot(payload, latitude, longitude);
};

export default function YieldPredictor({
  sectionId = "marketplace-yield-predictor",
  className,
}: YieldPredictorProps) {
  const [crop, setCrop] = useState<CropKey>("wheat");
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    setError(null);
    setIsLocating(true);

    try {
      const position = await getPosition();
      setIsLocating(false);
      setIsLoading(true);

      const result = await fetchWeather(position.coords.latitude, position.coords.longitude);
      setSnapshot(result);
    } catch (cause) {
      const message =
        cause instanceof GeolocationPositionError
          ? cause.code === 1
            ? "Location permission denied. Allow GPS access to analyze local farm weather."
            : cause.code === 2
              ? "Location unavailable. Move to an open area and try again."
              : "Location request timed out. Please try once more."
          : cause instanceof Error
            ? cause.message
            : "Unable to analyze farm weather right now.";
      setError(message);
    } finally {
      setIsLocating(false);
      setIsLoading(false);
    }
  }, []);

  const alerts = useMemo(() => {
    if (!snapshot) return [];
    return deriveAlerts(snapshot, crop);
  }, [snapshot, crop]);

  const insights = useMemo(() => {
    if (!snapshot) return [];
    return deriveInsights(snapshot, crop);
  }, [snapshot, crop]);

  const moistureValue = snapshot?.currentSoilMoisture ?? 0;
  const moistureGaugeData = useMemo(
    () => [
      { name: "Moisture", value: moistureValue },
      { name: "Remaining", value: Math.max(0, 100 - moistureValue) },
    ],
    [moistureValue]
  );

  const locationLabel = snapshot
    ? `GPS lock acquired · ${snapshot.latitude.toFixed(3)}, ${snapshot.longitude.toFixed(3)}`
    : "Awaiting GPS lock";

  return (
    <section
      id={sectionId}
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/45 to-teal-50/40 p-4 shadow-[0_20px_52px_rgba(15,23,42,0.16)] sm:p-6",
        "select-none",
        className
      )}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="pointer-events-none absolute -left-10 top-0 h-32 w-32 rounded-full bg-emerald-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-8 bottom-0 h-28 w-28 rounded-full bg-cyan-200/30 blur-3xl" />

      <div className="relative z-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-3xl font-black tracking-tight text-slate-900">Yield Predictor</h3>
            <p className="mt-1 text-base text-slate-600">
              Enterprise agronomic intelligence powered by GreenDuty.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/75 px-3 py-1 text-xs font-semibold text-emerald-700 backdrop-blur-md">
              <LocateFixed className="h-3.5 w-3.5" />
              {locationLabel}
            </span>
            <span className="rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-xs font-semibold text-slate-600">
              {snapshot
                ? `Updated ${snapshot.updatedAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "No live sample yet"}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:items-end">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Target Crop
            </span>
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2.5 shadow-sm backdrop-blur-md">
              <select
                value={crop}
                onChange={(event) => setCrop(event.target.value as CropKey)}
                className="w-full appearance-none bg-transparent text-sm font-semibold text-slate-800 outline-none"
              >
                {(Object.keys(CROP_PROFILES) as CropKey[]).map((key) => (
                  <option key={key} value={key}>
                    {CROP_PROFILES[key].label}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isLocating || isLoading}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-5 text-lg font-bold text-white shadow-[0_12px_26px_rgba(16,185,129,0.35)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-70 md:w-fit md:min-w-[250px]"
          >
            {isLocating || isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyzing local weather...
              </>
            ) : (
              <>
                <Radar className="h-5 w-5" />
                Analyze Farm Weather
              </>
            )}
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {!snapshot && !error ? (
          <div className="mt-7 rounded-2xl border border-dashed border-emerald-300/80 bg-white/70 px-4 py-8 text-center text-sm text-slate-600 backdrop-blur-sm">
            Tap <span className="font-semibold text-emerald-700">Analyze Farm Weather</span> to lock GPS and generate live crop alerts.
          </div>
        ) : null}

        {snapshot ? (
          <>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur-md transition duration-300 hover:shadow-md">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <ThermometerSun className="h-5 w-5" />
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Temperature
                </p>
                <p className="mt-1 text-4xl font-black text-slate-900">
                  {formatTemp(snapshot.currentTemperature)}
                </p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur-md transition duration-300 hover:shadow-md">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Sprout className="h-5 w-5" />
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Soil Temperature
                </p>
                <p className="mt-1 text-4xl font-black text-slate-900">
                  {formatTemp(snapshot.currentSoilTemperature)}
                </p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur-md transition duration-300 hover:shadow-md sm:col-span-2 xl:col-span-1">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                  <Droplets className="h-5 w-5" />
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Soil Moisture
                </p>
                <p className="mt-1 text-4xl font-black text-slate-900">
                  {formatMoisture(snapshot.currentSoilMoisture)}
                </p>
              </article>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <article className="rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur-md">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">24h Climate Trend</h4>
                    <p className="text-xs text-slate-500">
                      Temperature and precipitation trajectory
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-700">
                    <CloudRain className="h-3.5 w-3.5" />
                    Live
                  </span>
                </div>

                <div className="mt-4 h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={snapshot.trend24h}>
                      <defs>
                        <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#dbe2ea" />
                      <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#64748b" }} />
                      <YAxis
                        yAxisId="temp"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        width={34}
                      />
                      <YAxis
                        yAxisId="rain"
                        orientation="right"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        width={34}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #dbe2ea",
                          background: "rgba(255,255,255,0.95)",
                          fontSize: 12,
                        }}
                        formatter={(value: number | string, name: string) => {
                          const numeric =
                            typeof value === "number" ? value : Number(value ?? 0);
                          if (name === "temperature") {
                            return [formatTemp(numeric), "Temperature"];
                          }
                          return [`${numeric.toFixed(1)} mm`, "Precipitation"];
                        }}
                      />
                      <Area
                        yAxisId="temp"
                        type="monotone"
                        dataKey="temperature"
                        stroke="#059669"
                        strokeWidth={2.4}
                        fill="url(#tempGradient)"
                        animationDuration={450}
                      />
                      <Area
                        yAxisId="rain"
                        type="monotone"
                        dataKey="precipitation"
                        stroke="#0284c7"
                        strokeWidth={2}
                        fill="url(#rainGradient)"
                        animationDuration={500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur-md">
                <h4 className="text-lg font-bold text-slate-900">Soil Moisture Gauge</h4>
                <p className="text-xs text-slate-500">Color-coded hydration readiness</p>

                <div className="relative mt-4 h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={moistureGaugeData}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        innerRadius={66}
                        outerRadius={90}
                        paddingAngle={0}
                        stroke="none"
                      >
                        <Cell fill={moistureColor(moistureValue)} />
                        <Cell fill="#e2e8f0" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-slate-900">
                      {formatMoisture(moistureValue)}
                    </span>
                    <span className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Soil Moisture
                    </span>
                  </div>
                </div>

                <div className="mt-1 grid grid-cols-3 gap-2 text-[11px] font-semibold">
                  <span className="rounded-full bg-red-50 px-2 py-1 text-center text-red-600">
                    &lt;20%
                  </span>
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-center text-amber-600">
                    20-40%
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-center text-emerald-600">
                    &gt;40%
                  </span>
                </div>
              </article>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur-md">
                <h4 className="text-lg font-bold text-slate-900">Smart Alerts</h4>
                <div className="mt-3 space-y-3">
                  {alerts.map((alert) => {
                    const style = ALERT_STYLES[alert.level];
                    return (
                      <div
                        key={alert.id}
                        className={cn(
                          "rounded-2xl border px-3.5 py-3 transition duration-300",
                          style.shell,
                          style.glow
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/20 bg-white/75">
                            {alert.level === "good" ? (
                              <Sprout className="h-4 w-4" />
                            ) : alert.level === "info" ? (
                              <Wind className="h-4 w-4" />
                            ) : (
                              <AlertTriangle className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold">{alert.title}</p>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                  style.badge
                                )}
                              >
                                {style.text}
                              </span>
                            </div>
                            <p className="mt-1 text-sm leading-relaxed">{alert.message}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm backdrop-blur-md">
                <h4 className="text-lg font-bold text-slate-900">Yield Insights</h4>
                <div className="mt-3 space-y-3">
                  {insights.map((entry, index) => (
                    <div
                      key={`${entry.slice(0, 20)}-${index}`}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50/75 px-3.5 py-3 text-sm leading-relaxed text-emerald-900"
                    >
                      {entry}
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    <p className="font-semibold">24h Rain</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {snapshot.rainSum24h.toFixed(1)} mm
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    <p className="font-semibold">Max Wind</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {snapshot.maxWind24h.toFixed(0)} km/h
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 col-span-2 sm:col-span-1">
                    <p className="font-semibold">Humidity</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {snapshot.trend24h[0]?.humidity.toFixed(0) ?? "--"}%
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

