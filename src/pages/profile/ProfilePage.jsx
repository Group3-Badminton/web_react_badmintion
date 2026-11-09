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
  Modal,
  Descriptions,
  message,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  SaveOutlined,
  EditOutlined,
  CheckCircleOutlined,
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
        err.response?.data?.message || "Không thể tải thông tin hồ sơ của bạn. Vui lòng thử lại sau."
      );
    } finally {
      setLoading(false);
    }
  };

  // 2. Cập nhật thông tin: Họ tên, Email và Số điện thoại (UC-05)
  const onFinishUpdate = async (values) => {
    setSaving(true);
    try {
      const res = await userService.updateProfile({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
      });
      if (res.success && res.data) {
        message.success("Thông tin hồ sơ của bạn đã được cập nhật thành công.");
        setProfileData(res.data);
        setIsEditModalOpen(false);

        // Cập nhật thông tin mới vào AuthContext & localStorage để Header đổi tên theo
        const updatedUser = { ...user, ...res.data };
        setUser(updatedUser);
        localStorage.setItem("bcms_user", JSON.stringify(updatedUser));
      }
    } catch (err) {
      message.error(
        err.response?.data?.message || err.message || "Không thể cập nhật hồ sơ vào lúc này. Vui lòng thử lại sau."
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
    <div style={{ maxWidth: 650, margin: "0 auto", paddingBottom: 24 }}>
      {/* Tiêu đề trang */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Title level={3} style={{ margin: "0 0 4px", color: "#0f172a" }}>
          Hồ Sơ Cá Nhân
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Thông tin tài khoản và định danh người dùng
        </Text>
      </div>

      {/* Thẻ hiển thị hồ sơ cá nhân nhỏ gọn, thanh lịch */}
      <Card
        bordered={false}
        style={{
          borderRadius: 16,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
          overflow: "hidden"
        }}
        styles={{ body: { padding: "32px 28px" } }}
      >
        {/* Avatar & Header Profile */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <Avatar
            size={88}
            icon={<UserOutlined />}
            style={{
              backgroundColor:
                profileData?.role === ROLES.ADMIN ? "#EF4444" : "#009B60",
              fontSize: 42,
              marginBottom: 12,
              border: "4px solid #f1f5f9",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.1)",
            }}
          />
          <Title level={4} style={{ margin: "0 0 8px", fontSize: 20 }}>
            {profileData?.fullName || "Người dùng"}
          </Title>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, alignItems: "center" }}>
            {getRoleTag(profileData?.role)}
            <Tag color="green" icon={<CheckCircleOutlined />} style={{ borderRadius: 10, padding: "2px 8px" }}>
              Đang hoạt động
            </Tag>
          </div>
        </div>

        <Divider style={{ margin: "20px 0" }} />

        {/* Bảng chi tiết thông tin */}
        <Descriptions
          column={1}
          bordered
          size="middle"
          style={{ background: "#fafafa", borderRadius: 8, overflow: "hidden" }}
        >
          <Descriptions.Item label={<strong>Họ và tên</strong>}>
            <Text strong>{profileData?.fullName || "—"}</Text>
          </Descriptions.Item>

          <Descriptions.Item label={<strong>Địa chỉ Email</strong>}>
            <Text>{profileData?.email || "—"}</Text>
          </Descriptions.Item>

          <Descriptions.Item label={<strong>Số điện thoại</strong>}>
            <Text>{profileData?.phone || "—"}</Text>
          </Descriptions.Item>
        </Descriptions>

        {/* Nút mở Modal Chỉnh Sửa */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              form.setFieldsValue({
                fullName: profileData?.fullName,
                email: profileData?.email,
                phone: profileData?.phone,
              });
              setIsEditModalOpen(true);
            }}
            style={{
              background: "#009B60",
              borderColor: "#009B60",
              borderRadius: 8,
              fontWeight: 600,
              height: 40,
              padding: "0 32px",
              boxShadow: "0 3px 10px rgba(0, 155, 96, 0.2)",
            }}
          >
            Chỉnh Sửa Hồ Sơ
          </Button>
        </div>
      </Card>

      {/* Modal cập nhật hồ sơ cá nhân */}
      <Modal
        title="Chỉnh sửa thông tin hồ sơ"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
        destroyOnClose
        centered
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinishUpdate}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[{ required: true, message: "Vui lòng nhập họ và tên!" }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: "#94a3b8" }} />}
              placeholder="Nhập họ và tên đầy đủ"
              style={{ height: 40, borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Địa chỉ Email liên hệ"
            extra="Email định danh tài khoản, không thể thay đổi."
          >
            <Input
              disabled
              prefix={<MailOutlined style={{ color: "#94a3b8" }} />}
              placeholder="VD: user@gmail.com"
              style={{ height: 40, borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Số điện thoại"
            rules={[
              { required: true, message: "Vui lòng nhập số điện thoại!" },
              { pattern: /(0[3|5|7|8|9])+([0-9]{8})\b/, message: "Số điện thoại phải gồm 10 chữ số hợp lệ!" }
            ]}
          >
            <Input
              prefix={<PhoneOutlined style={{ color: "#94a3b8" }} />}
              placeholder="VD: 0912345678"
              style={{ height: 40, borderRadius: 6 }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right", marginTop: 24 }}>
            <Button onClick={() => setIsEditModalOpen(false)} style={{ marginRight: 8 }}>
              Hủy
            </Button>
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
              }}
            >
              Lưu Thay Đổi
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
