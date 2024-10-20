import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import "react-grid-layout/css/styles.css";
import "./index.scss";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import api from "./api";
import { Profile } from "./types";
import { Template } from "../../server/src/tasks/templates";

declare global {
  interface Window {
    agora: {
      profiles: Profile[];
      templates: Template[];
    };
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <HomePage />,
    },
    {
      path: "/db/:id",
      element: <DashboardPage />,
    },
  ]);

  const data = await api.get<{
    profiles: Profile[];
    templates: Template[];
  }>("/profiles");

  window.agora = data;

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
});
