import React, { useState } from "react";
import { Form, Input, Button, Alert, Divider, message } from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  KeyOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";
import { authService } from "../../services/authService";

const EMAILJS_SERVICE_ID = "service_ugdo9iz";
const EMAILJS_TEMPLATE_ID = "template_8bwu5in";
const EMAILJS_PUBLIC_KEY = "xWKN2ZcMfxpmGDmHA";

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(0); // 0: Form Đăng ký, 1: Nhập OTP
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  // BƯỚC 1: Xử lý Đăng ký và gửi OTP qua Email
  const onFinishRegister = async (values) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await authService.register(values);
      if (res.success && res.data) {
        const { otp, fullName } = res.data;
        setEmail(values.email);

        const expiryTime = new Date(
          Date.now() + 10 * 60 * 1000,
        ).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });

        // Gửi email qua EmailJS
        const templateParams = {
          email: values.email,
          to_email: values.email,
          user_name: fullName || "Quý khách",
          to_name: fullName || "Quý khách",
          otp: otp,
          otp_code: otp,
          time: expiryTime,
        };

        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          templateParams,
          EMAILJS_PUBLIC_KEY,
        );

        message.success("Mã OTP kích hoạt đã được gửi đến email của bạn!");
        setCurrentStep(1); // Chuyển sang màn hình nhập OTP
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
          err.text ||
          err.message ||
          "Đăng ký không thành công.",
      );
    } finally {
      setLoading(false);
    }
  };

  // BƯỚC 2: Gọi đúng hàm TÁI SỬ DỤNG verifyOtp để kích hoạt tài khoản
  const onFinishVerifyOtp = async (values) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await authService.verifyOtp({
        email: email,
        otp: values.otp,
      });

      if (res.success) {
        message.success(
          "Kích hoạt tài khoản thành công! Bạn có thể đăng nhập ngay.",
        );
        navigate("/login");
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          "Mã OTP không chính xác hoặc đã hết hạn!",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h2
          style={{
            margin: "0 0 8px",
            color: "#ffffff",
            fontSize: 26,
            fontWeight: 800,
          }}
        >
          {currentStep === 0 ? "Đăng Ký Tài Khoản" : "Xác Thực Kích Hoạt"}
        </h2>
        <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
          {currentStep === 0
            ? "Trở thành thành viên để đặt sân và nhận ưu đãi"
            : `Nhập mã xác thực 6 số gửi đến: ${email}`}
        </p>
      </div>

      {errorMessage && (
        <Alert
          message={errorMessage}
          type="error"
          showIcon
          style={{ marginBottom: 20, borderRadius: 10 }}
        />
      )}

      {/* ==================== BƯỚC 1: FORM ĐIỀN THÔNG TIN ==================== */}
      {currentStep === 0 && (
        <Form
          layout="vertical"
          onFinish={onFinishRegister}
          size="large"
          requiredMark={false}
        >
          <Form.Item
            name="fullName"
            label={<span className="auth-form-label">Họ và tên</span>}
            rules={[
              { required: true, message: "Vui lòng nhập họ và tên của bạn!" },
            ]}
          >
            <Input
              className="auth-glass-input"
              prefix={
                <UserOutlined
                  style={{ color: "rgba(255, 255, 255, 0.65)", marginRight: 6 }}
                />
              }
              placeholder="VD: Nguyễn Văn A"
            />
          </Form.Item>

          <Form.Item
            name="email"
            label={<span className="auth-form-label">Địa chỉ Email</span>}
            rules={[
              { required: true, message: "Vui lòng nhập Email!" },
              { type: "email", message: "Định dạng Email không hợp lệ!" },
            ]}
          >
            <Input
              className="auth-glass-input"
              prefix={
                <MailOutlined
                  style={{ color: "rgba(255, 255, 255, 0.65)", marginRight: 6 }}
                />
              }
              placeholder="VD: nguyenvana@gmail.com"
            />
          </Form.Item>

          <Form.Item
            name="phone"
            label={<span className="auth-form-label">Số điện thoại</span>}
            rules={[
              { required: true, message: "Vui lòng nhập số điện thoại!" },
              {
                pattern: /(0[3|5|7|8|9])+([0-9]{8})\b/,
                message: "Số điện thoại phải gồm 10 chữ số hợp lệ!",
              },
            ]}
          >
            <Input
              className="auth-glass-input"
              prefix={
                <PhoneOutlined
                  style={{ color: "rgba(255, 255, 255, 0.65)", marginRight: 6 }}
                />
              }
              placeholder="VD: 0912345678"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span className="auth-form-label">Mật khẩu</span>}
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu!" },
              { min: 6, message: "Mật khẩu tối thiểu phải từ 6 ký tự!" },
            ]}
          >
            <Input.Password
              className="auth-glass-input"
              prefix={
                <LockOutlined
                  style={{ color: "rgba(255, 255, 255, 0.65)", marginRight: 6 }}
                />
              }
              placeholder="Tối thiểu 6 ký tự"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={<span className="auth-form-label">Xác nhận mật khẩu</span>}
            dependencies={["password"]}
            rules={[
              { required: true, message: "Vui lòng xác nhận lại mật khẩu!" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("Mật khẩu xác nhận không khớp!"),
                  );
                },
              }),
            ]}
            style={{ marginBottom: 24 }}
          >
            <Input.Password
              className="auth-glass-input"
              prefix={
                <LockOutlined
                  style={{ color: "rgba(255, 255, 255, 0.65)", marginRight: 6 }}
                />
              }
              placeholder="Nhập lại mật khẩu ở trên"
            />
          </Form.Item>

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
              <span>Đăng Ký</span>
        
            </Button>
          </Form.Item>
        </Form>
      )}

      {/* ==================== BƯỚC 2: FORM NHẬP OTP XÁC THỰC ==================== */}
      {currentStep === 1 && (
        <Form
          layout="vertical"
          onFinish={onFinishVerifyOtp}
          size="large"
          requiredMark={false}
        >
          <Form.Item
            name="otp"
            label={
              <span className="auth-form-label">Nhập mã OTP (6 chữ số)</span>
            }
            rules={[
              { required: true, message: "Vui lòng nhập mã OTP!" },
              { len: 6, message: "Mã OTP gồm đúng 6 chữ số!" },
            ]}
          >
            <Input
              className="auth-glass-input"
              maxLength={6}
              prefix={
                <KeyOutlined
                  style={{ color: "rgba(255, 255, 255, 0.65)", marginRight: 6 }}
                />
              }
              placeholder="••••••"
              style={{
                letterSpacing: "8px",
                fontSize: "20px",
                textAlign: "center",
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 12 }}>
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
              <span>Xác Thực & Kích Hoạt Tài Khoản</span>
              <CheckCircleOutlined />
            </Button>
          </Form.Item>

          <div style={{ textAlign: "center", marginTop: 12 }}>
            <Button
              type="link"
              onClick={() => setCurrentStep(0)}
              style={{ color: "#94a3b8", fontSize: 13 }}
              icon={<RedoOutlined />}
            >
              Sửa lại thông tin đăng ký
            </Button>
          </div>
        </Form>
      )}

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
        Đã có tài khoản thành viên?{" "}
        <Link
          to="/login"
          style={{ color: "#4ade80", fontWeight: 700, textDecoration: "none" }}
        >
          Đăng nhập ngay
        </Link>
      </div>
    </div>
  );
}
