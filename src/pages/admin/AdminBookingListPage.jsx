// CLEAN CODE: Khai báo các components cần thiết từ antd cho trang Quản lý đặt sân Admin
import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Tag,
  Button,
  Input,
  Select,
  DatePicker,
  TimePicker,
  Space,
  Modal,
  Checkbox,
  Descriptions,
  message,
  Popconfirm,
  Tooltip,
  Typography,
  Avatar,
  Badge,
  Alert,
  Radio
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
  ExclamationCircleOutlined,
  StopOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  SyncOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

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
  PENDING_APPROVAL: {
    color: 'gold',
    label: 'Chờ duyệt đơn',
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
    label: 'Từ chối đặt sân',
    icon: <CloseCircleOutlined />
  }
};

// CLEAN CODE: Kiểm tra một lịch sân / đơn đặt có quá giờ hay không (nếu quá giờ thì hiện màu đỏ thay vì xanh dương)
const isBookingOrSlotOverdue = (bookingDate, startTime, endTime, status) => {
  if (!bookingDate || !startTime) return false;
  // Đơn đã hoàn thành hoặc đã bị từ chối/hủy thì không tính là quá giờ
  if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(status)) return false;
  const dateStr = dayjs(bookingDate).format('YYYY-MM-DD');

  // Nếu đang nhận sân / đang chơi: Quá giờ khi vượt quá endTime
  if (status === 'CHECKED_IN') {
    if (!endTime) return false;
    const endMoment = dayjs(`${dateStr} ${endTime}`, 'YYYY-MM-DD HH:mm');
    return endMoment.isValid() && endMoment.isBefore(dayjs());
  }

  // Các trạng thái còn lại (CONFIRMED, PENDING, PENDING_APPROVAL): Quá giờ khi đã qua startTime
  const startMoment = dayjs(`${dateStr} ${startTime}`, 'YYYY-MM-DD HH:mm');
  return startMoment.isValid() && startMoment.isBefore(dayjs());
};

const getBookingEditOrders = (booking) => {
  const items = booking.items?.length
    ? booking.items
    : [{
      courtId: booking.courtId,
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      price: booking.price
    }];

  return items.map((item, itemIndex) => ({
    itemId: item._id || null,
    itemIndex,
    status: item.status || 'ACTIVE',
    courtId: item.courtId?._id || item.courtId || '',
    bookingDate: dayjs(item.bookingDate || booking.bookingDate),
    startTime: dayjs(item.startTime, 'HH:mm'),
    endTime: dayjs(item.endTime, 'HH:mm'),
    price: item.price ?? booking.price ?? 0,
    courtName: item.courtName || item.courtId?.courtName || ''
  }));
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
  const [selectedCancellationItemIds, setSelectedCancellationItemIds] = useState([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editNote, setEditNote] = useState('');

  // AF1: Thay đổi thông tin đặt sân (Change Booking Information)
  const [editOrders, setEditOrders] = useState([]);
  const [editPaymentMethod, setEditPaymentMethod] = useState('CASH');
  const [isChangingInfo, setIsChangingInfo] = useState(false);
  const [isEditInfoMode, setIsEditInfoMode] = useState(false);

  // AF2: Từ chối yêu cầu đặt sân (Reject Booking)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Tạo đơn đặt sân mới dành cho Staff / Admin
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customerMode, setCustomerMode] = useState('WALK_IN');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [createCourtOrders, setCreateCourtOrders] = useState([]);
  const [createPrice, setCreatePrice] = useState(0);
  const [createVoucherCode, setCreateVoucherCode] = useState('');
  const [createDiscount, setCreateDiscount] = useState(0);
  const [createTotalAmount, setCreateTotalAmount] = useState(0);
  const [createPaymentMethod, setCreatePaymentMethod] = useState('CASH');
  const [createNote, setCreateNote] = useState('');
  const [createStatus, setCreateStatus] = useState('CONFIRMED');
  const [appliedCreateVoucher, setAppliedCreateVoucher] = useState(null);
  const [validatingCreateVoucher, setValidatingCreateVoucher] = useState(false);
  const [loadingCreatePrices, setLoadingCreatePrices] = useState(false);

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

  // Tải danh sách khách hàng phục vụ staff đặt sân
  const fetchCustomers = async () => {
    try {
      const res = await bookingService.getCustomers();
      if (res.success && res.data) {
        setCustomers(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách khách hàng:', err);
    }
  };

  // Tính toán bảng giá chi tiết từ Backend cho tất cả các sân trong đơn
  const calculatePricesForOrders = async (ordersList, voucherCode) => {
    const validOrders = ordersList.filter(o =>
      o.courtId && o.bookingDate && o.startTime && o.endTime && o.endTime.isAfter(o.startTime)
    );
    if (validOrders.length === 0) {
      setCreatePrice(0);
      setCreateDiscount(0);
      setCreateTotalAmount(0);
      return;
    }
    const backendOrders = validOrders.map(o => ({
      courtId: o.courtId,
      bookingDate: o.bookingDate.format('YYYY-MM-DD'),
      startTime: o.startTime.format('HH:mm'),
      endTime: o.endTime.format('HH:mm')
    }));

    try {
      setLoadingCreatePrices(true);
      const res = await bookingService.calculateBookingPrice({
        courtOrders: backendOrders,
        voucherCode: voucherCode || undefined
      });
      if (res.success && res.data) {
        const { courtBreakdowns, totalBasePrice, discount, finalTotalAmount, appliedVoucher } = res.data;
        setCreateCourtOrders(prev => prev.map((ord, idx) => {
          const breakdown = courtBreakdowns[idx] || courtBreakdowns.find(cb => cb.courtId === ord.courtId);
          return {
            ...ord,
            price: breakdown?.totalAmount ?? 0,
            intervals: breakdown?.intervals || []
          };
        }));
        setCreatePrice(totalBasePrice || 0);
        setCreateDiscount(discount || 0);
        setCreateTotalAmount(finalTotalAmount || 0);
        if (appliedVoucher) {
          setAppliedCreateVoucher(appliedVoucher);
        } else if (voucherCode) {
          setAppliedCreateVoucher(null);
        }
      }
    } catch (err) {
      console.error('Lỗi tính giá từ backend:', err);
    } finally {
      setLoadingCreatePrices(false);
    }
  };

  // Tải khung giờ trống cho từng mục sân trong đơn tạo
  const fetchSlotAvailabilityForOrder = async (index, courtId, date) => {
    if (!courtId || !date) return;
    try {
      const dateStr = date.format('YYYY-MM-DD');
      const res = await bookingService.getCourtAvailability(courtId, dateStr);
      if (res.success && res.data && res.data.slots) {
        setCreateCourtOrders(prev => prev.map((ord, i) => {
          if (i === index) {
            return { ...ord, availableSlots: res.data.slots };
          }
          return ord;
        }));
      }
    } catch (err) {
      console.error('Lỗi tải khung giờ trống:', err);
    }
  };

  // Mở modal đặt sân mới
  const handleOpenCreateModal = () => {
    fetchCustomers();
    const defaultCourt = courts.length > 0 ? courts[0]._id : '';
    setCustomerMode('WALK_IN');
    setSelectedCustomerId('');
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerEmail('');
    const today = dayjs();
    const initOrders = [
      {
        id: `court-${Date.now()}`,
        courtId: defaultCourt,
        bookingDate: today,
        startTime: dayjs('08:00', 'HH:mm'),
        endTime: dayjs('09:00', 'HH:mm'),
        availableSlots: [],
        price: 0
      }
    ];
    setCreateCourtOrders(initOrders);
    setCreateVoucherCode('');
    setAppliedCreateVoucher(null);
    setCreatePrice(0);
    setCreateDiscount(0);
    setCreateTotalAmount(0);
    setCreatePaymentMethod('CASH');
    setCreateNote('Khách đặt tại quầy');
    setCreateStatus('CONFIRMED');
    setIsCreateModalOpen(true);
    if (defaultCourt) {
      fetchSlotAvailabilityForOrder(0, defaultCourt, today);
      calculatePricesForOrders(initOrders, null);
    }
  };

  // Thêm một sân mới vào đơn
  const handleAddCourtOrder = () => {
    const usedCourtIds = createCourtOrders.map(o => o.courtId);
    const nextCourt = courts.find(c => !usedCourtIds.includes(c._id)) || courts[0];
    const lastOrder = createCourtOrders[createCourtOrders.length - 1];
    const newOrder = {
      id: `court-${Date.now()}-${Math.random()}`,
      courtId: nextCourt ? nextCourt._id : (courts[0]?._id || ''),
      bookingDate: lastOrder ? lastOrder.bookingDate : dayjs(),
      startTime: lastOrder ? lastOrder.startTime : dayjs('08:00', 'HH:mm'),
      endTime: lastOrder ? lastOrder.endTime : dayjs('09:00', 'HH:mm'),
      availableSlots: [],
      price: 0
    };
    const updated = [...createCourtOrders, newOrder];
    setCreateCourtOrders(updated);
    if (newOrder.courtId) {
      fetchSlotAvailabilityForOrder(updated.length - 1, newOrder.courtId, newOrder.bookingDate);
    }
    calculatePricesForOrders(updated, appliedCreateVoucher?.voucherCode);
  };

  // Xóa một sân khỏi đơn
  const handleRemoveCourtOrder = (index) => {
    if (createCourtOrders.length <= 1) {
      message.warning('Đơn đặt sân phải có ít nhất một sân thi đấu!');
      return;
    }
    const updated = createCourtOrders.filter((_, i) => i !== index);
    setCreateCourtOrders(updated);
    calculatePricesForOrders(updated, appliedCreateVoucher?.voucherCode);
  };

  // Thay đổi sân thi đấu cho mục thứ index
  const handleOrderCourtChange = (index, newCourtId) => {
    const updated = [...createCourtOrders];
    updated[index] = { ...updated[index], courtId: newCourtId };
    setCreateCourtOrders(updated);
    if (newCourtId && updated[index].bookingDate) {
      fetchSlotAvailabilityForOrder(index, newCourtId, updated[index].bookingDate);
    }
    calculatePricesForOrders(updated, appliedCreateVoucher?.voucherCode);
  };

  // Thay đổi ngày chơi cho mục thứ index
  const handleOrderDateChange = (index, newDate) => {
    if (!newDate) return;
    const updated = [...createCourtOrders];
    updated[index] = { ...updated[index], bookingDate: newDate };
    setCreateCourtOrders(updated);
    if (updated[index].courtId) {
      fetchSlotAvailabilityForOrder(index, updated[index].courtId, newDate);
    }
    calculatePricesForOrders(updated, appliedCreateVoucher?.voucherCode);
  };

  // Thay đổi giờ bắt đầu cho mục thứ index
  const handleOrderStartTimeChange = (index, newStartTime) => {
    if (!newStartTime) return;
    const updated = [...createCourtOrders];
    let end = updated[index].endTime;
    if (!end || !end.isAfter(newStartTime)) {
      end = newStartTime.add(1, 'hour');
    }
    updated[index] = { ...updated[index], startTime: newStartTime, endTime: end };
    setCreateCourtOrders(updated);
    calculatePricesForOrders(updated, appliedCreateVoucher?.voucherCode);
  };

  // Thay đổi giờ kết thúc cho mục thứ index
  const handleOrderEndTimeChange = (index, newEndTime) => {
    if (!newEndTime) return;
    const updated = [...createCourtOrders];
    updated[index] = { ...updated[index], endTime: newEndTime };
    setCreateCourtOrders(updated);
    calculatePricesForOrders(updated, appliedCreateVoucher?.voucherCode);
  };

  // Đồng bộ ngày và giờ của sân đầu tiên cho tất cả các sân còn lại
  const handleSyncTimeToAllOrders = () => {
    if (createCourtOrders.length <= 1) {
      message.info('Đơn hiện chỉ có 1 sân, hãy thêm sân trước khi đồng bộ!');
      return;
    }
    const base = createCourtOrders[0];
    const updated = createCourtOrders.map((ord, idx) => {
      if (idx === 0) return ord;
      return {
        ...ord,
        bookingDate: base.bookingDate,
        startTime: base.startTime,
        endTime: base.endTime
      };
    });
    setCreateCourtOrders(updated);
    updated.forEach((ord, idx) => {
      if (ord.courtId && ord.bookingDate) {
        fetchSlotAvailabilityForOrder(idx, ord.courtId, ord.bookingDate);
      }
    });
    calculatePricesForOrders(updated, appliedCreateVoucher?.voucherCode);
    message.success('Đã đồng bộ ngày và khung giờ cho tất cả các sân!');
  };

  // Áp dụng voucher ở form tạo đơn
  const handleApplyCreateVoucher = async () => {
    const code = createVoucherCode.trim().toUpperCase();
    if (!code) {
      message.warning('Vui lòng nhập mã giảm giá!');
      return;
    }
    try {
      setValidatingCreateVoucher(true);
      const courtIds = createCourtOrders.map(o => o.courtId).filter(Boolean);
      const res = await bookingService.validateVoucher(code, createPrice, { courtIds });
      if (res.success && res.data) {
        setAppliedCreateVoucher(res.data);
        await calculatePricesForOrders(createCourtOrders, res.data.voucherCode);
        message.success(`Đã áp dụng mã ${res.data.voucherCode}!`);
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Mã giảm giá không hợp lệ!');
      setAppliedCreateVoucher(null);
      await calculatePricesForOrders(createCourtOrders, undefined);
    } finally {
      setValidatingCreateVoucher(false);
    }
  };

  // Xóa voucher đã áp dụng
  const handleRemoveCreateVoucher = async () => {
    setAppliedCreateVoucher(null);
    setCreateVoucherCode('');
    await calculatePricesForOrders(createCourtOrders, undefined);
    message.info('Đã hủy áp dụng mã giảm giá.');
  };

  // Xử lý gửi đơn đặt sân từ Staff/Admin
  const handleSubmitCreateBooking = async () => {
    if (customerMode === 'EXISTING' && !selectedCustomerId) {
      message.warning('Vui lòng chọn khách hàng trong danh sách!');
      return;
    }
    if (customerMode === 'WALK_IN') {
      if (!newCustomerName.trim()) {
        message.warning('Vui lòng nhập họ tên khách hàng!');
        return;
      }
      if (!newCustomerPhone.trim()) {
        message.warning('Vui lòng nhập số điện thoại khách hàng!');
        return;
      }
    }

    if (!createCourtOrders || createCourtOrders.length === 0) {
      message.warning('Đơn đặt sân phải có ít nhất một sân thi đấu!');
      return;
    }

    // Kiểm tra tính hợp lệ từng sân
    for (let i = 0; i < createCourtOrders.length; i++) {
      const ord = createCourtOrders[i];
      const courtName = courts.find(c => c._id === ord.courtId)?.courtName || `Sân #${i + 1}`;
      if (!ord.courtId) {
        message.warning(`Mục #${i + 1}: Vui lòng chọn sân thi đấu!`);
        return;
      }
      if (!ord.bookingDate) {
        message.warning(`Mục #${i + 1} (${courtName}): Vui lòng chọn ngày đặt sân!`);
        return;
      }
      if (!ord.startTime || !ord.endTime) {
        message.warning(`Mục #${i + 1} (${courtName}): Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc!`);
        return;
      }
      if (!ord.startTime.isBefore(ord.endTime)) {
        message.warning(`Mục #${i + 1} (${courtName}): Thời gian kết thúc phải sau thời gian bắt đầu!`);
        return;
      }
    }

    // Kiểm tra xung đột nội bộ giữa các sân trong cùng 1 đơn (cùng sân, cùng ngày, chồng lấn giờ)
    for (let i = 0; i < createCourtOrders.length; i++) {
      for (let j = i + 1; j < createCourtOrders.length; j++) {
        const o1 = createCourtOrders[i];
        const o2 = createCourtOrders[j];
        if (
          o1.courtId === o2.courtId &&
          o1.bookingDate.format('YYYY-MM-DD') === o2.bookingDate.format('YYYY-MM-DD')
        ) {
          const s1 = o1.startTime.format('HH:mm');
          const e1 = o1.endTime.format('HH:mm');
          const s2 = o2.startTime.format('HH:mm');
          const e2 = o2.endTime.format('HH:mm');
          // Overlap condition: start1 < end2 && end1 > start2
          if (s1 < e2 && e1 > s2) {
            const courtName = courts.find(c => c._id === o1.courtId)?.courtName || 'Sân đã chọn';
            message.error(
              `Xung đột giờ: ${courtName} được chọn 2 lần chồng lấn giờ (${s1}-${e1} và ${s2}-${e2}) trong cùng một đơn!`
            );
            return;
          }
        }
      }
    }

    const courtOrdersPayload = createCourtOrders.map(ord => ({
      courtId: ord.courtId,
      bookingDate: ord.bookingDate.format('YYYY-MM-DD'),
      startTime: ord.startTime.format('HH:mm'),
      endTime: ord.endTime.format('HH:mm'),
      price: ord.price || 0
    }));

    const firstOrder = createCourtOrders[0];

    try {
      setCreatingBooking(true);
      const payload = {
        customerId: customerMode === 'EXISTING' ? selectedCustomerId : undefined,
        customerName: customerMode === 'WALK_IN' ? newCustomerName.trim() : undefined,
        customerPhone: customerMode === 'WALK_IN' ? newCustomerPhone.trim() : undefined,
        customerEmail: customerMode === 'WALK_IN' && newCustomerEmail.trim() ? newCustomerEmail.trim() : undefined,
        courtOrders: courtOrdersPayload,
        courtIds: createCourtOrders.map(o => o.courtId),
        // Fallback backward-compatible fields
        courtId: firstOrder.courtId,
        bookingDate: firstOrder.bookingDate.format('YYYY-MM-DD'),
        startTime: firstOrder.startTime.format('HH:mm'),
        endTime: firstOrder.endTime.format('HH:mm'),
        price: createPrice,
        voucherCode: appliedCreateVoucher ? appliedCreateVoucher.voucherCode : undefined,
        discount: createDiscount,
        totalAmount: createTotalAmount,
        paymentMethod: createPaymentMethod || 'CASH',
        paymentStatus: 'UNPAID',
        status: createStatus || 'CONFIRMED',
        note: createNote.trim()
      };

      const res = await bookingService.createBooking(payload);
      if (res.success) {
        message.success(
          `Đặt thành công ${createCourtOrders.length} sân! Mã đơn: #${res.data?.bookingCode}`
        );
        setIsCreateModalOpen(false);
        fetchBookings(1, pagination.pageSize);
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Đặt sân không thành công, vui lòng thử lại!');
    } finally {
      setCreatingBooking(false);
    }
  };

  // CLEAN CODE: Tải danh sách đơn đặt sân từ MongoDB
  const fetchBookings = useCallback(
    async (page = pagination.current, pageSize = pagination.pageSize) => {
      try {
        setLoading(true);
        const params = {
          page,
          limit: pageSize,
          search: search.trim(),
          status: statusFilter,
          paymentStatus: paymentStatusFilter !== 'ALL' ? paymentStatusFilter : undefined,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, statusFilter, paymentStatusFilter, courtFilter, selectedDate, pagination.current, pagination.pageSize]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCourts();
  }, []);

  useEffect(() => {
    fetchBookings(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setSelectedCancellationItemIds([]);
    setEditNote(record.note || '');
    setEditOrders(getBookingEditOrders(record));
    setEditPaymentMethod(record.paymentMethod || 'CASH');
    setRejectReason('');
    setIsEditInfoMode(false); // Khóa các ô input như xem chi tiết bình thường
    setIsDetailModalOpen(true);
  };

  // Hủy sửa thông tin đặt sân (khóa lại)
  const handleCancelEditInfo = () => {
    if (selectedBooking) {
      setEditOrders(getBookingEditOrders(selectedBooking));
      setEditPaymentMethod(selectedBooking.paymentMethod || 'CASH');
      setEditNote(selectedBooking.note || '');
    }
    setIsEditInfoMode(false);
  };

  // Thao tác duyệt / xác nhận hoặc từ chối đơn
  const handleUpdateStatus = async (bookingId, newStatus, newPaymentStatus) => {
    try {
      setLoading(true);
      const payload = {};
      if (newStatus) payload.status = newStatus;
      if (newPaymentStatus) payload.paymentStatus = newPaymentStatus;

      const res = await bookingService.updateBookingStatus(bookingId, payload);
      if (res.success) {
        let actionText = 'cập nhật trạng thái';
        if (newStatus === 'CONFIRMED') actionText = 'xác nhận duyệt đơn';
        else if (newStatus === 'CHECKED_IN') actionText = 'check-in nhận sân';
        else if (newStatus === 'COMPLETED') actionText = 'hoàn thành ca chơi';
        else if (newStatus === 'CANCELLED') actionText = 'hủy đơn';
        else if (newPaymentStatus === 'PAID') actionText = 'xác nhận thanh toán';
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

  const handleCancelSelectedBookingItems = () => {
    if (!selectedBooking || selectedCancellationItemIds.length === 0) {
      message.warning('Vui lòng chọn ít nhất một chi tiết sân cần hủy.');
      return;
    }
    const selectedItems = selectedBooking.items.filter((item) =>
      selectedCancellationItemIds.includes(item._id)
    );
    if (selectedItems.length !== selectedCancellationItemIds.length) {
      message.error('Không tìm thấy đầy đủ chi tiết đã chọn. Vui lòng tải lại booking.');
      return;
    }

    Modal.confirm({
      title: `Xác nhận hủy ${selectedItems.length} chi tiết sân?`,
      content: (
        <div>
          <p>Các chi tiết sau sẽ được hủy; những chi tiết khác được giữ nguyên:</p>
          <ul>
            {selectedItems.map((item) => (
              <li key={item._id}>
                {item.courtName || item.courtId?.courtName || 'Sân'} —{' '}
                {dayjs(item.bookingDate || selectedBooking.bookingDate).format('DD/MM/YYYY')}{' '}
                {item.startTime}-{item.endTime} — {(item.price || 0).toLocaleString('vi-VN')} đ
              </li>
            ))}
          </ul>
          <p>Thời gian hủy và trạng thái sẽ được kiểm tra lại trên máy chủ.</p>
        </div>
      ),
      okText: 'Hủy chi tiết đã chọn',
      cancelText: 'Quay lại',
      okButtonProps: { danger: true, loading: isUpdating },
      onOk: async () => {
        try {
          setIsUpdating(true);
          const res = await bookingService.updateBookingStatus(selectedBooking._id, {
            status: 'CANCELLED',
            itemIds: selectedCancellationItemIds
          });
          if (res.success) {
            setSelectedBooking(res.data);
            setSelectedCancellationItemIds([]);
            fetchBookings();
            message.success('Đã hủy các chi tiết sân đã chọn và cập nhật tổng tiền.');
          }
        } catch (err) {
          message.error(err?.response?.data?.message || 'Không thể hủy các chi tiết sân đã chọn.');
          throw err;
        } finally {
          setIsUpdating(false);
        }
      }
    });
  };

  // AF1: Xử lý thay đổi thông tin đặt sân (Change Booking Information)
  const handleChangeBookingInfo = async () => {
    if (!selectedBooking) return;
    if (editOrders.length === 0 || editOrders.some((order) =>
      !order.courtId ||
      !order.bookingDate?.isValid() ||
      !order.startTime?.isValid() ||
      !order.endTime?.isValid() ||
      !order.startTime.isBefore(order.endTime)
    )) {
      message.warning('Vui lòng chọn sân, ngày và khung giờ hợp lệ cho từng chi tiết.');
      return;
    }

    const originalOrders = getBookingEditOrders(selectedBooking);
    const changedOrders = editOrders.filter((order, index) => {
      const original = originalOrders[index];
      return !original ||
        order.courtId !== original.courtId ||
        order.bookingDate.format('YYYY-MM-DD') !== original.bookingDate.format('YYYY-MM-DD') ||
        order.startTime.format('HH:mm') !== original.startTime.format('HH:mm') ||
        order.endTime.format('HH:mm') !== original.endTime.format('HH:mm');
    });
    const courtOrderChanges = changedOrders.map((order) => ({
      ...(order.itemId ? { itemId: order.itemId } : { itemIndex: order.itemIndex }),
      courtId: order.courtId,
      bookingDate: order.bookingDate.format('YYYY-MM-DD'),
      startTime: order.startTime.format('HH:mm'),
      endTime: order.endTime.format('HH:mm')
    }));
    const payload = {
      ...(courtOrderChanges.length > 0 ? { courtOrders: courtOrderChanges } : {}),
      paymentMethod: editPaymentMethod || 'CASH',
      note: editNote
    };

    const saveChanges = async (confirmedTotalAmount) => {
      try {
        setIsChangingInfo(true);
        const res = await bookingService.changeBookingInfo(selectedBooking._id, {
          ...payload,
          ...(confirmedTotalAmount !== undefined ? { confirmedTotalAmount } : {})
        });
        if (res.success) {
          if (res.message?.includes('không thể gửi thông báo')) {
            message.warning(res.message);
          } else {
            message.success('Cập nhật thông tin đặt sân thành công. Trạng thái đơn được giữ nguyên.');
          }
          setSelectedBooking(res.data || selectedBooking);
          setEditOrders(getBookingEditOrders(res.data || selectedBooking));
          setIsEditInfoMode(false);
          await fetchBookings();
        }
      } catch (err) {
        message.error(
          err?.response?.data?.message ||
          'Không thể cập nhật đơn đặt sân. Dữ liệu cũ vẫn được giữ nguyên.'
        );
      } finally {
        setIsChangingInfo(false);
      }
    };

    try {
      setIsChangingInfo(true);
      const preview = await bookingService.calculateBookingPrice({
        courtOrders: editOrders.map((order) => ({
          courtId: order.courtId,
          bookingDate: order.bookingDate.format('YYYY-MM-DD'),
          startTime: order.startTime.format('HH:mm'),
          endTime: order.endTime.format('HH:mm')
        })),
        bookingDate: selectedBooking.bookingDate,
        voucherCode: selectedBooking.voucherId?.voucherCode || selectedBooking.voucherId?.code,
        existingVoucherId: selectedBooking.voucherId?._id
      });
      if (!preview.success || !preview.data ||
        preview.data.courtBreakdowns?.length !== editOrders.length) {
        throw new Error('Không thể tính giá cho đầy đủ các chi tiết đã thay đổi.');
      }
      const currentEditedPrice = changedOrders.reduce((sum, order) => sum + (order.price || 0), 0);
      const newEditedPrice = changedOrders.reduce(
        (sum, order) => sum + (preview.data.courtBreakdowns[order.itemIndex]?.totalAmount || 0),
        0
      );
      const newBasePrice = Math.max(
        0,
        (selectedBooking.price || 0) - currentEditedPrice + newEditedPrice
      );
      const voucher = preview.data.appliedVoucher ? selectedBooking.voucherId : null;
      let newDiscount = 0;
      if (voucher?.discountType === 'PERCENTAGE') {
        newDiscount = Math.round((newBasePrice * voucher.discountValue) / 100);
        const maxDisc = voucher.maxDiscount || voucher.maxDiscountAmount || 0;
        if (maxDisc > 0) newDiscount = Math.min(newDiscount, maxDisc);
      } else if (voucher) {
        newDiscount = Math.min(voucher.discountValue || 0, newBasePrice);
      } else if (!selectedBooking.voucherId) {
        newDiscount = Math.min(selectedBooking.discount || 0, newBasePrice);
      }
      const newTotal = Math.max(0, newBasePrice - newDiscount);
      const changedPriceDetails = changedOrders
        .map((order) => ({
          breakdown: preview.data.courtBreakdowns[order.itemIndex],
          oldPrice: order.price || 0
        }))
        .map(({ breakdown, oldPrice }) => ({
          courtName: breakdown?.courtName || 'Sân đã chọn',
          oldPrice,
          newPrice: breakdown.totalAmount
        }))
        .filter((detail) => detail.newPrice !== detail.oldPrice);
      if (changedPriceDetails.length > 0 || newTotal !== selectedBooking.totalAmount) {
        const difference = newTotal - selectedBooking.totalAmount;
        setIsChangingInfo(false);
        Modal.confirm({
          title: 'Xác nhận thay đổi giá đơn đặt sân',
          content: (
            <div>
              <div>Tổng tiền hiện tại: {(selectedBooking.totalAmount || 0).toLocaleString('vi-VN')} đ</div>
              <div>Tổng tiền sau khi đổi lịch/sân: {newTotal.toLocaleString('vi-VN')} đ</div>
              {changedPriceDetails.map((detail, index) => (
                <div key={`${detail.courtName}-${index}`}>
                  {detail.courtName}: {detail.oldPrice.toLocaleString('vi-VN')} đ → {detail.newPrice.toLocaleString('vi-VN')} đ
                </div>
              ))}
              <div>
                Chênh lệch: {difference > 0 ? '+' : ''}
                {difference.toLocaleString('vi-VN')} đ
              </div>
            </div>
          ),
          okText: 'Xác nhận cập nhật',
          cancelText: 'Quay lại',
          onOk: () => saveChanges(newTotal)
        });
        return;
      }

      await saveChanges();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Không thể kiểm tra giá mới cho lịch đặt sân.');
    } finally {
      setIsChangingInfo(false);
    }
  };

  // AF2: Xử lý từ chối yêu cầu đặt sân (Reject Booking)
  const handleRejectBooking = async () => {
    if (!selectedBooking) return;
    try {
      setIsRejecting(true);
      const res = await bookingService.rejectBooking(selectedBooking._id, {
        reason: rejectReason
      });

      if (res.success) {
        if (res.message && res.message.includes('không thể gửi thông báo')) {
          message.warning(res.message); // E4
        } else {
          message.success('Từ chối yêu cầu đặt sân thành công!');
        }
        setIsRejectModalOpen(false);
        setIsDetailModalOpen(false);
        fetchBookings();
      }
    } catch (err) {
      const errMsg =
        err?.response?.data?.message ||
        'Không thể xử lý yêu cầu đặt sân do lỗi hệ thống. Trạng thái đặt sân chưa được thay đổi. Vui lòng thử lại sau.';
      message.error(errMsg);
    } finally {
      setIsRejecting(false);
    }
  };

  // CLEAN CODE: Sao chép mã đơn vào bộ nhớ tạm
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
      render: (code, record) => (
        <Space size={4}>
          <Text strong style={{ color: '#059669' }}>
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
          {record.conflictWarnings?.length > 0 && (
            <Tooltip title={record.conflictWarnings.map((warning) =>
              `${warning.courtName || 'Sân'} ${warning.startTime}-${warning.endTime} trùng đơn #${warning.conflictingBookingCode}`
            ).join('; ')}>
              <Tag color="error" style={{ margin: 0 }}>
                <ExclamationCircleOutlined /> Trùng lịch
              </Tag>
            </Tooltip>
          )}
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
                style={{ backgroundColor: '#059669' }}
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
            {customer?.email && !customer.email.includes('@badminton.local') && (
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
      width: 220,
      render: (_, record) => {
        const items = record.items || [];
        if (items.length > 1) {
          return (
            <div>
              <Space wrap size={[4, 4]}>
                {items.map((it, idx) => {
                  const cName = it.courtName || it.courtId?.courtName || `Sân #${idx + 1}`;
                  return (
                    <Tag key={idx} color="green" style={{ fontWeight: 600, borderRadius: 4, margin: 0 }}>
                      🏸 {cName}
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
        const court = record.courtId || (items[0]?.courtId) || items[0];
        return (
          <Space direction="vertical" size={2}>
            <Text strong style={{ fontSize: 14 }}>
              🏸 {court?.courtName || items[0]?.courtName || 'Chưa chọn sân'}
            </Text>
            {(court?.courtType || items[0]?.courtType) && (
              <Tag color="cyan" style={{ fontSize: 11, borderRadius: 4, width: 'fit-content' }}>
                {court?.courtType || items[0]?.courtType}
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
      width: 340,
      render: (_, record) => {
        const items = record.items || [];
        const isRecordOverdue = isBookingOrSlotOverdue(record.bookingDate, record.startTime, record.endTime, record.status);

        return (
          <Space direction="vertical" size={3} style={{ width: '100%' }}>
            <Space size={6} wrap>
              <CalendarOutlined style={{ color: isRecordOverdue ? '#ef4444' : '#059669' }} />
              <Text strong style={{ color: isRecordOverdue ? '#dc2626' : undefined }}>
                {dayjs(record.bookingDate).format('DD/MM/YYYY')}
              </Text>
              {isRecordOverdue && (
                <Tag color="error" style={{ fontSize: 10, padding: '0 4px', lineHeight: '18px', borderRadius: 4, margin: 0, fontWeight: 600 }}>
                  Quá giờ
                </Tag>
              )}
            </Space>
            {items.length > 1 ? (
              <Space direction="vertical" size={3} style={{ width: '100%' }}>
                {items.map((it, idx) => {
                  const cName = it.courtName || it.courtId?.courtName || `Sân ${idx + 1}`;
                  const itDate = it.bookingDate || record.bookingDate;
                  const isItemCancelled = it.status === 'CANCELLED';
                  const isItemOverdue = !isItemCancelled && isBookingOrSlotOverdue(itDate, it.startTime, it.endTime, record.status);

                  return (
                    <Tag
                      key={it._id || idx}
                      color={isItemCancelled ? 'red' : isItemOverdue ? 'error' : 'geekblue'}
                      style={{
                        borderRadius: 4,
                        margin: 0,
                        fontSize: 12,
                        padding: '2px 8px',
                        whiteSpace: 'nowrap',
                        border: isItemOverdue ? '1px solid #fca5a5' : undefined
                      }}
                    >
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      {cName}: {dayjs(itDate).format('DD/MM')} {it.startTime} - {it.endTime}
                      {isItemCancelled ? ' (Đã hủy)' : isItemOverdue ? ' (Quá giờ)' : ''}
                    </Tag>
                  );
                })}
              </Space>
            ) : (
              <Tag
                color={isRecordOverdue ? 'error' : 'geekblue'}
                style={{
                  borderRadius: 4,
                  margin: 0,
                  fontSize: 12,
                  padding: '2px 8px',
                  whiteSpace: 'nowrap',
                  border: isRecordOverdue ? '1px solid #fca5a5' : undefined
                }}
              >
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {record.startTime} - {record.endTime}
                {isRecordOverdue ? ' (Quá giờ)' : ''}
              </Tag>
            )}
          </Space>
        );
      }
    },

    {
      title: 'Trạng Thái Đơn',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: (status) => {
        const conf = STATUS_CONFIG[status] || { color: 'default', label: status, icon: null };
        return (
          <Tag
            color={conf.color}
            icon={conf.icon}
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 500,
              whiteSpace: 'nowrap'
            }}
          >
            {conf.label}
          </Tag>
        );
      }
    },
    {
      title: 'Tổng Tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 140,
      render: (amount, record) => (
        <div>
          <Text strong style={{ color: '#059669', fontSize: 14 }}>
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
      title: 'Thanh Toán',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 150,
      render: (paymentStatus) => {
        const isPaid = paymentStatus === 'PAID';
        return (
          <Tag
            color={isPaid ? 'green' : 'red'}
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 500,
              whiteSpace: 'nowrap'
            }}
          >
            {isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
          </Tag>
        );
      }
    },
    {
      title: 'Xử Lý Đơn',
      key: 'actions',
      width: 200,
      align: 'center',
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
            {['PENDING', 'PENDING_APPROVAL'].includes(record.status) && (
              <Popconfirm
                title={record.conflictWarnings?.length ? (
                  <div>
                    <Text strong type="danger">Có lịch sân bị trùng:</Text>
                    {record.conflictWarnings.map((warning, index) => (
                      <div key={`${warning.itemId || warning.startTime}-${index}`}>
                        {warning.courtName || 'Sân'} {warning.startTime}-{warning.endTime} trùng đơn #{warning.conflictingBookingCode}
                      </div>
                    ))}
                    <div>Backend sẽ kiểm tra lại trước khi xác nhận.</div>
                  </div>
                ) : 'Xác nhận nhận và duyệt đơn đặt sân này?'}
                onConfirm={() => handleUpdateStatus(record._id, 'CONFIRMED')}
                okText="Duyệt đơn"
                cancelText="Hủy"
              >
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                >
                  Xác nhận
                </Button>
              </Popconfirm>
            )}

            {/* CONFIRMED -> CHECKED_IN */}
            {record.status === 'CONFIRMED' && (
              <Popconfirm
                title="Xác nhận khách đã đến nhận sân thi đấu?"
                onConfirm={() => handleUpdateStatus(record._id, 'CHECKED_IN')}
                okText="Nhận sân"
                cancelText="Hủy"
              >
                <Button
                  size="small"
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                >
                  Nhận sân
                </Button>
              </Popconfirm>
            )}

            {/* CHECKED_IN -> COMPLETED */}
            {record.status === 'CHECKED_IN' && (
              <Popconfirm
                title="Xác nhận khách đã chơi xong và trả sân?"
                onConfirm={() => handleUpdateStatus(record._id, 'COMPLETED')}
                okText="Hoàn thành"
                cancelText="Hủy"
              >
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                >
                  Hoàn thành
                </Button>
              </Popconfirm>
            )}

            {/* Thu tiền nếu UNPAID */}
            {record.paymentStatus === 'UNPAID' && ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(record.status) && (
              <Popconfirm
                title="Xác nhận khách đã thanh toán đơn này?"
                onConfirm={() => handleUpdateStatus(record._id, undefined, 'PAID')}
                okText="Đã thanh toán"
                cancelText="Hủy"
              >
                <Button
                  size="small"
                  icon={<DollarOutlined />}
                  style={{ borderColor: '#faad14', color: '#d48806' }}
                >
                  Thu tiền
                </Button>
              </Popconfirm>
            )}

            {/* Từ chối hoặc hủy đơn */}
            {['PENDING', 'PENDING_APPROVAL', 'CONFIRMED'].includes(record.status) && (
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
      {/* Page Header - Tinh giản, tone Trắng + Xanh Emerald hiện đại */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          background: '#ffffff',
          padding: '16px 20px',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
        }}
      >
        <div>
          <Title level={4} style={{ color: '#0f172a', margin: '0 0 2px', fontWeight: 700 }}>
            Nhận & Duyệt Đơn Đặt Sân 🏸
          </Title>
          <Text style={{ color: '#64748b', fontSize: 13 }}>
            Tiếp nhận các đơn đặt lịch từ khách hàng, kiểm tra thông tin và xác nhận giữ sân
          </Text>
        </div>
        <Space size={10}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{
              backgroundColor: '#059669',
              borderColor: '#059669',
              color: '#ffffff',
              fontWeight: 600,
              borderRadius: 8,
              height: 38,
              boxShadow: '0 1px 2px rgba(5, 150, 105, 0.2)'
            }}
            onClick={handleOpenCreateModal}
          >
            Đặt Sân Mới
          </Button>
          <Button
            icon={<ReloadOutlined spin={loading} />}
            style={{
              background: '#ffffff',
              borderColor: '#cbd5e1',
              color: '#334155',
              fontWeight: 500,
              borderRadius: 8,
              height: 38
            }}
            onClick={() => fetchBookings(pagination.current, pagination.pageSize)}
            loading={loading}
          >
            Làm mới dữ liệu
          </Button>
        </Space>
      </div>

      {/* KPI Stats Cards - Phong cách Flat Minimalist: Nền Trắng, viền Slate mỏng, Icon bo góc nhẹ */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Tổng Đơn Đặt Sân</Text>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                  {stats.totalAll}
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CalendarOutlined style={{ color: '#059669', fontSize: 20 }} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Space size={6}>
                  <Text style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Đang Chờ Duyệt</Text>
                  {stats.pendingCount > 0 && (
                    <Badge count="Cần xử lý" style={{ backgroundColor: '#f59e0b', fontSize: 11 }} />
                  )}
                </Space>
                <div style={{ fontSize: 26, fontWeight: 700, color: stats.pendingCount > 0 ? '#d97706' : '#0f172a', marginTop: 4 }}>
                  {stats.pendingCount}
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ClockCircleOutlined style={{ color: '#d97706', fontSize: 20 }} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Đã Xác Nhận Đặt</Text>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#059669', marginTop: 4 }}>
                  {stats.confirmedCount}
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CheckCircleOutlined style={{ color: '#059669', fontSize: 20 }} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Đã Hủy / Từ Chối</Text>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#64748b', marginTop: 4 }}>
                  {stats.cancelledCount}
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CloseCircleOutlined style={{ color: '#94a3b8', fontSize: 20 }} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Bộ lọc & Tìm kiếm */}
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          marginBottom: 16,
          background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
        styles={{ body: { padding: '16px 20px' } }}
      >
        <Row gutter={[12, 12]} align="middle">
          {/* Ô tìm kiếm */}
          <Col xs={24} sm={12} md={5}>
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
              <Option value="PENDING_APPROVAL">Chờ duyệt (PENDING_APPROVAL)</Option>
              <Option value="CONFIRMED">Đã xác nhận (CONFIRMED)</Option>
              <Option value="CHECKED_IN">Đang chơi / Nhận sân (CHECKED_IN)</Option>
              <Option value="COMPLETED">Hoàn thành (COMPLETED)</Option>
              <Option value="CANCELLED">Đã hủy (CANCELLED)</Option>
              <Option value="REJECTED">Từ chối (REJECTED)</Option>
            </Select>
          </Col>

          {/* Lọc theo trạng thái thanh toán */}
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%' }}
              value={paymentStatusFilter}
              onChange={setPaymentStatusFilter}
              placeholder="Thanh toán"
            >
              <Option value="ALL">Tất cả thanh toán</Option>
              <Option value="UNPAID">Chưa thanh toán</Option>
              <Option value="PAID">Đã thanh toán</Option>
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
          <Col xs={24} sm={12} md={3} style={{ textAlign: 'right' }}>
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
          background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
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
          scroll={{ x: 1560 }}
          locale={{ emptyText: 'Chưa có đơn đặt sân nào phù hợp với bộ lọc' }}
        />
      </Card>

      {/* Modal Xem chi tiết & Xử lý đơn đặt sân (Hỗ trợ AF1 & AF2) */}
      <Modal
        title={
          <Space>
            <CalendarOutlined style={{ color: '#059669' }} />
            <span>Chi Tiết Đơn Đặt Sân #{selectedBooking?.bookingCode}</span>
            {selectedBooking?.status && (
              <Tag color={STATUS_CONFIG[selectedBooking.status]?.color || 'default'}>
                {STATUS_CONFIG[selectedBooking.status]?.label || selectedBooking.status}
              </Tag>
            )}
          </Space>
        }
        open={isDetailModalOpen}
        onCancel={() => {
          setIsEditInfoMode(false);
          setIsDetailModalOpen(false);
        }}
        width={780}
        footer={
          isEditInfoMode
            ? [
              <Button key="cancel-edit" onClick={handleCancelEditInfo}>
                Hủy
              </Button>,
              <Button
                key="save-info"
                type="primary"
                loading={isChangingInfo}
                icon={<CheckCircleOutlined />}
                style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                onClick={handleChangeBookingInfo}
              >
                xác nhận
              </Button>
            ]
            : [
              <Button
                key="back"
                onClick={() => {
                  setIsEditInfoMode(false);
                  setIsDetailModalOpen(false);
                  setSelectedCancellationItemIds([]);
                }}
              >
                Đóng
              </Button>,

              ['PENDING', 'PENDING_APPROVAL', 'CONFIRMED'].includes(selectedBooking?.status) &&
              selectedCancellationItemIds.length > 0 && (
                <Button
                  key="cancel-items"
                  danger
                  icon={<StopOutlined />}
                  loading={isUpdating}
                  onClick={handleCancelSelectedBookingItems}
                >
                  Hủy {selectedCancellationItemIds.length} chi tiết đã chọn
                </Button>
              ),

              // AF2: Từ chối yêu cầu đặt sân - Chỉ hiện khi đơn PENDING
              ['PENDING', 'PENDING_APPROVAL'].includes(selectedBooking?.status) && (
                <Button
                  key="reject"
                  danger
                  icon={<StopOutlined />}
                  onClick={() => setIsRejectModalOpen(true)}
                >
                  Từ chối
                </Button>
              ),

              // AF1: Nút Thay Đổi Thông Tin Đặt Sân - Chỉ hiện khi đơn PENDING
              ['PENDING', 'PENDING_APPROVAL'].includes(selectedBooking?.status) && (
                <Button
                  key="unlock-edit"
                  icon={<EditOutlined />}
                  style={{ borderColor: '#fa8c16', color: '#d46b08', fontWeight: 600 }}
                  onClick={() => setIsEditInfoMode(true)}
                >
                  thay đổi thông tin
                </Button>
              ),

              // Duyệt đơn đặt sân (Chỉ hiện khi PENDING)
              ['PENDING', 'PENDING_APPROVAL'].includes(selectedBooking?.status) && (
                <Popconfirm
                  key="confirm"
                  title="Xác nhận nhận và duyệt đơn này?"
                  onConfirm={() => handleUpdateStatus(selectedBooking._id, 'CONFIRMED')}
                  okText="Xác nhận"
                  cancelText="Hủy"
                >
                  <Button
                    type="primary"
                    style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                    icon={<CheckOutlined />}
                  >
                    xác nhận
                  </Button>
                </Popconfirm>
              ),

              // Nhận sân (Khi CONFIRMED)
              selectedBooking?.status === 'CONFIRMED' && (
                <Popconfirm
                  key="check-in"
                  title="Xác nhận khách đã đến nhận sân thi đấu?"
                  onConfirm={() => handleUpdateStatus(selectedBooking._id, 'CHECKED_IN')}
                  okText="Nhận sân"
                  cancelText="Hủy"
                >
                  <Button
                    type="primary"
                    style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                    icon={<PlayCircleOutlined />}
                  >
                    Nhận sân (Check-in)
                  </Button>
                </Popconfirm>
              ),

              // Hoàn thành ca chơi (Khi CHECKED_IN)
              selectedBooking?.status === 'CHECKED_IN' && (
                <Popconfirm
                  key="complete"
                  title="Xác nhận khách đã chơi xong và trả sân?"
                  onConfirm={() => handleUpdateStatus(selectedBooking._id, 'COMPLETED')}
                  okText="Hoàn thành"
                  cancelText="Hủy"
                >
                  <Button
                    type="primary"
                    style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                    icon={<CheckCircleOutlined />}
                  >
                    Hoàn thành ca chơi
                  </Button>
                </Popconfirm>
              ),

              // Thu tiền nếu UNPAID
              selectedBooking?.paymentStatus === 'UNPAID' && ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(selectedBooking?.status) && (
                <Popconfirm
                  key="pay"
                  title="Xác nhận khách đã thanh toán đơn này?"
                  onConfirm={() => handleUpdateStatus(selectedBooking._id, undefined, 'PAID')}
                  okText="Đã thanh toán"
                  cancelText="Hủy"
                >
                  <Button
                    icon={<DollarOutlined />}
                    style={{ borderColor: '#faad14', color: '#d48806', fontWeight: 600 }}
                  >
                    Xác nhận thu tiền
                  </Button>
                </Popconfirm>
              )
            ].filter(Boolean)
        }
      >
        {selectedBooking && (
          <div style={{ marginTop: 8 }}>
            {/* Bảng thông tin chi tiết đơn đặt sân */}
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Mã Đơn">
                <Text strong style={{ color: '#059669' }}>
                  #{selectedBooking.bookingCode}
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
                {selectedBooking.customerId?.email && !selectedBooking.customerId.email.includes('@badminton.local')
                  ? selectedBooking.customerId.email
                  : ''}
              </Descriptions.Item>

              <Descriptions.Item label="Trạng Thái Đơn">
                <Tag
                  color={STATUS_CONFIG[selectedBooking.status]?.color || 'default'}
                  icon={STATUS_CONFIG[selectedBooking.status]?.icon}
                  style={{ padding: '2px 8px', borderRadius: 4, fontSize: 13 }}
                >
                  {STATUS_CONFIG[selectedBooking.status]?.label || selectedBooking.status}
                </Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Trạng Thái Thanh Toán">
                <Tag
                  color={selectedBooking.paymentStatus === 'PAID' ? 'green' : 'red'}
                  style={{ padding: '2px 8px', borderRadius: 4, fontSize: 13 }}
                >
                  {selectedBooking.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                </Tag>
              </Descriptions.Item>

              {selectedBooking.conflictWarnings?.length > 0 && (
                <Descriptions.Item label="Cảnh báo nội bộ" span={2}>
                  <Alert
                    type="warning"
                    showIcon
                    message="Có booking khác trùng sân hoặc khung giờ"
                    description={selectedBooking.conflictWarnings.map((warning) =>
                      `${warning.courtName || 'Sân'} — ${dayjs(warning.bookingDate).format('DD/MM/YYYY')} ${warning.startTime}-${warning.endTime} trùng đơn #${warning.conflictingBookingCode}`
                    ).join('; ')}
                  />
                </Descriptions.Item>
              )}

              <Descriptions.Item label="Chi tiết sân và lịch đặt" span={2}>
                {isEditInfoMode ? (
                  <Space direction="vertical" style={{ width: '100%' }} size={10}>
                    {editOrders.map((order, index) => {
                      const original = getBookingEditOrders(selectedBooking)[index];
                      return (
                        <Card key={order.itemId || `item-${index}`} size="small" style={{ width: '100%' }}>
                          <Space direction="vertical" style={{ width: '100%' }} size={8}>
                            <Space wrap>
                              <Text strong>
                                Hiện tại: {original?.courtName || selectedBooking.items?.[index]?.courtId?.courtName || 'Sân đặt'}
                              </Text>
                              <Tag
                                color={order.status === 'CANCELLED' ? 'red' : STATUS_CONFIG[selectedBooking.status]?.color || 'default'}
                              >
                                {order.status === 'CANCELLED'
                                  ? 'Lịch sân đã hủy'
                                  : STATUS_CONFIG[selectedBooking.status]?.label || selectedBooking.status}
                              </Tag>
                              <Text type="secondary">
                                Giá hiện tại: {(order.price || 0).toLocaleString('vi-VN')} đ
                              </Text>
                            </Space>
                            <Row gutter={[8, 8]}>
                              <Col xs={24} md={8}>
                                <Select
                                  style={{ width: '100%' }}
                                  value={order.courtId}
                                  disabled={order.status === 'CANCELLED'}
                                  options={courts.map((court) => ({
                                    value: court._id,
                                    label: `${court.courtName} (${court.courtType})`
                                  }))}
                                  onChange={(courtId) => setEditOrders((orders) =>
                                    orders.map((item, itemIndex) => itemIndex === index ? { ...item, courtId } : item)
                                  )}
                                  placeholder="Chọn sân thay thế"
                                />
                              </Col>
                              <Col xs={24} md={6}>
                                <DatePicker
                                  style={{ width: '100%' }}
                                  value={order.bookingDate}
                                  disabled={order.status === 'CANCELLED'}
                                  onChange={(bookingDate) => setEditOrders((orders) =>
                                    orders.map((item, itemIndex) => itemIndex === index ? { ...item, bookingDate } : item)
                                  )}
                                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                                  format="DD/MM/YYYY"
                                />
                              </Col>
                              <Col xs={12} md={5}>
                                <TimePicker
                                  style={{ width: '100%' }}
                                  value={order.startTime}
                                  disabled={order.status === 'CANCELLED'}
                                  format="HH:mm"
                                  minuteStep={15}
                                  onChange={(startTime) => setEditOrders((orders) =>
                                    orders.map((item, itemIndex) => itemIndex === index ? { ...item, startTime } : item)
                                  )}
                                  placeholder="Bắt đầu"
                                />
                              </Col>
                              <Col xs={12} md={5}>
                                <TimePicker
                                  style={{ width: '100%' }}
                                  value={order.endTime}
                                  disabled={order.status === 'CANCELLED'}
                                  format="HH:mm"
                                  minuteStep={15}
                                  onChange={(endTime) => setEditOrders((orders) =>
                                    orders.map((item, itemIndex) => itemIndex === index ? { ...item, endTime } : item)
                                  )}
                                  placeholder="Kết thúc"
                                />
                              </Col>
                            </Row>
                          </Space>
                        </Card>
                      );
                    })}
                    <Alert
                      type="info"
                      showIcon
                      message="Mỗi dòng là một chi tiết riêng"
                      description="Chỉ các dòng đã thay đổi mới được gửi để cập nhật. Giá mới sẽ được tính từ bảng giá hiện hành và yêu cầu xác nhận nếu tổng tiền thay đổi."
                    />
                  </Space>
                ) : selectedBooking.items?.length ? (
                  <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    {selectedBooking.items.map((item, index) => (
                      <Card key={item._id || `item-${index}`} size="small">
                        <Space wrap>
                          <Text strong>
                            🏸 {item.courtName || item.courtId?.courtName || `Sân #${index + 1}`}
                          </Text>
                          <Tag color="geekblue">
                            {dayjs(item.bookingDate || selectedBooking.bookingDate).format('DD/MM/YYYY')}
                          </Tag>
                          {(() => {
                            const isItemCancelled = item.status === 'CANCELLED';
                            const itDate = item.bookingDate || selectedBooking.bookingDate;
                            const isItemOverdue = !isItemCancelled && isBookingOrSlotOverdue(itDate, item.startTime, item.endTime, selectedBooking.status);

                            return (
                              <Tag
                                color={isItemCancelled ? 'default' : isItemOverdue ? 'error' : 'blue'}
                                style={{
                                  border: isItemOverdue ? '1px solid #fca5a5' : undefined
                                }}
                              >
                                {item.startTime} - {item.endTime}
                                {isItemOverdue ? ' (Quá giờ)' : ''}
                              </Tag>
                            );
                          })()}
                          <Tag color={item.status === 'CANCELLED' ? 'red' : 'green'}>
                            {item.status === 'CANCELLED' ? 'Đã hủy' : 'Đang hoạt động'}
                          </Tag>
                          <Text strong>{(item.price || 0).toLocaleString('vi-VN')} đ</Text>
                          {item.status !== 'CANCELLED' &&
                            item._id &&
                            ['PENDING', 'PENDING_APPROVAL', 'CONFIRMED', 'CHECKED_IN'].includes(selectedBooking.status) && (
                              <Checkbox
                                checked={selectedCancellationItemIds.includes(item._id)}
                                disabled={isUpdating}
                                onChange={(event) => {
                                  setSelectedCancellationItemIds((currentIds) =>
                                    event.target.checked
                                      ? [...currentIds, item._id]
                                      : currentIds.filter((itemId) => itemId !== item._id)
                                  );
                                }}
                              >
                                Chọn hủy
                              </Checkbox>
                            )}
                        </Space>
                      </Card>
                    ))}
                  </Space>
                ) : (
                  <Text strong>
                    🏸 {selectedBooking.courtId?.courtName || 'Chưa chọn sân'}
                  </Text>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Ngày Chơi">
                <Text strong>📅 {dayjs(selectedBooking.bookingDate).format('DD/MM/YYYY')}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Thời Gian Chơi">
                {selectedBooking.items?.length > 1 ? (
                  <Space direction="vertical" size={2}>
                    {selectedBooking.items.map((it, idx) => {
                      const itDate = it.bookingDate || selectedBooking.bookingDate;
                      const isItemCancelled = it.status === 'CANCELLED';
                      const isItemOverdue = !isItemCancelled && isBookingOrSlotOverdue(itDate, it.startTime, it.endTime, selectedBooking.status);

                      return (
                        <Tag
                          key={it._id || idx}
                          color={isItemCancelled ? 'red' : isItemOverdue ? 'error' : 'geekblue'}
                          style={{
                            fontSize: 12,
                            margin: 0,
                            border: isItemOverdue ? '1px solid #fca5a5' : undefined
                          }}
                        >
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          {it.courtName || it.courtId?.courtName || `Sân ${idx + 1}`}: {it.startTime} - {it.endTime}
                          {isItemCancelled ? ' (Đã hủy)' : isItemOverdue ? ' (Quá giờ)' : ''}
                        </Tag>
                      );
                    })}
                  </Space>
                ) : (
                  (() => {
                    const isSelectedOverdue = isBookingOrSlotOverdue(selectedBooking.bookingDate, selectedBooking.startTime, selectedBooking.endTime, selectedBooking.status);
                    return (
                      <Tag
                        color={isSelectedOverdue ? 'error' : 'geekblue'}
                        style={{
                          fontSize: 13,
                          padding: '2px 8px',
                          border: isSelectedOverdue ? '1px solid #fca5a5' : undefined
                        }}
                      >
                        ⏰ {selectedBooking.startTime} - {selectedBooking.endTime}
                        {isSelectedOverdue ? ' (Quá giờ)' : ''}
                      </Tag>
                    );
                  })()
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Đơn Giá Sân">
                {(selectedBooking.price || 0).toLocaleString('vi-VN')} đ
              </Descriptions.Item>

              {/* Giảm Giá */}
              <Descriptions.Item label="Giảm Giá">
                <Text style={{ color: selectedBooking.discount > 0 ? '#52c41a' : undefined, fontWeight: 500 }}>
                  {(selectedBooking.discount || 0).toLocaleString('vi-VN')} đ
                </Text>
              </Descriptions.Item>

              {/* Tổng Thanh Toán: Tự động tính lại khi thay đổi giá */}
              <Descriptions.Item label="Tổng Thanh Toán">
                <Text strong style={{ fontSize: 16, color: '#d4380d' }}>
                  {(selectedBooking.totalAmount || 0).toLocaleString('vi-VN')} đ
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Phương Thức">
                {isEditInfoMode ? (
                  <Select
                    style={{ width: '100%' }}
                    value={editPaymentMethod || 'CASH'}
                    onChange={setEditPaymentMethod}
                    placeholder="Phương thức thanh toán"
                  >
                    <Option value="CASH">Tiền mặt</Option>
                    <Option value="TRANSFER">Chuyển khoản</Option>
                  </Select>
                ) : (
                  <Tag color="blue">
                    {selectedBooking.paymentMethod === 'TRANSFER'
                      ? 'Chuyển khoản'
                      : 'Tiền mặt'}
                  </Tag>
                )}
              </Descriptions.Item>

              {selectedBooking.voucherId && (
                <Descriptions.Item label="Mã Khuyến Mãi" span={2}>
                  <Tag color="magenta">
                    🏷️ {selectedBooking.voucherId.voucherCode || selectedBooking.voucherId.code} - {selectedBooking.voucherId.voucherName || selectedBooking.voucherId.name}
                  </Tag>
                </Descriptions.Item>
              )}

              {/* Ghi Chú Đơn: Mở khóa khi isEditInfoMode = true */}
              <Descriptions.Item label="Ghi Chú Đơn" span={2}>
                {isEditInfoMode ? (
                  <Input.TextArea
                    rows={2}
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Nhập ghi chú cho đơn đặt sân hoặc lý do thay đổi..."
                  />
                ) : (
                  <Text>{selectedBooking.note || 'Không có ghi chú'}</Text>
                )}
              </Descriptions.Item>
            </Descriptions>

            {/* Chi tiết danh sách tất cả các sân và khung giờ trong đơn */}
            {!isEditInfoMode && selectedBooking.items && selectedBooking.items.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#092615', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🏸</span>
                  <span>Danh Sách Sân & Khung Giờ Thi Đấu:</span>
                  <Tag color="green" style={{ borderRadius: 8 }}>
                    {selectedBooking.items.length} sân
                  </Tag>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedBooking.items.map((item, idx) => {
                    const cName = item.courtName || item.courtId?.courtName || `Sân #${idx + 1}`;
                    const cType = item.courtType || item.courtId?.courtType || 'Tiêu chuẩn';
                    const cLoc = item.location || item.courtId?.location || '';

                    return (
                      <Card
                        key={idx}
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
                              <Text strong style={{ fontSize: 14, color: '#059669' }}>
                                🏸 {cName}
                              </Text>
                              <Tag color="cyan" style={{ fontSize: 11, borderRadius: 4 }}>
                                {cType}
                              </Tag>
                              {cLoc && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  📍 {cLoc}
                                </Text>
                              )}
                            </div>
                            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                              {(() => {
                                const isItemCancelled = item.status === 'CANCELLED';
                                const itDate = item.bookingDate || selectedBooking.bookingDate;
                                const isItemOverdue = !isItemCancelled && isBookingOrSlotOverdue(itDate, item.startTime, item.endTime, selectedBooking.status);

                                return (
                                  <Tag
                                    color={isItemCancelled ? 'default' : isItemOverdue ? 'error' : 'geekblue'}
                                    style={{
                                      fontSize: 12,
                                      borderRadius: 4,
                                      border: isItemOverdue ? '1px solid #fca5a5' : undefined
                                    }}
                                  >
                                    <ClockCircleOutlined /> {item.startTime} - {item.endTime}
                                    {isItemOverdue ? ' (Quá giờ)' : ''}
                                  </Tag>
                                );
                              })()}
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
                          </div>
                        </div>

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
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal AF2: Từ Chối Yêu Cầu Đặt Sân (Reject Booking) */}
      <Modal
        title={
          <Space>
            <StopOutlined style={{ color: '#ff4d4f' }} />
            <span>Từ Chối Đặt Sân</span>
          </Space>
        }
        open={isRejectModalOpen}
        onCancel={() => setIsRejectModalOpen(false)}
        onOk={handleRejectBooking}
        okText="Từ chối"
        okButtonProps={{ danger: true, loading: isRejecting }}
        cancelText="Quay lại"
        width={500}
      >
        <div style={{ marginTop: 12 }}>
          <Alert
            message="Xác nhận từ chối đơn đặt sân"
            description={
              <span>
                Đơn đặt sân mang mã{' '}
                <Text strong>#{selectedBooking?.bookingCode}</Text> sẽ được chuyển sang trạng thái{' '}
                <Tag color="magenta">REJECTED</Tag> và hệ thống sẽ gửi thông báo đến khách hàng.
              </span>
            }
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Text strong style={{ display: 'block', marginBottom: 6 }}>
            Lý do từ chối đặt sân:
          </Text>
          <Input.TextArea
            rows={3}
            placeholder="Ví dụ: Sân đang bảo trì đột xuất, khách hàng yêu cầu hủy, quá giờ xác nhận..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </div>
      </Modal>

      {/* Modal Đặt Sân Mới dành cho Staff / Admin */}
      <Modal
        title={
          <Space>
            <CalendarOutlined style={{ color: '#059669' }} />
            <span style={{ fontSize: 16 }}>Đặt Sân Cầu Lông Mới (Dành Cho Nhân Viên)</span>
          </Space>
        }
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        width={720}
        footer={[
          <Button key="cancel-create" onClick={() => setIsCreateModalOpen(false)}>
            Hủy
          </Button>,
          <Button
            key="submit-create"
            type="primary"
            loading={creatingBooking}
            icon={<CheckCircleOutlined />}
            style={{ backgroundColor: '#059669', borderColor: '#059669' }}
            onClick={handleSubmitCreateBooking}
          >
            Xác nhận đặt sân
          </Button>
        ]}
      >
        <div style={{ marginTop: 12 }}>
          {/* 1. Thông tin khách hàng */}
          <Card
            size="small"
            title={
              <Space>
                <UserOutlined style={{ color: '#059669' }} />
                <span>1. Thông Tin Khách Hàng</span>
              </Space>
            }
            style={{ borderRadius: 10, marginBottom: 16 }}
          >
            <div style={{ marginBottom: 12 }}>
              <Radio.Group
                value={customerMode}
                onChange={(e) => setCustomerMode(e.target.value)}
              >
                <Radio value="WALK_IN">Khách vãng lai / Đặt tại quầy</Radio>
                <Radio value="EXISTING">Chọn từ danh sách khách hàng</Radio>
              </Radio.Group>
            </div>

            {customerMode === 'EXISTING' ? (
              <div>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>
                  Chọn khách hàng <span style={{ color: 'red' }}>*</span>
                </Text>
                <Select
                  showSearch
                  style={{ width: '100%' }}
                  placeholder="Tìm theo tên hoặc số điện thoại..."
                  value={selectedCustomerId || undefined}
                  onChange={setSelectedCustomerId}
                  filterOption={(input, option) =>
                    (option?.children || '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {customers.map((c) => (
                    <Option key={c._id} value={c._id}>
                      {c.fullName} - 📞 {c.phone || 'Chưa có SĐT'} {c.email && !c.email.includes('@badminton.local') ? `(${c.email})` : ''}
                    </Option>
                  ))}
                </Select>
              </div>
            ) : (
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12}>
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>
                    Họ và tên khách hàng <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Input
                    placeholder="Nguyễn Văn A..."
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>
                    Số điện thoại <span style={{ color: 'red' }}>*</span>
                  </Text>
                  <Input
                    placeholder="0901234567..."
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                  />
                </Col>
                <Col xs={24}>
                  <Text strong style={{ display: 'block', marginBottom: 4 }}>
                    Email liên hệ (tùy chọn)
                  </Text>
                  <Input
                    placeholder="email@example.com"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                  />
                </Col>
              </Row>
            )}
          </Card>

          {/* 2. Danh sách sân và thời gian đặt */}
          <Card
            size="small"
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#059669' }} />
                <span>2. Chọn Sân & Thời Gian ({createCourtOrders.length} sân)</span>
              </Space>
            }
            extra={
              <Space>
                <Tooltip title="Sao chép ngày và khung giờ của Sân #1 sang các sân còn lại">
                  <Button
                    size="small"
                    icon={<SyncOutlined />}
                    disabled={createCourtOrders.length <= 1}
                    onClick={handleSyncTimeToAllOrders}
                  >
                    Đồng bộ giờ
                  </Button>
                </Tooltip>
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<PlusOutlined />}
                  onClick={handleAddCourtOrder}
                  style={{ borderColor: '#059669', color: '#059669' }}
                >
                  + Thêm sân
                </Button>
              </Space>
            }
            style={{ borderRadius: 10, marginBottom: 16 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {createCourtOrders.map((ord, idx) => {
                const courtObj = courts.find((c) => c._id === ord.courtId);
                const durationMinutes =
                  ord.startTime && ord.endTime && ord.endTime.isAfter(ord.startTime)
                    ? ord.endTime.diff(ord.startTime, 'minute')
                    : 0;
                const hours = (durationMinutes / 60).toFixed(1);

                return (
                  <div
                    key={ord.id || idx}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '12px 14px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10,
                        borderBottom: '1px dashed #cbd5e1',
                        paddingBottom: 6
                      }}
                    >
                      <Space>
                        <Tag color="green" style={{ fontWeight: 600 }}>
                          🏸 Sân #{idx + 1}
                        </Tag>
                        {courtObj && (
                          <Text strong style={{ color: '#1e293b' }}>
                            {courtObj.courtName} ({courtObj.courtType})
                          </Text>
                        )}
                        {durationMinutes > 0 && (
                          <Tag color="blue">
                            ⏱️ {Math.floor(durationMinutes / 60)}h{durationMinutes % 60 > 0 ? ` ${durationMinutes % 60}p` : ''} ({hours} tiếng)
                          </Tag>
                        )}
                      </Space>
                      <Space>
                        <Text strong style={{ color: '#059669', fontSize: 13 }}>
                          Tạm tính: {(ord.price || 0).toLocaleString('vi-VN')} đ
                        </Text>
                        {createCourtOrders.length > 1 && (
                          <Tooltip title="Xóa sân này khỏi đơn">
                            <Button
                              danger
                              type="text"
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() => handleRemoveCourtOrder(idx)}
                            />
                          </Tooltip>
                        )}
                      </Space>
                    </div>

                    <Row gutter={[10, 10]}>
                      <Col xs={24} sm={6}>
                        <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
                          Sân thi đấu <span style={{ color: 'red' }}>*</span>
                        </Text>
                        <Select
                          style={{ width: '100%' }}
                          value={ord.courtId || undefined}
                          onChange={(val) => handleOrderCourtChange(idx, val)}
                          placeholder="Chọn sân"
                        >
                          {courts.map((c) => (
                            <Option key={c._id} value={c._id}>
                              🏸 {c.courtName} ({c.courtType})
                            </Option>
                          ))}
                        </Select>
                      </Col>

                      <Col xs={24} sm={6}>
                        <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
                          Ngày chơi <span style={{ color: 'red' }}>*</span>
                        </Text>
                        <DatePicker
                          style={{ width: '100%' }}
                          value={ord.bookingDate}
                          onChange={(val) => handleOrderDateChange(idx, val)}
                          disabledDate={(current) => current && current < dayjs().startOf('day')}
                          format="DD/MM/YYYY"
                        />
                      </Col>

                      <Col xs={24} sm={6}>
                        <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
                          Bắt đầu <span style={{ color: 'red' }}>*</span>
                        </Text>
                        <TimePicker
                          format="HH:mm"
                          minuteStep={15}
                          style={{ width: '100%' }}
                          value={ord.startTime}
                          onChange={(val) => handleOrderStartTimeChange(idx, val)}
                          placeholder="Giờ bắt đầu"
                          allowClear={false}
                        />
                      </Col>

                      <Col xs={24} sm={6}>
                        <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
                          Kết thúc <span style={{ color: 'red' }}>*</span>
                        </Text>
                        <TimePicker
                          format="HH:mm"
                          minuteStep={15}
                          style={{ width: '100%' }}
                          value={ord.endTime}
                          onChange={(val) => handleOrderEndTimeChange(idx, val)}
                          placeholder="Giờ kết thúc"
                          allowClear={false}
                        />
                      </Col>

                      {ord.availableSlots && ord.availableSlots.some((s) => s.isBooked) && (
                        <Col xs={24}>
                          <div style={{ marginTop: 2, fontSize: 11 }}>
                            <Text type="secondary" style={{ display: 'inline-block', marginRight: 6 }}>
                              ⚠️ Khung giờ đã có khách trên sân này:
                            </Text>
                            <Space wrap size={[3, 3]}>
                              {ord.availableSlots
                                .filter((s) => s.isBooked)
                                .map((s) => (
                                  <Tag key={s.startTime} color="error" style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                                    {s.startTime} - {s.endTime}
                                  </Tag>
                                ))}
                            </Space>
                          </div>
                        </Col>
                      )}
                    </Row>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 3. Giá tiền & Thanh toán */}
          <Card
            size="small"
            title={
              <Space>
                <DollarOutlined style={{ color: '#059669' }} />
                <span>3. Giá Tiền & Thanh Toán</span>
              </Space>
            }
            style={{ borderRadius: 10, marginBottom: 16 }}
          >
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={8}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  Tổng tiền các sân ({createCourtOrders.length} sân)
                </Text>
                <div
                  style={{
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 11px',
                    borderRadius: 6,
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1'
                  }}
                >
                  <Text strong style={{ color: '#0f172a', fontSize: 15 }}>
                    {loadingCreatePrices ? 'Đang tính...' : `${(createPrice || 0).toLocaleString('vi-VN')} đ`}
                  </Text>
                </div>
              </Col>

              <Col xs={24} sm={8}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  Mã giảm giá (Voucher)
                </Text>
                {appliedCreateVoucher ? (
                  <div
                    style={{
                      height: 38,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 11px',
                      borderRadius: 6,
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #86efac'
                    }}
                  >
                    <Space>
                      <Tag color="success">{appliedCreateVoucher.voucherCode || appliedCreateVoucher.code}</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        -{(createDiscount || 0).toLocaleString('vi-VN')} đ
                      </Text>
                    </Space>
                    <Button size="small" type="link" danger onClick={handleRemoveCreateVoucher}>
                      Hủy
                    </Button>
                  </div>
                ) : (
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      style={{ height: 38 }}
                      placeholder="Mã voucher..."
                      value={createVoucherCode}
                      onChange={(e) => setCreateVoucherCode(e.target.value.toUpperCase())}
                    />
                    <Button
                      type="primary"
                      onClick={handleApplyCreateVoucher}
                      loading={validatingCreateVoucher}
                      style={{ height: 38, backgroundColor: '#059669', borderColor: '#059669' }}
                    >
                      Áp dụng
                    </Button>
                  </Space.Compact>
                )}
              </Col>

              <Col xs={24} sm={8}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  Tổng thanh toán cuối cùng
                </Text>
                <div
                  style={{
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 11px',
                    borderRadius: 6,
                    backgroundColor: '#fff1f0',
                    border: '1px solid #ffa39e'
                  }}
                >
                  <Text strong style={{ color: '#d4380d', fontSize: 16 }}>
                    {(createTotalAmount || 0).toLocaleString('vi-VN')} đ
                  </Text>
                  {createDiscount > 0 && (
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                      (Giảm {createDiscount.toLocaleString('vi-VN')} đ)
                    </Text>
                  )}
                </div>
              </Col>

              <Col xs={24} sm={12}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  Phương thức thanh toán
                </Text>
                <Select
                  style={{ width: '100%' }}
                  value={createPaymentMethod}
                  onChange={setCreatePaymentMethod}
                >
                  <Option value="CASH">Tiền mặt (Mặc định)</Option>
                  <Option value="TRANSFER">Chuyển khoản</Option>
                </Select>
              </Col>

              <Col xs={24} sm={12}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  Trạng thái đơn
                </Text>
                <Select
                  style={{ width: '100%' }}
                  value={createStatus}
                  onChange={setCreateStatus}
                >
                  <Option value="CONFIRMED">Đã xác nhận (CONFIRMED)</Option>
                  <Option value="PENDING">Chờ duyệt (PENDING)</Option>
                </Select>
              </Col>

              <Col xs={24}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  Ghi chú cho đơn đặt
                </Text>
                <Input.TextArea
                  rows={2}
                  placeholder="Ghi chú thêm (VD: Khách giải đấu, đặt 2 sân cạnh nhau...)"
                  value={createNote}
                  onChange={(e) => setCreateNote(e.target.value)}
                />
              </Col>
            </Row>
          </Card>
        </div>
      </Modal>
    </div>
  );
}
