import React from "react";
import { Routes, Route } from "react-router-dom";
import AuthLayout from "../components/layouts/AuthLayout";
import MainLayout from "../components/layouts/MainLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";

// Public Pages & Auth Pages
import HomePage from "../pages/home/HomePage";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";

// Dashboard & Protected Pages
import AdminDashboardPage from "../pages/dashboard/AdminDashboardPage";
import ProductManagementPage from "../pages/product/ProductManagementPage";
import VoucherManagementPage from "../pages/voucher/VoucherManagementPage";
import CustomerBookingPage from "../pages/customer/CustomerBookingPage";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage";
import ProfilePage from "../pages/profile/ProfilePage";
import { ROLES } from "../utils/constants";
import { Result, Button } from "antd";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Home Landing Page */}
      <Route path="/" element={<HomePage />} />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-Password" element={<ResetPasswordPage />} />
      </Route>

      {/* Main Authenticated Layout Routes */}
      <Route element={<MainLayout />}>
        {/* Customer Routes */}
        <Route
          path="/customer/book"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.CUSTOMER, ROLES.ADMIN, ROLES.STAFF]}
            >
              <CustomerBookingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/profile"
          element={
            <ProtectedRoute
              allowedRoles={[ROLES.CUSTOMER, ROLES.ADMIN, ROLES.STAFF]}
            >
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STAFF]}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        {/* Admin & Staff Dashboard */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STAFF]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        {/* UC-14 Product Management */}
        <Route
          path="/admin/products"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STAFF]}>
              <ProductManagementPage />
            </ProtectedRoute>
          }
        />
        {/* UC-15 Voucher Management */}
        <Route
          path="/admin/vouchers"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.STAFF]}>
              <VoucherManagementPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 404 Not Found */}
      <Route
        path="*"
        element={
          <div
            style={{ padding: 48, display: "flex", justifyContent: "center" }}
          >
            <Result
              status="404"
              title="404"
              subTitle="Trang bạn đang tìm kiếm không tồn tại."
              extra={
                <Button
                  type="primary"
                  onClick={() => (window.location.href = "/")}
                >
                  Về trang chủ
                </Button>
              }
            />
          </div>
        }
      />
    </Routes>
  );
}
