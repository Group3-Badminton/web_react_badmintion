import React from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "../pages/home/HomePage";
import LoginPage from "../pages/auth/LoginPage";
import AuthLayout from "../components/layouts/AuthLayout";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
    </Routes>
  );
}
