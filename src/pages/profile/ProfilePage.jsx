import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Form,
  Input,
  Button,
  Avatar,
  Typography,
  Tag,
  Divider,
  Spin,
  message,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { userService } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/constants";

const { Title, Text } = Typography;

export default function ProfilePage() {
  const [form] = Form.useForm();
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState(null);

  // 1. Tải thông tin cá nhân mới nhất từ Backend (UC-5.1 & UC-5.3)
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await userService.getProfile();
      if (res.success && res.data) {
        setProfileData(res.data);
        form.setFieldsValue({
          fullName: res.data.fullName,
          email: res.data.email,
          phone: res.data.phone,
        });
      }
    } catch (err) {
      message.error(
        err.response?.data?.message || "Không thể tải thông tin hồ sơ."
      );
    } finally {
      setLoading(false);
    }
  };

  // 2. Cập nhật thông tin: Họ tên và Email (UC-5.2 & UC-5.4)
  // Quy tắc BR-04 & BR-05: Số điện thoại là định danh duy nhất (read-only), không được sửa.
  const onFinishUpdate = async (values) => {
    setSaving(true);
    try {
      const res = await userService.updateProfile({
        fullName: values.fullName,
        email: values.email,
      });

      if (res.success && res.data) {
        message.success("Cập nhật thông tin cá nhân thành công!");
        setProfileData(res.data);

        // Cập nhật thông tin mới vào AuthContext & localStorage để Header đổi tên theo
        const updatedUser = { ...user, ...res.data };
        setUser(updatedUser);
        localStorage.setItem("bcms_user", JSON.stringify(updatedUser));
      }
    } catch (err) {
      message.error(
        err.response?.data?.message || err.message || "Cập nhật thất bại."
      );
    } finally {
      setSaving(false);
    }
  };

  // Hiển thị nhãn vai trò tương ứng (Admin, Staff, Customer)
  const getRoleTag = (role) => {
    if (role === ROLES.ADMIN) {
      return (
        <Tag color="#EF4444" style={{ padding: "2px 10px", borderRadius: 10 }}>
          Quản trị viên (Admin)
        </Tag>
      );
    }
    if (role === ROLES.STAFF) {
      return (
        <Tag color="#009B60" style={{ padding: "2px 10px", borderRadius: 10 }}>
          Nhân viên sân (Staff)
        </Tag>
      );
    }
    return (
      <Tag color="#1890ff" style={{ padding: "2px 10px", borderRadius: 10 }}>
        Khách hàng thành viên
      </Tag>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: "#666" }}>Đang tải thông tin hồ sơ...</div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", paddingBottom: 24 }}>
      {/* Tiêu đề trang */}
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: "0 0 2px", color: "#0f172a" }}>
          Hồ Sơ Cá Nhân
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Quản lý và cập nhật thông tin tài khoản cá nhân của bạn (UC-05)
        </Text>
      </div>

      {/* Khung chính Full Width & Thu gọn giãn cách */}
      <Card
        style={{
          width: "100%",
          borderRadius: 14,
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
          border: "1px solid #f0f0f0",
        }}
        styles={{ body: { padding: "20px 28px" } }}
      >
        {/* Phần Avatar & Tên tóm tắt */}
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <Avatar
            size={80}
            icon={<UserOutlined />}
            style={{
              backgroundColor:
                profileData?.role === ROLES.ADMIN ? "#EF4444" : "#009B60",
              fontSize: 38,
              marginBottom: 10,
              border: "3px solid #e6f7ef",
              boxShadow: "0 3px 10px rgba(0, 155, 96, 0.15)",
            }}
          />
          <Title level={4} style={{ margin: "0 0 6px", fontSize: 18 }}>
            {profileData?.fullName || "Người dùng"}
          </Title>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            {getRoleTag(profileData?.role)}
            <Tag color="green" style={{ borderRadius: 10, padding: "2px 8px" }}>
              ● Đang hoạt động
            </Tag>
          </div>
        </div>

        <Divider style={{ margin: "16px 0" }} />

        {/* Form nhập liệu tuân thủ chuẩn UC-05: Số điện thoại là READ-ONLY, Email & Họ tên cho phép sửa */}
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinishUpdate}
          size="middle"
          requiredMark={false}
        >
          <Row gutter={[20, 0]}>
            {/* Họ và tên (Cho phép sửa) */}
            <Col xs={24} md={12}>
              <Form.Item
                name="fullName"
                label={<strong>Họ và tên</strong>}
                rules={[{ required: true, message: "Vui lòng nhập họ và tên!" }]}
                style={{ marginBottom: 14 }}
              >
                <Input
                  prefix={<UserOutlined style={{ color: "#94a3b8" }} />}
                  placeholder="Nhập họ và tên"
                  style={{ borderRadius: 6, height: 40 }}
                />
              </Form.Item>
            </Col>

            {/* Email (Cho phép sửa) */}
            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label={<strong>Địa chỉ Email liên hệ</strong>}
                rules={[
                  { required: true, message: "Vui lòng nhập Email!" },
                  { type: "email", message: "Định dạng Email không hợp lệ!" }
                ]}
                extra="Dùng để nhận mã xác thực OTP và thông báo hệ thống."
                style={{ marginBottom: 14 }}
              >
                <Input
                  prefix={<MailOutlined style={{ color: "#94a3b8" }} />}
                  placeholder="VD: user@gmail.com"
                  style={{ borderRadius: 6, height: 40 }}
                />
              </Form.Item>
            </Col>

            {/* Số điện thoại (READ-ONLY theo đúng BR-04 & UC-5.2) */}
            <Col xs={24}>
              <Form.Item
                name="phone"
                label={<strong>Số điện thoại (Định danh tài khoản - Chỉ đọc)</strong>}
                extra="Theo quy tắc BR-04, số điện thoại là định danh duy nhất của tài khoản và không thể thay đổi."
                style={{ marginBottom: 14 }}
              >
                <Input
                  disabled
                  prefix={<PhoneOutlined style={{ color: "#94a3b8" }} />}
                  style={{ borderRadius: 6, background: "#f8fafc", height: 40 }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Nút lưu thay đổi */}
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
              style={{
                background: "#009B60",
                borderColor: "#009B60",
                borderRadius: 6,
                fontWeight: 600,
                height: 42,
                fontSize: 15,
                padding: "0 36px",
                boxShadow: "0 3px 10px rgba(0, 155, 96, 0.2)",
              }}
            >
              Lưu Thay Đổi
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
