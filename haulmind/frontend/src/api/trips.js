import client from "./client";

export async function getTrips() {
  const { data } = await client.get("/bookings/");
  return data;
}

export async function createTrip(payload) {
  const { data } = await client.post("/bookings/", payload);
  return data;
}

export async function deleteTrip(id) {
  const { data } = await client.delete(`/bookings/${id}`);
  return data;
}