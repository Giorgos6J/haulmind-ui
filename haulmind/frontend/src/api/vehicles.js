import client from "./client";

export async function getVehicles() {
  const { data } = await client.get("/vehicles/");
  return data;
}

export async function createVehicle(payload) {
  const { data } = await client.post("/vehicles/", payload);
  return data;
}

export async function deleteVehicle(id) {
  const { data } = await client.delete(`/vehicles/${id}/`);
  return data;
}