import React from "react";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import { AuthProvider } from "./context/AuthContext";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#059669',
          colorSuccess: '#059669',
          colorWarning: '#d97706',
          colorError: '#dc2626',
          colorInfo: '#059669',
          borderRadius: 8,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        },
        components: {
          Menu: {
            itemSelectedBg: '#ecfdf5',
            itemSelectedColor: '#059669',
            itemHoverBg: '#f8fafc',
            itemBorderRadius: 8
          },
          Button: {
            borderRadius: 8,
            controlHeight: 38
          },
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#1e293b',
            borderRadius: 8
          },
          Card: {
            borderRadius: 12
          }
        }
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}
