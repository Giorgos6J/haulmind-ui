import client from "./client";

/* Predictions */
export async function getPredictions() {
  const { data } = await client.get("/predict/");
  return data;
}

export async function getDeletedPredictions() {
  const { data } = await client.get("/predict/deleted");
  return data;
}

export async function createPrediction(bookingId) {
  const { data } = await client.post(`/predict/${bookingId}`);
  return data;
}

export async function deletePrediction(predictionId) {
  const { data } = await client.delete(`/predict/${predictionId}`);
  return data;
}

export async function restorePrediction(predictionId) {
  const { data } = await client.put(`/predict/${predictionId}/restore`);
  return data;
}

export async function permanentlyDeletePrediction(predictionId) {
  const { data } = await client.delete(`/predict/${predictionId}/permanent`);
  return data;
}

/* Actuals */
export async function getActuals() {
  const { data } = await client.get("/actuals/");
  return data;
}

export async function createActual(payload) {
  const { data } = await client.post("/actuals/", payload);
  return data;
}