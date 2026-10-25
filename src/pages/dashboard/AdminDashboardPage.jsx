import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Statistic, Typography, Space, Button, Progress, Tag, Table, Empty } from 'antd';
import {
  DollarOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services/bookingService';

const { Title, Text } = Typography;

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Dữ liệu thống kê thực tế lấy từ Database thông qua API
  const [stats, setStats] = useState({
    totalRevenue: 0,
    occupancyRate: 0,
    todayBookings: 0,
    activeCourts: 0,
    totalCourts: 0,
    pendingCount: 0,
    confirmedCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    totalAll: 0
  });

  const [recentBookings, setRecentBookings] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const todayStr = dayjs().format('YYYY-MM-DD');

      const [allBookingsRes, todayBookingsRes, courtsRes] = await Promise.all([
        bookingService.getAllBookings({ page: 1, limit: 5 }),
        bookingService.getAllBookings({ bookingDate: todayStr, limit: 1 }),
        bookingService.getCourts()
      ]);

      let revenue = 0;
      let pending = 0;
      let confirmed = 0;
      let completed = 0;
      let cancelled = 0;
      let totalAll = 0;
      let recentList = [];

      if (allBookingsRes.success && allBookingsRes.data) {
        recentList = allBookingsRes.data.bookings || [];
        if (allBookingsRes.data.stats) {
          const s = allBookingsRes.data.stats;
          revenue = s.totalRevenue || 0;
          pending = s.pendingCount || 0;
          confirmed = s.confirmedCount || 0;
          completed = s.completedCount || 0;
          cancelled = s.cancelledCount || 0;
          totalAll = s.totalAll || 0;
        }
      }

      let activeC = 0;
      let totalC = 0;
      if (courtsRes.success && Array.isArray(courtsRes.data)) {
        totalC = courtsRes.data.length;
        activeC = courtsRes.data.filter((c) => c.status === 'ACTIVE').length;
      }

      const todayTotal = todayBookingsRes.success && todayBookingsRes.data?.pagination
        ? todayBookingsRes.data.pagination.total
        : 0;

      // Tính tỷ lệ khai thác dựa trên số đơn hôm nay và tổng năng lực phục vụ
      const maxSlotsEstimate = Math.max(1, totalC * 6);
      const occupancy = totalC > 0 ? Math.min(100, Math.round((todayTotal / maxSlotsEstimate) * 100)) : 0;

      setStats({
        totalRevenue: revenue,
        occupancyRate: occupancy,
        todayBookings: todayTotal,
        activeCourts: activeC,
        totalCourts: totalC,
        pendingCount: pending,
        confirmedCount: confirmed,
        completedCount: completed,
        cancelledCount: cancelled,
        totalAll
      });

      setRecentBookings(
        recentList.map((b) => ({
          key: b._id,
          invoiceNumber: `#${b.bookingCode}`,
          customer: b.customerId?.fullName || b.customerName || 'Khách vãng lai',
          total: b.totalAmount || 0,
          method: b.paymentMethod || 'CASH',
          paymentStatus: b.paymentStatus || 'UNPAID',
          time: b.startTime
            ? `${b.startTime} (${dayjs(b.bookingDate).format('DD/MM')})`
            : dayjs(b.createdAt).format('HH:mm DD/MM')
        }))
      );
    } catch (err) {
      console.error('Lỗi nạp dữ liệu dashboard từ backend:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const columns = [
    {
      title: 'Mã đơn',
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
      render: (v) => <Text strong>{(v || 0).toLocaleString('vi-VN')} đ</Text>
    },
    {
      title: 'Thanh toán',
      dataIndex: 'method',
      key: 'method',
      render: (m, r) => (
        <Space size={4}>
          <Tag color={m === 'CASH' ? 'green' : 'blue'}>{m}</Tag>
          <Tag color={r.paymentStatus === 'PAID' ? 'green' : 'orange'}>
            {r.paymentStatus === 'PAID' ? 'Đã thu' : 'Chưa thu'}
          </Tag>
        </Space>
      )
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
            Xin chào, {user?.fullName || user?.name || 'Quản trị viên'} 👋
          </Title>
          <Text style={{ color: '#bbf246', fontSize: 14 }}>
            Hệ thống quản lý sân cầu lông BCMS — Dữ liệu thời gian thực từ cơ sở dữ liệu
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined spin={loading} />}
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            color: '#fff',
            borderRadius: 8
          }}
          onClick={fetchDashboardData}
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
              title="Tổng Doanh Thu Đã Thu"
              value={stats.totalRevenue}
              suffix="đ"
              valueStyle={{ color: '#009B60', fontWeight: 'bold', fontSize: 22 }}
              prefix={<DollarOutlined />}
            />
            <div style={{ marginTop: 8, fontSize: 13, color: '#888' }}>
              Từ các đơn đặt sân đã thanh toán
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12, borderTop: '4px solid #1890ff' }}>
            <Statistic
              title="Tỷ Lệ Khai Thác Sân Hôm Nay"
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
              {stats.todayBookings} lượt đặt trong ngày
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 12, borderTop: '4px solid #52c41a' }}>
            <Statistic
              title="Tổng Số Đơn Đặt Sân"
              value={stats.totalAll}
              valueStyle={{ color: '#52c41a', fontWeight: 'bold', fontSize: 22 }}
              prefix={<CheckCircleOutlined />}
            />
            <div style={{ marginTop: 8, fontSize: 13, color: '#888' }}>
              {stats.pendingCount} chờ duyệt, {stats.confirmedCount} đã xác nhận
            </div>
          </Card>
        </Col>
      </Row>

      {/* Booking Structure Breakdown & Recent Transactions */}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card title="Cơ Cấu Trạng Thái Đặt Sân" style={{ borderRadius: 12, height: '100%' }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text strong><CheckCircleOutlined style={{ color: '#009B60' }} /> Đã xác nhận / Hoàn thành:</Text>
                <Text strong>
                  {stats.confirmedCount + stats.completedCount} đơn (
                  {stats.totalAll > 0
                    ? Math.round(((stats.confirmedCount + stats.completedCount) / stats.totalAll) * 100)
                    : 0}%)
                </Text>
              </div>
              <Progress
                percent={stats.totalAll > 0 ? Math.round(((stats.confirmedCount + stats.completedCount) / stats.totalAll) * 100) : 0}
                strokeColor="#009B60"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text strong><ClockCircleOutlined style={{ color: '#faad14' }} /> Chờ duyệt (Pending):</Text>
                <Text strong>
                  {stats.pendingCount} đơn (
                  {stats.totalAll > 0 ? Math.round((stats.pendingCount / stats.totalAll) * 100) : 0}%)
                </Text>
              </div>
              <Progress
                percent={stats.totalAll > 0 ? Math.round((stats.pendingCount / stats.totalAll) * 100) : 0}
                strokeColor="#faad14"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text strong><CloseCircleOutlined style={{ color: '#ff4d4f' }} /> Đã hủy (Cancelled):</Text>
                <Text strong>
                  {stats.cancelledCount} đơn (
                  {stats.totalAll > 0 ? Math.round((stats.cancelledCount / stats.totalAll) * 100) : 0}%)
                </Text>
              </div>
              <Progress
                percent={stats.totalAll > 0 ? Math.round((stats.cancelledCount / stats.totalAll) * 100) : 0}
                strokeColor="#ff4d4f"
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Giao Dịch Đặt Sân Gần Đây" style={{ borderRadius: 12, height: '100%' }}>
            <Table
              dataSource={recentBookings}
              columns={columns}
              pagination={false}
              size="small"
              loading={loading}
              locale={{
                emptyText: <Empty description="Chưa có giao dịch đặt sân nào" style={{ padding: '24px 0' }} />
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
