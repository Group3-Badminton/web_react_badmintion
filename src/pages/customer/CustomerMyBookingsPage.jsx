// CLEAN CODE: Khai báo hooks cần thiết cho trang Quản lý đơn của tôi
import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Tag,
  Space,
  Button,
  Typography,
  Modal,
  Descriptions,
  message,
  Tooltip,
  Select,
  Input,
  Row,
  Col,
  Empty,
  Statistic,
  Alert,
  Divider,
  Spin,
  DatePicker,
  TimePicker
} from 'antd';
// CLEAN CODE: Khai báo các icons cần thiết cho trang Quản lý đơn của tôi
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
  PlayCircleOutlined,
  EditOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { bookingService } from '../../services/bookingService';
import { useAuth } from '../../context/AuthContext';

dayjs.extend(customParseFormat);

const { Title, Text } = Typography;
const { Option } = Select;

const getBusinessDateParts = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
};

const getBusinessStartDate = (dateValue, time) => {
  const parts = getBusinessDateParts(dateValue);
  if (!parts || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time || '')) return null;
  return new Date(`${parts.year}-${parts.month}-${parts.day}T${time}:00+07:00`);
};

const formatBusinessDate = (dateValue) => {
  const parts = getBusinessDateParts(dateValue);
  return parts ? `${parts.day}/${parts.month}/${parts.year}` : 'Chưa có ngày';
};

const STATUS_CONFIG = {
  PENDING: {
    color: 'gold',
    label: 'Chờ duyệt',
    icon: <ClockCircleOutlined />
  },
  PENDING_APPROVAL: {
    color: 'gold',
    label: 'Chờ Admin/Staff duyệt',
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
  const { logout, isCustomer } = useAuth();
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
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [availableCourts, setAvailableCourts] = useState([]);
  const [isEditingBooking, setIsEditingBooking] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editOrders, setEditOrders] = useState([]);

  const isPending = (status) => status === 'PENDING' || status === 'PENDING_APPROVAL';

  const getCancelDisabledReason = (booking, item = null) => {
    if (!booking) return '';
    if (booking.status === 'CANCELLED') return 'Đơn đặt sân đã bị hủy.';
    if (booking.status === 'REJECTED') return 'Đơn đặt sân đã bị từ chối.';
    if (booking.status === 'COMPLETED') return 'Đơn đặt sân đã hoàn thành, không thể hủy.';
    if (booking.status === 'CHECKED_IN') return 'Sân đang được sử dụng, không thể hủy sân này.';

    if (item) {
      if (item.status === 'CANCELLED') return 'Lịch sân này đã được hủy trước đó.';
      const court = item.courtId;
      if (court?.operationalStatus === 'IN_USE') {
        return 'Sân đang được sử dụng, không thể hủy sân này.';
      }
      return '';
    }

    const items = booking.items?.length
      ? booking.items.filter((it) => it.status !== 'CANCELLED')
      : [booking];
    if (items.length === 0) return 'Tất cả các lịch trong đơn đã bị hủy.';

    const allInUse = items.every((it) => it.courtId?.operationalStatus === 'IN_USE');
    if (allInUse) {
      return 'Sân đang được sử dụng, không thể hủy sân này.';
    }

    return '';
  };

  const getDisabledHoursAndMinutesForOrder = (bookingDate) => {
    if (!bookingDate || !bookingDate.isSame(dayjs(), 'day')) return {};
    const currentHour = dayjs().hour();
    const currentMinute = dayjs().minute();
    return {
      disabledHours: () => Array.from({ length: currentHour }, (_, i) => i),
      disabledMinutes: (selectedHour) => {
        if (selectedHour === currentHour) {
          return Array.from({ length: currentMinute + 1 }, (_, i) => i);
        }
        return [];
      }
    };
  };

  const canCancelBooking = (booking) => {
    if (!booking) return false;
    if (['CANCELLED', 'COMPLETED', 'REJECTED'].includes(booking.status)) return false;
    if (booking.status === 'CHECKED_IN') return false;
    const items = booking.items?.length
      ? booking.items.filter((item) => item.status !== 'CANCELLED')
      : [booking];
    if (items.length === 0) return false;
    return items.some((item) => {
      const court = item.courtId;
      return court?.operationalStatus !== 'IN_USE';
    });
  };

  const canCancelBookingItem = (booking, item) => {
    if (!item?._id || item.status === 'CANCELLED') return false;
    if (['CANCELLED', 'COMPLETED', 'REJECTED'].includes(booking?.status)) return false;
    if (booking?.status === 'CHECKED_IN') return false;
    const court = item.courtId;
    return court?.operationalStatus !== 'IN_USE';
  };

  const getCancellationItems = (booking) => booking.items?.length
    ? booking.items.filter((item) => item.status !== 'CANCELLED')
    : [booking];

  const confirmCancelBooking = (booking, targetItem = null) => {
    const items = targetItem ? [targetItem] : getCancellationItems(booking);
    const isWholeOrder = !targetItem;
    Modal.confirm({
      title: isWholeOrder ? 'Xác nhận hủy đơn đặt sân' : 'Xác nhận hủy lịch sân',
      content: (
        <div>
          <div><strong>Mã đơn:</strong> {booking.bookingCode}</div>
          <div><strong>Phạm vi:</strong> {isWholeOrder
            ? `Hủy toàn bộ lịch chưa hủy (${items.length} lịch sân)`
            : 'Chỉ hủy lịch sân được chọn'}</div>
          {items.map((item, index) => {
            const courtName = item.courtId?.courtName || item.courtName || 'Sân';
            return (
              <div key={item._id || `${courtName}-${index}`} style={{ marginTop: 8 }}>
                {courtName} — {formatBusinessDate(item.bookingDate || booking.bookingDate)} — {item.startTime || booking.startTime}–{item.endTime || booking.endTime}
              </div>
            );
          })}
          <div style={{ marginTop: 12 }}>
            {isWholeOrder
              ? 'Bạn có chắc chắn muốn hủy toàn bộ lịch sân còn lại trong đơn này?'
              : 'Các lịch sân khác trong đơn sẽ được giữ nguyên.'}
          </div>
        </div>
      ),
      okText: 'Xác nhận hủy',
      cancelText: 'Quay lại',
      okButtonProps: { danger: true },
      onOk: () => handleCancelBooking(booking._id, targetItem?._id)
    });
  };

  // Mở modal và nạp chi tiết đơn từ database
  const handleOpenDetailModal = async (record) => {
    setIsEditingBooking(false);
    setSelectedBooking(record);
    setIsDetailModalOpen(true);
    if (record?._id) {
      try {
        setDetailLoading(true);
        const res = await bookingService.getBookingById(record._id);
        if (res.success && res.data) {
          setSelectedBooking(res.data);
        }
      } catch (err) {
        console.warn('Lỗi tải dữ liệu chi tiết booking:', err);
      } finally {
        setDetailLoading(false);
      }
    }
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, statusFilter, pagination.current, pagination.pageSize]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMyBookings(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Hủy đơn đặt sân (chỉ khả dụng khi PENDING)
  const handleCancelBooking = async (bookingId, itemId = null) => {
    try {
      setCancellingId(bookingId);
      const res = await bookingService.updateBookingStatus(bookingId, {
        status: 'CANCELLED',
        ...(itemId ? { itemId } : {})
      });
      if (res.success) {
        if (res.data?.cancellationResult?.accountLocked) {
          message.warning(res.message || res.data.cancellationResult.lockReason);
          setIsDetailModalOpen(false);
          await logout();
          navigate('/login', { replace: true });
          return;
        }
        message.success(res.message || 'Đã hủy đơn đặt sân thành công!');
        await fetchMyBookings();
        if (res.data.status === 'CANCELLED' && isDetailModalOpen) {
          setIsDetailModalOpen(false);
        } else if (isDetailModalOpen) {
          setSelectedBooking(res.data);
        }
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Không thể hủy đơn đặt sân!');
    } finally {
      setCancellingId(null);
    }
  };

  const handleStartEditBooking = async () => {
    if (!selectedBooking || !isPending(selectedBooking.status)) return;
    try {
      const res = await bookingService.getCourts();
      if (res.success) setAvailableCourts(res.data || []);
      const items = selectedBooking.items?.length
        ? selectedBooking.items
        : [{
            itemIndex: 0,
            courtId: selectedBooking.courtId?._id || selectedBooking.courtId,
            bookingDate: selectedBooking.bookingDate,
            startTime: selectedBooking.startTime,
            endTime: selectedBooking.endTime,
            price: selectedBooking.price
          }];
      setEditOrders(items.map((item, itemIndex) => ({
        itemId: item._id || null,
        itemIndex,
        status: item.status || 'ACTIVE',
        courtId: item.courtId?._id || item.courtId,
        bookingDate: dayjs(item.bookingDate || selectedBooking.bookingDate),
        startTime: dayjs(item.startTime, 'HH:mm'),
        endTime: dayjs(item.endTime, 'HH:mm'),
        price: item.price ?? selectedBooking.price ?? 0
      })));
      setIsEditingBooking(true);
    } catch (err) {
      message.error(err?.response?.data?.message || 'Không thể tải dữ liệu để sửa đơn.');
    }
  };

  const handleSaveBookingEdit = async () => {
    if (!selectedBooking || editOrders.length === 0 ||
      editOrders.some((order) => !order.courtId || !order.bookingDate?.isValid() ||
        !order.startTime?.isValid() || !order.endTime?.isValid() ||
        !order.startTime.isBefore(order.endTime))) {
      message.warning('Vui lòng chọn ngày, sân và khung giờ hợp lệ cho tất cả các mục.');
      return;
    }

    const now = dayjs();
    const hasPastOrder = editOrders.some((order) => {
      if (order.status === 'CANCELLED') return false;
      const orderDateTime = dayjs(`${order.bookingDate.format('YYYY-MM-DD')} ${order.startTime.format('HH:mm')}`);
      return !orderDateTime.isAfter(now);
    });
    if (hasPastOrder) {
      message.warning('Không thể chọn thời gian bắt đầu trong quá khứ hoặc hiện tại!');
      return;
    }

    try {
      setSavingEdit(true);
      const res = await bookingService.changeBookingInfo(selectedBooking._id, {
        courtOrders: editOrders.map((order) => ({
          ...(order.itemId ? { itemId: order.itemId } : {}),
          ...(Number.isInteger(order.itemIndex) ? { itemIndex: order.itemIndex } : {}),
          courtId: order.courtId,
          bookingDate: order.bookingDate.format('YYYY-MM-DD'),
          startTime: order.startTime.format('HH:mm'),
          endTime: order.endTime.format('HH:mm')
        }))
      });
      if (res.success) {
        message.success('Đã cập nhật đơn. Đơn tiếp tục ở trạng thái chờ duyệt.');
        setIsEditingBooking(false);
        setSelectedBooking(res.data || selectedBooking);
        await fetchMyBookings();
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Không thể cập nhật đơn đặt sân.');
    } finally {
      setSavingEdit(false);
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
          onClick={() => handleOpenDetailModal(record)}
        >
          #{code}
        </Button>
      )
    },
    {
      title: 'Sân Thi Đấu',
      key: 'court',
      render: (_, record) => {
        const items = record.items || [];
        if (items.length > 1) {
          return (
            <div>
              <Space wrap size={[4, 4]}>
                {items.map((it, idx) => {
                  const cName = it.courtName || it.courtId?.courtName || `Sân #${idx + 1}`;
                  const isItemCancelled = it.status === 'CANCELLED';
                  return (
                    <Tag key={it._id || idx} color={isItemCancelled ? 'red' : 'success'} style={{ fontWeight: 600, borderRadius: 6, margin: 0 }}>
                      🏸 {cName} {isItemCancelled ? '(Đã hủy)' : ''}
                    </Tag>
                  );
                })}
              </Space>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                Đơn gồm {items.length} sân thi đấu
              </div>
            </div>
          );
        }
        const singleCourt = record.courtId || (items[0]?.courtId) || items[0];
        return (
          <div>
            <Text strong>🏸 {singleCourt?.courtName || items[0]?.courtName || 'Sân cầu lông'}</Text>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {singleCourt?.courtType || items[0]?.courtType || singleCourt?.location || ''}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Ngày & Giờ Chơi',
      key: 'schedule',
      render: (_, record) => {
        const items = record.items || [];
        return (
          <div>
            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: items.length > 1 ? 4 : 2 }}>
              📅 {dayjs(record.bookingDate).format('DD/MM/YYYY')}
            </div>
            {items.length > 1 ? (
              <Space direction="vertical" size={2}>
                {items.map((it, idx) => {
                  const cName = it.courtName || it.courtId?.courtName || `Sân ${idx + 1}`;
                  const isItemCancelled = it.status === 'CANCELLED';
                  return (
                    <Tag key={it._id || idx} color={isItemCancelled ? 'red' : 'geekblue'} style={{ fontSize: 11, borderRadius: 4, margin: 0 }}>
                      <ClockCircleOutlined style={{ marginRight: 3 }} />
                      {cName}: {dayjs(it.bookingDate || record.bookingDate).format('DD/MM')} {it.startTime} - {it.endTime}
                      {isItemCancelled ? ' (Đã hủy)' : ''}
                    </Tag>
                  );
                })}
              </Space>
            ) : (
              <Tag color="geekblue" style={{ marginTop: 2 }}>
                <ClockCircleOutlined /> {record.startTime} - {record.endTime}
              </Tag>
            )}
          </div>
        );
      }
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
              onClick={() => handleOpenDetailModal(record)}
            >
              Xem
            </Button>
          </Tooltip>

          {canCancelBooking(record) ? (
            <Button
              size="small"
              danger
              loading={cancellingId === record._id}
              onClick={() => confirmCancelBooking(record)}
            >
              Hủy
            </Button>
          ) : (
            <Tooltip title={getCancelDisabledReason(record)}>
              <span>
                <Button size="small" disabled>
                  Hủy
                </Button>
              </span>
            </Tooltip>
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
              <Option value="PENDING_APPROVAL">Chờ duyệt (PENDING_APPROVAL)</Option>
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
          canCancelBooking(selectedBooking) ? (
            <Button
              key="cancel-modal"
              danger
              onClick={() => confirmCancelBooking(selectedBooking)}
              loading={cancellingId === selectedBooking._id}
            >
              Hủy Đơn Này
            </Button>
          ) : selectedBooking ? (
            <Tooltip key="cancel-modal-disabled" title={getCancelDisabledReason(selectedBooking)}>
              <span>
                <Button disabled danger>
                  Hủy Đơn Này
                </Button>
              </span>
            </Tooltip>
          ) : null,
          <Button key="close" type="primary" onClick={() => setIsDetailModalOpen(false)} style={{ backgroundColor: '#009B60', borderColor: '#009B60' }}>
            Đóng
          </Button>
        ].filter(Boolean)}
        width={720}
      >
        {selectedBooking && (
          <Spin spinning={detailLoading}>
            <div style={{ marginTop: 12 }}>
              {isPending(selectedBooking.status) && (
                <Alert
                  message="Đơn đặt sân đang chờ duyệt"
                  description="Nhân viên sân sẽ sớm kiểm tra và xác nhận giữ sân cho bạn. Bạn có thể hủy đơn nếu thay đổi kế hoạch."
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              {isPending(selectedBooking.status) && !isEditingBooking && (
                <Button
                  icon={<EditOutlined />}
                  onClick={handleStartEditBooking}
                  style={{ marginBottom: 16 }}
                >
                  Chỉnh sửa đơn
                </Button>
              )}

              {isEditingBooking && (
                <Card size="small" title="Chỉnh sửa yêu cầu đặt sân" style={{ marginBottom: 16 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {editOrders.map((order, index) => (
                      <Row gutter={[8, 8]} align="middle" key={order.itemId || `new-${index}`}>
                        <Col xs={24} md={6}>
                          <Select
                            style={{ width: '100%' }}
                            value={order.courtId}
                            disabled={order.status === 'CANCELLED'}
                            options={availableCourts.map((court) => ({
                              value: court._id,
                              label: court.courtName
                            }))}
                            onChange={(courtId) => setEditOrders((orders) =>
                              orders.map((item, itemIndex) => itemIndex === index ? { ...item, courtId } : item)
                            )}
                            placeholder="Chọn sân"
                          />
                        </Col>
                        <Col xs={24} md={5}>
                          <DatePicker
                            style={{ width: '100%' }}
                            value={order.bookingDate}
                            disabled={order.status === 'CANCELLED'}
                            format="DD/MM/YYYY"
                            disabledDate={(date) => date && date < dayjs().startOf('day')}
                            onChange={(bookingDate) => setEditOrders((orders) =>
                              orders.map((item, itemIndex) => itemIndex === index ? { ...item, bookingDate } : item)
                            )}
                          />
                        </Col>
                        <Col xs={12} md={4}>
                          <TimePicker
                            style={{ width: '100%' }}
                            format="HH:mm"
                            value={order.startTime}
                            disabled={order.status === 'CANCELLED'}
                            disabledTime={() => getDisabledHoursAndMinutesForOrder(order.bookingDate)}
                            minuteStep={15}
                            onChange={(startTime) => setEditOrders((orders) =>
                              orders.map((item, itemIndex) => itemIndex === index ? { ...item, startTime } : item)
                            )}
                          />
                        </Col>
                        <Col xs={12} md={4}>
                          <TimePicker
                            style={{ width: '100%' }}
                            format="HH:mm"
                            value={order.endTime}
                            disabled={order.status === 'CANCELLED'}
                            minuteStep={15}
                            onChange={(endTime) => setEditOrders((orders) =>
                              orders.map((item, itemIndex) => itemIndex === index ? { ...item, endTime } : item)
                            )}
                          />
                        </Col>
                        <Col xs={24} md={5}>
                          <Button
                            danger
                            disabled={editOrders.length === 1 || order.status === 'CANCELLED'}
                            onClick={() => setEditOrders((orders) => orders.filter((_, itemIndex) => itemIndex !== index))}
                          >
                            Xóa
                          </Button>
                        </Col>
                      </Row>
                    ))}
                    <Space>
                      <Button
                        icon={<PlusOutlined />}
                        onClick={() => setEditOrders((orders) => [
                          ...orders,
                          {
                            courtId: availableCourts[0]?._id || '',
                            bookingDate: dayjs(selectedBooking.bookingDate),
                            startTime: dayjs('08:00', 'HH:mm'),
                            endTime: dayjs('09:00', 'HH:mm')
                          }
                        ])}
                      >
                        Thêm sân/khung giờ
                      </Button>
                      <Button onClick={() => setIsEditingBooking(false)}>Hủy sửa</Button>
                      <Button type="primary" loading={savingEdit} onClick={handleSaveBookingEdit}>
                        Lưu thay đổi
                      </Button>
                    </Space>
                  </Space>
                </Card>
              )}

              {/* Thông tin đơn hàng chung */}
              <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Mã Đơn">
                  <Text strong style={{ color: '#009B60' }}>
                    #{selectedBooking.bookingCode}
                  </Text>
                </Descriptions.Item>

                <Descriptions.Item label="Ngày Tạo Đơn">
                  {dayjs(selectedBooking.createdAt).format('HH:mm DD/MM/YYYY')}
                </Descriptions.Item>

                <Descriptions.Item label="Khách Hàng">
                  <Text strong>{selectedBooking.customerId?.fullName || 'Khách hàng'}</Text>
                </Descriptions.Item>

                <Descriptions.Item label="Số Điện Thoại">
                  <Text>{selectedBooking.customerId?.phone || 'Chưa cập nhật'}</Text>
                </Descriptions.Item>

                <Descriptions.Item label="Ngày Chơi">
                  <Text strong style={{ color: '#009B60' }}>
                    📅 {dayjs(selectedBooking.bookingDate).format('DD/MM/YYYY')}
                  </Text>
                </Descriptions.Item>

                <Descriptions.Item label="Trạng Thái Đơn">
                  <Tag color={STATUS_CONFIG[selectedBooking.status]?.color || 'default'}>
                    {STATUS_CONFIG[selectedBooking.status]?.label || selectedBooking.status}
                  </Tag>
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

                {selectedBooking.voucherId && (
                  <Descriptions.Item label="Mã Khuyến Mãi" span={2}>
                    <Tag color="magenta">
                      🏷️ {selectedBooking.voucherId.voucherCode || selectedBooking.voucherId.code} - {selectedBooking.voucherId.voucherName || selectedBooking.voucherId.name}
                    </Tag>
                  </Descriptions.Item>
                )}

                {selectedBooking.note && (
                  <Descriptions.Item label="Ghi Chú" span={2}>
                    <Text>{selectedBooking.note}</Text>
                  </Descriptions.Item>
                )}
            </Descriptions>

            {/* Danh sách tất cả các sân và khung giờ thuộc đơn đặt này */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#092615', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🏸</span>
                <span>Danh Sách Sân & Khung Giờ Thi Đấu:</span>
                <Tag color="green" style={{ borderRadius: 8 }}>
                  {selectedBooking.items?.length || 1} sân
                </Tag>
              </div>

              {selectedBooking.items && selectedBooking.items.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedBooking.items.map((item, idx) => {
                    const cName = item.courtName || item.courtId?.courtName || `Sân #${idx + 1}`;
                    const cType = item.courtType || item.courtId?.courtType || 'Tiêu chuẩn';
                    const cLoc = item.location || item.courtId?.location || '';

                    return (
                      <Card
                        key={item._id || idx}
                        size="small"
                        style={{
                          borderRadius: 8,
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Text strong style={{ fontSize: 14, color: '#009B60' }}>
                                🏸 {cName}
                              </Text>
                              <Tag color="cyan" style={{ fontSize: 11, borderRadius: 4 }}>
                                {cType}
                              </Tag>
                              {item.status === 'CANCELLED' && <Tag color="red">Đã hủy</Tag>}
                              {cLoc && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  📍 {cLoc}
                                </Text>
                              )}
                            </div>
                            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Tag color="purple">
                                {dayjs(item.bookingDate || selectedBooking.bookingDate).format('DD/MM/YYYY')}
                              </Tag>
                              <Tag color="geekblue" style={{ fontSize: 12, borderRadius: 4 }}>
                                <ClockCircleOutlined /> {item.startTime} - {item.endTime}
                              </Tag>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                ({(item.durationHours || 1)} tiếng)
                              </Text>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Thành tiền sân:</div>
                            <Text strong style={{ fontSize: 15, color: '#0f172a' }}>
                              {(item.price || 0).toLocaleString('vi-VN')} đ
                            </Text>
                            {canCancelBookingItem(selectedBooking, item) ? (
                              <div style={{ marginTop: 8 }}>
                                <Button
                                  size="small"
                                  danger
                                  loading={cancellingId === selectedBooking._id}
                                  onClick={() => confirmCancelBooking(selectedBooking, item)}
                                >
                                  Hủy lịch này
                                </Button>
                              </div>
                            ) : item.status !== 'CANCELLED' ? (
                              <div style={{ marginTop: 8 }}>
                                <Tooltip title={getCancelDisabledReason(selectedBooking, item)}>
                                  <span>
                                    <Button size="small" disabled>
                                      Hủy lịch này
                                    </Button>
                                  </span>
                                </Tooltip>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Chi tiết các khoảng giờ phân bổ (nếu có) */}
                        {item.intervals && item.intervals.length > 0 && (
                          <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px dashed #cbd5e1' }}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                              Chi tiết các khoảng giá:
                            </Text>
                            <Space wrap size={[6, 4]}>
                              {item.intervals.map((inv, iIdx) => (
                                <Tag key={iIdx} color={inv.priceType?.includes('cao điểm') ? 'volcano' : 'blue'} style={{ fontSize: 11, borderRadius: 4 }}>
                                  {inv.startTime}-{inv.endTime} ({inv.priceType}): {(inv.amount || 0).toLocaleString('vi-VN')}đ
                                </Tag>
                              ))}
                            </Space>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              ) : (
                /* Fallback cho dữ liệu cũ */
                <Card size="small" style={{ borderRadius: 8, backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text strong style={{ color: '#009B60' }}>
                        🏸 {selectedBooking.courtId?.courtName || 'Sân cầu lông'}
                      </Text>
                      <Tag color="cyan" style={{ marginLeft: 6 }}>
                        {selectedBooking.courtId?.courtType}
                      </Tag>
                      <div style={{ marginTop: 4 }}>
                        <Tag color="geekblue">
                          <ClockCircleOutlined /> {selectedBooking.startTime} - {selectedBooking.endTime}
                        </Tag>
                      </div>
                    </div>
                    <Text strong style={{ fontSize: 15 }}>
                      {(selectedBooking.price || 0).toLocaleString('vi-VN')} đ
                    </Text>
                  </div>
                </Card>
              )}
            </div>

            {/* Bảng tổng kết thanh toán */}
            <Card size="small" style={{ borderRadius: 8, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <Row justify="space-between" style={{ marginBottom: 4 }}>
                <Col><Text type="secondary">Tổng tiền sân:</Text></Col>
                <Col><Text strong>{(selectedBooking.price || 0).toLocaleString('vi-VN')} đ</Text></Col>
              </Row>
              {selectedBooking.discount > 0 && (
                <Row justify="space-between" style={{ marginBottom: 4 }}>
                  <Col><Text style={{ color: '#16a34a' }}>Giảm giá (Voucher):</Text></Col>
                  <Col><Text style={{ color: '#16a34a', fontWeight: 600 }}>-{(selectedBooking.discount || 0).toLocaleString('vi-VN')} đ</Text></Col>
                </Row>
              )}
              <Divider style={{ margin: '6px 0' }} />
              <Row justify="space-between" align="middle">
                <Col><Text strong style={{ fontSize: 14 }}>Tổng thanh toán:</Text></Col>
                <Col>
                  <Text strong style={{ fontSize: 18, color: '#d4380d' }}>
                    {(selectedBooking.totalAmount || 0).toLocaleString('vi-VN')} đ
                  </Text>
                </Col>
              </Row>
            </Card>
          </div>
        </Spin>
        )}
      </Modal>
    </div>
  );
}
