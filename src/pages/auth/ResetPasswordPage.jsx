import React, { useState } from "react";
import { Form, Input, Button, Alert, Steps, message } from "antd";
import {
  MailOutlined,
  KeyOutlined,
  LockOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";
import { authService } from "../../services/authService";

// Cấu hình EmailJS thật:
const EMAILJS_SERVICE_ID = "service_ugdo9iz";
const EMAILJS_TEMPLATE_ID = "template_8bwu5in";
const EMAILJS_PUBLIC_KEY = "xWKN2ZcMfxpmGDmHA";

export default function ResetPasswordPage() {
  const [currentStep, setCurrentStep] = useState(0); // 0: Nhập Email, 1: Nhập OTP, 2: Mật khẩu mới
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  // BƯỚC 1: Xử lý Gửi mã OTP THẬT qua Email
  const onFinishStep1_Email = async (values) => {
    setLoading(true);
    setErrorMessage("");

    try {
      // 1. Gọi Backend tạo OTP
      const res = await authService.sendOtp(values.email);

      if (res.success && res.data) {
        const { otp: generatedOtp, fullName } = res.data;
        setEmail(values.email);

        // Tính giờ hết hạn (10 phút sau)
        const expiryTime = new Date(
          Date.now() + 10 * 60 * 1000,
        ).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const templateParams = {
          email: values.email, 
          to_email: values.email,
          user_name: fullName || "Quý khách",
          to_name: fullName || "Quý khách",
          otp: generatedOtp,
          otp_code: generatedOtp,
          time: expiryTime,
        };

        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          templateParams,
          EMAILJS_PUBLIC_KEY,
        );

        message.success(
          "Mã OTP đã được gửi đến email của bạn! Vui lòng kiểm tra hộp thư.",
        );

        // Chuyển sang Bước 2 (Nhập OTP)
        setCurrentStep(1);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
          err.text ||
          err.message ||
          "Không thể gửi mã OTP. Vui lòng kiểm tra lại địa chỉ email!",
      );
    } finally {
      setLoading(false);
    }
  };

  // BƯỚC 2: Xử lý Xác nhận mã OTP
  const onFinishStep2_Otp = async (values) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await authService.verifyOtp({
        email: email,
        otp: values.otp,
      });

      if (res.success) {
        setOtp(values.otp);
        message.success("Xác thực OTP thành công!");
        // Chuyển sang Bước 3 (Nhập Mật khẩu mới)
        setCurrentStep(2);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          "Mã OTP không hợp lệ hoặc đã hết hạn!",
      );
    } finally {
      setLoading(false);
    }
  };

  // BƯỚC 3: Xử lý Đặt lại mật khẩu mới
  const onFinishStep3_NewPassword = async (values) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await authService.resetPassword({
        email: email,
        otp: otp,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });

      if (res.success) {
        message.success("Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.");
        navigate("/login");
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.message || "Đổi mật khẩu thất bại.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h2
          style={{
            margin: "0 0 6px",
            color: "#ffffff",
            fontSize: 24,
            fontWeight: 800,
          }}
        >
          {currentStep === 0 && "Quên Mật Khẩu"}
          {currentStep === 1 && "Xác Thực Mã OTP"}
          {currentStep === 2 && "Đặt Lại Mật Khẩu Mới"}
        </h2>
        <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
          {currentStep === 0 && "Nhập email đăng ký để nhận mã xác nhận OTP"}
          {currentStep === 1 && `Mã xác nhận 6 số đã gửi đến: ${email}`}
          {currentStep === 2 && "Thiết lập mật khẩu mới cho tài khoản của bạn"}
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

      {/* ==================== BƯỚC 1: NHẬP EMAIL ==================== */}
      {currentStep === 0 && (
        <Form
          layout="vertical"
          onFinish={onFinishStep1_Email}
          size="large"
          requiredMark={false}
        >
          <Form.Item
            name="email"
            label={<span className="auth-form-label">Email tài khoản</span>}
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
              placeholder="VD: customer@gmail.com"
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
              <span>Tiếp Tục (Gửi Mã OTP)</span>
              <ArrowRightOutlined />
            </Button>
          </Form.Item>
        </Form>
      )}

      {/* ==================== BƯỚC 2: NHẬP MÃ OTP ==================== */}
      {currentStep === 1 && (
        <Form
          layout="vertical"
          onFinish={onFinishStep2_Otp}
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
              <span>Xác Thực Mã OTP</span>
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
              Nhập lại Email khác
            </Button>
          </div>
        </Form>
      )}

      {/* ==================== BƯỚC 3: NHẬP MẬT KHẨU MỚI ==================== */}
      {currentStep === 2 && (
        <Form
          layout="vertical"
          onFinish={onFinishStep3_NewPassword}
          size="large"
          requiredMark={false}
        >
          <Form.Item
            name="newPassword"
            label={<span className="auth-form-label">Mật khẩu mới</span>}
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu mới!" },
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
            label={
              <span className="auth-form-label">Xác nhận mật khẩu mới</span>
            }
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Vui lòng xác nhận lại mật khẩu!" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
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
              placeholder="Nhập lại mật khẩu mới"
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
              <span>Hoàn Tất Đổi Mật Khẩu</span>
              <CheckCircleOutlined />
            </Button>
          </Form.Item>
        </Form>
      )}

      {/* Quay lại Đăng nhập */}
      <div style={{ textAlign: "center", marginTop: 24, fontSize: 14 }}>
        <Link
          to="/login"
          style={{ color: "#4ade80", fontWeight: 700, textDecoration: "none" }}
        >
          ← Quay lại Đăng nhập
        </Link>
      </div>
    </div>
  );
}
