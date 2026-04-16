import { useEffect, useState } from "react";
import {
  emptyDeletedBookingsBin,
  emptyDeletedVehiclesBin,
  getDeletedBookings,
  getDeletedVehicles,
  permanentlyDeleteBooking,
  permanentlyDeleteVehicle,
  restoreBooking,
  restoreVehicle,
} from "../api/deletedItems";
import {
  getDeletedPredictions,
  permanentlyDeletePrediction,
  restorePrediction,
} from "../api/operations";

function PageCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-3xl border border-violet-100 bg-white shadow-[0_10px_30px_rgba(17,24,39,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

function SummaryCard({ title, value, helper }) {
  return (
    <PageCard className="p-5">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </h3>
      {helper && <p className="mt-2 text-xs text-slate-500">{helper}</p>}
    </PageCard>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function LabelChip({ children }) {
  return (
    <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
      {children}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  tone = "neutral",
  className = "",
}) {
  const styles = {
    neutral:
      "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    success:
      "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50",
    danger:
      "border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
    softDanger:
      "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

export default function DeletedItemsPage() {
  const [deletedVehicles, setDeletedVehicles] = useState([]);
  const [deletedBookings, setDeletedBookings] = useState([]);
  const [deletedPredictions, setDeletedPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadDeletedItems = async () => {
    try {
      setLoading(true);
      setError("");

      const [vehiclesData, bookingsData, predictionsData] = await Promise.all([
        getDeletedVehicles(),
        getDeletedBookings(),
        getDeletedPredictions(),
      ]);

      setDeletedVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setDeletedBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setDeletedPredictions(Array.isArray(predictionsData) ? predictionsData : []);
    } catch (err) {
      console.error("Failed to load deleted items:", err);
      setError("Failed to load deleted items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedItems();
  }, []);

  const handleRestoreVehicle = async (id) => {
    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const result = await restoreVehicle(id);
      setMessage(result?.message || "Vehicle restored successfully.");
      await loadDeletedItems();
    } catch (err) {
      console.error("Failed to restore vehicle:", err);
      setError(err?.response?.data?.detail || "Failed to restore vehicle.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDeleteVehicle = async (id) => {
    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const result = await permanentlyDeleteVehicle(id);
      setMessage(result?.message || "Vehicle permanently deleted.");
      await loadDeletedItems();
    } catch (err) {
      console.error("Failed to permanently delete vehicle:", err);
      setError(
        err?.response?.data?.detail || "Failed to permanently delete vehicle."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleEmptyVehiclesBin = async () => {
    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const result = await emptyDeletedVehiclesBin();
      setMessage(result?.message || "Deleted vehicles bin cleaned.");
      await loadDeletedItems();
    } catch (err) {
      console.error("Failed to empty deleted vehicles bin:", err);
      setError(
        err?.response?.data?.detail || "Failed to empty deleted vehicles bin."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreBooking = async (id) => {
    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const result = await restoreBooking(id);
      setMessage(result?.message || "Booking restored successfully.");
      await loadDeletedItems();
    } catch (err) {
      console.error("Failed to restore booking:", err);
      setError(err?.response?.data?.detail || "Failed to restore booking.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDeleteBooking = async (id) => {
    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const result = await permanentlyDeleteBooking(id);
      setMessage(result?.message || "Booking permanently deleted.");
      await loadDeletedItems();
    } catch (err) {
      console.error("Failed to permanently delete booking:", err);
      setError(
        err?.response?.data?.detail || "Failed to permanently delete booking."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleEmptyBookingsBin = async () => {
    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const result = await emptyDeletedBookingsBin();
      setMessage(result?.message || "Deleted bookings bin cleaned.");
      await loadDeletedItems();
    } catch (err) {
      console.error("Failed to empty deleted bookings bin:", err);
      setError(
        err?.response?.data?.detail || "Failed to empty deleted bookings bin."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestorePrediction = async (id) => {
    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const result = await restorePrediction(id);
      setMessage(result?.message || "Prediction restored successfully.");
      await loadDeletedItems();
    } catch (err) {
      console.error("Failed to restore prediction:", err);
      setError(err?.response?.data?.detail || "Failed to restore prediction.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDeletePrediction = async (id) => {
    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const result = await permanentlyDeletePrediction(id);
      setMessage(result?.message || "Prediction permanently deleted.");
      await loadDeletedItems();
    } catch (err) {
      console.error("Failed to permanently delete prediction:", err);
      setError(
        err?.response?.data?.detail || "Failed to permanently delete prediction."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "-";

    const raw = String(value);
    const [datePart, timePart] = raw.includes("T")
      ? raw.split("T")
      : raw.split(" ");

    if (!datePart) return raw;

    const [year, month, day] = datePart.split("-");
    const time = timePart ? timePart.slice(0, 5) : "00:00";

    return `${day}/${month}/${year} ${time}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700">
          Recovery center
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          title="Deleted Vehicles"
          value={deletedVehicles.length}
          helper="Archived fleet assets available for restore"
        />
        <SummaryCard
          title="Deleted Bookings"
          value={deletedBookings.length}
          helper="Archived bookings stored in the recovery bin"
        />
        <SummaryCard
          title="Deleted Predictions"
          value={deletedPredictions.length}
          helper="Removed prediction records available for restore"
        />
      </div>

      {loading ? (
        <PageCard className="px-6 py-10">
          <p className="text-sm text-slate-500">Loading deleted items...</p>
        </PageCard>
      ) : (
        <>
          <PageCard className="p-6">
            <SectionHeader
              title="Deleted Vehicles"
              subtitle="Restore archived vehicles or remove them permanently."
              action={
                <ActionButton
                  onClick={handleEmptyVehiclesBin}
                  disabled={actionLoading}
                  tone="softDanger"
                >
                  Empty Vehicles Bin
                </ActionButton>
              }
            />

            {deletedVehicles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No deleted vehicles found
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Deleted fleet assets will appear here for recovery.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {deletedVehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-violet-200 hover:bg-violet-50/40"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {vehicle.plate_number}
                          </h3>
                          <LabelChip>{vehicle.vehicle_type}</LabelChip>
                          <LabelChip>{vehicle.fuel_type}</LabelChip>
                        </div>

                        <p className="text-sm text-slate-600">
                          {vehicle.manufacturer} {vehicle.model}
                        </p>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Max Load
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {vehicle.max_load_kg} kg
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Registration
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {vehicle.registration_day}/{vehicle.registration_month}/
                              {vehicle.registration_year}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Deleted At
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {formatDateTime(vehicle.deleted_at)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <ActionButton
                          onClick={() => handleRestoreVehicle(vehicle.id)}
                          disabled={actionLoading}
                          tone="success"
                        >
                          Restore
                        </ActionButton>

                        <ActionButton
                          onClick={() => handlePermanentDeleteVehicle(vehicle.id)}
                          disabled={actionLoading}
                          tone="danger"
                        >
                          Permanent Delete
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PageCard>

          <PageCard className="p-6">
            <SectionHeader
              title="Deleted Bookings"
              subtitle="Review archived bookings and recover them when needed."
              action={
                <ActionButton
                  onClick={handleEmptyBookingsBin}
                  disabled={actionLoading}
                  tone="softDanger"
                >
                  Empty Bookings Bin
                </ActionButton>
              }
            />

            {deletedBookings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No deleted bookings found
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Deleted booking records will appear here for restore actions.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {deletedBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-violet-200 hover:bg-violet-50/40"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {booking.booking_code}
                          </h3>
                          <LabelChip>{booking.status}</LabelChip>
                        </div>

                        <p className="text-sm text-slate-600">
                          {booking.origin_address} → {booking.destination_address}
                        </p>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Distance
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {booking.planned_distance_km} km
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Cargo
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {booking.cargo_type} • {booking.cargo_weight_kg} kg
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Vehicle ID
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {booking.vehicle_id}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Departure
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {formatDateTime(booking.departure_time)}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Deleted At
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {formatDateTime(booking.deleted_at)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <ActionButton
                          onClick={() => handleRestoreBooking(booking.id)}
                          disabled={actionLoading}
                          tone="success"
                        >
                          Restore
                        </ActionButton>

                        <ActionButton
                          onClick={() => handlePermanentDeleteBooking(booking.id)}
                          disabled={actionLoading}
                          tone="danger"
                        >
                          Permanent Delete
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PageCard>

          <PageCard className="p-6">
            <SectionHeader
              title="Deleted Predictions"
              subtitle="Restore removed predictions or delete them permanently."
            />

            {deletedPredictions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No deleted predictions found
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Deleted prediction records will appear here for restore actions.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {deletedPredictions.map((prediction) => (
                  <div
                    key={prediction.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-violet-200 hover:bg-violet-50/40"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-900">
                            Prediction #{prediction.id}
                          </h3>
                          <LabelChip>Booking ID {prediction.booking_id}</LabelChip>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Predicted Fuel
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {Number(prediction.predicted_fuel_liters || 0).toFixed(2)} L
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Predicted Cost
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              €{Number(prediction.predicted_cost || 0).toFixed(2)}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Fuel Price Used
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {prediction.fuel_price_used
                                ? `€${Number(prediction.fuel_price_used).toFixed(3)}/L`
                                : "-"}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Model
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {prediction.model_version || "-"}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Deleted At
                            </p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {formatDateTime(prediction.deleted_at)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <ActionButton
                          onClick={() => handleRestorePrediction(prediction.id)}
                          disabled={actionLoading}
                          tone="success"
                        >
                          Restore
                        </ActionButton>

                        <ActionButton
                          onClick={() => handlePermanentDeletePrediction(prediction.id)}
                          disabled={actionLoading}
                          tone="danger"
                        >
                          Permanent Delete
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PageCard>
        </>
      )}
    </div>
  );
}