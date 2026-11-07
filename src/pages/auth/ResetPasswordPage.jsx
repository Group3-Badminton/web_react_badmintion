import React, { useState } from "react";
import { Form, Input, Button, Alert, message } from "antd";
import {
  MailOutlined,
  KeyOutlined,
  LockOutlined,
  CheckCircleOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";
import { authService } from "../../services/authService";

// Cấu hình EmailJS:
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

  const onFinishStep1_Email = async (values) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await authService.sendOtp(values.email);

      if (res.success && res.data) {
        const { otp: generatedOtp, fullName, otpExpiry } = res.data;
        setEmail(values.email);

        const expiryDate = otpExpiry ? new Date(otpExpiry) : new Date(Date.now() + 10 * 60 * 1000);
        const expiryTime = expiryDate.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const templateParams = {
          email: values.email,
          user_name: fullName || "Quý khách",
          otp: generatedOtp,
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
            color: "#0f172a",
            fontSize: 22,
            fontWeight: 800,
          }}
        >
          {currentStep === 0 && "Quên Mật Khẩu"}
          {currentStep === 1 && "Xác Thực Mã OTP"}
          {currentStep === 2 && "Đặt Lại Mật Khẩu Mới"}
        </h2>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
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
          style={{ marginBottom: 16, borderRadius: 8, padding: "8px 12px" }}
        />
      )}

      {/* ==================== BƯỚC 1: NHẬP EMAIL ==================== */}
      {currentStep === 0 && (
        <Form
          layout="vertical"
          onFinish={onFinishStep1_Email}
          requiredMark={false}
        >
          <Form.Item
            name="email"
            label={
              <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>
                Email tài khoản
              </span>
            }
            rules={[
              { required: true, message: "Vui lòng nhập Email!" },
              { type: "email", message: "Định dạng Email không hợp lệ!" },
            ]}
            style={{ marginBottom: 18 }}
          >
            <Input
              prefix={
                <MailOutlined style={{ color: "#94a3b8", marginRight: 6 }} />
              }
              placeholder="VD: customer@gmail.com"
              style={{ height: 38, borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 42,
                borderRadius: 8,
                background: "#059669",
                borderColor: "#059669",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              Gửi Mã OTP
            </Button>
          </Form.Item>
        </Form>
      )}

      {/* ==================== BƯỚC 2: NHẬP MÃ OTP ==================== */}
      {currentStep === 1 && (
        <Form
          layout="vertical"
          onFinish={onFinishStep2_Otp}
          requiredMark={false}
        >
          <Form.Item
            name="otp"
            label={
              <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>
                Nhập mã OTP (6 chữ số)
              </span>
            }
            rules={[
              { required: true, message: "Vui lòng nhập mã OTP!" },
              { len: 6, message: "Mã OTP gồm đúng 6 chữ số!" },
            ]}
            style={{ marginBottom: 18 }}
          >
            <Input
              maxLength={6}
              prefix={
                <KeyOutlined style={{ color: "#94a3b8", marginRight: 6 }} />
              }
              placeholder="••••••"
              style={{
                height: 44,
                borderRadius: 8,
                letterSpacing: "8px",
                fontSize: "20px",
                textAlign: "center",
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 42,
                borderRadius: 8,
                background: "#059669",
                borderColor: "#059669",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              Xác Thực Mã OTP
            </Button>
          </Form.Item>

          <div style={{ textAlign: "center", marginTop: 10 }}>
            <Button
              type="link"
              onClick={() => setCurrentStep(0)}
              style={{ color: "#64748b", fontSize: 13 }}
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
          requiredMark={false}
        >
          <Form.Item
            name="newPassword"
            label={
              <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>
                Mật khẩu mới
              </span>
            }
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu mới!" },
              { min: 6, message: "Mật khẩu tối thiểu phải từ 6 ký tự!" },
            ]}
            style={{ marginBottom: 12 }}
          >
            <Input.Password
              prefix={
                <LockOutlined style={{ color: "#94a3b8", marginRight: 6 }} />
              }
              placeholder="Tối thiểu 6 ký tự"
              style={{ height: 38, borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={
              <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>
                Xác nhận mật khẩu mới
              </span>
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
            style={{ marginBottom: 18 }}
          >
            <Input.Password
              prefix={
                <LockOutlined style={{ color: "#94a3b8", marginRight: 6 }} />
              }
              placeholder="Nhập lại mật khẩu mới"
              style={{ height: 38, borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 42,
                borderRadius: 8,
                background: "#059669",
                borderColor: "#059669",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
            Đổi Mật Khẩu
            </Button>
          </Form.Item>
        </Form>
      )}

      {/* Quay lại Đăng nhập */}
      <div style={{ textAlign: "center", marginTop: 20, fontSize: 13.5 }}>
        <Link
          to="/login"
          style={{ color: "#059669", fontWeight: 700, textDecoration: "none" }}
        >
          Quay lại Đăng nhập
        </Link>
      </div>
    </div>
  );
}
