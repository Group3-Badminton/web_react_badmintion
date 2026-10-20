import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Tag,
  Space,
  Button,
  Typography,
  Modal,
  Descriptions,
  Popconfirm,
  message,
  Tooltip,
  Select,
  Input,
  Row,
  Col,
  Empty,
  Statistic,
  Alert
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  TagOutlined,
  SearchOutlined,
  StopOutlined,
  PlayCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { bookingService } from '../../services/bookingService';

const { Title, Text } = Typography;
const { Option } = Select;

const STATUS_CONFIG = {
  PENDING: {
    color: 'gold',
    label: 'Chờ duyệt',
    icon: <ClockCircleOutlined />
  },
  CONFIRMED: {
    color: 'green',
    label: 'Đã xác nhận',
    icon: <CheckCircleOutlined />
  },
  CHECKED_IN: {
    color: 'blue',
    label: 'Đang chơi / Nhận sân',
    icon: <PlayCircleOutlined />
  },
  COMPLETED: {
    color: 'cyan',
    label: 'Hoàn thành',
    icon: <CheckCircleOutlined />
  },
  CANCELLED: {
    color: 'red',
    label: 'Đã hủy',
    icon: <CloseCircleOutlined />
  },
  REJECTED: {
    color: 'magenta',
    label: 'Từ chối',
    icon: <StopOutlined />
  }
};

export default function CustomerMyBookingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({
    totalAll: 0,
    pendingCount: 0,
    confirmedCount: 0,
    completedCount: 0,
    cancelledCount: 0
  });

  // Modal chi tiết
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  // Tải danh sách đơn đặt sân của khách hàng
  const fetchMyBookings = useCallback(
    async (page = pagination.current, pageSize = pagination.pageSize) => {
      try {
        setLoading(true);
        const params = {
          page,
          limit: pageSize,
          search: search.trim(),
          status: statusFilter !== 'ALL' ? statusFilter : undefined
        };

        const res = await bookingService.getAllBookings(params);
        if (res.success && res.data) {
          setBookings(res.data.bookings || []);
          setPagination({
            current: res.data.pagination.page,
            pageSize: res.data.pagination.limit,
            total: res.data.pagination.total
          });
          if (res.data.stats) {
            setStats(res.data.stats);
          }
        }
      } catch (err) {
        message.error(err?.response?.data?.message || 'Không thể tải lịch sử đặt sân!');
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, pagination.current, pagination.pageSize]
  );

  useEffect(() => {
    fetchMyBookings(1, pagination.pageSize);
  }, [statusFilter]);

  // Hủy đơn đặt sân (chỉ khả dụng khi PENDING)
  const handleCancelBooking = async (bookingId) => {
    try {
      setCancellingId(bookingId);
      const res = await bookingService.updateBookingStatus(bookingId, { status: 'CANCELLED' });
      if (res.success) {
        message.success('Đã hủy đơn đặt sân thành công!');
        fetchMyBookings();
        if (isDetailModalOpen) {
          setIsDetailModalOpen(false);
        }
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Không thể hủy đơn đặt sân!');
    } finally {
      setCancellingId(null);
    }
  };

  const columns = [
    {
      title: 'Mã Đơn',
      dataIndex: 'bookingCode',
      key: 'bookingCode',
      width: 140,
      render: (code, record) => (
        <Button
          type="link"
          style={{ padding: 0, fontWeight: 700, color: '#009B60' }}
          onClick={() => {
            setSelectedBooking(record);
            setIsDetailModalOpen(true);
          }}
        >
          #{code}
        </Button>
      )
    },
    {
      title: 'Sân Thi Đấu',
      dataIndex: 'courtId',
      key: 'court',
      render: (court) => (
        <div>
          <Text strong>{court?.courtName || 'Sân cầu lông'}</Text>
          <div style={{ fontSize: 12, color: '#64748b' }}>{court?.courtType || court?.location || ''}</div>
        </div>
      )
    },
    {
      title: 'Ngày & Giờ Chơi',
      key: 'schedule',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>
            📅 {dayjs(record.bookingDate).format('DD/MM/YYYY')}
          </div>
          <Tag color="geekblue" style={{ marginTop: 4 }}>
            <ClockCircleOutlined /> {record.startTime} - {record.endTime}
          </Tag>
        </div>
      )
    },
    {
      title: 'Tổng Tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount, record) => (
        <div>
          <Text strong style={{ color: '#009B60', fontSize: 14 }}>
            {(amount || 0).toLocaleString('vi-VN')} đ
          </Text>
          {record.discount > 0 && (
            <div style={{ fontSize: 11, color: '#16a34a' }}>
              Giảm: -{record.discount.toLocaleString('vi-VN')} đ
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Hình Thức',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method) => (
        <Tag color="blue">
          {method === 'VIETQR' ? 'VietQR' : method === 'TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}
        </Tag>
      )
    },
    {
      title: 'Thanh Toán',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (payStatus) => (
        <Tag color={payStatus === 'PAID' ? 'green' : 'red'}>
          {payStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
        </Tag>
      )
    },
    {
      title: 'Trạng Thái Đơn',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const conf = STATUS_CONFIG[status] || { color: 'default', label: status, icon: null };
        return (
          <Tag color={conf.color} icon={conf.icon} style={{ padding: '2px 8px', borderRadius: 6, fontWeight: 500 }}>
            {conf.label}
          </Tag>
        );
      }
    },
    {
      title: 'Thao Tác',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size={8}>
          <Tooltip title="Xem chi tiết đơn">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedBooking(record);
                setIsDetailModalOpen(true);
              }}
            >
              Xem
            </Button>
          </Tooltip>

          {record.status === 'PENDING' && (
            <Popconfirm
              title="Bạn có chắc chắn muốn hủy đơn đặt sân này?"
              onConfirm={() => handleCancelBooking(record._id)}
              okText="Hủy đơn"
              cancelText="Quay lại"
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                danger
                loading={cancellingId === record._id}
              >
                Hủy
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 32 }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #092615 0%, #1a4d2e 100%)',
          padding: '24px 28px',
          borderRadius: 16,
          color: '#ffffff',
          marginBottom: 20,
          boxShadow: '0 8px 24px rgba(9, 38, 21, 0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div>
          <Title level={3} style={{ color: '#ffffff', margin: '0 0 4px' }}>
            Lịch Đặt Sân Của Tôi 🏸
          </Title>
          <Text style={{ color: '#bbf246', fontSize: 13 }}>
            Xem lại lịch sử đặt sân, theo dõi trạng thái duyệt đơn và quản lý các ca chơi đã đặt
          </Text>
        </div>

        <Space size={12}>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            style={{
              backgroundColor: '#bbf246',
              borderColor: '#bbf246',
              color: '#092615',
              fontWeight: 'bold',
              height: 38,
              borderRadius: 8
            }}
            onClick={() => navigate('/customer/book')}
          >
            Đặt Sân Ngay
          </Button>
          <Button
            icon={<ReloadOutlined spin={loading} />}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
              height: 38,
              borderRadius: 8
            }}
            onClick={() => fetchMyBookings()}
          >
            Làm mới
          </Button>
        </Space>
      </div>

      {/* Thẻ Thống Kê Nhanh */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <Statistic title="Tổng đơn đã đặt" value={stats.totalAll || 0} prefix={<CalendarOutlined style={{ color: '#009B60' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <Statistic title="Đang chờ duyệt" value={stats.pendingCount || 0} valueStyle={{ color: '#d97706' }} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <Statistic title="Đã xác nhận" value={stats.confirmedCount || 0} valueStyle={{ color: '#009B60' }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <Statistic title="Đã hoàn thành" value={stats.completedCount || 0} valueStyle={{ color: '#0284c7' }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Bộ Lọc & Tìm Kiếm */}
      <Card style={{ borderRadius: 14, marginBottom: 16, border: '1px solid #e2e8f0' }} bodyStyle={{ padding: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={10}>
            <Input
              placeholder="Tìm kiếm theo mã đơn..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={() => fetchMyBookings(1, pagination.pageSize)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Lọc theo trạng thái"
            >
              <Option value="ALL">Tất cả trạng thái</Option>
              <Option value="PENDING">Chờ duyệt (PENDING)</Option>
              <Option value="CONFIRMED">Đã xác nhận (CONFIRMED)</Option>
              <Option value="CHECKED_IN">Đã nhận sân (CHECKED_IN)</Option>
              <Option value="COMPLETED">Hoàn thành (COMPLETED)</Option>
              <Option value="CANCELLED">Đã hủy (CANCELLED)</Option>
              <Option value="REJECTED">Từ chối (REJECTED)</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6} style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              style={{ backgroundColor: '#009B60', borderColor: '#009B60', borderRadius: 8 }}
              onClick={() => fetchMyBookings(1, pagination.pageSize)}
            >
              Tìm Kiếm
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Bảng Danh Sách Đặt Sân */}
      <Card style={{ borderRadius: 14, border: '1px solid #e2e8f0' }} bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={bookings}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showTotal: (total) => `Tổng cộng ${total} đơn đặt sân`,
            onChange: (page, pageSize) => fetchMyBookings(page, pageSize)
          }}
          locale={{
            emptyText: (
              <Empty
                description="Bạn chưa có đơn đặt sân nào"
                style={{ padding: '32px 0' }}
              >
                <Button
                  type="primary"
                  style={{ backgroundColor: '#009B60', borderColor: '#009B60' }}
                  onClick={() => navigate('/customer/book')}
                >
                  Đặt Sân Ngay Bây Giờ
                </Button>
              </Empty>
            )
          }}
        />
      </Card>

      {/* Modal Chi Tiết Đơn Đặt Sân */}
      <Modal
        title={
          <Space>
            <CalendarOutlined style={{ color: '#009B60' }} />
            <span>Chi Tiết Đơn Đặt Sân #{selectedBooking?.bookingCode}</span>
            {selectedBooking?.status && (
              <Tag color={STATUS_CONFIG[selectedBooking.status]?.color || 'default'}>
                {STATUS_CONFIG[selectedBooking.status]?.label || selectedBooking.status}
              </Tag>
            )}
          </Space>
        }
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          selectedBooking?.status === 'PENDING' && (
            <Popconfirm
              key="cancel-modal"
              title="Bạn có chắc chắn muốn hủy đơn đặt sân này?"
              onConfirm={() => handleCancelBooking(selectedBooking._id)}
              okText="Hủy đơn"
              cancelText="Quay lại"
              okButtonProps={{ danger: true }}
            >
              <Button danger loading={cancellingId === selectedBooking._id}>
                Hủy Đơn Này
              </Button>
            </Popconfirm>
          ),
          <Button key="close" type="primary" onClick={() => setIsDetailModalOpen(false)} style={{ backgroundColor: '#009B60', borderColor: '#009B60' }}>
            Đóng
          </Button>
        ].filter(Boolean)}
        width={650}
      >
        {selectedBooking && (
          <div style={{ marginTop: 12 }}>
            {selectedBooking.status === 'PENDING' && (
              <Alert
                message="Đơn đặt sân đang chờ duyệt"
                description="Nhân viên sân sẽ sớm kiểm tra và xác nhận giữ sân cho bạn. Bạn có thể hủy đơn nếu thay đổi kế hoạch."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Mã Đơn">
                <Text strong style={{ color: '#009B60' }}>
                  #{selectedBooking.bookingCode}
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Ngày Tạo Đơn">
                {dayjs(selectedBooking.createdAt).format('HH:mm DD/MM/YYYY')}
              </Descriptions.Item>

              <Descriptions.Item label="Sân Đặt">
                <Text strong>🏸 {selectedBooking.courtId?.courtName || 'Sân cầu lông'}</Text>
                <div style={{ fontSize: 12, color: '#64748b' }}>{selectedBooking.courtId?.courtType}</div>
              </Descriptions.Item>

              <Descriptions.Item label="Địa Điểm">
                <Text type="secondary">{selectedBooking.courtId?.location || 'Cần Thơ'}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Ngày Chơi">
                <Text strong style={{ color: '#009B60' }}>
                  {dayjs(selectedBooking.bookingDate).format('DD/MM/YYYY')}
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Khung Giờ">
                <Tag color="geekblue">
                  <ClockCircleOutlined /> {selectedBooking.startTime} - {selectedBooking.endTime}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Tiền Sân">
                {(selectedBooking.price || 0).toLocaleString('vi-VN')} đ
              </Descriptions.Item>

              <Descriptions.Item label="Giảm Giá">
                <Text style={{ color: selectedBooking.discount > 0 ? '#16a34a' : undefined }}>
                  -{(selectedBooking.discount || 0).toLocaleString('vi-VN')} đ
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Tổng Thanh Toán">
                <Text strong style={{ fontSize: 16, color: '#d4380d' }}>
                  {(selectedBooking.totalAmount || 0).toLocaleString('vi-VN')} đ
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Hình Thức">
                <Tag color="blue">
                  {selectedBooking.paymentMethod === 'VIETQR'
                    ? 'Chuyển khoản VietQR'
                    : selectedBooking.paymentMethod === 'TRANSFER'
                    ? 'Chuyển khoản ngân hàng'
                    : 'Tiền mặt tại quầy (Mặc định)'}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Thanh Toán">
                <Tag color={selectedBooking.paymentStatus === 'PAID' ? 'green' : 'red'}>
                  {selectedBooking.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Trạng Thái Đơn">
                <Tag color={STATUS_CONFIG[selectedBooking.status]?.color || 'default'}>
                  {STATUS_CONFIG[selectedBooking.status]?.label || selectedBooking.status}
                </Tag>
              </Descriptions.Item>

              {selectedBooking.voucherId && (
                <Descriptions.Item label="Mã Khuyến Mãi" span={2}>
                  <Tag color="magenta">
                    🏷️ {selectedBooking.voucherId.voucherCode} - {selectedBooking.voucherId.voucherName}
                  </Tag>
                </Descriptions.Item>
              )}

              {selectedBooking.note && (
                <Descriptions.Item label="Ghi Chú" span={2}>
                  <Text>{selectedBooking.note}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
}
