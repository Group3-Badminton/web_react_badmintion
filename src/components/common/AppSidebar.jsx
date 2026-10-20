// eslint-disable-next-line no-unused-vars
import React from 'react';
import { Layout, Menu } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  IdcardOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  DollarOutlined,
  ThunderboltOutlined,
  UnorderedListOutlined,
  PlayCircleOutlined,
  ShoppingCartOutlined,
  TagOutlined,
  FileTextOutlined,
  FolderOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { STAFF_PERMISSIONS } from '../../utils/constants';

const { Sider } = Layout;

export default function AppSidebar({ collapsed }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isStaff, isCustomer, hasPermission } = useAuth();

  const getMenuItems = () => {
    if (isCustomer) {
      return [
        {
          key: '/customer/book',
          icon: <ThunderboltOutlined style={{ color: '#009B60' }} />,
          label: 'Đặt sân online'
        },
        {
          key: '/customer/my-bookings',
          icon: <UnorderedListOutlined />,
          label: 'Lịch đặt của tôi'
        },
        {
          key: '/customer/profile',
          icon: <UserOutlined />,
          label: 'Hồ sơ cá nhân'
        }
      ];
    }

    // Admin and Staff menu
    const items = [];

    // Dashboard Overview
    if (isAdmin || isStaff) {
      items.push({
        key: '/admin/dashboard',
        icon: <AppstoreOutlined style={{ color: '#009B60' }} />,
        label: 'Tổng quan (Dashboard)'
      });
    }

    // Live Court Board Monitor
    if (isAdmin || hasPermission(STAFF_PERMISSIONS.CHECKIN_CHECKOUT)) {
      items.push({
        key: '/admin/monitor',
        icon: <PlayCircleOutlined style={{ color: '#1890ff' }} />,
        label: 'Bảng ca đấu trực tiếp'
      });
    }

    // POS & Inventory
    if (isAdmin || hasPermission(STAFF_PERMISSIONS.POS_SALES)) {
      items.push({
        key: '/admin/pos',
        icon: <ShoppingCartOutlined />,
        label: 'Bán hàng POS & Kho'
      });
    }

    // Product Management (UC-14)
    if (isAdmin || isStaff) {
      items.push({
        key: '/admin/products',
        icon: <TagOutlined style={{ color: '#009B60' }} />,
        label: 'Quản lý sản phẩm'
      });
    }

    // Bookings
    if (isAdmin || hasPermission(STAFF_PERMISSIONS.MANAGE_BOOKINGS)) {
      items.push({
        key: '/admin/bookings',
        icon: <CalendarOutlined />,
        label: 'Quản lý đặt sân'
      });
    }

    // Invoices & Receipts
    if (isAdmin || isStaff) {
      items.push({
        key: '/admin/invoices',
        icon: <FileTextOutlined />,
        label: 'Quản lý hóa đơn'
      });
    }

    // Vouchers (UC-15)
    if (isAdmin || isStaff) {
      items.push({
        key: '/admin/vouchers',
        icon: <TagOutlined style={{ color: '#009B60' }} />,
        label: 'Mã giảm giá (Voucher)'
      });
    }

    // Danh mục chung (Bao gồm Bảng giá và Danh mục sân)
    const generalCategoryChildren = [];

    // Bảng giá sân (Admin & Staff)
    if (isAdmin || isStaff) {
      generalCategoryChildren.push({
        key: '/admin/prices',
        icon: <DollarOutlined />,
        label: 'Bảng giá sân'
      });
    }

    // Courts (Staff & Admin)
    if (isAdmin || isStaff) {
      items.push({
        key: '/admin/courts',
        icon: <AppstoreOutlined />,
        label: 'Quản lý danh mục sân'
      });
    }

    // Courts
    if (isAdmin || hasPermission(STAFF_PERMISSIONS.VIEW_COURTS)) {
      generalCategoryChildren.push({
        key: '/admin/courts',
        icon: <AppstoreOutlined />,
        label: 'Danh mục sân'
      });
    }

    if (generalCategoryChildren.length > 0) {
      items.push({
        key: 'general-category',
        icon: <FolderOutlined style={{ color: '#009B60' }} />,
        label: 'Danh mục chung',
        children: generalCategoryChildren
      });
    }

    // Customer Management
    if (isAdmin || isStaff || hasPermission(STAFF_PERMISSIONS.VIEW_CUSTOMERS)) {
      items.push({
        key: '/admin/customers',
        icon: <TeamOutlined />,
        label: 'Quản lý khách hàng'
      });
    }

    // Staff Management (Admin only)
    if (isAdmin) {
      items.push({
        key: '/admin/staffs',
        icon: <IdcardOutlined />,
        label: 'Quản lý nhân viên'
      });
    }

    return items;
  };

  const menuItems = getMenuItems();

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={240}
      theme="light"
      style={{
        borderRight: '1px solid #f0f0f0',
        minHeight: 'calc(100vh - 64px)'
      }}
    >
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={['general-category']}
        style={{ borderRight: 0, padding: '12px 0' }}
        items={menuItems}
        onClick={({ key }) => {
          if (key && key.startsWith('/')) {
            navigate(key);
          }
        }}
      />
    </Sider>
  );
}
