import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAllComparisons } from "../api/analytics";
import { getTrips } from "../api/trips";
import { getVehicles } from "../api/vehicles";
import { getActuals } from "../api/operations";

function average(values) {
  const valid = values.filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((acc, curr) => acc + curr, 0) / valid.length;
}

function sum(values) {
  return values
    .filter((v) => typeof v === "number" && !Number.isNaN(v))
    .reduce((acc, curr) => acc + curr, 0);
}

function formatCurrency(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return `€${value.toFixed(2)}`;
}

function formatNumber(value, suffix = "") {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return `${value.toFixed(2)}${suffix}`;
}

function formatDateDisplay(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCostVarianceTone(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "#98A2B3";
  if (value > 20) return "#F04438";
  if (value > 10) return "#F79009";
  if (value > 0) return "#8B7CFF";
  return "#12B76A";
}

function getMismatchLevel(item) {
  const fuelError = typeof item?.fuel?.percentage_error === "number" ? item.fuel.percentage_error : 0;
  const costError = typeof item?.cost?.percentage_error === "number" ? item.cost.percentage_error : 0;
  const distanceError =
    typeof item?.distance?.percentage_error === "number" ? item.distance.percentage_error : 0;

  const maxError = Math.max(fuelError, costError, distanceError);

  if (maxError >= 20) return "high";
  if (maxError >= 10) return "medium";
  return "low";
}

function getMismatchBadgeTone(level) {
  if (level === "high") return "border-[#FECACA] bg-[#FEF2F2] text-[#B42318]";
  if (level === "medium") return "border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]";
  return "border-[#D1FADF] bg-[#ECFDF3] text-[#027A48]";
}

function matchesDateRange(date, fromDate, toDate) {
  if (!date) return false;

  const target = new Date(date);

  if (fromDate) {
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    if (target < start) return false;
  }

  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    if (target > end) return false;
  }

  return true;
}

function SummaryCard({ title, value, helper }) {
  return (
    <div className="rounded-[28px] border border-[#E7EAF3] bg-white p-5 shadow-[0_10px_30px_rgba(16,24,40,0.04)]">
      <p className="text-sm text-[#667085]">{title}</p>
      <h3 className="mt-2 text-[28px] font-semibold tracking-tight text-[#1D2433]">{value}</h3>
      {helper ? <p className="mt-2 text-sm text-[#98A2B3]">{helper}</p> : null}
    </div>
  );
}

function Panel({ title, subtitle, children, action }) {
  return (
    <section className="rounded-[30px] border border-[#E7EAF3] bg-white p-6 shadow-[0_10px_30px_rgba(16,24,40,0.04)]">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#1D2433]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-[#667085]">{subtitle}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export default function AnalyticsPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [comparisons, setComparisons] = useState([]);
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [actuals, setActuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState(formatDateInputValue(monthStart));
  const [toDate, setToDate] = useState(formatDateInputValue(now));
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [mismatchFilter, setMismatchFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const [comparisonData, tripsData, vehiclesData, actualsData] = await Promise.all([
          getAllComparisons(),
          getTrips(),
          getVehicles(),
          getActuals(),
        ]);

        setComparisons(Array.isArray(comparisonData?.comparisons) ? comparisonData.comparisons : []);
        setTrips(Array.isArray(tripsData) ? tripsData : []);
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : vehiclesData?.vehicles || []);
        setActuals(Array.isArray(actualsData) ? actualsData : []);
      } catch (err) {
        console.error("Failed to load analytics:", err);
        setError("Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const tripMap = useMemo(() => new Map(trips.map((trip) => [trip.id, trip])), [trips]);
  const vehicleMap = useMemo(() => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])), [vehicles]);
  const actualMap = useMemo(() => new Map(actuals.map((actual) => [actual.booking_id, actual])), [actuals]);

  const enrichedComparisons = useMemo(() => {
    return comparisons.map((item) => {
      const trip = tripMap.get(item.booking_id) || null;
      const actual = actualMap.get(item.booking_id) || null;
      const vehicle = trip ? vehicleMap.get(trip.vehicle_id) || null : null;
      const effectiveDate = actual?.completed_at || trip?.departure_time || null;
      const mismatchLevel = getMismatchLevel(item);

      return {
        ...item,
        trip,
        actual,
        vehicle,
        effectiveDate,
        mismatchLevel,
      };
    });
  }, [comparisons, tripMap, actualMap, vehicleMap]);

  const filteredComparisons = useMemo(() => {
    const filtered = enrichedComparisons.filter((item) => {
      const search = searchTerm.trim().toLowerCase();

      const routeText = item.trip
        ? `${item.trip.origin_address || ""} ${item.trip.destination_address || ""}`.toLowerCase()
        : "";

      const vehicleText = item.vehicle
        ? `${item.vehicle.plate_number || ""} ${item.vehicle.manufacturer || ""} ${item.vehicle.model || ""}`.toLowerCase()
        : "";

      const matchesSearch =
        !search ||
        (item.booking_code || "").toLowerCase().includes(search) ||
        routeText.includes(search) ||
        vehicleText.includes(search);

      const matchesDate = matchesDateRange(item.effectiveDate, fromDate, toDate);

      const matchesVehicle =
        vehicleFilter === "all"
          ? true
          : String(item.trip?.vehicle_id) === String(vehicleFilter);

      const matchesMismatch =
        mismatchFilter === "all" ? true : item.mismatchLevel === mismatchFilter;

      return matchesSearch && matchesDate && matchesVehicle && matchesMismatch;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "newest") {
        const timeA = a.effectiveDate ? new Date(a.effectiveDate).getTime() : 0;
        const timeB = b.effectiveDate ? new Date(b.effectiveDate).getTime() : 0;
        return timeB - timeA;
      }

      if (sortBy === "fuel_error") {
        return (b?.fuel?.percentage_error || 0) - (a?.fuel?.percentage_error || 0);
      }

      if (sortBy === "cost_error") {
        return (b?.cost?.percentage_error || 0) - (a?.cost?.percentage_error || 0);
      }

      if (sortBy === "cost_difference") {
        return Math.abs(b?.cost?.difference || 0) - Math.abs(a?.cost?.difference || 0);
      }

      return 0;
    });
  }, [enrichedComparisons, searchTerm, fromDate, toDate, vehicleFilter, mismatchFilter, sortBy]);

  const analytics = useMemo(() => {
    const totalComparisons = filteredComparisons.length;

    const avgFuelError = average(filteredComparisons.map((item) => item?.fuel?.percentage_error));
    const avgEtaError = average(filteredComparisons.map((item) => item?.eta?.percentage_error));
    const avgDistanceError = average(filteredComparisons.map((item) => item?.distance?.percentage_error));
    const avgCostError = average(filteredComparisons.map((item) => item?.cost?.percentage_error));

    const totalPredictedCost = sum(filteredComparisons.map((item) => item?.cost?.predicted_cost));
    const totalRecordedCost = sum(filteredComparisons.map((item) => item?.cost?.actual_cost));
    const totalCostDifference = sum(filteredComparisons.map((item) => item?.cost?.difference));

    const highMismatchTrips = filteredComparisons.filter((item) => item.mismatchLevel === "high").length;

    return {
      totalComparisons,
      avgFuelError,
      avgEtaError,
      avgDistanceError,
      avgCostError,
      totalPredictedCost,
      totalRecordedCost,
      totalCostDifference,
      highMismatchTrips,
    };
  }, [filteredComparisons]);

  const fuelComparisonData = useMemo(
    () =>
      filteredComparisons.slice(0, 8).map((item) => ({
        booking: item.booking_code || `Booking ${item.booking_id}`,
        predicted: Number(item?.fuel?.predicted_liters || 0),
        recorded: Number(item?.fuel?.actual_liters || 0),
      })),
    [filteredComparisons]
  );

  const costVarianceData = useMemo(
    () =>
      filteredComparisons.slice(0, 8).map((item) => ({
        booking: item.booking_code || `Booking ${item.booking_id}`,
        predictedCost: Number(item?.cost?.predicted_cost || 0),
        recordedCost: Number(item?.cost?.actual_cost || 0),
        costError: Number(item?.cost?.percentage_error || 0),
      })),
    [filteredComparisons]
  );

  const topMismatches = useMemo(() => {
    return [...filteredComparisons]
      .sort((a, b) => {
        const scoreA = Math.max(
          typeof a?.fuel?.percentage_error === "number" ? a.fuel.percentage_error : -1,
          typeof a?.cost?.percentage_error === "number" ? a.cost.percentage_error : -1,
          typeof a?.distance?.percentage_error === "number" ? a.distance.percentage_error : -1
        );
        const scoreB = Math.max(
          typeof b?.fuel?.percentage_error === "number" ? b.fuel.percentage_error : -1,
          typeof b?.cost?.percentage_error === "number" ? b.cost.percentage_error : -1,
          typeof b?.distance?.percentage_error === "number" ? b.distance.percentage_error : -1
        );
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }, [filteredComparisons]);

  const exportCsv = () => {
    const rows = filteredComparisons.map((item) => ({
      booking_code: item.booking_code || "",
      booking_id: item.booking_id,
      date: item.effectiveDate ? formatDateDisplay(item.effectiveDate) : "",
      vehicle: item.vehicle
        ? `${item.vehicle.plate_number || ""} ${item.vehicle.manufacturer || ""} ${item.vehicle.model || ""}`.trim()
        : "",
      route: item.trip
        ? `${item.trip.origin_address || ""} -> ${item.trip.destination_address || ""}`
        : "",
      mismatch_level: item.mismatchLevel,
      predicted_fuel_liters: item?.fuel?.predicted_liters ?? "",
      recorded_fuel_liters: item?.fuel?.actual_liters ?? "",
      fuel_difference_liters: item?.fuel?.difference_liters ?? "",
      fuel_error_percent: item?.fuel?.percentage_error ?? "",
      predicted_eta_minutes: item?.eta?.predicted_minutes ?? "",
      recorded_eta_minutes: item?.eta?.actual_minutes ?? "",
      eta_difference_minutes: item?.eta?.difference_minutes ?? "",
      eta_error_percent: item?.eta?.percentage_error ?? "",
      planned_distance_km: item?.distance?.planned_distance_km ?? "",
      recorded_distance_km: item?.distance?.actual_distance_km ?? "",
      distance_difference_km: item?.distance?.difference_km ?? "",
      distance_error_percent: item?.distance?.percentage_error ?? "",
      predicted_cost: item?.cost?.predicted_cost ?? "",
      recorded_cost: item?.cost?.actual_cost ?? "",
      cost_difference: item?.cost?.difference ?? "",
      cost_error_percent: item?.cost?.percentage_error ?? "",
    }));

    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            const stringValue = value === null || value === undefined ? "" : String(value);
            return `"${stringValue.replaceAll('"', '""')}"`
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = formatDateInputValue(new Date());

    link.href = url;
    link.setAttribute("download", `haulmind_analytics_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFromDate(formatDateInputValue(monthStart));
    setToDate(formatDateInputValue(now));
    setVehicleFilter("all");
    setMismatchFilter("all");
    setSortBy("newest");
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-[24px] border border-[#FECACA] bg-[#FEF2F2] px-5 py-4 text-sm text-[#B42318]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[30px] border border-[#E7EAF3] bg-white p-8 shadow-[0_10px_30px_rgba(16,24,40,0.04)]">
          <p className="text-[#667085]">Loading analytics...</p>
        </div>
      ) : (
        <>
          <Panel
            title="Analytics Filters"
            subtitle="Filter comparison data by exact dates, vehicle, mismatch severity, and current search."
            action={
              <button
                type="button"
                onClick={exportCsv}
                disabled={filteredComparisons.length === 0}
                className="rounded-2xl bg-[#6D5EF5] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(109,94,245,0.24)] transition hover:bg-[#5B4CF0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Export CSV
              </button>
            }
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input
                type="text"
                placeholder="Search booking, route, vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
              />

              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
              />

              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
              />

              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
              >
                <option value="all">All Vehicles</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={String(vehicle.id)}>
                    {vehicle.plate_number} - {vehicle.manufacturer} {vehicle.model}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
              <select
                value={mismatchFilter}
                onChange={(e) => setMismatchFilter(e.target.value)}
                className="rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
              >
                <option value="all">All Mismatch Levels</option>
                <option value="low">Low Mismatch</option>
                <option value="medium">Medium Mismatch</option>
                <option value="high">High Mismatch</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="fuel_error">Sort: Highest Fuel Error</option>
                <option value="cost_error">Sort: Highest Cost Error</option>
                <option value="cost_difference">Sort: Largest Cost Difference</option>
              </select>

              <button
                type="button"
                onClick={resetFilters}
                className="rounded-2xl border border-[#D0D5DD] bg-white px-4 py-3 text-sm font-semibold text-[#344054] hover:bg-[#F8F9FC]"
              >
                Reset Filters
              </button>
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
            <SummaryCard
              title="Total Comparisons"
              value={analytics.totalComparisons}
              helper="Filtered comparison rows currently in view"
            />
            <SummaryCard
              title="Avg Fuel Error"
              value={analytics.avgFuelError === null ? "-" : `${analytics.avgFuelError.toFixed(2)}%`}
              helper="Average deviation between predicted and recorded fuel"
            />
            <SummaryCard
              title="Avg Cost Error"
              value={analytics.avgCostError === null ? "-" : `${analytics.avgCostError.toFixed(2)}%`}
              helper="Average variance between predicted and recorded trip cost"
            />
            <SummaryCard
              title="High Mismatch Trips"
              value={analytics.highMismatchTrips}
              helper="Trips with strong fuel, cost, or distance variance"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            <SummaryCard
              title="Total Predicted Cost"
              value={formatCurrency(analytics.totalPredictedCost)}
              helper="Total predicted cost for the filtered period"
            />
            <SummaryCard
              title="Total Recorded Cost"
              value={formatCurrency(analytics.totalRecordedCost)}
              helper="Total recorded cost for the filtered period"
            />
            <SummaryCard
              title="Net Cost Difference"
              value={formatCurrency(analytics.totalCostDifference)}
              helper="Recorded cost minus predicted cost"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Panel
              title="Predicted vs Recorded Fuel"
              subtitle="Fuel comparison for the current filtered dataset"
            >
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fuelComparisonData} barGap={8}>
                    <CartesianGrid stroke="#EEF1F7" vertical={false} />
                    <XAxis
                      dataKey="booking"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#98A2B3", fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#98A2B3", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 18,
                        border: "1px solid #E7EAF3",
                        boxShadow: "0 12px 32px rgba(16,24,40,0.10)",
                        backgroundColor: "#fff",
                      }}
                    />
                    <Bar dataKey="predicted" fill="#6D5EF5" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="recorded" fill="#D6D0FF" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel
              title="Predicted vs Recorded Cost"
              subtitle="Financial comparison for the current filtered dataset"
            >
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={costVarianceData} barGap={8}>
                    <CartesianGrid stroke="#EEF1F7" vertical={false} />
                    <XAxis
                      dataKey="booking"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#98A2B3", fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#98A2B3", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 18,
                        border: "1px solid #E7EAF3",
                        boxShadow: "0 12px 32px rgba(16,24,40,0.10)",
                        backgroundColor: "#fff",
                      }}
                    />
                    <Bar dataKey="predictedCost" fill="#8B7CFF" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="recordedCost" fill="#D1FADF" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Panel
              title="Comparison Results"
              subtitle="Detailed booking-level comparison for the filtered period"
            >
              {filteredComparisons.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-[#FCFCFE] p-6 text-sm text-[#667085]">
                  No comparison data matches the current filters.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredComparisons.map((item) => (
                    <div
                      key={item.booking_id}
                      className="rounded-[24px] border border-[#E7EAF3] bg-[#FCFCFE] p-5"
                    >
                      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-[#1D2433]">{item.booking_code}</h3>
                          <p className="text-sm text-[#667085]">
                            {item.trip
                              ? `${item.trip.origin_address} → ${item.trip.destination_address}`
                              : `Booking ID: ${item.booking_id}`}
                          </p>
                          <p className="mt-1 text-sm text-[#98A2B3]">
                            {item.vehicle
                              ? `${item.vehicle.plate_number} - ${item.vehicle.manufacturer} ${item.vehicle.model}`
                              : "Vehicle unavailable"}{" "}
                            • {formatDateDisplay(item.effectiveDate)}
                          </p>
                        </div>

                        <div
                          className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${getMismatchBadgeTone(
                            item.mismatchLevel
                          )}`}
                        >
                          {item.mismatchLevel} mismatch
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 text-sm">
                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                          <p className="mb-2 font-semibold text-[#344054]">Fuel</p>
                          <p className="text-[#667085]">Predicted: {item?.fuel?.predicted_liters ?? "-"} L</p>
                          <p className="text-[#667085]">Recorded: {item?.fuel?.actual_liters ?? "-"} L</p>
                          <p className="text-[#667085]">Difference: {item?.fuel?.difference_liters ?? "-"} L</p>
                          <p className="mt-2 font-medium text-[#6D5EF5]">
                            Error: {item?.fuel?.percentage_error ?? "-"}%
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                          <p className="mb-2 font-semibold text-[#344054]">ETA</p>
                          <p className="text-[#667085]">
                            Predicted: {item?.eta?.predicted_minutes ?? "ETA unavailable"}
                            {typeof item?.eta?.predicted_minutes === "number" ? " min" : ""}
                          </p>
                          <p className="text-[#667085]">
                            Recorded: {item?.eta?.actual_minutes ?? "ETA unavailable"}
                            {typeof item?.eta?.actual_minutes === "number" ? " min" : ""}
                          </p>
                          <p className="text-[#667085]">
                            Difference: {item?.eta?.difference_minutes ?? "-"}
                            {typeof item?.eta?.difference_minutes === "number" ? " min" : ""}
                          </p>
                          <p className="mt-2 font-medium text-[#8B7CFF]">
                            Error: {item?.eta?.percentage_error ?? "-"}%
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                          <p className="mb-2 font-semibold text-[#344054]">Distance</p>
                          <p className="text-[#667085]">Planned: {item?.distance?.planned_distance_km ?? "-"} km</p>
                          <p className="text-[#667085]">Recorded: {item?.distance?.actual_distance_km ?? "-"} km</p>
                          <p className="text-[#667085]">Difference: {item?.distance?.difference_km ?? "-"} km</p>
                          <p className="mt-2 font-medium text-[#344054]">
                            Error: {item?.distance?.percentage_error ?? "-"}%
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                          <p className="mb-2 font-semibold text-[#344054]">Cost</p>
                          <p className="text-[#667085]">
                            Predicted: {formatCurrency(item?.cost?.predicted_cost)}
                          </p>
                          <p className="text-[#667085]">
                            Recorded: {formatCurrency(item?.cost?.actual_cost)}
                          </p>
                          <p className="text-[#667085]">
                            Difference: {formatCurrency(item?.cost?.difference)}
                          </p>
                          <p
                            className="mt-2 font-medium"
                            style={{ color: getCostVarianceTone(item?.cost?.percentage_error) }}
                          >
                            Error: {item?.cost?.percentage_error ?? "-"}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              title="Top Mismatches"
              subtitle="Highest-priority review cases from the filtered dataset"
            >
              {topMismatches.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-[#FCFCFE] p-6 text-sm text-[#667085]">
                  No mismatches available for the current filters.
                </div>
              ) : (
                <div className="space-y-3">
                  {topMismatches.map((item) => (
                    <div
                      key={item.booking_id}
                      className="rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-[#1D2433]">{item.booking_code}</h4>
                          <p className="text-sm text-[#667085]">
                            {item.trip
                              ? `${item.trip.origin_address} → ${item.trip.destination_address}`
                              : `Booking ID: ${item.booking_id}`}
                          </p>
                        </div>
                        <div
                          className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${getMismatchBadgeTone(
                            item.mismatchLevel
                          )}`}
                        >
                          {item.mismatchLevel}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-[#667085]">
                        <p>Fuel error: {formatNumber(item?.fuel?.percentage_error, "%")}</p>
                        <p>Cost error: {formatNumber(item?.cost?.percentage_error, "%")}</p>
                        <p>Distance error: {formatNumber(item?.distance?.percentage_error, "%")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}