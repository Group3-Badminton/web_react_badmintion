import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout,
  Dropdown,
  Avatar,
  Space,
  Typography,
  Tag,
  Button,
  Badge,
  Popover,
  List,
  Divider,
  Modal,
  message,
  Spin
} from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  CheckOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  AlertOutlined
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import notificationService from '../../services/notificationService';

const { Header } = Layout;
const { Text, Paragraph } = Typography;

export default function AppHeader({ collapsed, setCollapsed }) {
  const { user, logout, isAdmin, isStaff, isCustomer } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Modal xem chi tiết thông báo
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Lấy số lượng thông báo chưa đọc
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationService.getUnreadCount();
      if (res?.success) {
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch {
      // Bỏ qua lỗi ngầm khi không có mạng hoặc chưa đăng nhập
    }
  }, [user]);

  // Lấy 5 thông báo mới nhất cho Popover
  const fetchRecentNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await notificationService.getMyNotifications({ page: 1, limit: 5 });
      if (res?.success) {
        setNotifications(res.data.items || []);
      }
    } catch {
      // Bỏ qua lỗi ngầm
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Tự động kiểm tra thông báo định kỳ
  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();
    fetchRecentNotifications();

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 20000); // Poll mỗi 20 giây

    return () => clearInterval(interval);
  }, [user, fetchUnreadCount, fetchRecentNotifications]);

  // Khi mở Popover thì tải lại dữ liệu mới nhất
  const handlePopoverOpenChange = (open) => {
    setPopoverOpen(open);
    if (open) {
      fetchRecentNotifications();
      fetchUnreadCount();
    }
  };

  // Xem chi tiết thông báo từ Popover
  const handleItemClick = async (item) => {
    try {
      const res = await notificationService.getNotificationById(item._id);
      if (res?.success) {
        setSelectedNotif(res.data);
        setDetailModalOpen(true);
        setPopoverOpen(false);

        // Cập nhật trạng thái đọc ngay trên UI
        setNotifications((prev) =>
          prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
        );
        fetchUnreadCount();
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể xem chi tiết thông báo');
    }
  };

  // Đánh dấu tất cả là đã đọc
  const handleMarkAllRead = async () => {
    try {
      const res = await notificationService.markAllAsRead();
      if (res?.success) {
        message.success('Đã đánh dấu tất cả thông báo là đã đọc!');
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Thao tác thất bại');
    }
  };

  // Điều hướng đến trang thông báo đầy đủ
  const handleNavigateToAll = () => {
    setPopoverOpen(false);
    if (isCustomer) {
      navigate('/customer/notifications');
    } else {
      navigate('/admin/notifications');
    }
  };

  const getRoleTag = () => {
    if (isAdmin) return <Tag color="#EF4444">Quản trị viên (Admin)</Tag>;
    if (isStaff) return <Tag color="#009B60">Nhân viên sân (Staff)</Tag>;
    return <Tag color="#1890ff">Khách hàng (Customer)</Tag>;
  };

  // Icon loại thông báo
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'BOOKING_SUCCESS':
      case 'BOOKING_CONFIRMED':
        return <CheckCircleOutlined style={{ color: '#009B60', marginTop: 4, fontSize: 16 }} />;
      case 'BOOKING_CANCELLED':
      case 'BOOKING_REJECTED':
        return <CloseCircleOutlined style={{ color: '#ff4d4f', marginTop: 4, fontSize: 16 }} />;
      case 'SESSION_NEAR_END':
        return <AlertOutlined style={{ color: '#faad14', marginTop: 4, fontSize: 16 }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff', marginTop: 4, fontSize: 16 }} />;
    }
  };

  // UC-02 Logout with Confirmation Modal
  const handleLogout = () => {
    Modal.confirm({
      title: 'Xác nhận đăng xuất',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?',
      okText: 'Đăng xuất',
      okType: 'danger',
      cancelText: 'Hủy',
      centered: true,
      onOk: async () => {
        try {
          await logout();
          message.success('Đăng xuất thành công!');
          navigate('/login');
        } catch (error) {
          message.error('Có lỗi xảy ra khi đăng xuất. Vui lòng thử lại.');
        }
      }
    });
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Hồ sơ cá nhân',
      icon: <UserOutlined />,
      onClick: () => navigate(isAdmin || isStaff ? '/admin/profile' : '/customer/profile')
    },
    {
      key: 'notifications',
      label: 'Thông báo của tôi',
      icon: <BellOutlined />,
      onClick: handleNavigateToAll
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      label: 'Đăng xuất',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout
    }
  ];

  const notificationContent = (
    <div style={{ width: 340 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong style={{ fontSize: 14 }}>
          Thông báo ({unreadCount} chưa đọc)
        </Text>
        {unreadCount > 0 && (
          <Button
            type="link"
            size="small"
            icon={<CheckOutlined />}
            onClick={handleMarkAllRead}
            style={{ padding: 0, fontSize: 12 }}
          >
            Đọc tất cả
          </Button>
        )}
      </div>
      <Divider style={{ margin: '8px 0' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin size="small" />
        </div>
      ) : (
        <List
          size="small"
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              key={item._id}
              onClick={() => handleItemClick(item)}
              style={{
                cursor: 'pointer',
                background: item.isRead ? 'transparent' : '#f6ffed',
                padding: '8px',
                borderRadius: 6,
                marginBottom: 4,
                transition: 'background 0.2s'
              }}
            >
              <List.Item.Meta
                avatar={getNotificationIcon(item.type)}
                title={
                  <Text strong={!item.isRead} style={{ fontSize: 13, color: item.isRead ? '#555' : '#111' }}>
                    {item.title}
                  </Text>
                }
                description={
                  <div>
                    <Paragraph
                      ellipsis={{ rows: 2 }}
                      style={{ fontSize: 12, marginBottom: 2, color: '#666' }}
                    >
                      {item.message}
                    </Paragraph>
                    <Text orientation="secondary" style={{ fontSize: 10, color: '#999' }}>
                      {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'Chưa có thông báo nào' }}
        />
      )}

      <Divider style={{ margin: '8px 0' }} />
      <div style={{ textAlign: 'center' }}>
        <Button
          type="link"
          size="small"
          onClick={handleNavigateToAll}
          icon={<ArrowRightOutlined />}
          style={{ fontSize: 12, color: '#009B60' }}
        >
          Xem tất cả thông báo
        </Button>
      </div>
    </div>
  );

  return (
    <Header
      style={{
        padding: '0 20px',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: 64
      }}
    >
      <Space>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          style={{ fontSize: 16 }}
        />
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          <span style={{ fontSize: 20, fontWeight: 700, color: '#009B60' }}>🏸 CẦU LÔNG HUB</span>
          <span style={{ fontSize: 12, color: '#888' }}>BCMS</span>
        </div>
      </Space>

      <Space size="middle">
        <Popover
          content={notificationContent}
          trigger="click"
          placement="bottomRight"
          open={popoverOpen}
          onOpenChange={handlePopoverOpenChange}
        >
          <Badge count={unreadCount} overflowCount={99} offset={[-2, 6]}>
            <Button
              type="text"
              shape="circle"
              icon={<BellOutlined style={{ fontSize: 18, color: '#555' }} />}
            />
          </Badge>
        </Popover>

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <Avatar style={{ backgroundColor: '#009B60' }} icon={<UserOutlined />} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <Text strong style={{ fontSize: 14 }}>{user?.name || user?.fullName || 'Người dùng'}</Text>
              <div>{getRoleTag()}</div>
            </div>
          </div>
        </Dropdown>
      </Space>

      {/* Modal xem chi tiết thông báo */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BellOutlined style={{ color: '#009B60' }} />
            <span>Chi tiết thông báo</span>
          </div>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setDetailModalOpen(false)}>
            Đóng
          </Button>
        ]}
        centered
        width={500}
      >
        {selectedNotif && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Tag color={selectedNotif.isRead ? 'default' : 'success'}>
                {selectedNotif.isRead ? 'Đã đọc' : 'Chưa đọc'}
              </Tag>
              <Text orientation="secondary" style={{ fontSize: 12 }}>
                {new Date(selectedNotif.createdAt).toLocaleDateString('vi-VN')} {new Date(selectedNotif.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </div>
            <Title level={4} style={{ marginTop: 8, marginBottom: 8 }}>
              {selectedNotif.title}
            </Title>
            <Divider style={{ margin: '8px 0' }} />
            <Paragraph style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#333' }}>
              {selectedNotif.message}
            </Paragraph>
          </div>
        )}
      </Modal>
    </Header>
  );
}
