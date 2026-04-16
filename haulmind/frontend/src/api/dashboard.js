import api from "./client";

export const getDashboardSummary = async () => {
  const response = await api.get("/dashboard/summary");
  return response.data;
};

export const getFleetStatus = async () => {
  const response = await api.get("/dashboard/fleet-status");
  return response.data;
};