import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppRoutes from "./routes/AppRoutes";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 32,
            minHeight: "100vh",
            background: "#051911",
            color: "#ffffff",
            fontFamily: "system-ui, -apple-system, sans-serif"
          }}
        >
          <div
            style={{
              maxWidth: 800,
              margin: "40px auto",
              padding: 24,
              background: "#162b20",
              borderRadius: 12,
              border: "1px solid #ff4d4f"
            }}
          >
            <h2 style={{ color: "#ff4d4f", marginTop: 0 }}>
              ⚠️ Đã xảy ra lỗi giao diện (Runtime Error)
            </h2>
            <p style={{ color: "#e2e8f0" }}>
              Một thành phần trong hệ thống gặp lỗi khi hiển thị. Chi tiết lỗi bên dưới:
            </p>
            <pre
              style={{
                background: "#091710",
                color: "#ff7875",
                padding: 16,
                borderRadius: 8,
                overflowX: "auto",
                whiteSpace: "pre-wrap"
              }}
            >
              {this.state.error?.toString()}
            </pre>
            {this.state.errorInfo?.componentStack && (
              <details style={{ marginTop: 12, color: "#94a3b8" }}>
                <summary style={{ cursor: "pointer", color: "#4ade80" }}>
                  Xem Component Stack Trace
                </summary>
                <pre
                  style={{
                    background: "#091710",
                    color: "#cbd5e1",
                    padding: 12,
                    borderRadius: 6,
                    fontSize: 12,
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                    marginTop: 8
                  }}
                >
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#009B60",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                Tải lại trang (F5)
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = "/login";
                }}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#475569",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer"
                }}
              >
                Xóa phiên cũ & Về trang đăng nhập
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
