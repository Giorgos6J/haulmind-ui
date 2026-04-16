import client from "./client";

export async function getAllComparisons() {
  const { data } = await client.get("/comparison/all");
  return data;
}