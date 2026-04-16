import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./index.css";

import AppLayout from "./components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import VehiclesPage from "./pages/VehiclesPage";
import TripsPage from "./pages/TripsPage";
import DeletedItemsPage from "./pages/DeletedItemsPage";
import AnalyticsPage from "./pages/AnalyticsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "vehicles", element: <VehiclesPage /> },
      { path: "trips", element: <TripsPage /> },
      { path: "deleted", element: <DeletedItemsPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);