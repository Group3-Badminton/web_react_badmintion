import React, { useState } from "react";
import { Form, Input, Button, Alert, Typography, Divider, message } from "antd";
import {
  UserOutlined,
  LockOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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
        } else if (role === "ADMIN") {
          navigate("/");
        } else if (role === "STAFF") {
          navigate("/");
        } else {
          navigate("/");
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
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2
          style={{
            margin: "0 0 8px",
            color: "#ffffff",
            fontSize: 26,
            fontWeight: 800,
          }}
        >
          Đăng Nhập
        </h2>
        <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
          Nhập số điện thoại hoặc email để tiếp tục
        </p>
      </div>

      {errorMessage && (
        <Alert
          message="Đăng nhập không thành công"
          description={errorMessage}
          type="error"
          showIcon
          style={{ marginBottom: 20, borderRadius: 10 }}
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
            <span className="auth-form-label">Số điện thoại hoặc Email</span>
          }
          rules={[
            {
              required: true,
              message: "Vui lòng nhập số điện thoại hoặc email!",
            },
          ]}
        >
          <Input
            className="auth-glass-input"
            prefix={
              <UserOutlined
                style={{ color: "rgba(255, 255, 255, 0.65)", marginRight: 6 }}
              />
            }
            placeholder="VD: 0912345678 hoặc customer@gmail.com"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={<span className="auth-form-label">Mật khẩu</span>}
          rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
          style={{ marginBottom: 12 }}
        >
          <Input.Password
            className="auth-glass-input"
            prefix={
              <LockOutlined
                style={{ color: "rgba(255, 255, 255, 0.65)", marginRight: 6 }}
              />
            }
            placeholder="••••••••"
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
            to="/forgot-password"
            style={{
              color: "#4ade80",
              fontSize: 13,
              fontWeight: 500,
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
              height: 48,
              borderRadius: 24,
              background: "linear-gradient(135deg, #bbf246 0%, #86efac 100%)",
              border: "none",
              color: "#092615",
              fontSize: 16,
              fontWeight: 800,
              boxShadow: "0 0 25px rgba(187, 242, 70, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span>Đăng Nhập</span>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "#092615",
                color: "#bbf246",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
              }}
            >
              <ArrowRightOutlined />
            </div>
          </Button>
        </Form.Item>
      </Form>

      <Divider
        style={{
          margin: "24px 0 20px",
          borderColor: "rgba(255, 255, 255, 0.15)",
          color: "rgba(255, 255, 255, 0.5)",
          fontSize: 13,
        }}
      >
        Hoặc
      </Divider>

      <div
        style={{
          textAlign: "center",
          fontSize: 14,
          color: "rgba(255, 255, 255, 0.85)",
        }}
      >
        Chưa có tài khoản khách hàng?{" "}
        <Link
          to="/register"
          style={{ color: "#4ade80", fontWeight: 700, textDecoration: "none" }}
        >
          Đăng ký ngay
        </Link>
      </div>
    </div>
  );
}
