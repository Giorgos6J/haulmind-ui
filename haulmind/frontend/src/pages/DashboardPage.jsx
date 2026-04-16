import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboardSummary } from "../api/dashboard";
import { getFuelCalendar } from "../api/fuel";
import { getActuals, getPredictions } from "../api/operations";
import { getTrips } from "../api/trips";

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function safeArray(value, fallbackKeys = []) {
  if (Array.isArray(value)) return value;

  if (value && typeof value === "object") {
    for (const key of fallbackKeys) {
      if (Array.isArray(value[key])) return value[key];
    }
  }

  return [];
}

function formatCurrency(value) {
  const amount = toNumber(value, NaN);
  if (Number.isNaN(amount)) return "€0.00";

  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPrice(value) {
  const amount = toNumber(value, NaN);
  if (Number.isNaN(amount)) return "-";
  return `€${amount.toFixed(3)}/L`;
}

function formatNumber(value) {
  const amount = toNumber(value, NaN);
  if (Number.isNaN(amount)) return "-";
  return new Intl.NumberFormat("en-GB").format(amount);
}

function formatDateTime(value) {
  if (!isValidDate(value)) return "-";

  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(value) {
  if (!isValidDate(value)) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function getMonthStart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function toDateKey(value) {
  if (!isValidDate(value)) return null;
  return new Date(value).toISOString().slice(0, 10);
}

function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getYearMonth(value) {
  if (!isValidDate(value)) return null;
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function groupSeries(items, keyGetter, valueGetter, labelFormatter, valueKey = "value") {
  const grouped = items.reduce((acc, item) => {
    const key = keyGetter(item);
    if (!key) return acc;

    if (!acc[key]) {
      acc[key] = {
        key,
        label: labelFormatter(key),
        [valueKey]: 0,
      };
    }

    acc[key][valueKey] += valueGetter(item);
    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => a.key.localeCompare(b.key));
}

function getEffectiveTripDate(trip, actual) {
  const source = actual?.completed_at || trip?.departure_time;
  if (!isValidDate(source)) return null;
  return new Date(source);
}

function isActualComplete(actual) {
  if (!actual) return false;

  return (
    actual.actual_fuel_liters !== null &&
    actual.actual_fuel_liters !== undefined &&
    actual.actual_eta_minutes !== null &&
    actual.actual_eta_minutes !== undefined &&
    actual.actual_distance_km !== null &&
    actual.actual_distance_km !== undefined &&
    actual.actual_cost !== null &&
    actual.actual_cost !== undefined &&
    Boolean(actual.completed_at)
  );
}

function Badge({ children, tone = "violet" }) {
  const tones = {
    violet: "border-[#D9D6FE] bg-[#F5F3FF] text-[#5B4FE8]",
    emerald: "border-[#B7E6CB] bg-[#ECFDF3] text-[#067647]",
    amber: "border-[#F6D59D] bg-[#FFFAEB] text-[#B54708]",
    blue: "border-[#B2DDFF] bg-[#EFF8FF] text-[#175CD3]",
    slate: "border-[#D0D5DD] bg-[#F8FAFC] text-[#475467]",
    rose: "border-[#F9C7C5] bg-[#FEF3F2] text-[#B42318]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${tones[tone] || tones.violet}`}
    >
      {children}
    </span>
  );
}

function SummaryCard({ title, value, helper, badge, accent = "violet" }) {
  const accentMap = {
    violet: {
      ring: "from-[#6D5EF5] to-[#8B7CFF]",
      soft: "from-[#F5F3FF] to-[#FAF8FF]",
      dot: "bg-[#6D5EF5]",
    },
    emerald: {
      ring: "from-[#12B76A] to-[#32D583]",
      soft: "from-[#ECFDF3] to-[#F3FFF8]",
      dot: "bg-[#12B76A]",
    },
    amber: {
      ring: "from-[#F79009] to-[#FDB022]",
      soft: "from-[#FFF7E8] to-[#FFFBF2]",
      dot: "bg-[#F79009]",
    },
    blue: {
      ring: "from-[#2E90FA] to-[#53B1FD]",
      soft: "from-[#EFF8FF] to-[#F8FBFF]",
      dot: "bg-[#2E90FA]",
    },
  };

  const current = accentMap[accent] || accentMap.violet;

  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-white/70 bg-white/95 p-5 shadow-[0_20px_50px_rgba(17,24,39,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(17,24,39,0.10)]">
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${current.ring}`} />
      <div className={`absolute right-0 top-0 h-28 w-28 rounded-full bg-gradient-to-br ${current.soft} blur-2xl`} />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-3">
            {badge ? <Badge tone={accent}>{badge}</Badge> : null}
            <p className="text-sm font-medium text-[#475467]">{title}</p>
          </div>
          <span
            className={`mt-1 h-3 w-3 rounded-full ${current.dot} shadow-[0_0_0_6px_rgba(109,94,245,0.08)]`}
          />
        </div>

        <h3 className="mt-5 text-[30px] font-semibold tracking-tight text-[#0F172A]">
          {value}
        </h3>

        <p className="mt-2 text-sm leading-6 text-[#667085]">{helper}</p>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, tone = "slate" }) {
  const tones = {
    violet: "border-[#E7E3F8] bg-[#FAF8FF]",
    emerald: "border-[#D1FADF] bg-[#ECFDF3]",
    amber: "border-[#FDE68A] bg-[#FFFAEB]",
    blue: "border-[#D1E9FF] bg-[#EFF8FF]",
    slate: "border-[#E7EAF3] bg-[#FCFCFE]",
    rose: "border-[#FECDCA] bg-[#FEF3F2]",
  };

  return (
    <div className={`rounded-[22px] border p-4 ${tones[tone] || tones.slate}`}>
      <p className="text-sm text-[#667085]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[#0F172A]">{value}</p>
    </div>
  );
}

function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <section
      className={`rounded-[30px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_50px_rgba(17,24,39,0.07)] ${className}`}
    >
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-[#667085]">{subtitle}</p>
          ) : null}
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[#D0D5DD] bg-[#FCFCFD] px-5 py-8 text-center text-sm text-[#667085]">
      {text}
    </div>
  );
}

function WorkflowRow({ label, value, helper, tone = "violet" }) {
  const toneMap = {
    violet: "border-[#E7E3F8] bg-[#F5F3FF] text-[#6D5EF5]",
    emerald: "border-[#D1FADF] bg-[#ECFDF3] text-[#027A48]",
    amber: "border-[#FDE68A] bg-[#FFFAEB] text-[#B54708]",
    blue: "border-[#D1E9FF] bg-[#EFF8FF] text-[#175CD3]",
    rose: "border-[#FECDCA] bg-[#FEF3F2] text-[#B42318]",
    slate: "border-[#E7EAF3] bg-[#F8FAFC] text-[#475467]",
  };

  return (
    <div className="flex items-center justify-between rounded-[22px] border border-[#EEF1F7] bg-[#FCFCFE] px-4 py-4">
      <div className="pr-4">
        <p className="text-sm font-medium text-[#344054]">{label}</p>
        <p className="mt-1 text-xs text-[#667085]">{helper}</p>
      </div>

      <div
        className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneMap[tone] || toneMap.slate}`}
      >
        {value}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState({});
  const [predictions, setPredictions] = useState([]);
  const [trips, setTrips] = useState([]);
  const [actuals, setActuals] = useState([]);
  const [fuelCalendar, setFuelCalendar] = useState([]);
  const [timeMode, setTimeMode] = useState("daily");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (showInitialLoader = false) => {
    try {
      if (showInitialLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const results = await Promise.allSettled([
        getDashboardSummary(),
        getTrips(),
        getPredictions(),
        getActuals(),
        getFuelCalendar(getMonthStart(), 30),
      ]);

      const [summaryResult, tripsResult, predictionsResult, actualsResult, fuelResult] = results;

      const summaryData =
        summaryResult.status === "fulfilled"
          ? summaryResult.value?.summary ?? summaryResult.value ?? {}
          : {};

      const tripsData =
        tripsResult.status === "fulfilled"
          ? safeArray(tripsResult.value, ["trips", "items", "data", "results"])
          : [];

      const predictionsData =
        predictionsResult.status === "fulfilled"
          ? safeArray(predictionsResult.value, ["predictions", "items", "data", "results"])
          : [];

      const actualsData =
        actualsResult.status === "fulfilled"
          ? safeArray(actualsResult.value, ["actuals", "items", "data", "results"])
          : [];

      const fuelDataRaw =
        fuelResult.status === "fulfilled"
          ? safeArray(fuelResult.value, ["calendar", "fuel_calendar", "items", "data", "results"])
          : [];

      const sortedFuelData = [...fuelDataRaw].sort((a, b) => {
        const aTime = isValidDate(a?.target_date) ? new Date(a.target_date).getTime() : 0;
        const bTime = isValidDate(b?.target_date) ? new Date(b.target_date).getTime() : 0;
        return aTime - bTime;
      });

      setSummary(summaryData);
      setTrips(Array.isArray(tripsData) ? tripsData : []);
      setPredictions(Array.isArray(predictionsData) ? predictionsData : []);
      setActuals(Array.isArray(actualsData) ? actualsData : []);
      setFuelCalendar(sortedFuelData);

      const failedCount = results.filter((result) => result.status === "rejected").length;
      if (failedCount > 0) {
        setError(`Some dashboard sections could not be loaded (${failedCount}/5 failed).`);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(true);
  }, [loadDashboard]);

  const predictionMap = useMemo(
    () => new Map(predictions.map((item) => [item.booking_id, item])),
    [predictions]
  );

  const actualMap = useMemo(
    () => new Map(actuals.map((item) => [item.booking_id, item])),
    [actuals]
  );

  const tripRows = useMemo(() => {
    return trips.map((trip) => {
      const prediction = predictionMap.get(trip.id) || null;
      const actual = actualMap.get(trip.id) || null;

      let workflowStatus = "missing_prediction";

      if (prediction && !actual) {
        workflowStatus = "needs_actual";
      } else if (prediction && actual && !isActualComplete(actual)) {
        workflowStatus = "incomplete_actual";
      } else if (prediction && actual && isActualComplete(actual)) {
        workflowStatus = "ready_for_comparison";
      }

      const isOperationallyCompleted =
        trip.status === "completed" || workflowStatus === "ready_for_comparison";

      const effectiveDate = getEffectiveTripDate(trip, actual);

      return {
        ...trip,
        prediction,
        actual,
        workflowStatus,
        isOperationallyCompleted,
        effectiveDate,
      };
    });
  }, [trips, predictionMap, actualMap]);

  const currentMonthKey = getCurrentYearMonth();

  const totalVehicles = toNumber(summary?.active_vehicles ?? summary?.total_vehicles, 0);

  const openTrips = tripRows.filter((trip) => !trip.isOperationallyCompleted);
  const openTripCount = openTrips.length;

  const activePredictedSpend = openTrips.reduce(
    (acc, trip) => acc + toNumber(trip?.prediction?.predicted_cost, 0),
    0
  );

  const recordedSpendThisMonth = actuals
    .filter((actual) => getYearMonth(actual?.completed_at) === currentMonthKey)
    .reduce((acc, actual) => acc + toNumber(actual?.actual_cost, 0), 0);

  const missingPredictionCount = openTrips.filter(
    (trip) => trip.workflowStatus === "missing_prediction"
  ).length;

  const predictionsAwaitingResultsCount = openTrips.filter(
    (trip) => trip.workflowStatus === "needs_actual"
  ).length;

  const incompleteResultsCount = openTrips.filter(
    (trip) => trip.workflowStatus === "incomplete_actual"
  ).length;

  const readyForComparisonCount = tripRows.filter(
    (trip) => trip.workflowStatus === "ready_for_comparison"
  ).length;

  const completedThisMonthCount = tripRows.filter((trip) => {
    if (!trip.isOperationallyCompleted) return false;
    const key = getYearMonth(trip.effectiveDate);
    return key === currentMonthKey;
  }).length;

  const fuelStats = useMemo(() => {
    const currentFuelPrice = toNumber(fuelCalendar[0]?.estimated_price_per_liter, 0);

    const averageFuelPrice = fuelCalendar.length
      ? fuelCalendar.reduce(
          (acc, item) => acc + toNumber(item?.estimated_price_per_liter, 0),
          0
        ) / fuelCalendar.length
      : 0;

    const highestFuelPrice = fuelCalendar.length
      ? Math.max(...fuelCalendar.map((item) => toNumber(item?.estimated_price_per_liter, 0)))
      : 0;

    return {
      currentFuelPrice,
      averageFuelPrice,
      highestFuelPrice,
    };
  }, [fuelCalendar]);

  const dieselDailyData = useMemo(() => {
    return groupSeries(
      fuelCalendar,
      (item) => toDateKey(item?.target_date),
      (item) => toNumber(item?.estimated_price_per_liter, 0),
      (key) => formatShortDate(key),
      "price"
    ).map((item) => ({
      ...item,
      price: Number(item.price.toFixed(3)),
    }));
  }, [fuelCalendar]);

  const dieselWeeklyData = useMemo(() => {
    const groups = groupSeries(
      fuelCalendar,
      (item) => {
        if (!isValidDate(item?.target_date)) return null;
        const date = new Date(item.target_date);
        const day = date.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + diff);
        return date.toISOString().slice(0, 10);
      },
      (item) => toNumber(item?.estimated_price_per_liter, 0),
      (key) => `Week of ${formatShortDate(key)}`,
      "total"
    );

    return groups.map((group) => {
      const count = fuelCalendar.filter((entry) => {
        if (!isValidDate(entry?.target_date)) return false;
        const date = new Date(entry.target_date);
        const day = date.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + diff);
        return date.toISOString().slice(0, 10) === group.key;
      }).length;

      return {
        key: group.key,
        label: group.label,
        price: Number((group.total / Math.max(count, 1)).toFixed(3)),
      };
    });
  }, [fuelCalendar]);

  const dieselChartData = timeMode === "weekly" ? dieselWeeklyData : dieselDailyData;

  const workflowChartData = useMemo(() => {
    return [
      { label: "Missing Prediction", value: missingPredictionCount, color: "#F79009" },
      { label: "Awaiting Results", value: predictionsAwaitingResultsCount, color: "#2E90FA" },
      { label: "Incomplete Results", value: incompleteResultsCount, color: "#F04438" },
      { label: "Ready", value: readyForComparisonCount, color: "#12B76A" },
    ];
  }, [
    missingPredictionCount,
    predictionsAwaitingResultsCount,
    incompleteResultsCount,
    readyForComparisonCount,
  ]);

  const actionQueue = useMemo(() => {
    return [...openTrips]
      .sort((a, b) => {
        const aTime = a.effectiveDate ? a.effectiveDate.getTime() : 0;
        const bTime = b.effectiveDate ? b.effectiveDate.getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5)
      .map((trip) => {
        const nextAction =
          trip.workflowStatus === "missing_prediction"
            ? "Run Prediction"
            : trip.workflowStatus === "needs_actual"
            ? "Add Trip Results"
            : trip.workflowStatus === "incomplete_actual"
            ? "Complete Trip Results"
            : "Monitor";

        return {
          ...trip,
          nextAction,
        };
      });
  }, [openTrips]);

  const latestPredictions = useMemo(() => {
    return [...predictions]
      .sort((a, b) => {
        const aTime = isValidDate(a?.created_at) ? new Date(a.created_at).getTime() : 0;
        const bTime = isValidDate(b?.created_at) ? new Date(b.created_at).getTime() : 0;

        if (aTime !== bTime) return bTime - aTime;
        return toNumber(b?.id, 0) - toNumber(a?.id, 0);
      })
      .slice(0, 5);
  }, [predictions]);

  const recentCompleted = useMemo(() => {
    return tripRows
      .filter((trip) => trip.isOperationallyCompleted)
      .sort((a, b) => {
        const aTime = a.effectiveDate ? a.effectiveDate.getTime() : 0;
        const bTime = b.effectiveDate ? b.effectiveDate.getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [tripRows]);

  return (
    <div className="space-y-6 pb-8">
      {error ? (
        <div className="flex flex-col gap-3 rounded-[24px] border border-[#FECACA] bg-[#FEF2F2] px-5 py-4 text-sm text-[#B42318] md:flex-row md:items-center md:justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadDashboard(false)}
            className="inline-flex w-fit rounded-xl border border-[#FDA29B] bg-white px-4 py-2 font-medium text-[#B42318] transition hover:bg-[#FFF5F4]"
          >
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[30px] border border-white/70 bg-white/95 p-8 shadow-[0_20px_50px_rgba(17,24,39,0.07)]">
          <p className="text-[#667085]">Loading dashboard...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              badge="Fleet"
              accent="violet"
              title="Total Vehicles"
              value={formatNumber(totalVehicles)}
              helper="Fleet assets currently available for operations."
            />
            <SummaryCard
              badge="Operations"
              accent="blue"
              title="Open Trips"
              value={formatNumber(openTripCount)}
              helper="Trips that still need operational action."
            />
            <SummaryCard
              badge="Prediction"
              accent="emerald"
              title="Active Predicted Spend"
              value={formatCurrency(activePredictedSpend)}
              helper="Predicted fuel spend only for open trips."
            />
            <SummaryCard
              badge="Results"
              accent="amber"
              title="Recorded Spend This Month"
              value={formatCurrency(recordedSpendThisMonth)}
              helper="Real trip cost already recorded this month."
            />
            <SummaryCard
              badge="Comparison"
              accent="violet"
              title="Ready for Comparison"
              value={formatNumber(readyForComparisonCount)}
              helper="Trips fully ready for predicted vs recorded review."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MiniMetric
              label="Missing Prediction"
              value={formatNumber(missingPredictionCount)}
              tone="amber"
            />
            <MiniMetric
              label="Predictions Awaiting Results"
              value={formatNumber(predictionsAwaitingResultsCount)}
              tone="blue"
            />
            <MiniMetric
              label="Incomplete Results"
              value={formatNumber(incompleteResultsCount)}
              tone="rose"
            />
            <MiniMetric
              label="Completed This Month"
              value={formatNumber(completedThisMonthCount)}
              tone="emerald"
            />
            <MiniMetric
              label="Average Diesel"
              value={formatPrice(fuelStats.averageFuelPrice)}
              tone="slate"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.45fr_1fr] 2xl:items-start">
            <Panel
              title="Diesel Price Outlook"
              subtitle="Track current diesel pricing and forecast movement across the selected period."
              action={
                <div className="inline-flex rounded-2xl border border-[#E7E3F8] bg-[#FAF9FF] p-1">
                  {[
                    { key: "daily", label: "Daily" },
                    { key: "weekly", label: "Weekly" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTimeMode(item.key)}
                      className={[
                        "rounded-xl px-4 py-2 text-sm font-medium transition",
                        timeMode === item.key
                          ? "bg-[#6D5EF5] text-white shadow-sm"
                          : "text-[#667085] hover:text-[#0F172A]",
                      ].join(" ")}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <MiniMetric
                  label="Current Diesel"
                  value={formatPrice(fuelStats.currentFuelPrice)}
                  tone="violet"
                />
                <MiniMetric
                  label="Average Diesel"
                  value={formatPrice(fuelStats.averageFuelPrice)}
                  tone="slate"
                />
                <MiniMetric
                  label="Highest Diesel"
                  value={formatPrice(fuelStats.highestFuelPrice)}
                  tone="amber"
                />
              </div>

              {!dieselChartData.length ? (
                <EmptyState text="No diesel pricing data available yet." />
              ) : (
                <div className="h-[300px] overflow-hidden rounded-[26px] border border-[#EEF1F7] bg-[linear-gradient(180deg,_#FCFCFE_0%,_#FFFFFF_100%)] p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={dieselChartData}
                      margin={{ top: 12, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="dieselGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6D5EF5" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#6D5EF5" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid stroke="#EEF1F7" vertical={false} />

                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#98A2B3", fontSize: 12 }}
                      />

                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#98A2B3", fontSize: 12 }}
                        tickFormatter={(value) => `€${toNumber(value, 0).toFixed(2)}`}
                      />

                      <Tooltip
                        contentStyle={{
                          borderRadius: 18,
                          border: "1px solid #E7EAF3",
                          boxShadow: "0 18px 40px rgba(16,24,40,0.12)",
                          backgroundColor: "#fff",
                        }}
                        labelFormatter={(label) => `Period: ${label}`}
                        formatter={(value) => [
                          `€${toNumber(value, 0).toFixed(3)}/L`,
                          "Diesel price",
                        ]}
                      />

                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#6D5EF5"
                        strokeWidth={3}
                        fill="url(#dieselGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <div className="space-y-6">
              <Panel
                title="Workflow Overview"
                subtitle="The most important operational states that still need attention."
              >
                <div className="space-y-3">
                  <WorkflowRow
                    label="Missing Prediction"
                    value={formatNumber(missingPredictionCount)}
                    helper="Trips created but still waiting for the prediction engine."
                    tone="amber"
                  />
                  <WorkflowRow
                    label="Predictions Awaiting Results"
                    value={formatNumber(predictionsAwaitingResultsCount)}
                    helper="Bookings with predictions that are still waiting for recorded trip results."
                    tone="blue"
                  />
                  <WorkflowRow
                    label="Incomplete Results"
                    value={formatNumber(incompleteResultsCount)}
                    helper="Trip results exist but recorded values are incomplete."
                    tone="rose"
                  />
                  <WorkflowRow
                    label="Ready for Comparison"
                    value={formatNumber(readyForComparisonCount)}
                    helper="Trips fully ready for predicted vs recorded review."
                    tone="emerald"
                  />
                </div>
              </Panel>

              <Panel
                title="Workflow Distribution"
                subtitle="Quick visual balance between backlog and comparison-ready trips."
              >
                {!workflowChartData.length ? (
                  <EmptyState text="No workflow data available yet." />
                ) : (
                  <div className="h-[250px] overflow-hidden rounded-[26px] border border-[#EEF1F7] bg-[linear-gradient(180deg,_#FCFCFE_0%,_#FFFFFF_100%)] p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={workflowChartData}
                        margin={{ top: 8, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid stroke="#EEF1F7" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#98A2B3", fontSize: 12 }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#98A2B3", fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 18,
                            border: "1px solid #E7EAF3",
                            boxShadow: "0 18px 40px rgba(16,24,40,0.12)",
                            backgroundColor: "#fff",
                          }}
                          formatter={(value) => [value, "Trips"]}
                        />
                        <Bar dataKey="value" radius={[10, 10, 0, 0]} maxBarSize={48}>
                          {workflowChartData.map((entry) => (
                            <Cell key={entry.label} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Panel>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
            <Panel
              title="Action Queue"
              subtitle="The next trips that still need operator attention."
            >
              {actionQueue.length === 0 ? (
                <EmptyState text="No open trips currently require action." />
              ) : (
                <div className="space-y-3">
                  {actionQueue.map((trip) => (
                    <div
                      key={trip.id}
                      className="rounded-[24px] border border-[#E7EAF3] bg-[linear-gradient(180deg,_#FFFFFF_0%,_#FCFCFE_100%)] p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A]">
                            {trip.booking_code || `#${trip.id}`}
                          </p>
                          <p className="mt-1 text-sm text-[#667085]">
                            {(trip.origin_address || "-") + " → " + (trip.destination_address || "-")}
                          </p>
                          <p className="mt-1 text-xs text-[#98A2B3]">
                            {formatDateTime(trip.departure_time)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            tone={
                              trip.workflowStatus === "missing_prediction"
                                ? "amber"
                                : trip.workflowStatus === "needs_actual"
                                ? "blue"
                                : trip.workflowStatus === "incomplete_actual"
                                ? "rose"
                                : "slate"
                            }
                          >
                            {trip.nextAction}
                          </Badge>

                          <Badge tone="slate">
                            {String(trip.status || "scheduled").replaceAll("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              title="Latest Predictions"
              subtitle="Recent model outputs that feed the operational workflow."
              action={
                <button
                  type="button"
                  onClick={() => loadDashboard(false)}
                  disabled={refreshing}
                  className="rounded-xl border border-[#E7EAF3] bg-white px-4 py-2 text-sm font-medium text-[#344054] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              }
            >
              <div className="space-y-3">
                {latestPredictions.length === 0 ? (
                  <EmptyState text="No prediction records yet." />
                ) : (
                  latestPredictions.map((prediction) => {
                    const fuelPriceUsed = toNumber(prediction?.fuel_price_used, NaN);
                    const predictedFuel = toNumber(prediction?.predicted_fuel_liters, 0);
                    const predictedCost = toNumber(prediction?.predicted_cost, 0);

                    return (
                      <div
                        key={
                          prediction.id ??
                          `${prediction.booking_id}-${prediction.model_version || "model"}`
                        }
                        className="rounded-[24px] border border-[#E7EAF3] bg-[linear-gradient(180deg,_#FFFFFF_0%,_#FCFCFE_100%)] p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#0F172A]">
                              Booking #{prediction.booking_id ?? "-"}
                            </p>
                            <p className="mt-1 text-xs text-[#667085]">
                              {prediction.model_version || "model unavailable"}
                            </p>
                          </div>

                          <Badge tone="violet">
                            {Number.isNaN(fuelPriceUsed)
                              ? "fuel n/a"
                              : `€${fuelPriceUsed.toFixed(3)}/L`}
                          </Badge>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-[20px] border border-[#F2F4F7] bg-white px-3 py-3">
                            <p className="text-xs uppercase tracking-[0.08em] text-[#98A2B3]">
                              Fuel
                            </p>
                            <p className="mt-1 text-lg font-semibold text-[#0F172A]">
                              {predictedFuel.toFixed(2)} L
                            </p>
                          </div>

                          <div className="rounded-[20px] border border-[#F2F4F7] bg-white px-3 py-3">
                            <p className="text-xs uppercase tracking-[0.08em] text-[#98A2B3]">
                              Cost
                            </p>
                            <p className="mt-1 text-lg font-semibold text-[#0F172A]">
                              {formatCurrency(predictedCost)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1fr_1fr]">
            <Panel
              title="Recently Completed"
              subtitle="Trips that have already moved out of the active workflow."
            >
              {recentCompleted.length === 0 ? (
                <EmptyState text="No completed trips available yet." />
              ) : (
                <div className="space-y-3">
                  {recentCompleted.map((trip) => (
                    <div
                      key={trip.id}
                      className="rounded-[24px] border border-[#E7EAF3] bg-[linear-gradient(180deg,_#FFFFFF_0%,_#FCFCFE_100%)] p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A]">
                            {trip.booking_code || `#${trip.id}`}
                          </p>
                          <p className="mt-1 text-sm text-[#667085]">
                            {(trip.origin_address || "-") + " → " + (trip.destination_address || "-")}
                          </p>
                          <p className="mt-1 text-xs text-[#98A2B3]">
                            {formatDateTime(trip.effectiveDate)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="emerald">Completed</Badge>
                          {trip.workflowStatus === "ready_for_comparison" ? (
                            <Badge tone="violet">Ready for comparison</Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              title="What matters now"
              subtitle="The cleanest read of the current dashboard state."
            >
              <div className="space-y-3">
                <WorkflowRow
                  label="Open Trips"
                  value={formatNumber(openTripCount)}
                  helper="This is the real active workload, not all bookings."
                  tone="blue"
                />
                <WorkflowRow
                  label="Active Predicted Spend"
                  value={formatCurrency(activePredictedSpend)}
                  helper="This excludes completed trips and focuses on open exposure."
                  tone="emerald"
                />
                <WorkflowRow
                  label="Predictions Awaiting Results"
                  value={formatNumber(predictionsAwaitingResultsCount)}
                  helper="These bookings already have predictions and are waiting for recorded trip results."
                  tone="blue"
                />
                <WorkflowRow
                  label="Completed This Month"
                  value={formatNumber(completedThisMonthCount)}
                  helper="Cleaner executive indicator than raw status totals."
                  tone="amber"
                />
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}