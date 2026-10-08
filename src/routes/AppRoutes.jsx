import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AuthLayout from '../components/layouts/AuthLayout';
import MainLayout from '../components/layouts/MainLayout';
import ProtectedRoute from '../components/common/ProtectedRoute';

// Public Pages & Auth Pages
import HomePage from '../pages/home/HomePage';
import LoginPage from '../pages/auth/LoginPage';

// Dashboard & Protected Pages
import AdminDashboardPage from '../pages/dashboard/AdminDashboardPage';
import CustomerBookingPage from '../pages/customer/CustomerBookingPage';

import { ROLES } from '../utils/constants';
import { Result, Button } from 'antd';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Home Landing Page */}
      <Route path="/" element={<HomePage />} />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Main Authenticated Layout Routes */}
      <Route element={<MainLayout />}>
        {/* Customer Routes */}
        <Route
          path="/customer/book"
          element={
            <ProtectedRoute allowedRoles={[ROLES.CUSTOMER, ROLES.ADMIN, ROLES.STAFF]}>
              <CustomerBookingPage />
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
      </Route>

      {/* 404 Not Found */}
      <Route
        path="*"
        element={
          <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
            <Result
              status="404"
              title="404"
              subTitle="Trang bạn đang tìm kiếm không tồn tại."
              extra={
                <Button type="primary" onClick={() => (window.location.href = '/')}>
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
