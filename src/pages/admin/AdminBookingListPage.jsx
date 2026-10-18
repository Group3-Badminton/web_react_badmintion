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
  InputNumber,
  Select,
  DatePicker,
  TimePicker,
  Space,
  Modal,
  Descriptions,
  message,
  Popconfirm,
  Tooltip,
  Typography,
  Divider,
  Avatar,
  Badge,
  Tabs,
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
  PlayCircleOutlined
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

// Quy tắc chuyển trạng thái chỉ theo 1 chiều hợp lệ, không được đi ngược lại
const ALLOWED_STATUS_TRANSITIONS = {
  PENDING: [
    { value: 'PENDING', label: 'Chờ duyệt (PENDING - Hiện tại)' },
    { value: 'CONFIRMED', label: 'Đã xác nhận (CONFIRMED)' },
    { value: 'CANCELLED', label: 'Đã hủy (CANCELLED)' },
    { value: 'REJECTED', label: 'Từ chối (REJECTED)' }
  ],
  CONFIRMED: [
    { value: 'CONFIRMED', label: 'Đã xác nhận (CONFIRMED - Hiện tại)' },
    { value: 'CHECKED_IN', label: 'Đã nhận sân (CHECKED_IN)' },
    { value: 'CANCELLED', label: 'Đã hủy (CANCELLED)' }
  ],
  CHECKED_IN: [
    { value: 'CHECKED_IN', label: 'Đã nhận sân (CHECKED_IN - Hiện tại)' },
    { value: 'COMPLETED', label: 'Hoàn thành ca chơi (COMPLETED)' },
    { value: 'CANCELLED', label: 'Đã hủy (CANCELLED)' }
  ],
  COMPLETED: [
    { value: 'COMPLETED', label: 'Hoàn thành (COMPLETED - Đã kết thúc)' }
  ],
  CANCELLED: [
    { value: 'CANCELLED', label: 'Đã hủy (CANCELLED - Đã kết thúc)' }
  ],
  REJECTED: [
    { value: 'REJECTED', label: 'Từ chối (REJECTED - Đã kết thúc)' }
  ]
};

const PAYMENT_STATUS_CONFIG = {
  PAID: { color: 'green', label: 'Đã thanh toán' },
  UNPAID: { color: 'red', label: 'Chưa thanh toán' }
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

  // AF1: Thay đổi thông tin đặt sân (Change Booking Information)
  const [editCourtId, setEditCourtId] = useState('');
  const [editBookingDate, setEditBookingDate] = useState(null);
  const [editStartTime, setEditStartTime] = useState(dayjs('08:00', 'HH:mm'));
  const [editEndTime, setEditEndTime] = useState(dayjs('09:00', 'HH:mm'));
  const [editPrice, setEditPrice] = useState(0);
  const [editDiscount, setEditDiscount] = useState(0);
  const [editTotalAmount, setEditTotalAmount] = useState(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState('CASH');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isChangingInfo, setIsChangingInfo] = useState(false);
  const [isEditInfoMode, setIsEditInfoMode] = useState(false);
  const [timeSlots, setTimeSlots] = useState([]);

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
  const [createCourtId, setCreateCourtId] = useState('');
  const [createBookingDate, setCreateBookingDate] = useState(dayjs());
  const [createStartTime, setCreateStartTime] = useState(dayjs('08:00', 'HH:mm'));
  const [createEndTime, setCreateEndTime] = useState(dayjs('09:00', 'HH:mm'));
  const [createPrice, setCreatePrice] = useState(100000);
  const [createVoucherCode, setCreateVoucherCode] = useState('');
  const [createDiscount, setCreateDiscount] = useState(0);
  const [createTotalAmount, setCreateTotalAmount] = useState(100000);
  const [createPaymentMethod, setCreatePaymentMethod] = useState('CASH');
  const [createNote, setCreateNote] = useState('');
  const [createStatus, setCreateStatus] = useState('CONFIRMED');
  const [createAvailableSlots, setCreateAvailableSlots] = useState([]);
  const [loadingCreateSlots, setLoadingCreateSlots] = useState(false);
  const [appliedCreateVoucher, setAppliedCreateVoucher] = useState(null);
  const [validatingCreateVoucher, setValidatingCreateVoucher] = useState(false);

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

  // Hàm tính toán giá dựa theo thời gian bắt đầu và kết thúc (VNĐ)
  const getCalculatedPrice = (startTimeDayjs, endTimeDayjs, dateDayjs, slots = []) => {
    if (!startTimeDayjs || !endTimeDayjs) return 100000;
    const diffMinutes = endTimeDayjs.diff(startTimeDayjs, 'minute');
    if (diffMinutes <= 0) return 0;
    const hours = diffMinutes / 60;

    const isWeekend = dateDayjs ? (dateDayjs.day() === 0 || dateDayjs.day() === 6) : false;
    let hourlyRate = isWeekend ? 140000 : 100000;

    if (slots && slots.length > 0) {
      const sStr = startTimeDayjs.format('HH:mm');
      const found = slots.find((s) => s.startTime === sStr);
      if (found && found.price) {
        hourlyRate = found.price;
      } else if (slots[0]?.price) {
        hourlyRate = slots[0].price;
      }
    }

    return Math.round(hourlyRate * hours);
  };

  // Tải khung giờ trống cho form tạo đơn
  const fetchCreateSlotAvailability = async (courtId, date) => {
    if (!courtId || !date) return;
    try {
      setLoadingCreateSlots(true);
      const dateStr = date.format('YYYY-MM-DD');
      const res = await bookingService.getCourtAvailability(courtId, dateStr);
      if (res.success && res.data && res.data.slots) {
        setCreateAvailableSlots(res.data.slots);
        const price = getCalculatedPrice(createStartTime, createEndTime, date, res.data.slots);
        recalculateCreateAmounts(price);
      }
    } catch (err) {
      console.error('Lỗi tải khung giờ trống:', err);
    } finally {
      setLoadingCreateSlots(false);
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
    setCreateCourtId(defaultCourt);
    setCreateBookingDate(dayjs());
    const initStart = dayjs('08:00', 'HH:mm');
    const initEnd = dayjs('09:00', 'HH:mm');
    setCreateStartTime(initStart);
    setCreateEndTime(initEnd);
    setCreatePrice(100000);
    setCreateVoucherCode('');
    setCreateDiscount(0);
    setCreateTotalAmount(100000);
    setCreatePaymentMethod('CASH');
    setCreateNote('Khách đặt tại quầy');
    setCreateStatus('CONFIRMED');
    setAppliedCreateVoucher(null);
    setIsCreateModalOpen(true);
    if (defaultCourt) {
      fetchCreateSlotAvailability(defaultCourt, dayjs());
    }
  };

  // Khi đổi Sân ở form tạo đơn -> cập nhật ngay khung giờ và đơn giá theo thời gian chọn
  const handleCreateCourtChange = (newCourtId) => {
    setCreateCourtId(newCourtId);
    fetchCreateSlotAvailability(newCourtId, createBookingDate);
  };

  // Khi đổi Ngày ở form tạo đơn -> cập nhật ngay khung giờ và đơn giá theo thời gian chọn
  const handleCreateDateChange = (newDate) => {
    setCreateBookingDate(newDate);
    fetchCreateSlotAvailability(createCourtId, newDate);
  };

  // Tính lại tổng tiền form tạo
  const recalculateCreateAmounts = (priceVal, voucherObj = appliedCreateVoucher) => {
    const base = Number(priceVal) || 0;
    let disc = 0;
    if (voucherObj) {
      if (voucherObj.discountType === 'PERCENTAGE') {
        disc = Math.round((base * voucherObj.discountValue) / 100);
        if (voucherObj.maxDiscount > 0 && disc > voucherObj.maxDiscount) {
          disc = voucherObj.maxDiscount;
        }
      } else if (voucherObj.discountValue) {
        disc = Math.min(voucherObj.discountValue, base);
      }
    }
    disc = Math.min(disc, base);
    setCreatePrice(base);
    setCreateDiscount(disc);
    setCreateTotalAmount(Math.max(0, base - disc));
  };

  // Khi đổi Thời gian bắt đầu ở form tạo đơn
  const handleCreateStartTimeChange = (newStartTime) => {
    if (!newStartTime) return;
    setCreateStartTime(newStartTime);
    let end = createEndTime;
    if (!end || !end.isAfter(newStartTime)) {
      end = newStartTime.add(1, 'hour');
      setCreateEndTime(end);
    }
    const price = getCalculatedPrice(newStartTime, end, createBookingDate, createAvailableSlots);
    recalculateCreateAmounts(price);
  };

  // Khi đổi Thời gian kết thúc ở form tạo đơn
  const handleCreateEndTimeChange = (newEndTime) => {
    if (!newEndTime) return;
    setCreateEndTime(newEndTime);
    const price = getCalculatedPrice(createStartTime, newEndTime, createBookingDate, createAvailableSlots);
    recalculateCreateAmounts(price);
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
      const res = await bookingService.validateVoucher(code, createPrice);
      if (res.success && res.data) {
        setAppliedCreateVoucher(res.data);
        recalculateCreateAmounts(createPrice, res.data);
        message.success(`Đã áp dụng mã ${res.data.voucherCode}!`);
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Mã giảm giá không hợp lệ!');
      setAppliedCreateVoucher(null);
      recalculateCreateAmounts(createPrice, null);
    } finally {
      setValidatingCreateVoucher(false);
    }
  };

  // Xử lý gửi đơn đặt sân từ Staff
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
    if (!createCourtId) {
      message.warning('Vui lòng chọn sân thi đấu!');
      return;
    }
    if (!createBookingDate) {
      message.warning('Vui lòng chọn ngày đặt sân!');
      return;
    }
    if (!createStartTime || !createEndTime) {
      message.warning('Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc!');
      return;
    }
    if (!createStartTime.isBefore(createEndTime)) {
      message.warning('Thời gian kết thúc phải sau thời gian bắt đầu!');
      return;
    }

    const startTime = createStartTime.format('HH:mm');
    const endTime = createEndTime.format('HH:mm');

    try {
      setCreatingBooking(true);
      const payload = {
        customerId: customerMode === 'EXISTING' ? selectedCustomerId : undefined,
        customerName: customerMode === 'WALK_IN' ? newCustomerName.trim() : undefined,
        customerPhone: customerMode === 'WALK_IN' ? newCustomerPhone.trim() : undefined,
        customerEmail: customerMode === 'WALK_IN' && newCustomerEmail.trim() ? newCustomerEmail.trim() : undefined,
        courtId: createCourtId,
        bookingDate: createBookingDate.format('YYYY-MM-DD'),
        startTime,
        endTime,
        price: createPrice,
        voucherCode: appliedCreateVoucher ? appliedCreateVoucher.voucherCode : undefined,
        discount: createDiscount,
        totalAmount: createTotalAmount,
        paymentMethod: createPaymentMethod || 'CASH',
        paymentStatus: 'UNPAID',
        status: createStatus,
        note: createNote.trim()
      };

      const res = await bookingService.createBooking(payload);
      if (res.success) {
        message.success(`Đặt sân thành công! Mã đơn: #${res.data?.bookingCode}`);
        setIsCreateModalOpen(false);
        fetchBookings(1, pagination.pageSize);
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Đặt sân không thành công, vui lòng thử lại!');
    } finally {
      setCreatingBooking(false);
    }
  };

  // Tải danh sách khung giờ phục vụ đổi giờ đặt sân
  const fetchTimeSlots = async () => {
    try {
      const res = await bookingService.getTimeSlots();
      if (res.success && res.data) {
        setTimeSlots(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách khung giờ:', err);
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
    [search, statusFilter, courtFilter, selectedDate, pagination.current, pagination.pageSize]
  );

  useEffect(() => {
    fetchCourts();
    fetchTimeSlots();
  }, []);

  useEffect(() => {
    fetchBookings(1, pagination.pageSize);
  }, [statusFilter, courtFilter, selectedDate]);

  // Tìm kiếm khi nhấn Enter
  const handleSearchSubmit = () => {
    fetchBookings(1, pagination.pageSize);
  };

  // Đặt lại bộ lọc
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setCourtFilter('ALL');
    setSelectedDate(null);
  };

  // Xử lý chuyển trang
  const handleTableChange = (newPagination) => {
    fetchBookings(newPagination.current, newPagination.pageSize);
  };

  // Hàm tính toán lại giá, giảm giá voucher và tổng tiền khi thay đổi giá
  const recalculateAmounts = (newPrice, customDiscount = null) => {
    const priceVal = typeof newPrice === 'number' ? newPrice : (parseFloat(newPrice) || 0);
    let disc = 0;
    if (customDiscount !== null && customDiscount !== undefined) {
      disc = typeof customDiscount === 'number' ? customDiscount : (parseFloat(customDiscount) || 0);
    } else {
      const voucher = selectedBooking?.voucherId;
      if (voucher) {
        if (voucher.discountType === 'PERCENTAGE') {
          disc = Math.round((priceVal * voucher.discountValue) / 100);
          if (voucher.maxDiscount > 0 && disc > voucher.maxDiscount) {
            disc = voucher.maxDiscount;
          }
        } else if (voucher.discountValue) {
          disc = Math.min(voucher.discountValue, priceVal);
        }
      }
    }
    disc = Math.min(disc, priceVal);
    const total = Math.max(0, priceVal - disc);
    setEditPrice(priceVal);
    setEditDiscount(disc);
    setEditTotalAmount(total);
  };

  const handlePriceChange = (val) => {
    recalculateAmounts(val);
  };

  // Tải tình trạng khung giờ và giá tiền tương ứng theo Sân và Ngày chơi
  const fetchCourtAvailabilityForModal = async (courtId, bookingDate) => {
    if (!courtId || !bookingDate) return;
    try {
      setLoadingSlots(true);
      const dateStr = dayjs(bookingDate).format('YYYY-MM-DD');
      const res = await bookingService.getCourtAvailability(courtId, dateStr);
      if (res.success && res.data && res.data.slots) {
        setAvailableSlots(res.data.slots);
      }
    } catch (err) {
      console.error('Lỗi tải bảng giá và khung giờ sân:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Đổi sân thi đấu -> Tải lại danh sách giờ và giá của sân đó
  const handleCourtChange = (newCourtId) => {
    setEditCourtId(newCourtId);
    fetchCourtAvailabilityForModal(newCourtId, editBookingDate);
    const price = getCalculatedPrice(editStartTime, editEndTime, editBookingDate, availableSlots);
    recalculateAmounts(price);
  };

  // Đổi ngày chơi -> Tải lại danh sách giờ và giá (ngày thường / cuối tuần)
  const handleBookingDateChange = (newDate) => {
    setEditBookingDate(newDate);
    fetchCourtAvailabilityForModal(editCourtId, newDate);
    const price = getCalculatedPrice(editStartTime, editEndTime, newDate, availableSlots);
    recalculateAmounts(price);
  };

  // Đổi Thời gian bắt đầu ở form sửa
  const handleEditStartTimeChange = (newStartTime) => {
    if (!newStartTime) return;
    setEditStartTime(newStartTime);
    let end = editEndTime;
    if (!end || !end.isAfter(newStartTime)) {
      end = newStartTime.add(1, 'hour');
      setEditEndTime(end);
    }
    const price = getCalculatedPrice(newStartTime, end, editBookingDate, availableSlots);
    recalculateAmounts(price);
  };

  // Đổi Thời gian kết thúc ở form sửa
  const handleEditEndTimeChange = (newEndTime) => {
    if (!newEndTime) return;
    setEditEndTime(newEndTime);
    const price = getCalculatedPrice(editStartTime, newEndTime, editBookingDate, availableSlots);
    recalculateAmounts(price);
  };

  // Mở modal xem chi tiết
  const handleOpenDetailModal = (record) => {
    setSelectedBooking(record);
    setEditStatus(record.status);
    setEditPaymentStatus(record.paymentStatus);
    setEditNote(record.note || '');
    const courtId = record.courtId?._id || record.courtId || '';
    const date = record.bookingDate ? dayjs(record.bookingDate) : dayjs();
    const startDj = record.startTime ? dayjs(record.startTime, 'HH:mm') : dayjs('08:00', 'HH:mm');
    const endDj = record.endTime ? dayjs(record.endTime, 'HH:mm') : dayjs('09:00', 'HH:mm');
    setEditCourtId(courtId);
    setEditBookingDate(date);
    setEditStartTime(startDj);
    setEditEndTime(endDj);
    setEditPrice(record.price || 0);
    setEditDiscount(record.discount || 0);
    setEditTotalAmount(record.totalAmount || 0);
    setEditPaymentMethod(record.paymentMethod || 'CASH');
    setRejectReason('');
    setIsEditInfoMode(false); // Khóa các ô input như xem chi tiết bình thường
    setIsDetailModalOpen(true);
    fetchCourtAvailabilityForModal(courtId, date);
  };

  // Hủy sửa thông tin đặt sân (khóa lại)
  const handleCancelEditInfo = () => {
    if (selectedBooking) {
      setEditCourtId(selectedBooking.courtId?._id || selectedBooking.courtId || '');
      setEditBookingDate(selectedBooking.bookingDate ? dayjs(selectedBooking.bookingDate) : dayjs());
      setEditStartTime(selectedBooking.startTime ? dayjs(selectedBooking.startTime, 'HH:mm') : dayjs('08:00', 'HH:mm'));
      setEditEndTime(selectedBooking.endTime ? dayjs(selectedBooking.endTime, 'HH:mm') : dayjs('09:00', 'HH:mm'));
      setEditPrice(selectedBooking.price || 0);
      setEditDiscount(selectedBooking.discount || 0);
      setEditTotalAmount(selectedBooking.totalAmount || 0);
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

  // AF1: Xử lý thay đổi thông tin đặt sân (Change Booking Information)
  const handleChangeBookingInfo = async () => {
    if (!selectedBooking) return;
    if (!editStartTime || !editEndTime) {
      message.warning('Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc!');
      return;
    }
    if (!editStartTime.isBefore(editEndTime)) {
      message.warning('Thời gian kết thúc phải sau thời gian bắt đầu!');
      return;
    }

    try {
      setIsChangingInfo(true);
      const startTime = editStartTime.format('HH:mm');
      const endTime = editEndTime.format('HH:mm');

      const res = await bookingService.changeBookingInfo(selectedBooking._id, {
        courtId: editCourtId,
        bookingDate: editBookingDate ? editBookingDate.format('YYYY-MM-DD') : undefined,
        startTime,
        endTime,
        price: editPrice,
        discount: editDiscount,
        totalAmount: editTotalAmount,
        paymentMethod: editPaymentMethod || 'CASH',
        note: editNote,
        status: 'CONFIRMED'
      });

      if (res.success) {
        if (res.message && res.message.includes('không thể gửi thông báo')) {
          message.warning(res.message); // E4
        } else {
          message.success('Thay đổi thông tin và xác nhận đặt sân thành công!');
        }
        setIsEditInfoMode(false);
        setIsDetailModalOpen(false);
        fetchBookings();
      }
    } catch (err) {
      const errMsg =
        err?.response?.data?.message ||
        'Không thể xử lý yêu cầu đặt sân do lỗi hệ thống. Trạng thái đặt sân chưa được thay đổi. Vui lòng thử lại sau.';
      message.error(errMsg);
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
      title: 'Tổng Tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 140,
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
      title: 'Thanh Toán',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 140,
      render: (paymentStatus) => {
        const isPaid = paymentStatus === 'PAID';
        return (
          <Tag
            color={isPaid ? 'green' : 'red'}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500
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
        <Space size={12}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{
              backgroundColor: '#bbf246',
              borderColor: '#bbf246',
              color: '#092615',
              fontWeight: 'bold',
              borderRadius: 8,
              height: 38
            }}
            onClick={handleOpenCreateModal}
          >
            Đặt Sân Mới
          </Button>
          <Button
            icon={<ReloadOutlined spin={loading} />}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: '#fff',
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
          <Col xs={24} sm={12} md={7}>
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
          <Col xs={12} sm={6} md={5}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Trạng thái đơn"
            >
              <Option value="ALL">Tất cả trạng thái</Option>
              <Option value="PENDING">Chờ duyệt (PENDING)</Option>
              <Option value="CONFIRMED">Đã xác nhận (CONFIRMED)</Option>
              <Option value="CHECKED_IN">Đang chơi / Nhận sân (CHECKED_IN)</Option>
              <Option value="COMPLETED">Hoàn thành (COMPLETED)</Option>
              <Option value="CANCELLED">Đã hủy (CANCELLED)</Option>
              <Option value="REJECTED">Từ chối (REJECTED)</Option>
            </Select>
          </Col>

          {/* Lọc theo sân */}
          <Col xs={12} sm={6} md={5}>
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
          <Col xs={12} sm={6} md={5}>
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
          scroll={{ x: 900 }}
          locale={{ emptyText: 'Chưa có đơn đặt sân nào phù hợp với bộ lọc' }}
        />
      </Card>

      {/* Modal Xem chi tiết & Xử lý đơn đặt sân (Hỗ trợ AF1 & AF2) */}
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
                style={{ backgroundColor: '#009B60', borderColor: '#009B60' }}
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
                }}
              >
                Đóng
              </Button>,

              // AF2: Từ chối yêu cầu đặt sân - Chỉ hiện khi đơn PENDING
              selectedBooking?.status === 'PENDING' && (
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
              selectedBooking?.status === 'PENDING' && (
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
              selectedBooking?.status === 'PENDING' && (
                <Popconfirm
                  key="confirm"
                  title="Xác nhận nhận và duyệt đơn này?"
                  onConfirm={() => handleUpdateStatus(selectedBooking._id, 'CONFIRMED')}
                  okText="Xác nhận"
                  cancelText="Hủy"
                >
                  <Button
                    type="primary"
                    style={{ backgroundColor: '#009B60', borderColor: '#009B60' }}
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
                <Text strong style={{ color: '#009B60' }}>
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

              {/* Sân Thi Đấu: Mở khóa khi isEditInfoMode = true */}
              <Descriptions.Item label="Sân Thi Đấu">
                {isEditInfoMode ? (
                  <Select
                    style={{ width: '100%' }}
                    value={editCourtId}
                    onChange={handleCourtChange}
                    placeholder="Chọn sân thi đấu"
                  >
                    {courts.map((c) => (
                      <Option key={c._id} value={c._id}>
                        🏸 {c.courtName} ({c.courtType})
                      </Option>
                    ))}
                  </Select>
                ) : (
                  <div>
                    <Text strong>🏸 {selectedBooking.courtId?.courtName || 'Chưa chọn sân'}</Text>
                    {selectedBooking.courtId?.courtType && (
                      <Tag color="cyan" style={{ marginLeft: 6 }}>
                        {selectedBooking.courtId.courtType}
                      </Tag>
                    )}
                    {selectedBooking.courtId?.location && (
                      <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                        📍 {selectedBooking.courtId.location}
                      </Text>
                    )}
                  </div>
                )}
              </Descriptions.Item>

              {/* Ngày Chơi: Mở khóa khi isEditInfoMode = true */}
              <Descriptions.Item label="Ngày Chơi">
                {isEditInfoMode ? (
                  <DatePicker
                    style={{ width: '100%' }}
                    value={editBookingDate}
                    onChange={handleBookingDateChange}
                    disabledDate={(current) => current && current < dayjs().startOf('day')}
                    format="DD/MM/YYYY"
                  />
                ) : (
                  <Text strong>📅 {dayjs(selectedBooking.bookingDate).format('DD/MM/YYYY')}</Text>
                )}
              </Descriptions.Item>

              {/* Thời Gian Chơi: Mở khóa khi isEditInfoMode = true */}
              <Descriptions.Item label="Thời Gian Chơi">
                {isEditInfoMode ? (
                  <div>
                    <Row gutter={[8, 8]}>
                      <Col xs={24} sm={12}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
                          Giờ bắt đầu:
                        </Text>
                        <TimePicker
                          format="HH:mm"
                          minuteStep={15}
                          style={{ width: '100%' }}
                          value={editStartTime}
                          onChange={handleEditStartTimeChange}
                          placeholder="Bắt đầu"
                          allowClear={false}
                        />
                      </Col>
                      <Col xs={24} sm={12}>
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 2 }}>
                          Giờ kết thúc:
                        </Text>
                        <TimePicker
                          format="HH:mm"
                          minuteStep={15}
                          style={{ width: '100%' }}
                          value={editEndTime}
                          onChange={handleEditEndTimeChange}
                          placeholder="Kết thúc"
                          allowClear={false}
                        />
                      </Col>
                    </Row>
                    {editStartTime && editEndTime && (
                      <div style={{ marginTop: 6, fontSize: 12, color: '#009B60', fontWeight: 500 }}>
                        ⏱️ {editStartTime.format('HH:mm')} - {editEndTime.format('HH:mm')}
                        {editEndTime.isAfter(editStartTime) && ` (${(editEndTime.diff(editStartTime, 'minute') / 60).toFixed(1)} tiếng)`}
                      </div>
                    )}
                  </div>
                ) : (
                  <Tag color="geekblue" style={{ fontSize: 13, padding: '2px 8px' }}>
                    ⏰ {selectedBooking.startTime} - {selectedBooking.endTime}
                  </Tag>
                )}
              </Descriptions.Item>

              {/* Đơn Giá Sân: Đồng bộ tự động theo khung giờ chọn và cho phép chỉnh sửa */}
              <Descriptions.Item label="Đơn Giá Sân">
                {isEditInfoMode ? (
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    step={10000}
                    value={editPrice}
                    onChange={handlePriceChange}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                    addonAfter="đ"
                  />
                ) : (
                  `${(selectedBooking.price || 0).toLocaleString('vi-VN')} đ`
                )}
              </Descriptions.Item>

              {/* Giảm Giá */}
              <Descriptions.Item label="Giảm Giá">
                <Text style={{ color: (isEditInfoMode ? editDiscount : selectedBooking.discount) > 0 ? '#52c41a' : undefined, fontWeight: 500 }}>
                  {isEditInfoMode
                    ? `${(editDiscount || 0).toLocaleString('vi-VN')} đ`
                    : `${(selectedBooking.discount || 0).toLocaleString('vi-VN')} đ`}
                </Text>
              </Descriptions.Item>

              {/* Tổng Thanh Toán: Tự động tính lại khi thay đổi giá */}
              <Descriptions.Item label="Tổng Thanh Toán">
                <Text strong style={{ fontSize: 16, color: '#d4380d' }}>
                  {isEditInfoMode
                    ? `${(editTotalAmount || 0).toLocaleString('vi-VN')} đ`
                    : `${(selectedBooking.totalAmount || 0).toLocaleString('vi-VN')} đ`}
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
                    🏷️ {selectedBooking.voucherId.voucherCode} - {selectedBooking.voucherId.voucherName}
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
            <CalendarOutlined style={{ color: '#009B60' }} />
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
            style={{ backgroundColor: '#009B60', borderColor: '#009B60' }}
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
                <UserOutlined style={{ color: '#009B60' }} />
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

          {/* 2. Thông tin lịch đặt sân */}
          <Card
            size="small"
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#009B60' }} />
                <span>2. Chọn Sân & Thời Gian</span>
              </Space>
            }
            style={{ borderRadius: 10, marginBottom: 16 }}
          >
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  Sân thi đấu <span style={{ color: 'red' }}>*</span>
                </Text>
                <Select
                  style={{ width: '100%' }}
                  value={createCourtId || undefined}
                  onChange={handleCreateCourtChange}
                  placeholder="Chọn sân"
                >
                  {courts.map((c) => (
                    <Option key={c._id} value={c._id}>
                      🏸 {c.courtName} ({c.courtType})
                    </Option>
                  ))}
                </Select>
              </Col>

              <Col xs={24} sm={12}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  Ngày chơi <span style={{ color: 'red' }}>*</span>
                </Text>
                <DatePicker
                  style={{ width: '100%' }}
                  value={createBookingDate}
                  onChange={handleCreateDateChange}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                  format="DD/MM/YYYY"
                />
              </Col>

              <Col xs={24} sm={12}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  Thời gian bắt đầu <span style={{ color: 'red' }}>*</span>
                </Text>
                <TimePicker
                  format="HH:mm"
                  minuteStep={15}
                  style={{ width: '100%', height: 38 }}
                  value={createStartTime}
                  onChange={handleCreateStartTimeChange}
                  placeholder="Giờ bắt đầu (VD: 08:00)"
                  allowClear={false}
                />
              </Col>

              <Col xs={24} sm={12}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  Thời gian kết thúc <span style={{ color: 'red' }}>*</span>
                </Text>
                <TimePicker
                  format="HH:mm"
                  minuteStep={15}
                  style={{ width: '100%', height: 38 }}
                  value={createEndTime}
                  onChange={handleCreateEndTimeChange}
                  placeholder="Giờ kết thúc (VD: 10:00)"
                  allowClear={false}
                />
              </Col>

              <Col xs={24}>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ color: '#009B60', fontSize: 13 }}>
                      ⏱️ Thời lượng đặt: {createStartTime && createEndTime && createEndTime.isAfter(createStartTime)
                        ? `${Math.floor(createEndTime.diff(createStartTime, 'minute') / 60)} giờ ${createEndTime.diff(createStartTime, 'minute') % 60} phút (${(createEndTime.diff(createStartTime, 'minute') / 60).toFixed(1)} tiếng)`
                        : 'Vui lòng chọn giờ kết thúc sau giờ bắt đầu'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Khung giờ: {createStartTime ? createStartTime.format('HH:mm') : ''} - {createEndTime ? createEndTime.format('HH:mm') : ''}
                    </Text>
                  </div>
                  {createAvailableSlots && createAvailableSlots.some(s => s.isBooked) && (
                    <div style={{ marginTop: 8, fontSize: 12 }}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                        ⚠️ Các giờ đã có khách đặt trước trên sân này trong ngày:
                      </Text>
                      <Space wrap size={[4, 4]}>
                        {createAvailableSlots.filter(s => s.isBooked).map(s => (
                          <Tag key={s.startTime} color="error" style={{ fontSize: 11, borderRadius: 4 }}>
                            {s.startTime} - {s.endTime}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  )}
                </div>
              </Col>
            </Row>
          </Card>

          {/* 3. Giá tiền & Thanh toán */}
          <Card
            size="small"
            title={
              <Space>
                <DollarOutlined style={{ color: '#009B60' }} />
                <span>3. Giá Tiền & Thanh Toán</span>
              </Space>
            }
            style={{ borderRadius: 10, marginBottom: 16 }}
          >
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={8}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  Đơn giá sân (VNĐ)
                </Text>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={10000}
                  value={createPrice}
                  onChange={(val) => recalculateCreateAmounts(val)}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                  addonAfter="đ"
                />
              </Col>

              <Col xs={24} sm={8}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  Mã giảm giá (Voucher)
                </Text>
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="Mã voucher..."
                    value={createVoucherCode}
                    onChange={(e) => setCreateVoucherCode(e.target.value.toUpperCase())}
                  />
                  <Button
                    type="primary"
                    onClick={handleApplyCreateVoucher}
                    loading={validatingCreateVoucher}
                    style={{ backgroundColor: '#009B60', borderColor: '#009B60' }}
                  >
                    Áp dụng
                  </Button>
                </Space.Compact>
              </Col>

              <Col xs={24} sm={8}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  Tổng tiền thanh toán
                </Text>
                <div
                  style={{
                    height: 32,
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

              <Col xs={24} sm={8}>
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

              <Col xs={24}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>
                  Ghi chú cho đơn đặt
                </Text>
                <Input.TextArea
                  rows={2}
                  placeholder="Ghi chú thêm (VD: Khách gọi điện đặt, cần chuẩn bị vợt...)"
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
