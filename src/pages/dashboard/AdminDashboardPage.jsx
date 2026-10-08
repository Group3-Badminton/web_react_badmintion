import React, { useState } from 'react';
import { Row, Col, Card, Statistic, Typography, Space, Button, Progress, Tag, Table } from 'antd';
import {
  DollarOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ShoppingOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Mock initial stats for UI visualization
  const stats = {
    totalRevenue: 15850000,
    occupancyRate: 75,
    todayBookings: 12,
    activeCourts: 6,
    totalCourts: 8
  };

  const sampleInvoices = [
    {
      key: '1',
      invoiceNumber: 'INV-2026-001',
      customer: 'Nguyễn Văn An',
      total: 360000,
      method: 'CASH',
      time: '08:30'
    },
    {
      key: '2',
      invoiceNumber: 'INV-2026-002',
      customer: 'Trần Thị Mai',
      total: 540000,
      method: 'VIETQR',
      time: '09:15'
    },
    {
      key: '3',
      invoiceNumber: 'INV-2026-003',
      customer: 'Lê Hoàng Nam',
      total: 240000,
      method: 'CASH',
      time: '10:00'
    }
  ];

  const columns = [
    {
      title: 'Mã hóa đơn',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (t) => <Text strong style={{ color: '#009B60' }}>{t}</Text>
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customer',
      key: 'customer'
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'total',
      key: 'total',
      render: (v) => <Text strong>{v.toLocaleString('vi-VN')} đ</Text>
    },
    {
      title: 'Thanh toán',
      dataIndex: 'method',
      key: 'method',
      render: (m) => <Tag color={m === 'CASH' ? 'green' : 'blue'}>{m}</Tag>
    },
    {
      title: 'Thời gian',
      dataIndex: 'time',
      key: 'time'
    }
  ];

  return (
    <div>
      {/* Welcome Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          background: 'linear-gradient(135deg, #092615 0%, #1a4d2e 100%)',
          padding: '24px 30px',
          borderRadius: 16,
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(9, 38, 21, 0.15)'
        }}
      >
        <div>
          <Title level={3} style={{ color: '#ffffff', margin: '0 0 6px' }}>
            Xin chào, {user?.name || 'Quản trị viên'} 👋
          </Title>
          <Text style={{ color: '#bbf246', fontSize: 14 }}>
            Hệ thống quản lý sân cầu lông BCMS — Chúc bạn một ngày làm việc hiệu quả!
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            color: '#fff',
            borderRadius: 8
          }}
          onClick={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 500);
          }}
          loading={loading}
        >
          Làm mới
        </Button>
      </div>

      {/* KPI Cards */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12, borderTop: '4px solid #009B60' }}>
            <Statistic
              title="Doanh Thu Tháng Này"
              value={stats.totalRevenue}
              suffix="đ"
              valueStyle={{ color: '#009B60', fontWeight: 'bold', fontSize: 22 }}
              prefix={<DollarOutlined />}
            />
            <div style={{ marginTop: 8, fontSize: 13, color: '#888' }}>
              Tăng trưởng ổn định
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12, borderTop: '4px solid #1890ff' }}>
            <Statistic
              title="Tỷ Lệ Khai Thác Sân"
              value={stats.occupancyRate}
              suffix="%"
              valueStyle={{ color: '#1890ff', fontWeight: 'bold', fontSize: 22 }}
              prefix={<ThunderboltOutlined />}
            />
            <div style={{ marginTop: 8 }}>
              <Progress percent={stats.occupancyRate} strokeColor="#1890ff" size="small" showInfo={false} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {stats.activeCourts} / {stats.totalCourts} sân đang hoạt động
              </Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12, borderTop: '4px solid #E9B323' }}>
            <Statistic
              title="Lịch Đặt Sân Hôm Nay"
              value={stats.todayBookings}
              valueStyle={{ color: '#E9B323', fontWeight: 'bold', fontSize: 22 }}
              prefix={<CalendarOutlined />}
            />
            <div style={{ marginTop: 8, fontSize: 13, color: '#888' }}>
              6 ca hoàn thành, 6 ca sắp tới
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12, borderTop: '4px solid #52c41a' }}>
            <Statistic
              title="Trạng Thái Vận Hành"
              value="Tốt"
              valueStyle={{ color: '#52c41a', fontWeight: 'bold', fontSize: 22 }}
              prefix={<CheckCircleOutlined />}
            />
            <div style={{ marginTop: 8, fontSize: 13, color: '#888' }}>
              Hệ thống hoạt động trơn tru
            </div>
          </Card>
        </Col>
      </Row>

      {/* Revenue Structure Breakdown & Recent Transactions */}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card title="Cơ Cấu Doanh Thu Ước Tính" style={{ borderRadius: 12, height: '100%' }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text strong><CalendarOutlined style={{ color: '#009B60' }} /> Tiền Thuê Sân:</Text>
                <Text strong>11.500.000 đ (72%)</Text>
              </div>
              <Progress percent={72} strokeColor="#009B60" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text strong><ShoppingOutlined style={{ color: '#1890ff' }} /> Bán Lẻ Nước & Đồ Ăn (POS):</Text>
                <Text strong>3.250.000 đ (21%)</Text>
              </div>
              <Progress percent={21} strokeColor="#1890ff" />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text strong><ThunderboltOutlined style={{ color: '#E9B323' }} /> Cho Thuê Vợt & Phụ Kiện:</Text>
                <Text strong>1.100.000 đ (7%)</Text>
              </div>
              <Progress percent={7} strokeColor="#E9B323" />
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Giao Dịch Gần Đây" style={{ borderRadius: 12, height: '100%' }}>
            <Table
              dataSource={sampleInvoices}
              columns={columns}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
