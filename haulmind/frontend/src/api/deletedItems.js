import client from "./client";

/* Vehicles */
export async function getDeletedVehicles() {
  const { data } = await client.get("/vehicles/deleted");
  return data;
}

export async function restoreVehicle(id) {
  const { data } = await client.put(`/vehicles/${id}/restore`);
  return data;
}

export async function permanentlyDeleteVehicle(id) {
  const { data } = await client.delete(`/vehicles/${id}/permanent`);
  return data;
}

export async function emptyDeletedVehiclesBin() {
  const { data } = await client.delete("/vehicles/deleted/empty-bin");
  return data;
}

/* Bookings / Trips */
export async function getDeletedBookings() {
  const { data } = await client.get("/bookings/deleted");
  return data;
}

export async function restoreBooking(id) {
  const { data } = await client.put(`/bookings/${id}/restore`);
  return data;
}

export async function permanentlyDeleteBooking(id) {
  const { data } = await client.delete(`/bookings/${id}/permanent`);
  return data;
}

export async function emptyDeletedBookingsBin() {
  const { data } = await client.delete("/bookings/deleted/empty-bin");
  return data;
}