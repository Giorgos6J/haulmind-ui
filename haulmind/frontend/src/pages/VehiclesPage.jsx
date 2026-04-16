import { useEffect, useMemo, useState } from "react";
import { createVehicle, deleteVehicle, getVehicles } from "../api/vehicles";

function PageCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-3xl border border-violet-100 bg-white shadow-[0_10px_30px_rgba(17,24,39,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

function StatCard({ title, value, helper }) {
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

function InfoChip({ children }) {
  return (
    <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
      {children}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    plate_number: "",
    vehicle_type: "",
    manufacturer: "",
    model: "",
    fuel_type: "",
    max_load_kg: "",
    base_consumption_per_100km: "",
    registration_day: "",
    registration_month: "",
    registration_year: "",
  });

  const loadVehicles = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getVehicles();
      setVehicles(Array.isArray(data) ? data : data.vehicles || []);
    } catch (err) {
      console.error("Failed to load vehicles:", err);
      setError("Failed to load vehicles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      await createVehicle({
        ...form,
        max_load_kg: Number(form.max_load_kg),
        base_consumption_per_100km: Number(form.base_consumption_per_100km),
        registration_day: Number(form.registration_day),
        registration_month: Number(form.registration_month),
        registration_year: Number(form.registration_year),
      });

      setForm({
        plate_number: "",
        vehicle_type: "",
        manufacturer: "",
        model: "",
        fuel_type: "",
        max_load_kg: "",
        base_consumption_per_100km: "",
        registration_day: "",
        registration_month: "",
        registration_year: "",
      });

      setMessage("Vehicle created successfully.");
      await loadVehicles();
    } catch (err) {
      console.error("Failed to create vehicle:", err);
      console.error("Response data:", err?.response?.data);
      setError(
        err?.response?.data?.detail
          ? JSON.stringify(err.response.data.detail)
          : "Failed to create vehicle."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setError("");
      setMessage("");
      await deleteVehicle(id);
      setMessage("Vehicle moved to deleted items.");
      await loadVehicles();
    } catch (err) {
      console.error("Failed to delete vehicle:", err);
      console.error("Response data:", err?.response?.data);
      setError(
        err?.response?.data?.detail
          ? JSON.stringify(err.response.data.detail)
          : "Failed to delete vehicle."
      );
    }
  };

  const averageConsumption = useMemo(() => {
    const valid = vehicles
      .map((vehicle) => Number(vehicle.base_consumption_per_100km))
      .filter((value) => !Number.isNaN(value) && value > 0);

    if (valid.length === 0) return "-";
    const total = valid.reduce((acc, curr) => acc + curr, 0);
    return `${(total / valid.length).toFixed(1)} / 100km`;
  }, [vehicles]);

  const totalCapacity = useMemo(() => {
    const total = vehicles.reduce(
      (acc, vehicle) => acc + Number(vehicle.max_load_kg || 0),
      0
    );
    return total ? `${total.toLocaleString()} kg` : "-";
  }, [vehicles]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700">
          Fleet records synced
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
        <StatCard
          title="Total Vehicles"
          value={vehicles.length}
          helper="Active fleet records available for bookings"
        />
        <StatCard
          title="Avg Base Consumption"
          value={averageConsumption}
          helper="Average baseline consumption across all vehicles"
        />
        <StatCard
          title="Total Fleet Capacity"
          value={totalCapacity}
          helper="Combined max load currently registered"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[440px_minmax(0,1fr)]">
        <PageCard className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Add Vehicle
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Register a vehicle with specs used by the prediction engine.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Plate Number">
              <input
                name="plate_number"
                placeholder="e.g. KXZ-1234"
                value={form.plate_number}
                onChange={handleChange}
                className={inputClassName}
                required
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Vehicle Type">
                <input
                  name="vehicle_type"
                  placeholder="Truck"
                  value={form.vehicle_type}
                  onChange={handleChange}
                  className={inputClassName}
                  required
                />
              </Field>

              <Field label="Fuel Type">
                <input
                  name="fuel_type"
                  placeholder="Diesel"
                  value={form.fuel_type}
                  onChange={handleChange}
                  className={inputClassName}
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Manufacturer">
                <input
                  name="manufacturer"
                  placeholder="Mercedes-Benz"
                  value={form.manufacturer}
                  onChange={handleChange}
                  className={inputClassName}
                  required
                />
              </Field>

              <Field label="Model">
                <input
                  name="model"
                  placeholder="Actros 1845"
                  value={form.model}
                  onChange={handleChange}
                  className={inputClassName}
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Max Load (kg)">
                <input
                  name="max_load_kg"
                  type="number"
                  placeholder="18000"
                  value={form.max_load_kg}
                  onChange={handleChange}
                  className={inputClassName}
                  required
                />
              </Field>

              <Field label="Base Consumption / 100km">
                <input
                  name="base_consumption_per_100km"
                  type="number"
                  step="0.1"
                  placeholder="29.5"
                  value={form.base_consumption_per_100km}
                  onChange={handleChange}
                  className={inputClassName}
                  required
                />
              </Field>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                Registration Date
              </p>
              <div className="grid grid-cols-3 gap-3">
                <input
                  name="registration_day"
                  type="number"
                  placeholder="DD"
                  value={form.registration_day}
                  onChange={handleChange}
                  className={inputClassName}
                  required
                />
                <input
                  name="registration_month"
                  type="number"
                  placeholder="MM"
                  value={form.registration_month}
                  onChange={handleChange}
                  className={inputClassName}
                  required
                />
                <input
                  name="registration_year"
                  type="number"
                  placeholder="YYYY"
                  value={form.registration_year}
                  onChange={handleChange}
                  className={inputClassName}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Create Vehicle"}
            </button>
          </form>
        </PageCard>

        <PageCard className="p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Fleet Vehicles
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Registered fleet assets available for operations.
              </p>
            </div>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {vehicles.length} active
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
              Loading vehicles...
            </div>
          ) : vehicles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">
                No vehicles found
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Create your first fleet asset to start bookings and predictions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id ?? vehicle.vehicle_id}
                  className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-violet-200 hover:bg-violet-50/40"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {vehicle.plate_number}
                        </h3>
                        <InfoChip>{vehicle.vehicle_type}</InfoChip>
                        <InfoChip>{vehicle.fuel_type}</InfoChip>
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
                            Base Consumption
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {vehicle.base_consumption_per_100km} / 100km
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
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(vehicle.id ?? vehicle.vehicle_id)}
                      className="rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageCard>
      </div>
    </div>
  );
}