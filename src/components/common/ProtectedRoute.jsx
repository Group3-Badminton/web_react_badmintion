import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spin, Result, Button } from 'antd';

export default function ProtectedRoute({ children, allowedRoles = [], requiredPermission = null }) {
  const { user, token, loading, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Đang tải dữ liệu..." />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
    return (
      <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
        <Result
          status="403"
          title="403 - Truy cập bị từ chối"
          subTitle="Xin lỗi, tài khoản của bạn không có quyền truy cập trang này."
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              Quay lại
            </Button>
          }
        />
      </div>
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
        <Result
          status="403"
          title="Thiếu quyền thao tác"
          subTitle={`Bạn cần được cấp quyền [${requiredPermission}] để truy cập tính năng này.`}
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              Quay lại
            </Button>
          }
        />
      </div>
    );
  }

  return children;
}
