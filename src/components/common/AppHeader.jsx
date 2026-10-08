import React, { useState } from 'react';
import { Layout, Dropdown, Avatar, Space, Typography, Tag, Button, Badge, Popover, List, Divider } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;
const { Text } = Typography;

export default function AppHeader({ collapsed, setCollapsed }) {
  const { user, logout, isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();

  const [notifications] = useState([
    {
      _id: '1',
      title: 'Chào mừng quay trở lại!',
      message: 'Hệ thống quản lý sân cầu lông BCMS đã sẵn sàng hoạt động.',
      createdAt: new Date(),
      isRead: false
    }
  ]);
  const [unreadCount] = useState(1);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const getRoleTag = () => {
    if (isAdmin) return <Tag color="#EF4444">Quản trị viên (Admin)</Tag>;
    if (isStaff) return <Tag color="#009B60">Nhân viên sân (Staff)</Tag>;
    return <Tag color="#1890ff">Khách hàng (Customer)</Tag>;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Hồ sơ cá nhân',
      icon: <UserOutlined />,
      onClick: () => navigate(isAdmin || isStaff ? '/admin/profile' : '/customer/profile')
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
    <div style={{ width: 320 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong>Thông báo hệ thống</Text>
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <List
        size="small"
        dataSource={notifications}
        renderItem={(item) => (
          <List.Item
            key={item._id}
            style={{
              cursor: 'pointer',
              background: item.isRead ? 'transparent' : '#f6ffed',
              padding: '8px',
              borderRadius: 6,
              marginBottom: 4
            }}
          >
            <List.Item.Meta
              avatar={<InfoCircleOutlined style={{ color: '#009B60', marginTop: 4 }} />}
              title={<Text strong={!item.isRead} style={{ fontSize: 13 }}>{item.title}</Text>}
              description={
                <div>
                  <Text style={{ fontSize: 12 }}>{item.message}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </Text>
                </div>
              }
            />
          </List.Item>
        )}
        locale={{ emptyText: 'Chưa có thông báo nào' }}
      />
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
          onOpenChange={setPopoverOpen}
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
    </Header>
  );
}
