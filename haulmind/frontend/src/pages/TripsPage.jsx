import { useEffect, useMemo, useState } from "react";
import { createTrip, deleteTrip, getTrips } from "../api/trips";
import { getVehicles } from "../api/vehicles";
import {
  createActual,
  createPrediction,
  deletePrediction,
  getActuals,
  getPredictions,
} from "../api/operations";

function formatDateTime(value) {
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

function formatCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `€${number.toFixed(2)}`;
}

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function statusTone(status) {
  const tones = {
    scheduled: "border-[#E7E3F8] bg-[#F5F3FF] text-[#6D5EF5]",
    completed: "border-[#D1FADF] bg-[#ECFDF3] text-[#027A48]",
    in_progress: "border-[#DDD6FE] bg-[#F5F3FF] text-[#7C3AED]",
  };

  return tones[status] || "border-[#E7EAF3] bg-[#F8F9FC] text-[#667085]";
}

function workflowTone(status) {
  const tones = {
    missing_prediction: "border-[#FECACA] bg-[#FEF2F2] text-[#B42318]",
    needs_actual: "border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]",
    incomplete_actual: "border-[#FDE68A] bg-[#FFF7E1] text-[#B54708]",
    ready_for_comparison: "border-[#D1FADF] bg-[#ECFDF3] text-[#027A48]",
  };

  return tones[status] || "border-[#E7EAF3] bg-[#F8F9FC] text-[#667085]";
}

function getWorkflowLabel(status) {
  const labels = {
    missing_prediction: "Missing Prediction",
    needs_actual: "Awaiting Results",
    incomplete_actual: "Incomplete Results",
    ready_for_comparison: "Ready for Comparison",
  };

  return labels[status] || "Unknown";
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

function getEffectiveTripDate(trip) {
  const source = trip?.actual?.completed_at || trip?.departure_time;
  const date = new Date(source);
  return Number.isNaN(date.getTime()) ? null : date;
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

export default function TripsPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [actuals, setActuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actualSubmitting, setActualSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState(formatDateInputValue(monthStart));
  const [toDate, setToDate] = useState(formatDateInputValue(now));
  const [statusFilter, setStatusFilter] = useState("all");
  const [workflowFilter, setWorkflowFilter] = useState("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");

  const [form, setForm] = useState({
    booking_code: "",
    origin_address: "",
    destination_address: "",
    planned_distance_km: "",
    cargo_weight_kg: "",
    cargo_type: "",
    vehicle_id: "",
    departure_time: "",
    status: "scheduled",
  });

  const [actualModalOpen, setActualModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [actualForm, setActualForm] = useState({
    actual_fuel_liters: "",
    actual_eta_minutes: "",
    actual_distance_km: "",
    actual_cost: "",
    completed_at: "",
  });

  const loadTripsPageData = async () => {
    try {
      setLoading(true);
      setError("");

      const [tripsData, vehiclesData, predictionsData, actualsData] = await Promise.all([
        getTrips(),
        getVehicles(),
        getPredictions(),
        getActuals(),
      ]);

      setTrips(Array.isArray(tripsData) ? tripsData : []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : vehiclesData.vehicles || []);
      setPredictions(Array.isArray(predictionsData) ? predictionsData : []);
      setActuals(Array.isArray(actualsData) ? actualsData : []);
    } catch (err) {
      console.error("Failed to load trips page data:", err);
      setError("Failed to load trips page data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTripsPageData();
  }, []);

  const predictionMap = useMemo(
    () => new Map(predictions.map((item) => [item.booking_id, item])),
    [predictions]
  );

  const actualMap = useMemo(
    () => new Map(actuals.map((item) => [item.booking_id, item])),
    [actuals]
  );

  const vehicleMap = useMemo(
    () => new Map(vehicles.map((item) => [item.id, item])),
    [vehicles]
  );

  const totalPredictedSpend = predictions.reduce(
    (acc, item) => acc + Number(item.predicted_cost || 0),
    0
  );

  const tripRows = useMemo(() => {
    return trips
      .map((trip) => {
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

        const vehicle = vehicleMap.get(trip.vehicle_id) || null;
        const effectiveDate = getEffectiveTripDate({ ...trip, actual });

        return {
          ...trip,
          prediction,
          actual,
          workflowStatus,
          vehicle,
          isOperationallyCompleted,
          effectiveDate,
        };
      })
      .sort((a, b) => {
        const dateA = a.effectiveDate ? a.effectiveDate.getTime() : 0;
        const dateB = b.effectiveDate ? b.effectiveDate.getTime() : 0;
        return dateB - dateA;
      });
  }, [trips, predictionMap, actualMap, vehicleMap]);

  const filteredTripRows = useMemo(() => {
    return tripRows.filter((trip) => {
      const search = searchTerm.trim().toLowerCase();
      const vehicleText = trip.vehicle
        ? `${trip.vehicle.plate_number} ${trip.vehicle.manufacturer} ${trip.vehicle.model}`.toLowerCase()
        : "";
      const routeText = `${trip.origin_address || ""} ${trip.destination_address || ""}`.toLowerCase();

      const matchesSearch =
        !search ||
        (trip.booking_code || "").toLowerCase().includes(search) ||
        routeText.includes(search) ||
        vehicleText.includes(search);

      const matchesDate = matchesDateRange(trip.effectiveDate, fromDate, toDate);

      const matchesStatus =
        statusFilter === "all" ? true : trip.status === statusFilter;

      const matchesWorkflow =
        workflowFilter === "all" ? true : trip.workflowStatus === workflowFilter;

      const matchesVehicle =
        vehicleFilter === "all"
          ? true
          : String(trip.vehicle_id) === String(vehicleFilter);

      return (
        matchesSearch &&
        matchesDate &&
        matchesStatus &&
        matchesWorkflow &&
        matchesVehicle
      );
    });
  }, [
    tripRows,
    searchTerm,
    fromDate,
    toDate,
    statusFilter,
    workflowFilter,
    vehicleFilter,
  ]);

  const activeTripsCount = tripRows.filter(
    (trip) => !trip.isOperationallyCompleted
  ).length;

  const completedTripsCount = tripRows.filter(
    (trip) => trip.isOperationallyCompleted
  ).length;

  const readyForComparisonCount = tripRows.filter(
    (trip) => trip.workflowStatus === "ready_for_comparison"
  ).length;

  const awaitingResultsCount = tripRows.filter(
    (trip) => trip.workflowStatus === "needs_actual"
  ).length;

  const missingPredictionCount = tripRows.filter(
    (trip) => trip.workflowStatus === "missing_prediction"
  ).length;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleActualFieldChange = (e) => {
    const { name, value } = e.target;
    setActualForm((prev) => ({ ...prev, [name]: value }));
  };

  const openActualModal = (trip) => {
    setSelectedTrip(trip);
    setActualForm({
      actual_fuel_liters: "",
      actual_eta_minutes: "",
      actual_distance_km:
        trip?.planned_distance_km !== null && trip?.planned_distance_km !== undefined
          ? String(trip.planned_distance_km)
          : "",
      actual_cost: "",
      completed_at: trip?.departure_time || "",
    });
    setActualModalOpen(true);
  };

  const closeActualModal = (force = false) => {
    if (actualSubmitting && !force) return;

    setActualModalOpen(false);
    setSelectedTrip(null);
    setActualForm({
      actual_fuel_liters: "",
      actual_eta_minutes: "",
      actual_distance_km: "",
      actual_cost: "",
      completed_at: "",
    });
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFromDate(formatDateInputValue(monthStart));
    setToDate(formatDateInputValue(now));
    setStatusFilter("all");
    setWorkflowFilter("all");
    setVehicleFilter("all");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      await createTrip({
        ...form,
        planned_distance_km: Number(form.planned_distance_km),
        cargo_weight_kg: Number(form.cargo_weight_kg),
        vehicle_id: Number(form.vehicle_id),
      });

      setForm({
        booking_code: "",
        origin_address: "",
        destination_address: "",
        planned_distance_km: "",
        cargo_weight_kg: "",
        cargo_type: "",
        vehicle_id: "",
        departure_time: "",
        status: "scheduled",
      });

      setMessage("Trip created successfully.");
      await loadTripsPageData();
    } catch (err) {
      console.error("Failed to create trip:", err);
      setError(
        err?.response?.data?.detail
          ? JSON.stringify(err.response.data.detail)
          : "Failed to create trip."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setError("");
      setMessage("");
      await deleteTrip(id);
      setMessage("Trip moved to deleted items.");
      await loadTripsPageData();
    } catch (err) {
      console.error("Failed to delete trip:", err);
      setError(
        err?.response?.data?.detail
          ? JSON.stringify(err.response.data.detail)
          : "Failed to delete trip."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePrediction = async (bookingId) => {
    try {
      setActionLoadingId(`prediction-${bookingId}`);
      setError("");
      setMessage("");

      await createPrediction(bookingId);
      setMessage(`Prediction created for booking ${bookingId}.`);
      await loadTripsPageData();
    } catch (err) {
      console.error("Failed to create prediction:", err);
      setError(err?.response?.data?.detail || "Failed to create prediction.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeletePrediction = async (predictionId, bookingId) => {
    const confirmed = window.confirm(
      "Delete this prediction?\n\nThis will remove the prediction record only. The booking will remain available."
    );

    if (!confirmed) return;

    try {
      setActionLoadingId(`delete-prediction-${predictionId}`);
      setError("");
      setMessage("");

      await deletePrediction(predictionId);

      setPredictions((prev) =>
        prev.filter(
          (item) => item.id !== predictionId && item.booking_id !== bookingId
        )
      );

      setMessage(`Prediction removed for booking ${bookingId}.`);
    } catch (err) {
      console.error("Failed to delete prediction:", err);
      setError(err?.response?.data?.detail || "Failed to delete prediction.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateActual = async (e) => {
    e.preventDefault();

    if (!selectedTrip) return;

    try {
      setActualSubmitting(true);
      setError("");
      setMessage("");

      await createActual({
        booking_id: selectedTrip.id,
        actual_fuel_liters: Number(actualForm.actual_fuel_liters),
        actual_eta_minutes: Number(actualForm.actual_eta_minutes),
        actual_distance_km: Number(actualForm.actual_distance_km),
        actual_cost: Number(actualForm.actual_cost),
        completed_at: actualForm.completed_at,
      });

      closeActualModal(true);
      setMessage(
        `Trip results saved and moved to comparison flow for booking ${selectedTrip.id}.`
      );
      await loadTripsPageData();
    } catch (err) {
      console.error("Failed to create actual:", err);
      setError(err?.response?.data?.detail || "Failed to save trip results.");
    } finally {
      setActualSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-[24px] border border-[#FECACA] bg-[#FEF2F2] px-5 py-4 text-sm text-[#B42318]">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-[24px] border border-[#D1FADF] bg-[#ECFDF3] px-5 py-4 text-sm text-[#027A48]">
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[28px] border border-[#E7EAF3] bg-white p-5 shadow-[0_10px_30px_rgba(16,24,40,0.04)]">
          <p className="text-sm text-[#667085]">Active Trips</p>
          <p className="mt-2 text-[30px] font-semibold tracking-tight text-[#1D2433]">
            {activeTripsCount}
          </p>
        </div>

        <div className="rounded-[28px] border border-[#E7EAF3] bg-white p-5 shadow-[0_10px_30px_rgba(16,24,40,0.04)]">
          <p className="text-sm text-[#667085]">Predictions Ready</p>
          <p className="mt-2 text-[30px] font-semibold tracking-tight text-[#1D2433]">
            {predictions.length}
          </p>
        </div>

        <div className="rounded-[28px] border border-[#E7EAF3] bg-white p-5 shadow-[0_10px_30px_rgba(16,24,40,0.04)]">
          <p className="text-sm text-[#667085]">Predictions Awaiting Results</p>
          <p className="mt-2 text-[30px] font-semibold tracking-tight text-[#1D2433]">
            {awaitingResultsCount}
          </p>
        </div>

        <div className="rounded-[28px] border border-[#E7EAF3] bg-white p-5 shadow-[0_10px_30px_rgba(16,24,40,0.04)]">
          <p className="text-sm text-[#667085]">Ready for Comparison</p>
          <p className="mt-2 text-[30px] font-semibold tracking-tight text-[#1D2433]">
            {readyForComparisonCount}
          </p>
        </div>

        <div className="rounded-[28px] border border-[#E7EAF3] bg-white p-5 shadow-[0_10px_30px_rgba(16,24,40,0.04)]">
          <p className="text-sm text-[#667085]">Completed Trips</p>
          <p className="mt-2 text-[30px] font-semibold tracking-tight text-[#1D2433]">
            {completedTripsCount}
          </p>
        </div>
      </div>

      <div className="rounded-[28px] border border-[#E7EAF3] bg-white p-5 shadow-[0_10px_30px_rgba(16,24,40,0.04)]">
        <p className="text-sm text-[#667085]">Predicted Spend</p>
        <p className="mt-2 text-[30px] font-semibold tracking-tight text-[#1D2433]">
          €{totalPredictedSpend.toFixed(2)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[380px_1fr]">
        <div className="rounded-[30px] border border-[#E7EAF3] bg-white p-6 shadow-[0_10px_30px_rgba(16,24,40,0.04)]">
          <div className="mb-5">
            <h2 className="text-xl font-semibold tracking-tight text-[#1D2433]">
              Create Booking
            </h2>
            <p className="mt-1 text-sm text-[#667085]">
              Build a new trip and assign it to a fleet vehicle.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#344054]">
                Booking Code
              </label>
              <input
                name="booking_code"
                placeholder="BK-1003"
                value={form.booking_code}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#344054]">
                Origin Address
              </label>
              <input
                name="origin_address"
                placeholder="Alimos, Athens, Greece"
                value={form.origin_address}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#344054]">
                Destination Address
              </label>
              <input
                name="destination_address"
                placeholder="Patras, Greece"
                value={form.destination_address}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#344054]">
                  Distance (km)
                </label>
                <input
                  name="planned_distance_km"
                  type="number"
                  step="0.1"
                  value={form.planned_distance_km}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#344054]">
                  Cargo (kg)
                </label>
                <input
                  name="cargo_weight_kg"
                  type="number"
                  step="0.1"
                  value={form.cargo_weight_kg}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#344054]">
                Cargo Type
              </label>
              <input
                name="cargo_type"
                placeholder="Retail goods"
                value={form.cargo_type}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#344054]">
                Vehicle
              </label>
              <select
                name="vehicle_id"
                value={form.vehicle_id}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
                required
              >
                <option value="">Select vehicle</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate_number} - {vehicle.manufacturer} {vehicle.model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#344054]">
                Departure Time
              </label>
              <input
                name="departure_time"
                type="datetime-local"
                value={form.departure_time}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#344054]">
                Status
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
                required
              >
                <option value="scheduled">scheduled</option>
                <option value="in_progress">in_progress</option>
                <option value="completed">completed</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex w-full items-center justify-center rounded-2xl bg-[#6D5EF5] px-4 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(109,94,245,0.30)] transition hover:bg-[#5B4CF0] disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Create Booking"}
            </button>
          </form>
        </div>

        <div className="rounded-[30px] border border-[#E7EAF3] bg-white p-6 shadow-[0_10px_30px_rgba(16,24,40,0.04)]">
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-[#1D2433]">
                  Trips Operations
                </h2>
                <p className="mt-1 text-sm text-[#667085]">
                  Search, filter, and manage all trip records from one operational view.
                </p>
              </div>

              <div className="rounded-full border border-[#E7E3F8] bg-[#F5F3FF] px-3 py-1 text-xs font-medium text-[#6D5EF5]">
                Missing Prediction: {missingPredictionCount}
              </div>
            </div>

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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
              <select
                value={workflowFilter}
                onChange={(e) => setWorkflowFilter(e.target.value)}
                className="rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
              >
                <option value="all">All Workflow States</option>
                <option value="missing_prediction">Missing Prediction</option>
                <option value="needs_actual">Awaiting Results</option>
                <option value="incomplete_actual">Incomplete Results</option>
                <option value="ready_for_comparison">Ready for Comparison</option>
              </select>

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

              <button
                type="button"
                onClick={resetFilters}
                className="rounded-2xl border border-[#D0D5DD] bg-white px-4 py-3 text-sm font-semibold text-[#344054] hover:bg-[#F8F9FC]"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-[#667085]">Loading trips...</p>
          ) : filteredTripRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-[#FCFCFE] p-6 text-sm text-[#667085]">
              No trips match the current filters.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTripRows.map((trip) => {
                const prediction = trip.prediction;
                const actual = trip.actual;
                const canCreateActual = Boolean(prediction) && !actual;
                const hasActual = Boolean(actual);
                const actualComplete = isActualComplete(actual);

                return (
                  <div
                    key={trip.id}
                    className="rounded-[28px] border border-[#E7EAF3] bg-[#FCFCFE] p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold text-[#1D2433]">
                            {trip.booking_code}
                          </h3>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${statusTone(trip.status)}`}
                          >
                            {(trip.status || "scheduled").replaceAll("_", " ")}
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${workflowTone(trip.workflowStatus)}`}
                          >
                            {getWorkflowLabel(trip.workflowStatus)}
                          </span>
                        </div>

                        <p className="text-sm text-[#667085]">
                          {trip.origin_address} <span className="mx-2 text-[#D0D5DD]">→</span>{" "}
                          {trip.destination_address}
                        </p>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl bg-white p-4 shadow-sm">
                            <p className="text-xs uppercase tracking-[0.14em] text-[#98A2B3]">
                              Distance
                            </p>
                            <p className="mt-2 text-base font-semibold text-[#1D2433]">
                              {trip.planned_distance_km} km
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-4 shadow-sm">
                            <p className="text-xs uppercase tracking-[0.14em] text-[#98A2B3]">
                              Cargo
                            </p>
                            <p className="mt-2 text-base font-semibold text-[#1D2433]">
                              {trip.cargo_weight_kg} kg
                            </p>
                            <p className="mt-1 text-xs text-[#667085]">{trip.cargo_type}</p>
                          </div>

                          <div className="rounded-2xl bg-white p-4 shadow-sm">
                            <p className="text-xs uppercase tracking-[0.14em] text-[#98A2B3]">
                              Date
                            </p>
                            <p className="mt-2 text-base font-semibold text-[#1D2433]">
                              {formatDateTime(trip.effectiveDate)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-4 shadow-sm">
                            <p className="text-xs uppercase tracking-[0.14em] text-[#98A2B3]">
                              Vehicle
                            </p>
                            <p className="mt-2 text-base font-semibold text-[#1D2433]">
                              {trip.vehicle
                                ? `${trip.vehicle.plate_number} - ${trip.vehicle.manufacturer} ${trip.vehicle.model}`
                                : `ID ${trip.vehicle_id}`}
                            </p>
                          </div>
                        </div>

                        {prediction ? (
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl border border-[#E7E3F8] bg-[#F5F3FF] p-4">
                              <p className="text-xs uppercase tracking-[0.14em] text-[#8E77ED]">
                                Predicted Fuel
                              </p>
                              <p className="mt-2 text-base font-semibold text-[#1D2433]">
                                {Number(prediction.predicted_fuel_liters || 0).toFixed(2)} L
                              </p>
                            </div>

                            <div className="rounded-2xl border border-[#E7EAF3] bg-white p-4">
                              <p className="text-xs uppercase tracking-[0.14em] text-[#98A2B3]">
                                Predicted Cost
                              </p>
                              <p className="mt-2 text-base font-semibold text-[#1D2433]">
                                {formatCurrency(prediction.predicted_cost)}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-[#E7EAF3] bg-white p-4">
                              <p className="text-xs uppercase tracking-[0.14em] text-[#98A2B3]">
                                Fuel Price Used
                              </p>
                              <p className="mt-2 text-base font-semibold text-[#1D2433]">
                                {prediction.fuel_price_used
                                  ? `€${Number(prediction.fuel_price_used).toFixed(3)}/L`
                                  : "-"}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-[#E7EAF3] bg-white p-4">
                              <p className="text-xs uppercase tracking-[0.14em] text-[#98A2B3]">
                                Model
                              </p>
                              <p className="mt-2 text-base font-semibold text-[#1D2433]">
                                {prediction.model_version || "-"}
                              </p>
                            </div>
                          </div>
                        ) : null}

                        {actual ? (
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl border border-[#D1FADF] bg-[#ECFDF3] p-4">
                              <p className="text-xs uppercase tracking-[0.14em] text-[#027A48]">
                                Recorded Fuel
                              </p>
                              <p className="mt-2 text-base font-semibold text-[#1D2433]">
                                {actual.actual_fuel_liters ?? "-"} L
                              </p>
                            </div>

                            <div className="rounded-2xl border border-[#D1FADF] bg-white p-4">
                              <p className="text-xs uppercase tracking-[0.14em] text-[#98A2B3]">
                                Recorded Cost
                              </p>
                              <p className="mt-2 text-base font-semibold text-[#1D2433]">
                                {formatCurrency(actual.actual_cost)}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-[#D1FADF] bg-white p-4">
                              <p className="text-xs uppercase tracking-[0.14em] text-[#98A2B3]">
                                Recorded ETA
                              </p>
                              <p className="mt-2 text-base font-semibold text-[#1D2433]">
                                {actual.actual_eta_minutes ?? "-"} min
                              </p>
                            </div>

                            <div className="rounded-2xl border border-[#D1FADF] bg-white p-4">
                              <p className="text-xs uppercase tracking-[0.14em] text-[#98A2B3]">
                                Recorded At
                              </p>
                              <p className="mt-2 text-base font-semibold text-[#1D2433]">
                                {formatDateTime(actual.completed_at)}
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex w-full shrink-0 flex-col gap-2 xl:w-[220px]">
                        <button
                          onClick={() => handleCreatePrediction(trip.id)}
                          disabled={Boolean(prediction) || actionLoadingId === `prediction-${trip.id}`}
                          className="rounded-2xl bg-[#6D5EF5] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(109,94,245,0.24)] transition hover:bg-[#5B4CF0] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {prediction
                            ? "Prediction Ready"
                            : actionLoadingId === `prediction-${trip.id}`
                            ? "Running..."
                            : "Run Prediction"}
                        </button>

                        {prediction ? (
                          <button
                            onClick={() => handleDeletePrediction(prediction.id, trip.id)}
                            disabled={
                              actionLoadingId === `delete-prediction-${prediction.id}` ||
                              hasActual
                            }
                            className="rounded-2xl border border-[#FECDCA] bg-white px-4 py-3 text-sm font-semibold text-[#B42318] transition hover:bg-[#FEF3F2] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {actionLoadingId === `delete-prediction-${prediction.id}`
                              ? "Deleting..."
                              : hasActual
                              ? "Prediction Locked"
                              : "Delete Prediction"}
                          </button>
                        ) : null}

                        <button
                          onClick={() => openActualModal(trip)}
                          disabled={!canCreateActual}
                          className="rounded-2xl border border-[#D1FADF] bg-white px-4 py-3 text-sm font-semibold text-[#027A48] transition hover:bg-[#ECFDF3] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {!prediction
                            ? "Need Prediction First"
                            : hasActual
                            ? actualComplete
                              ? "Results Saved"
                              : "Incomplete Results"
                            : "Add Trip Results"}
                        </button>

                        {trip.workflowStatus === "ready_for_comparison" ? (
                          <div className="rounded-2xl border border-[#D1FADF] bg-[#ECFDF3] px-4 py-3 text-sm font-semibold text-[#027A48] text-center">
                            Ready for Comparison
                          </div>
                        ) : null}

                        {prediction || hasActual ? (
                          <div className="space-y-2">
                            <button
                              type="button"
                              disabled
                              className="w-full rounded-2xl border border-[#FECACA] bg-[#FFF5F4] px-4 py-3 text-sm font-semibold text-[#B42318] opacity-70 cursor-not-allowed"
                            >
                              Delete Booking
                            </button>

                            <p className="text-xs text-[#B42318]">
                              Remove dependent records first before deleting this booking.
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDelete(trip.id)}
                            className="rounded-2xl border border-[#FECDCA] bg-white px-4 py-3 text-sm font-semibold text-[#B42318] transition hover:bg-[#FEF3F2]"
                          >
                            Delete Booking
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {actualModalOpen && selectedTrip ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/50 px-4">
          <div className="w-full max-w-[640px] rounded-[30px] border border-[#E7EAF3] bg-white p-6 shadow-[0_20px_60px_rgba(16,24,40,0.18)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-[#1D2433]">
                  Add Trip Results
                </h3>
                <p className="mt-1 text-sm text-[#667085]">
                  Booking {selectedTrip.booking_code} — enter the recorded post-trip values.
                </p>
              </div>

              <button
                type="button"
                onClick={() => closeActualModal()}
                className="rounded-full border border-[#E7EAF3] px-3 py-1 text-sm text-[#667085] hover:bg-[#F8F9FC]"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateActual} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#344054]">
                    Recorded Fuel (L)
                  </label>
                  <input
                    name="actual_fuel_liters"
                    type="number"
                    step="0.1"
                    value={actualForm.actual_fuel_liters}
                    onChange={handleActualFieldChange}
                    className="w-full rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#344054]">
                    Recorded ETA (min)
                  </label>
                  <input
                    name="actual_eta_minutes"
                    type="number"
                    step="0.1"
                    value={actualForm.actual_eta_minutes}
                    onChange={handleActualFieldChange}
                    className="w-full rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#344054]">
                    Recorded Distance (km)
                  </label>
                  <input
                    name="actual_distance_km"
                    type="number"
                    step="0.1"
                    value={actualForm.actual_distance_km}
                    onChange={handleActualFieldChange}
                    className="w-full rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#344054]">
                    Recorded Cost (€)
                  </label>
                  <input
                    name="actual_cost"
                    type="number"
                    step="0.01"
                    value={actualForm.actual_cost}
                    onChange={handleActualFieldChange}
                    className="w-full rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#344054]">
                  Recorded At
                </label>
                <input
                  name="completed_at"
                  type="datetime-local"
                  value={actualForm.completed_at}
                  onChange={handleActualFieldChange}
                  className="w-full rounded-2xl border border-[#E7EAF3] bg-[#FCFCFE] px-4 py-3 text-sm outline-none transition focus:border-[#C7BDFE] focus:ring-4 focus:ring-[#F3F0FF]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => closeActualModal()}
                  className="rounded-2xl border border-[#D0D5DD] bg-white px-4 py-3 text-sm font-semibold text-[#344054] hover:bg-[#F8F9FC]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actualSubmitting}
                  className="rounded-2xl bg-[#027A48] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(2,122,72,0.24)] transition hover:bg-[#05603A] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actualSubmitting ? "Saving..." : "Save Trip Results"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}