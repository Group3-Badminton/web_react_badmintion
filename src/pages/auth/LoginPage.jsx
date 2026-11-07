import React, { useState } from "react";
import { Form, Input, Button, Alert, Divider, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(() => {
    const authErr = sessionStorage.getItem("bcms_auth_error");
    if (authErr) {
      sessionStorage.removeItem("bcms_auth_error");
      return authErr;
    }
    return "";
  });
  const { loginSuccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const onFinish = async (values) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await authService.login(values);
      if (res.success && res.data) {
        message.success("Đăng nhập thành công!");
        loginSuccess(res.data);

        // Chuyển hướng sau khi đăng nhập
        const role = res.data.user?.role;
        const fromPath = location.state?.from;

        if (fromPath) {
          navigate(fromPath);
        } else if (role === "ADMIN" || role === "STAFF") {
          navigate("/admin/dashboard");
        } else {
          navigate("/customer/book");
        }
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || "Đăng nhập thất bại.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Tiêu đề Form */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2
          style={{
            margin: "0 0 8px",
            color: "#0f172a",
            fontSize: 26,
            fontWeight: 800,
          }}
        >
          Đăng Nhập
        </h2>
      </div>

      {errorMessage && (
        <Alert
          message="Đăng nhập không thành công"
          description={errorMessage}
          type="error"
          showIcon
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      <Form
        layout="vertical"
        onFinish={onFinish}
        size="large"
        requiredMark={false}
      >
        <Form.Item
          name="account"
          label={
            <span style={{ fontWeight: 600, color: "#334155" }}>
              Số điện thoại hoặc Email
            </span>
          }
          rules={[
            {
              required: true,
              message: "Vui lòng nhập số điện thoại hoặc email!",
            },
          ]}
        >
          <Input
            prefix={
              <UserOutlined style={{ color: "#94a3b8", marginRight: 6 }} />
            }
            placeholder="VD: 0912345678 hoặc customer@gmail.com"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={
            <span style={{ fontWeight: 600, color: "#334155" }}>Mật khẩu</span>
          }
          rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
          style={{ marginBottom: 12 }}
        >
          <Input.Password
            prefix={
              <LockOutlined style={{ color: "#94a3b8", marginRight: 6 }} />
            }
            placeholder="••••••••"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 24,
          }}
        >
          <Link
            to="/reset-Password"
            style={{
              color: "#059669",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Quên mật khẩu?
          </Link>
        </div>

        <Form.Item style={{ marginBottom: 12 }}>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            style={{
              height: 44,
              borderRadius: 8,
              background: "#059669",
              borderColor: "#059669",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            Đăng Nhập
          </Button>
        </Form.Item>
      </Form>

      <Divider
        style={{
          margin: "24px 0 20px",
          color: "#94a3b8",
          fontSize: 13,
        }}
      >
        Hoặc
      </Divider>

      <div
        style={{
          textAlign: "center",
          fontSize: 14,
          color: "#475569",
        }}
      >
        Chưa có tài khoản khách hàng?{" "}
        <Link
          to="/register"
          style={{
            color: "#059669",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Đăng ký ngay
        </Link>
      </div>
    </div>
  );
}
