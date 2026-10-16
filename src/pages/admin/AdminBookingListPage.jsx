import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Button,
  Input,
  Select,
  DatePicker,
  Space,
  Modal,
  Descriptions,
  message,
  Popconfirm,
  Tooltip,
  Typography,
  Divider,
  Avatar,
  Badge
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  UserOutlined,
  CopyOutlined,
  CheckOutlined,
  FilterOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { bookingService } from '../../services/bookingService';

const { Title, Text } = Typography;
const { Option } = Select;

// Cấu hình trạng thái tập trung vào quy trình Nhận đơn & Xác nhận đặt sân
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
  CANCELLED: {
    color: 'red',
    label: 'Đã hủy / Từ chối',
    icon: <CloseCircleOutlined />
  }
};

const PAYMENT_STATUS_CONFIG = {
  PAID: { color: 'green', label: 'Đã thanh toán' },
  UNPAID: { color: 'red', label: 'Chưa thanh toán' },
  REFUNDED: { color: 'orange', label: 'Đã hoàn tiền' }
};

export default function AdminBookingListPage() {
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [courts, setCourts] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // Bộ lọc
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [courtFilter, setCourtFilter] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(null);

  // Thống kê nhanh
  const [stats, setStats] = useState({
    totalAll: 0,
    pendingCount: 0,
    confirmedCount: 0,
    cancelledCount: 0,
    totalRevenue: 0
  });

  // Modal chi tiết & cập nhật
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState('');
  const [editNote, setEditNote] = useState('');

  // Tải danh sách sân phục vụ bộ lọc
  const fetchCourts = async () => {
    try {
      const res = await bookingService.getCourts();
      if (res.success) {
        setCourts(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách sân:', err);
    }
  };

  // Tải danh sách đơn đặt sân
  const fetchBookings = useCallback(
    async (page = pagination.current, pageSize = pagination.pageSize) => {
      try {
        setLoading(true);
        const params = {
          page,
          limit: pageSize,
          search: search.trim(),
          status: statusFilter,
          paymentStatus: paymentStatusFilter,
          courtId: courtFilter,
          bookingDate: selectedDate ? selectedDate.format('YYYY-MM-DD') : ''
        };

        const res = await bookingService.getAllBookings(params);
        if (res.success) {
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
        message.error(err?.response?.data?.message || 'Không thể tải danh sách đặt sân!');
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, paymentStatusFilter, courtFilter, selectedDate, pagination.current, pagination.pageSize]
  );

  useEffect(() => {
    fetchCourts();
  }, []);

  useEffect(() => {
    fetchBookings(1, pagination.pageSize);
  }, [statusFilter, paymentStatusFilter, courtFilter, selectedDate]);

  // Tìm kiếm khi nhấn Enter
  const handleSearchSubmit = () => {
    fetchBookings(1, pagination.pageSize);
  };

  // Đặt lại bộ lọc
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setPaymentStatusFilter('ALL');
    setCourtFilter('ALL');
    setSelectedDate(null);
  };

  // Xử lý chuyển trang
  const handleTableChange = (newPagination) => {
    fetchBookings(newPagination.current, newPagination.pageSize);
  };

  // Mở modal xem chi tiết
  const handleOpenDetailModal = (record) => {
    setSelectedBooking(record);
    setEditStatus(record.status);
    setEditPaymentStatus(record.paymentStatus);
    setEditNote(record.note || '');
    setIsDetailModalOpen(true);
  };

  // Thao tác duyệt / xác nhận hoặc từ chối đơn
  const handleUpdateStatus = async (bookingId, newStatus) => {
    try {
      setLoading(true);
      const res = await bookingService.updateBookingStatus(bookingId, { status: newStatus });
      if (res.success) {
        const actionText = newStatus === 'CONFIRMED' ? 'xác nhận duyệt đơn' : 'hủy đơn';
        message.success(`Đã ${actionText} thành công!`);
        fetchBookings();
        if (isDetailModalOpen) {
          setIsDetailModalOpen(false);
        }
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Thao tác thất bại!');
    } finally {
      setLoading(false);
    }
  };

  // Lưu chỉnh sửa thông tin trong Modal
  const handleSaveModalUpdate = async () => {
    if (!selectedBooking) return;
    try {
      setIsUpdating(true);
      const res = await bookingService.updateBookingStatus(selectedBooking._id, {
        status: editStatus,
        paymentStatus: editPaymentStatus,
        note: editNote
      });

      if (res.success) {
        message.success('Cập nhật thông tin đơn đặt sân thành công!');
        setIsDetailModalOpen(false);
        fetchBookings();
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Cập nhật thất bại!');
    } finally {
      setIsUpdating(false);
    }
  };

  // Sao chép mã đơn
  const copyBookingCode = (code) => {
    navigator.clipboard.writeText(code);
    message.success(`Đã sao chép mã đơn: ${code}`);
  };

  // Cấu hình các cột của bảng Ant Design
  const columns = [
    {
      title: 'Mã Đơn',
      dataIndex: 'bookingCode',
      key: 'bookingCode',
      width: 140,
      render: (code) => (
        <Space size={4}>
          <Text strong style={{ color: '#009B60' }}>
            #{code}
          </Text>
          <Tooltip title="Sao chép mã">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined style={{ fontSize: 12, color: '#888' }} />}
              onClick={() => copyBookingCode(code)}
            />
          </Tooltip>
        </Space>
      )
    },
    {
      title: 'Khách Hàng',
      key: 'customer',
      width: 210,
      render: (_, record) => {
        const customer = record.customerId;
        return (
          <Space direction="vertical" size={2}>
            <Space>
              <Avatar
                size="small"
                style={{ backgroundColor: '#009B60' }}
                icon={<UserOutlined />}
              >
                {customer?.fullName ? customer.fullName.charAt(0).toUpperCase() : 'U'}
              </Avatar>
              <Text strong>{customer?.fullName || 'Khách vãng lai'}</Text>
            </Space>
            {customer?.phone && (
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 28 }}>
                📞 {customer.phone}
              </Text>
            )}
            {customer?.email && (
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 28 }}>
                ✉️ {customer.email}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Sân Cầu Lông',
      key: 'court',
      width: 190,
      render: (_, record) => {
        const court = record.courtId;
        return (
          <Space direction="vertical" size={2}>
            <Text strong style={{ fontSize: 14 }}>
              🏸 {court?.courtName || 'Chưa chọn sân'}
            </Text>
            {court?.courtType && (
              <Tag color="cyan" style={{ fontSize: 11, borderRadius: 4, width: 'fit-content' }}>
                {court.courtType}
              </Tag>
            )}
            {court?.location && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                <EnvironmentOutlined /> {court.location}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Lịch Đặt Chơi',
      key: 'schedule',
      width: 170,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Space size={6}>
            <CalendarOutlined style={{ color: '#009B60' }} />
            <Text strong>{dayjs(record.bookingDate).format('DD/MM/YYYY')}</Text>
          </Space>
          <Tag color="geekblue" style={{ borderRadius: 4, margin: 0 }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {record.startTime} - {record.endTime}
          </Tag>
        </Space>
      )
    },
    {
      title: 'Tiền & Thanh Toán',
      key: 'payment',
      width: 180,
      render: (_, record) => {
        const payConfig = PAYMENT_STATUS_CONFIG[record.paymentStatus] || {
          color: 'default',
          label: record.paymentStatus
        };
        return (
          <Space direction="vertical" size={4}>
            <Text strong style={{ fontSize: 15, color: '#d4380d' }}>
              {(record.totalAmount || 0).toLocaleString('vi-VN')} đ
            </Text>
            <Space wrap size={4}>
              <Tag color={payConfig.color} style={{ margin: 0, borderRadius: 4 }}>
                {payConfig.label}
              </Tag>
              <Tag color="default" style={{ margin: 0, borderRadius: 4 }}>
                {record.paymentMethod || 'CASH'}
              </Tag>
            </Space>
          </Space>
        );
      }
    },
    {
      title: 'Trạng Thái Đơn',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status) => {
        const conf = STATUS_CONFIG[status] || { color: 'default', label: status, icon: null };
        return (
          <Tag
            color={conf.color}
            icon={conf.icon}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500
            }}
          >
            {conf.label}
          </Tag>
        );
      }
    },
    {
      title: 'Xử Lý Đơn',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => {
        return (
          <Space wrap size={6}>
            <Tooltip title="Xem chi tiết đơn">
              <Button
                type="default"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => handleOpenDetailModal(record)}
              >
                Chi tiết
              </Button>
            </Tooltip>

            {/* Quy trình Nhận & Duyệt đơn: PENDING -> CONFIRMED */}
            {record.status === 'PENDING' && (
              <Popconfirm
                title="Xác nhận nhận và duyệt đơn đặt sân này?"
                onConfirm={() => handleUpdateStatus(record._id, 'CONFIRMED')}
                okText="Duyệt đơn"
                cancelText="Hủy"
              >
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  style={{ backgroundColor: '#009B60', borderColor: '#009B60' }}
                >
                  Xác nhận
                </Button>
              </Popconfirm>
            )}

            {/* Từ chối hoặc hủy đơn */}
            {['PENDING', 'CONFIRMED'].includes(record.status) && (
              <Popconfirm
                title="Bạn có chắc chắn muốn hủy đơn đặt sân này?"
                onConfirm={() => handleUpdateStatus(record._id, 'CANCELLED')}
                okText="Hủy đơn"
                cancelText="Quay lại"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger type="text">
                  Hủy đơn
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          background: 'linear-gradient(135deg, #092615 0%, #1a4d2e 100%)',
          padding: '20px 24px',
          borderRadius: 14,
          color: '#ffffff',
          boxShadow: '0 4px 16px rgba(9, 38, 21, 0.12)'
        }}
      >
        <div>
          <Title level={3} style={{ color: '#ffffff', margin: '0 0 4px' }}>
            Nhận & Duyệt Đơn Đặt Sân 🏸
          </Title>
          <Text style={{ color: '#bbf246', fontSize: 13 }}>
            Tiếp nhận các đơn đặt lịch từ khách hàng, kiểm tra thông tin và xác nhận giữ sân
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
          onClick={() => fetchBookings(pagination.current, pagination.pageSize)}
          loading={loading}
        >
          Làm mới dữ liệu
        </Button>
      </div>

      {/* KPI Stats Cards - Tập trung vào Nhận đơn & Xác nhận */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderTop: '3px solid #1890ff' }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <Statistic
              title="Tổng Đơn Đặt Sân"
              value={stats.totalAll}
              prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ fontWeight: 'bold', fontSize: 24 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderTop: '3px solid #faad14' }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Statistic
                title="Đang Chờ Duyệt"
                value={stats.pendingCount}
                prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                valueStyle={{ color: '#faad14', fontWeight: 'bold', fontSize: 24 }}
              />
              {stats.pendingCount > 0 && (
                <Badge count="Cần xử lý" style={{ backgroundColor: '#faad14' }} />
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderTop: '3px solid #009B60' }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <Statistic
              title="Đã Xác Nhận Đặt"
              value={stats.confirmedCount}
              prefix={<CheckCircleOutlined style={{ color: '#009B60' }} />}
              valueStyle={{ color: '#009B60', fontWeight: 'bold', fontSize: 24 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderTop: '3px solid #ff4d4f' }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <Statistic
              title="Đã Hủy / Từ Chối"
              value={stats.cancelledCount}
              prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f', fontWeight: 'bold', fontSize: 24 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Bộ lọc & Tìm kiếm */}
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          marginBottom: 16,
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}
        styles={{ body: { padding: '16px 20px' } }}
      >
        <Row gutter={[12, 12]} align="middle">
          {/* Ô tìm kiếm */}
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Tìm mã đơn, tên khách, SĐT..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={handleSearchSubmit}
              allowClear
            />
          </Col>

          {/* Lọc theo trạng thái đặt đơn */}
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Trạng thái đơn"
            >
              <Option value="ALL">Tất cả trạng thái</Option>
              <Option value="PENDING">Chờ duyệt (PENDING)</Option>
              <Option value="CONFIRMED">Đã xác nhận (CONFIRMED)</Option>
              <Option value="CANCELLED">Đã hủy (CANCELLED)</Option>
            </Select>
          </Col>

          {/* Lọc theo thanh toán */}
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              value={paymentStatusFilter}
              onChange={setPaymentStatusFilter}
              placeholder="Thanh toán"
            >
              <Option value="ALL">Tất cả thanh toán</Option>
              <Option value="PAID">Đã thanh toán</Option>
              <Option value="UNPAID">Chưa thanh toán</Option>
              <Option value="REFUNDED">Đã hoàn tiền</Option>
            </Select>
          </Col>

          {/* Lọc theo sân */}
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              value={courtFilter}
              onChange={setCourtFilter}
              placeholder="Chọn sân"
            >
              <Option value="ALL">Tất cả các sân</Option>
              {courts.map((c) => (
                <Option key={c._id} value={c._id}>
                  {c.courtName}
                </Option>
              ))}
            </Select>
          </Col>

          {/* Lọc theo ngày đặt sân */}
          <Col xs={12} sm={6} md={4}>
            <DatePicker
              style={{ width: '100%' }}
              placeholder="Chọn ngày đặt"
              value={selectedDate}
              onChange={setSelectedDate}
              format="DD/MM/YYYY"
            />
          </Col>

          {/* Nút hành động */}
          <Col xs={24} sm={12} md={2} style={{ textAlign: 'right' }}>
            <Button
              icon={<FilterOutlined />}
              onClick={handleResetFilters}
              title="Xóa tất cả bộ lọc"
            >
              Đặt lại
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Bảng dữ liệu Bookings */}
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}
        styles={{ body: { padding: '12px' } }}
      >
        <Table
          columns={columns}
          dataSource={bookings}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20', '50'],
            showTotal: (total, range) => `${range[0]}-${range[1]} trên tổng số ${total} đơn đặt sân`
          }}
          onChange={handleTableChange}
          scroll={{ x: 1050 }}
          locale={{ emptyText: 'Chưa có đơn đặt sân nào phù hợp với bộ lọc' }}
        />
      </Card>

      {/* Modal Xem chi tiết & Xử lý đơn đặt sân */}
      <Modal
        title={
          <Space>
            <CalendarOutlined style={{ color: '#009B60' }} />
            <span>Chi Tiết Đơn Đặt Sân #{selectedBooking?.bookingCode}</span>
          </Space>
        }
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        width={700}
        footer={[
          <Button key="back" onClick={() => setIsDetailModalOpen(false)}>
            Đóng
          </Button>,
          selectedBooking?.status === 'PENDING' && (
            <Popconfirm
              key="confirm"
              title="Xác nhận nhận và duyệt đơn này?"
              onConfirm={() => handleUpdateStatus(selectedBooking._id, 'CONFIRMED')}
              okText="Duyệt đơn"
              cancelText="Hủy"
            >
              <Button
                type="primary"
                style={{ backgroundColor: '#009B60', borderColor: '#009B60' }}
                icon={<CheckOutlined />}
              >
                Xác Nhận Duyệt Đơn
              </Button>
            </Popconfirm>
          ),
          selectedBooking && ['PENDING', 'CONFIRMED'].includes(selectedBooking.status) && (
            <Popconfirm
              key="cancel"
              title="Bạn chắc chắn muốn hủy đơn này?"
              onConfirm={() => handleUpdateStatus(selectedBooking._id, 'CANCELLED')}
              okText="Hủy đơn"
              cancelText="Quay lại"
              okButtonProps={{ danger: true }}
            >
              <Button danger>Hủy Đơn Này</Button>
            </Popconfirm>
          ),
          <Button
            key="submit"
            type="primary"
            loading={isUpdating}
            icon={<CheckOutlined />}
            onClick={handleSaveModalUpdate}
          >
            Lưu Thay Đổi
          </Button>
        ].filter(Boolean)}
      >
        {selectedBooking && (
          <div style={{ marginTop: 16 }}>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Mã Đơn">
                <Text strong style={{ color: '#009B60' }}>
                  {selectedBooking.bookingCode}
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Ngày Tạo Đơn">
                {dayjs(selectedBooking.createdAt).format('HH:mm DD/MM/YYYY')}
              </Descriptions.Item>

              <Descriptions.Item label="Khách Hàng">
                <Text strong>{selectedBooking.customerId?.fullName || 'Khách vãng lai'}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Số Điện Thoại">
                {selectedBooking.customerId?.phone || 'Chưa cập nhật'}
              </Descriptions.Item>

              <Descriptions.Item label="Email Khách">
                {selectedBooking.customerId?.email || 'Chưa cập nhật'}
              </Descriptions.Item>

              <Descriptions.Item label="Sân Thi Đấu">
                <Text strong>{selectedBooking.courtId?.courtName}</Text>
                {selectedBooking.courtId?.location && (
                  <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                    📍 {selectedBooking.courtId.location}
                  </Text>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Ngày Chơi">
                <Text strong>{dayjs(selectedBooking.bookingDate).format('DD/MM/YYYY')}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Khung Giờ">
                <Tag color="geekblue">
                  {selectedBooking.startTime} - {selectedBooking.endTime}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Đơn Giá Sân">
                {(selectedBooking.price || 0).toLocaleString('vi-VN')} đ
              </Descriptions.Item>

              <Descriptions.Item label="Giảm Giá">
                {(selectedBooking.discount || 0).toLocaleString('vi-VN')} đ
              </Descriptions.Item>

              <Descriptions.Item label="Tổng Thanh Toán">
                <Text strong style={{ fontSize: 16, color: '#d4380d' }}>
                  {(selectedBooking.totalAmount || 0).toLocaleString('vi-VN')} đ
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Phương Thức">
                <Tag color="blue">{selectedBooking.paymentMethod || 'CASH'}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" style={{ margin: '20px 0 12px', fontSize: 14 }}>
              <EditOutlined style={{ marginRight: 6, color: '#009B60' }} />
              Chỉnh Sửa Trạng Thái & Ghi Chú
            </Divider>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <div style={{ marginBottom: 6 }}>
                  <Text strong>Trạng Thái Đơn:</Text>
                </div>
                <Select
                  style={{ width: '100%' }}
                  value={editStatus}
                  onChange={setEditStatus}
                >
                  <Option value="PENDING">Chờ duyệt (PENDING)</Option>
                  <Option value="CONFIRMED">Đã xác nhận (CONFIRMED)</Option>
                  <Option value="CANCELLED">Đã hủy / Từ chối (CANCELLED)</Option>
                </Select>
              </Col>

              <Col xs={24} sm={12}>
                <div style={{ marginBottom: 6 }}>
                  <Text strong>Trạng Thái Thanh Toán:</Text>
                </div>
                <Select
                  style={{ width: '100%' }}
                  value={editPaymentStatus}
                  onChange={setEditPaymentStatus}
                >
                  <Option value="PAID">Đã thanh toán (PAID)</Option>
                  <Option value="UNPAID">Chưa thanh toán (UNPAID)</Option>
                  <Option value="REFUNDED">Đã hoàn tiền (REFUNDED)</Option>
                </Select>
              </Col>

              <Col xs={24}>
                <div style={{ marginBottom: 6 }}>
                  <Text strong>Ghi Chú Đơn Đặt Sân:</Text>
                </div>
                <Input.TextArea
                  rows={3}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Nhập ghi chú cho đơn đặt sân..."
                />
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
}
