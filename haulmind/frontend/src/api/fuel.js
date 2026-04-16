import client from "./client";

export async function getFuelCalendar(startDate, days = 30) {
  const params = {
    days,
  };

  if (startDate) {
    params.start_date = startDate;
  }

  const { data } = await client.get("/fuel/calendar", { params });
  return data;
}
