import React, { useState } from "react";
import { Form, Input, Button, Alert, Divider, message } from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  KeyOutlined,
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
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const onFinishRegister = async (values) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await authService.register(values);
      if (res.success && res.data) {
        const { otp, fullName, otpExpiry } = res.data;
        setEmail(values.email);

        const expiryDate = otpExpiry ? new Date(otpExpiry) : new Date(Date.now() + 10 * 60 * 1000);
        const expiryTime = expiryDate.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        // Gửi email qua EmailJS
        const templateParams = {
          email: values.email,
          user_name: fullName || "Quý khách",
          otp: otp,
          time: expiryTime,
        };

        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          templateParams,
          EMAILJS_PUBLIC_KEY,
        );

        message.success("Mã OTP kích hoạt đã được gửi đến email của bạn!");
        setCurrentStep(1);
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

  // BƯỚC 2: Gọi hàm verifyOtp để kích hoạt tài khoản
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
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <h2
          style={{
            margin: "0 0 4px",
            color: "#0f172a",
            fontSize: 22,
            fontWeight: 800,
          }}
        >
          {currentStep === 0 ? "Đăng Ký Tài Khoản" : "Xác Thực Kích Hoạt"}
        </h2>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
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
          style={{ marginBottom: 14, borderRadius: 8, padding: "8px 12px" }}
        />
      )}
      {currentStep === 0 && (
        <Form
          layout="vertical"
          onFinish={onFinishRegister}
          requiredMark={false}
        >
          <Form.Item
            name="fullName"
            label={
              <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>
                Họ và tên
              </span>
            }
            rules={[
              { required: true, message: "Vui lòng nhập họ và tên của bạn!" },
            ]}
            style={{ marginBottom: 10 }}
          >
            <Input
              prefix={
                <UserOutlined style={{ color: "#94a3b8", marginRight: 6 }} />
              }
              placeholder="VD: Nguyễn Văn A"
              style={{ height: 38, borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label={
              <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>
                Địa chỉ Email
              </span>
            }
            rules={[
              { required: true, message: "Vui lòng nhập Email!" },
              { type: "email", message: "Định dạng Email không hợp lệ!" },
            ]}
            style={{ marginBottom: 10 }}
          >
            <Input
              prefix={
                <MailOutlined style={{ color: "#94a3b8", marginRight: 6 }} />
              }
              placeholder="VD: nguyenvana@gmail.com"
              style={{ height: 38, borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="phone"
            label={
              <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>
                Số điện thoại
              </span>
            }
            rules={[
              { required: true, message: "Vui lòng nhập số điện thoại!" },
              {
                pattern: /(0[3|5|7|8|9])+([0-9]{8})\b/,
                message: "Số điện thoại phải gồm 10 chữ số hợp lệ!",
              },
            ]}
            style={{ marginBottom: 10 }}
          >
            <Input
              prefix={
                <PhoneOutlined style={{ color: "#94a3b8", marginRight: 6 }} />
              }
              placeholder="VD: 0912345678"
              style={{ height: 38, borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={
              <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 13 }}>
                Mật khẩu
              </span>
            }
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu!" },
              { min: 6, message: "Mật khẩu tối thiểu phải từ 6 ký tự!" },
            ]}
            style={{ marginBottom: 10 }}
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
                Xác nhận mật khẩu
              </span>
            }
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
            style={{ marginBottom: 16 }}
          >
            <Input.Password
              prefix={
                <LockOutlined style={{ color: "#94a3b8", marginRight: 6 }} />
              }
              placeholder="Nhập lại mật khẩu ở trên"
              style={{ height: 38, borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 40,
                borderRadius: 8,
                background: "#059669",
                borderColor: "#059669",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              Đăng Ký
            </Button>
          </Form.Item>
        </Form>
      )}
      {currentStep === 1 && (
        <Form
          layout="vertical"
          onFinish={onFinishVerifyOtp}
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
            style={{ marginBottom: 16 }}
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

          <Form.Item style={{ marginBottom: 10 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 40,
                borderRadius: 8,
                background: "#059669",
                borderColor: "#059669",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              Xác Thực & Kích Hoạt Tài Khoản
            </Button>
          </Form.Item>

          <div style={{ textAlign: "center" }}>
            <Button
              type="link"
              onClick={() => setCurrentStep(0)}
              style={{ color: "#64748b", fontSize: 13 }}
              icon={<RedoOutlined />}
            >
              Sửa lại thông tin đăng ký
            </Button>
          </div>
        </Form>
      )}

      <Divider
        style={{ margin: "16px 0 12px", color: "#94a3b8", fontSize: 13 }}
      >
        Hoặc
      </Divider>

      <div
        style={{
          textAlign: "center",
          fontSize: 13.5,
          color: "#475569",
        }}
      >
        Đã có tài khoản thành viên?{" "}
        <Link
          to="/login"
          style={{ color: "#059669", fontWeight: 700, textDecoration: "none" }}
        >
          Đăng nhập ngay
        </Link>
      </div>
    </div>
  );
}
