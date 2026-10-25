import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Radio,
  Tag,
  Typography,
  Tabs,
  Table,
  Space,
  Divider,
  Alert,
  DatePicker,
  Popconfirm,
  Tooltip,
  Badge,
  message
} from 'antd';
import {
  PlayCircleOutlined,
  FieldTimeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SwapOutlined,
  PlusOutlined,
  HistoryOutlined,
  ReloadOutlined,
  UserOutlined,
  DollarOutlined,
  CheckOutlined,
  TableOutlined,
  CalendarOutlined,
  PhoneOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  QrcodeOutlined,
  TagOutlined,
  CoffeeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import sessionService from '../../services/sessionService';
import { bookingService } from '../../services/bookingService';
import { invoiceService } from '../../services/invoiceService';

const { Title, Text } = Typography;
const { Option } = Select;

const getTodayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getTomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function PlayingSessionPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('operations');
  const [courtsData, setCourtsData] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [matrixData, setMatrixData] = useState({ courts: [], timeSlots: [], matrix: {} });
  const [matrixLoading, setMatrixLoading] = useState(false);

  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedSlotCell, setSelectedSlotCell] = useState(null);

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('Khách đến trễ, nhân viên đã gọi điện thoại xác nhận khách không đến chơi.');
  const [cancelLoading, setCancelLoading] = useState(false);

  const [historySessions, setHistorySessions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [checkInType, setCheckInType] = useState('booking');
  const [confirmedBookings, setConfirmedBookings] = useState([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [selectedCourtForCheckIn, setSelectedCourtForCheckIn] = useState(null);
  const [checkInForm] = Form.useForm();
  const [earlyCheckInAlert, setEarlyCheckInAlert] = useState(null);
  const [acceptEarlyCheckInState, setAcceptEarlyCheckInState] = useState(false);
  const selectedTimeSlotId = Form.useWatch('timeSlotId', checkInForm);

  const getBookingCheckInState = (booking, slot) => {
    if (!booking) return { canCheckIn: false, reason: '' };
    const bDate = booking.bookingDate ? booking.bookingDate.split('T')[0] : selectedDate;
    const today = getTodayStr();
    if (bDate < today) {
      return { canCheckIn: false, isPast: true, reason: 'Đã qua ngày' };
    }
    if (bDate > today) {
      return { canCheckIn: false, isFuture: true, reason: 'Chưa tới ngày' };
    }
    const [eh, em] = (booking.endTime || slot?.endTime || '00:00').split(':').map(Number);
    const [sh, sm] = (booking.startTime || slot?.startTime || '00:00').split(':').map(Number);
    const sMin = sh * 60 + sm;
    const eMin = eh * 60 + em;
    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();

    if (nowMin >= eMin) {
      return { canCheckIn: false, isPast: true, reason: 'Đã qua giờ' };
    }
    if (sMin - nowMin > 15) {
      return { canCheckIn: false, isFuture: true, reason: 'Chưa tới giờ' };
    }
    return { canCheckIn: true };
  };

  const getWalkInCalculationInfo = () => {
    if (!selectedTimeSlotId) return null;
    const slots = (availableTimeSlots && availableTimeSlots.length > 0) ? availableTimeSlots : (matrixData.timeSlots || []);
    const slot = slots.find(s => s._id === selectedTimeSlotId);
    if (!slot) return null;

    const [sh, sm] = (slot.startTime || '08:00').split(':').map(Number);
    const [eh, em] = (slot.endTime || '10:00').split(':').map(Number);
    const slotStartTotalMin = sh * 60 + sm;
    const slotEndTotalMin = eh * 60 + em;
    const currentTotalMin = currentTime.getHours() * 60 + currentTime.getMinutes();

    if (currentTotalMin >= slotEndTotalMin) {
      return { isInvalid: true, message: 'Khung giờ này đã kết thúc trong quá khứ, không thể nhận sân!' };
    }
    if (slotStartTotalMin - currentTotalMin > 15) {
      return { isInvalid: true, message: 'Chưa tới thời gian nhận sân cho ca đấu này! Chỉ mở trước tối đa 15 phút.' };
    }

    const isWeekend = currentTime.getDay() === 0 || currentTime.getDay() === 6;
    const hourlyRate = isWeekend ? 140000 : 100000;

    if (currentTotalMin >= slotStartTotalMin && currentTotalMin < slotEndTotalMin) {
      const remainingMinutes = slotEndTotalMin - currentTotalMin;
      const billedMinutes = Math.max(30, remainingMinutes);
      const hours = Math.round((billedMinutes / 60) * 100) / 100;
      const fee = Math.round((hourlyRate / 60) * billedMinutes);

      return {
        isProrated: true,
        inTime: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        outTime: slot.endTime,
        remainingMinutes,
        billedMinutes,
        hours,
        fee
      };
    } else {
      const slotHours = (slotEndTotalMin - slotStartTotalMin) / 60 || 2;
      const fee = hourlyRate * slotHours;
      return {
        isProrated: false,
        inTime: slot.startTime,
        outTime: slot.endTime,
        remainingMinutes: slotHours * 60,
        billedMinutes: slotHours * 60,
        hours: slotHours,
        fee
      };
    }
  };

  const [extendModalVisible, setExtendModalVisible] = useState(false);
  const [selectedSessionForExtend, setSelectedSessionForExtend] = useState(null);
  const [extendDuration, setExtendDuration] = useState(30);
  const [extendConflict, setExtendConflict] = useState(null);

  const [switchCourtModalVisible, setSwitchCourtModalVisible] = useState(false);
  const [selectedSessionForSwitch, setSelectedSessionForSwitch] = useState(null);
  const [availableCourtsForSwitch, setAvailableCourtsForSwitch] = useState([]);
  const [switchCourtForm] = Form.useForm();

  const [checkOutModalVisible, setCheckOutModalVisible] = useState(false);
  const [selectedSessionForCheckOut, setSelectedSessionForCheckOut] = useState(null);
  const [checkOutOvertimeInfo, setCheckOutOvertimeInfo] = useState(null);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [settleSessionModalVisible, setSettleSessionModalVisible] = useState(false);
  const [checkoutInvoice, setCheckoutInvoice] = useState(null);
  const [sessionPaymentMethod, setSessionPaymentMethod] = useState('CASH');
  const [sessionCashReceived, setSessionCashReceived] = useState('');
  const [sessionTransactionRef, setSessionTransactionRef] = useState('');
  const [sessionVoucherCode, setSessionVoucherCode] = useState('');
  const [sessionAppliedVoucher, setSessionAppliedVoucher] = useState(null);
  const [sessionDiscountAmount, setSessionDiscountAmount] = useState(0);
  const [validatingSessionVoucher, setValidatingSessionVoucher] = useState(false);
  const [submittingSessionSettle, setSubmittingSessionSettle] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchMatrix(selectedDate);
    fetchLiveBoard();
    const pollInterval = setInterval(() => {
      fetchMatrix(selectedDate);
      fetchLiveBoard(false);
    }, 15000);
    return () => clearInterval(pollInterval);
  }, [selectedDate]);

  const fetchMatrix = async (date = selectedDate) => {
    setMatrixLoading(true);
    try {
      const res = await sessionService.getCourtMatrix(date);
      if (res && res.data) {
        setMatrixData(res.data);
        if (res.data.timeSlots?.length > 0) {
          setAvailableTimeSlots(res.data.timeSlots);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMatrixLoading(false);
    }
  };

  const fetchLiveBoard = async () => {
    try {
      const res = await sessionService.getLiveBoard();
      if (res && res.data) {
        setCourtsData(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistorySessions = async (page = 1) => {
    setHistoryLoading(true);
    try {
      const res = await sessionService.getAllSessions({ page, limit: 10 });
      if (res && res.data) {
        setHistorySessions(res.data.sessions || []);
        setPagination({
          page: res.data.pagination?.page || 1,
          limit: res.data.pagination?.limit || 10,
          total: res.data.pagination?.total || 0
        });
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi tải lịch sử ca chơi');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === 'history') {
      fetchHistorySessions(1);
    } else if (key === 'operations') {
      fetchLiveBoard();
      fetchMatrix(selectedDate);
    }
  };

  const handleCellClick = async (court, slot, cell) => {
    const isToday = selectedDate === getTodayStr();
    const isPastDate = selectedDate < getTodayStr();
    const isFutureDate = selectedDate > getTodayStr();

    const [sh, sm] = (slot.startTime || '00:00').split(':').map(Number);
    const [eh, em] = (slot.endTime || '00:00').split(':').map(Number);
    const slotStartMin = sh * 60 + sm;
    const slotEndMin = eh * 60 + em;
    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();

    const isSlotPast = isPastDate || (isToday && slotEndMin <= nowMin);
    const isSlotFutureTooFar = isFutureDate || (isToday && (slotStartMin - nowMin > 15));

    if (cell.status === 'AVAILABLE') {
      if (isSlotPast) {
        message.warning('Khung giờ này đã kết thúc trong quá khứ, không thể nhận sân!');
        return;
      }
      if (isSlotFutureTooFar) {
        message.warning('Chưa đến giờ nhận sân cho ca đấu này! Chỉ mở nhận sân trước giờ bắt đầu tối đa 15 phút.');
        return;
      }

      setSelectedCourtForCheckIn(court);
      setCheckInType('walkin');
      setEarlyCheckInAlert(null);

      if (matrixData.timeSlots?.length > 0) {
        setAvailableTimeSlots(matrixData.timeSlots);
      } else {
        try {
          const tsRes = await bookingService.getTimeSlots();
          setAvailableTimeSlots(tsRes?.data || []);
        } catch (e) {}
      }

      try {
        const bRes = await bookingService.getAllBookings({ status: 'CONFIRMED', limit: 50 });
        const bookings = bRes?.data?.bookings || bRes?.data || [];
        setConfirmedBookings(Array.isArray(bookings) ? bookings : []);
      } catch (e) {}

      checkInForm.resetFields();
      checkInForm.setFieldsValue({
        courtId: court._id,
        timeSlotId: slot._id,
        walkInCustomerName: 'Khách vãng lai',
        walkInCustomerPhone: '',
        durationHours: 1
      });
      setCheckInModalVisible(true);
    } else if (cell.booking) {
      setSelectedSlotCell({ court, slot, cell });
      setBookingModalVisible(true);
    } else if (cell.status === 'IN_PROGRESS') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCheckInDirectFromBooking = async (bookingId, courtId, forceAcceptEarly = false) => {
    if (selectedSlotCell?.cell?.booking) {
      const bState = getBookingCheckInState(selectedSlotCell.cell.booking, selectedSlotCell.slot);
      if (!bState.canCheckIn) {
        if (bState.isPast) {
          message.warning('Ca đấu này đã kết thúc trong quá khứ! Không thể nhận sân.');
          return;
        }
        if (bState.isFuture) {
          message.warning('Chưa đến giờ nhận sân cho ca đấu này! Chỉ mở nhận sân trước giờ bắt đầu tối đa 15 phút.');
          return;
        }
      }
    }
    try {
      const res = await sessionService.checkIn({
        isWalkIn: false,
        bookingId,
        courtId,
        acceptEarlyCheckIn: forceAcceptEarly
      });

      if (res && res.data?.requireEarlyConfirmation) {
        setEarlyCheckInAlert(res.data);
        setBookingModalVisible(false);
        setCheckInType('booking');
        checkInForm.setFieldsValue({ bookingId });
        setCheckInModalVisible(true);
        return;
      }

      message.success('Nhận sân thành công! Ca chơi đã bắt đầu.');
      setBookingModalVisible(false);
      setEarlyCheckInAlert(null);
      setAcceptEarlyCheckInState(false);
      fetchMatrix(selectedDate);
      fetchLiveBoard();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể nhận sân');
    }
  };

  const handleCancelBookingSubmit = async () => {
    if (!selectedSlotCell?.cell?.booking?._id) return;
    setCancelLoading(true);
    try {
      await bookingService.updateBookingStatus(selectedSlotCell.cell.booking._id, {
        status: 'CANCELLED',
        note: cancelReason || 'Khách đến trễ, nhân viên đã gọi điện thoại xác nhận khách không đến chơi.'
      });
      message.success('Đã hủy đơn đặt sân thành công sau khi liên hệ khách hàng.');
      setCancelModalVisible(false);
      setBookingModalVisible(false);
      fetchMatrix(selectedDate);
      fetchLiveBoard();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể hủy đơn đặt sân');
    } finally {
      setCancelLoading(false);
    }
  };

  const openCheckInModal = async (court = null) => {
    setSelectedCourtForCheckIn(court);
    setEarlyCheckInAlert(null);
    setAcceptEarlyCheckInState(false);
    checkInForm.resetFields();

    let allSlots = matrixData.timeSlots || [];
    try {
      const res = await bookingService.getAllBookings({ status: 'CONFIRMED', limit: 50 });
      const bookings = res?.data?.bookings || res?.data || [];
      setConfirmedBookings(Array.isArray(bookings) ? bookings : []);

      if (allSlots.length === 0) {
        const tsRes = await bookingService.getTimeSlots();
        allSlots = tsRes?.data || [];
      }
      setAvailableTimeSlots(allSlots);
    } catch (e) {
      setConfirmedBookings([]);
      setAvailableTimeSlots(matrixData.timeSlots || []);
    }

    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    const validCurrentSlot = allSlots.find((s) => {
      const [sh, sm] = (s.startTime || '00:00').split(':').map(Number);
      const [eh, em] = (s.endTime || '00:00').split(':').map(Number);
      const sMin = sh * 60 + sm;
      const eMin = eh * 60 + em;
      return nowMin >= sMin - 15 && nowMin < eMin;
    });

    const initValues = {
      walkInCustomerName: 'Khách vãng lai',
      walkInCustomerPhone: '',
      durationHours: 1
    };
    if (court) {
      initValues.courtId = court._id;
    }
    if (validCurrentSlot) {
      initValues.timeSlotId = validCurrentSlot._id;
    }
    checkInForm.setFieldsValue(initValues);
    setCheckInModalVisible(true);
  };

  const handleCheckInSubmit = async (forceAcceptEarly = false) => {
    try {
      const values = await checkInForm.validateFields();

      if (checkInType === 'walkin') {
        const slots = (availableTimeSlots && availableTimeSlots.length > 0) ? availableTimeSlots : (matrixData.timeSlots || []);
        const slot = slots.find(s => s._id === values.timeSlotId);
        if (slot) {
          const [sh, sm] = (slot.startTime || '00:00').split(':').map(Number);
          const [eh, em] = (slot.endTime || '00:00').split(':').map(Number);
          const sMin = sh * 60 + sm;
          const eMin = eh * 60 + em;
          const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
          if (nowMin >= eMin) {
            message.warning('Ca đấu đã kết thúc trong quá khứ! Vui lòng chọn ca hiện tại.');
            return;
          }
          if (sMin - nowMin > 15) {
            message.warning('Chưa đến giờ nhận sân cho ca đấu này! Chỉ mở nhận sân trước giờ bắt đầu tối đa 15 phút.');
            return;
          }
        }
      } else if (checkInType === 'booking') {
        const booking = confirmedBookings.find(b => b._id === values.bookingId);
        if (booking) {
          const bState = getBookingCheckInState(booking, null);
          if (!bState.canCheckIn) {
            message.warning(bState.reason || 'Đơn đặt sân này không thể nhận sân ở thời điểm hiện tại!');
            return;
          }
        }
      }

      const isEarlyAccepted = typeof forceAcceptEarly === 'boolean' ? forceAcceptEarly : Boolean(acceptEarlyCheckInState);
      const targetCourtId = values.courtId || selectedCourtForCheckIn?._id;

      const payload = {
        isWalkIn: checkInType === 'walkin',
        bookingId: checkInType === 'booking' ? values.bookingId : undefined,
        courtId: targetCourtId ? String(targetCourtId) : undefined,
        walkInCustomerName: values.walkInCustomerName || 'Khách vãng lai',
        walkInCustomerPhone: values.walkInCustomerPhone || '',
        timeSlotId: values.timeSlotId,
        durationHours: Number(values.durationHours) || 1,
        acceptEarlyCheckIn: Boolean(isEarlyAccepted),
        note: values.note || ''
      };

      const res = await sessionService.checkIn(payload);
      if (res && res.data?.requireEarlyConfirmation) {
        setEarlyCheckInAlert(res.data);
        return;
      }

      message.success('Nhận sân thành công! Ca chơi đã bắt đầu.');
      setCheckInModalVisible(false);
      setEarlyCheckInAlert(null);
      setAcceptEarlyCheckInState(false);
      fetchLiveBoard();
      fetchMatrix(selectedDate);
    } catch (err) {
      if (err.errorFields) return;
      const errorMsg = err.response?.data?.message || err.message || 'Không thể nhận sân';
      message.error(errorMsg);
    }
  };

  const openExtendModal = (session) => {
    setSelectedSessionForExtend(session);
    setExtendDuration(30);
    setExtendConflict(null);
    setExtendModalVisible(true);
  };

  const handleExtendSubmit = async () => {
    if (!selectedSessionForExtend) return;
    try {
      const res = await sessionService.extendSession(selectedSessionForExtend._id, {
        extensionMinutes: extendDuration
      });

      if (res && res.data?.hasConflict) {
        setExtendConflict(res.data);
        return;
      }

      message.success(`Đã gia hạn thêm ${extendDuration} phút thành công!`);
      setExtendModalVisible(false);
      fetchLiveBoard();
      fetchMatrix(selectedDate);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể gia hạn');
    }
  };

  const openSwitchCourtModal = (session) => {
    setSelectedSessionForSwitch(session);
    switchCourtForm.resetFields();
    const vacantCourts = courtsData.filter(
      (c) => c._id.toString() !== session.courtId?.toString() && c.operationalStatus === 'AVAILABLE'
    );
    setAvailableCourtsForSwitch(vacantCourts);
    setSwitchCourtModalVisible(true);
  };

  const handleSwitchCourtSubmit = async () => {
    try {
      const values = await switchCourtForm.validateFields();
      await sessionService.switchCourt(selectedSessionForSwitch._id, {
        newCourtId: values.newCourtId,
        reason: values.reason
      });
      message.success('Chuyển sân thành công!');
      setSwitchCourtModalVisible(false);
      fetchLiveBoard();
      fetchMatrix(selectedDate);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể đổi sân');
    }
  };

  const openCheckOutModal = (session) => {
    setSelectedSessionForCheckOut(session);
    setCheckOutModalVisible(true);
  };

  const handleCheckOutSubmit = async () => {
    if (!selectedSessionForCheckOut) return;
    setCheckoutSubmitting(true);
    try {
      const res = await sessionService.checkOut(selectedSessionForCheckOut._id);
      message.success('Trả sân thành công! Đã tạo hóa đơn thanh toán.');
      setCheckOutModalVisible(false);
      fetchLiveBoard();
      fetchMatrix(selectedDate);

      const inv = res.data?.invoice || res.invoice;
      if (inv) {
        setCheckoutInvoice(inv);
        setSessionPaymentMethod('CASH');
        setSessionCashReceived(String(inv.totalAmount || inv.subtotal || ''));
        setSessionTransactionRef('');
        setSessionVoucherCode('');
        setSessionAppliedVoucher(null);
        setSessionDiscountAmount(0);
        setSettleSessionModalVisible(true);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể trả sân');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const handleApplySessionVoucher = async () => {
    if (!sessionVoucherCode.trim()) {
      message.warning('Vui lòng nhập mã giảm giá!');
      return;
    }
    const orderAmt = Number(checkoutInvoice?.subtotal) || Number(checkoutInvoice?.totalAmount) || 0;
    setValidatingSessionVoucher(true);
    try {
      const res = await invoiceService.validateVoucher({
        code: sessionVoucherCode.trim(),
        orderAmount: orderAmt
      });
      const data = res?.data || res;
      setSessionAppliedVoucher(data.voucher);
      setSessionDiscountAmount(data.discountAmount || 0);
      message.success(res?.message || 'Áp dụng mã giảm giá thành công!');
    } catch (err) {
      message.error(err.response?.data?.message || 'Mã giảm giá không hợp lệ!');
      setSessionAppliedVoucher(null);
      setSessionDiscountAmount(0);
    } finally {
      setValidatingSessionVoucher(false);
    }
  };

  const handleRemoveSessionVoucher = () => {
    setSessionAppliedVoucher(null);
    setSessionDiscountAmount(0);
    setSessionVoucherCode('');
  };

  const handleConfirmSessionPayment = async () => {
    if (!checkoutInvoice) return;
    const finalAmt = Math.max(0, (Number(checkoutInvoice.subtotal) || Number(checkoutInvoice.totalAmount)) - sessionDiscountAmount);
    const numCash = Number(sessionCashReceived) || 0;

    if (sessionPaymentMethod === 'CASH' && numCash < finalAmt) {
      message.error('Số tiền khách đưa không được nhỏ hơn tổng tiền cần thanh toán!');
      return;
    }

    setSubmittingSessionSettle(true);
    try {
      await invoiceService.settleSessionInvoice(checkoutInvoice._id, {
        paymentMethod: sessionPaymentMethod,
        cashReceived: sessionPaymentMethod === 'CASH' ? numCash : finalAmt,
        transactionReference: sessionPaymentMethod === 'TRANSFER' ? sessionTransactionRef.trim() : '',
        voucherCode: sessionAppliedVoucher?.code || ''
      });
      message.success('Thanh toán hóa đơn ca chơi thành công! Sân đã sẵn sàng đón lượt khách mới.');
      setSettleSessionModalVisible(false);
      fetchLiveBoard();
      fetchMatrix(selectedDate);
    } catch (err) {
      message.error(err.response?.data?.message || 'Thanh toán thất bại!');
    } finally {
      setSubmittingSessionSettle(false);
    }
  };

  const handleCompleteCleaning = async (courtId) => {
    try {
      await sessionService.completeCleaning(courtId);
      message.success('Sân đã sẵn sàng đón khách tiếp theo!');
      fetchLiveBoard();
      fetchMatrix(selectedDate);
    } catch (err) {
      message.error('Thao tác không thành công');
    }
  };

  const formatCountdown = (endTime) => {
    if (!endTime) return '--:--:--';
    const diff = new Date(endTime).getTime() - currentTime.getTime();
    if (diff <= 0) return '00:00:00 (HẾT GIỜ)';
    const hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
    const minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
    const seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const isSessionNearEnd = (session) => {
    if (!session || !session.scheduledEndTime) return false;
    const diffMin = (new Date(session.scheduledEndTime).getTime() - currentTime.getTime()) / 60000;
    return session.isNearEnd || (diffMin <= 10 && diffMin > 0);
  };

  const renderMatrixCell = (court, slot, cell) => {
    const isAvailable = cell.status === 'AVAILABLE';
    const isLate = cell.isLate;
    const isInProgress = cell.status === 'IN_PROGRESS';
    const isBooked = cell.status === 'CONFIRMED';
    const isCompleted = cell.status === 'COMPLETED';

    const isToday = selectedDate === getTodayStr();
    const isPastDate = selectedDate < getTodayStr();
    const isFutureDate = selectedDate > getTodayStr();

    const [sh, sm] = (slot.startTime || '00:00').split(':').map(Number);
    const [eh, em] = (slot.endTime || '00:00').split(':').map(Number);
    const slotStartMin = sh * 60 + sm;
    const slotEndMin = eh * 60 + em;
    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();

    const isSlotPast = isPastDate || (isToday && slotEndMin <= nowMin);
    const isSlotFutureTooFar = isFutureDate || (isToday && (slotStartMin - nowMin > 15));
    const isSlotCurrent = isToday && (nowMin >= slotStartMin - 15) && (nowMin < slotEndMin);

    let cellBg = '#ffffff';
    let cellBorder = '1.5px dashed #cbd5e1';
    let shadow = 'none';

    if (isAvailable) {
      if (isSlotPast) {
        cellBg = '#f8fafc';
        cellBorder = '1px dashed #cbd5e1';
      } else if (isSlotCurrent) {
        cellBg = '#f0fdf4';
        cellBorder = '1.5px dashed #10b981';
        shadow = '0 1px 3px rgba(16, 185, 129, 0.15)';
      } else {
        cellBg = '#ffffff';
        cellBorder = '1.5px dashed #94a3b8';
      }
    } else if (isInProgress) {
      cellBg = '#f0fdf4';
      cellBorder = '1.5px solid #10b981';
      shadow = '0 1px 3px rgba(16, 185, 129, 0.15)';
    } else if (isLate) {
      cellBg = '#fff7ed';
      cellBorder = '2px solid #ea580c';
      shadow = '0 2px 6px rgba(234, 88, 12, 0.25)';
    } else if (isBooked) {
      cellBg = '#eff6ff';
      cellBorder = '1.5px solid #3b82f6';
      shadow = '0 1px 3px rgba(59, 130, 246, 0.15)';
    } else if (isCompleted) {
      cellBg = '#f8fafc';
      cellBorder = '1px solid #e2e8f0';
    }

    return (
      <td
        key={`${court._id}-${slot._id}`}
        style={{ padding: '4px' }}
        onClick={() => handleCellClick(court, slot, cell)}
      >
        <div
          style={{
            background: cellBg,
            border: cellBorder,
            boxShadow: shadow,
            borderRadius: 8,
            padding: '8px 10px',
            minHeight: 82,
            height: 82,
            cursor: (isAvailable && isSlotPast) ? 'not-allowed' : 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.2s',
            opacity: (isCompleted || (isAvailable && isSlotPast)) ? 0.65 : 1
          }}
          onMouseEnter={(e) => {
            if (!(isAvailable && isSlotPast)) {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {isAvailable && (
            <div style={{ textAlign: 'center', margin: 'auto' }}>
              {isSlotPast ? (
                <>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8' }}>Đã qua giờ</div>
                </>
              ) : isSlotCurrent ? (
                <>
                  <PlusOutlined style={{ fontSize: 16, color: '#009B60', marginBottom: 2 }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>Trống</div>
                  <div style={{ fontSize: 10, color: '#047857', fontWeight: 600 }}>Nhận sân ngay</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Trống</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>Chưa tới giờ</div>
                </>
              )}
            </div>
          )}

          {isLate && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Tag color="volcano" style={{ fontSize: 10, lineHeight: '18px', padding: '0 5px', margin: 0, fontWeight: 700 }}>
                  Trễ {cell.lateMinutes}p
                </Tag>
                <PhoneOutlined style={{ color: '#ea580c', fontSize: 12 }} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#9a3412', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cell.booking?.customer?.fullName || cell.booking?.customerDisplayName || 'Khách đặt'}
                {cell.booking?.isWalkIn && (
                  <Tag color="cyan" style={{ marginLeft: 4, fontSize: 9, padding: '0 3px', lineHeight: '14px' }}>VL</Tag>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#c2410c', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                <span>{cell.booking?.customer?.phone || cell.booking?.customerDisplayPhone || '--'}</span>
                <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 500 }}>Chờ gọi</span>
              </div>
            </>
          )}

          {!isLate && isBooked && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Tag color="blue" style={{ fontSize: 10, lineHeight: '18px', padding: '0 5px', margin: 0 }}>
                  Đã đặt
                </Tag>
                <span style={{ fontSize: 10, color: '#2563eb', fontWeight: 600 }}>
                  {cell.booking?.bookingCode?.slice(-4)}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#1e40af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cell.booking?.customer?.fullName || cell.booking?.customerDisplayName || 'Khách đặt'}
                {cell.booking?.isWalkIn && (
                  <Tag color="cyan" style={{ marginLeft: 4, fontSize: 9, padding: '0 3px', lineHeight: '14px' }}>VL</Tag>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {cell.booking?.customer?.phone || cell.booking?.customerDisplayPhone || '--'}
              </div>
            </>
          )}

          {isInProgress && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Tag color="green" style={{ fontSize: 10, lineHeight: '18px', padding: '0 5px', margin: 0, fontWeight: 700 }}>
                  Đang chơi
                </Tag>
                <PlayCircleOutlined style={{ color: '#10b981', fontSize: 12 }} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#065f46', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cell.session?.customerDisplayName || cell.booking?.customer?.fullName || cell.booking?.customerDisplayName || 'Khách đang chơi'}
                {(cell.session?.isWalkIn || cell.booking?.isWalkIn) && (
                  <Tag color="cyan" style={{ marginLeft: 4, fontSize: 9, padding: '0 3px', lineHeight: '14px' }}>VL</Tag>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#047857' }}>
                {cell.session?.sessionCode || cell.booking?.bookingCode || '--'}
              </div>
            </>
          )}

          {isCompleted && (
            <div style={{ textAlign: 'center', margin: 'auto', color: '#94a3b8' }}>
              <CheckCircleOutlined style={{ fontSize: 14, marginBottom: 2 }} />
              <div style={{ fontSize: 11 }}>Đã kết thúc</div>
            </div>
          )}
        </div>
      </td>
    );
  };

  return (
    <div style={{ padding: '0 8px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1f2937' }}>
            🏸 Quản Lý Ca Chơi & Giám Sát Sân
          </Title>
          <Text type="secondary">
            Theo dõi trạng thái sân trực tiếp theo thời gian thực và tự động cảnh báo khi gần hết giờ
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { fetchLiveBoard(); fetchMatrix(selectedDate); }}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ background: '#009B60', borderColor: '#009B60' }}
            onClick={() => openCheckInModal(null)}
          >
            Nhận sân cho khách
          </Button>
        </Space>
      </div>

      <Tabs activeKey={activeTab} onChange={handleTabChange} type="card">
        <Tabs.TabPane
          tab={
            <span>
              <TableOutlined /> Bảng điều hành sân & Lịch ca đấu
            </span>
          }
          key="operations"
        >
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 20,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  🏸 Trạng thái sân thực tế
                </span>
              </div>
            </div>

            <Row gutter={[16, 16]}>
              {courtsData.map((court) => {
                const session = court.activeSession;
                const nearEnd = session && isSessionNearEnd(session);

                let borderColor = '#e2e8f0';
                let badgeColor = 'blue';
                let statusText = 'SẴN SÀNG';

                if (court.operationalStatus === 'IN_USE') {
                  borderColor = nearEnd ? '#ef4444' : '#10b981';
                  badgeColor = nearEnd ? 'volcano' : 'green';
                  statusText = nearEnd ? 'SẮP HẾT GIỜ' : 'ĐANG CHƠI';
                } else if (court.operationalStatus === 'CLEANING') {
                  borderColor = '#f59e0b';
                  badgeColor = 'gold';
                  statusText = 'ĐANG DỌN DẸP';
                } else if (court.status === 'INACTIVE') {
                  borderColor = '#9ca3af';
                  badgeColor = 'default';
                  statusText = 'TẠM NGƯNG';
                }

                return (
                  <Col xs={24} sm={12} lg={6} key={court._id}>
                    <Card
                      size="small"
                      hoverable
                      style={{
                        borderRadius: 10,
                        border: `1.5px solid ${borderColor}`,
                        boxShadow: nearEnd ? '0 0 12px rgba(239, 68, 68, 0.35)' : '0 1px 4px rgba(0,0,0,0.04)',
                        background: nearEnd ? '#fff5f5' : '#ffffff',
                        transition: 'all 0.25s ease'
                      }}
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{court.name}</span>
                          <Tag color={badgeColor} style={{ margin: 0, fontWeight: 600 }}>{statusText}</Tag>
                        </div>
                      }
                    >
                      {court.operationalStatus === 'IN_USE' && session ? (
                        <div>
                          {nearEnd && (
                            <Alert
                              message="⚠️ Sắp hết giờ chơi (< 10 phút)!"
                              type="error"
                              showIcon
                              style={{ marginBottom: 10, padding: '4px 8px', fontSize: 11 }}
                            />
                          )}

                          <div style={{
                            background: nearEnd ? '#fee2e2' : '#f0fdf4',
                            padding: '8px 12px',
                            borderRadius: 6,
                            textAlign: 'center',
                            marginBottom: 10,
                            border: `1px solid ${nearEnd ? '#fca5a5' : '#bbf7d0'}`
                          }}>
                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, letterSpacing: '0.5px' }}>
                              THỜI GIAN CÒN LẠI
                            </div>
                            <div style={{
                              fontSize: 20,
                              fontWeight: 800,
                              color: nearEnd ? '#dc2626' : '#15803d',
                              fontFamily: 'monospace'
                            }}>
                              {formatCountdown(session.scheduledEndTime)}
                            </div>
                          </div>

                          <div style={{ fontSize: 12, lineHeight: '20px', marginBottom: 12 }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <UserOutlined style={{ marginRight: 5, color: '#6b7280' }} />
                              <b>Khách:</b>{' '}
                              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                {session.customerDisplayName || session.bookingId?.customerId?.fullName || 'Khách vãng lai'}
                              </span>
                              {session.isWalkIn && (
                                <Tag color="cyan" style={{ marginLeft: 4, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                                  Khách vãng lai
                                </Tag>
                              )}
                            </div>
                            <div>
                              <ClockCircleOutlined style={{ marginRight: 5, color: '#6b7280' }} />
                              <b>Khung:</b> {session.bookingId?.startTime && session.bookingId?.endTime
                                ? `${session.bookingId.startTime} - ${session.bookingId.endTime}`
                                : (session.scheduledStartTime ? `${new Date(session.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(session.scheduledEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '--')}
                            </div>
                            <div>
                              <DollarOutlined style={{ marginRight: 5, color: '#6b7280' }} />
                              <b>Tạm tính:</b> <span style={{ color: '#009B60', fontWeight: 700 }}>{(session.totalAmount || 0).toLocaleString('vi-VN')} đ</span>
                            </div>
                            {session.extensions?.length > 0 && (
                              <div style={{ marginTop: 2 }}>
                                <Tag color="cyan" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                                  Đã +{session.extensions.reduce((sum, e) => sum + e.extendedMinutes, 0)}p
                                </Tag>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <Button
                              size="small"
                              icon={<CoffeeOutlined />}
                              onClick={() => navigate(`/admin/pos?sessionId=${session._id}`)}
                              style={{
                                background: '#f0fdf4',
                                borderColor: '#86efac',
                                color: '#166534',
                                fontWeight: 600,
                                fontSize: 12
                              }}
                              block
                            >
                              + Nước uống & Phụ kiện (POS)
                            </Button>
                            <Button
                              type="primary"
                              size="small"
                              icon={<FieldTimeOutlined />}
                              style={{ background: '#2563eb', borderColor: '#2563eb', fontWeight: 600 }}
                              onClick={() => openExtendModal(session)}
                              block
                            >
                              + Gia hạn ca đấu
                            </Button>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <Button
                                size="small"
                                icon={<SwapOutlined />}
                                onClick={() => openSwitchCourtModal(session)}
                                style={{ flex: 1, fontSize: 12 }}
                              >
                                Đổi sân
                              </Button>
                              <Button
                                size="small"
                                type="primary"
                                danger
                                icon={<CheckOutlined />}
                                onClick={() => openCheckOutModal(session)}
                                style={{ flex: 1, fontSize: 12, fontWeight: 600 }}
                              >
                                Trả sân
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : court.operationalStatus === 'CLEANING' ? (
                        <div style={{ textAlign: 'center', padding: '14px 0' }}>
                          <ClockCircleOutlined style={{ fontSize: 32, color: '#f59e0b', marginBottom: 8 }} />
                          <div style={{ fontWeight: 600, color: '#d97706', fontSize: 13, marginBottom: 4 }}>
                            Đang dọn dẹp vệ sinh
                          </div>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            Tự chuyển Sẵn sàng sau 10p
                          </Text>
                          <div style={{ marginTop: 12 }}>
                            <Button
                              type="primary"
                              size="small"
                              style={{ background: '#f59e0b', borderColor: '#f59e0b', fontSize: 12 }}
                              onClick={() => handleCompleteCleaning(court._id)}
                              block
                            >
                              Xác nhận dọn xong
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '16px 0' }}>
                          <CheckCircleOutlined style={{ fontSize: 34, color: '#10b981', marginBottom: 8 }} />
                          <div style={{ fontWeight: 600, color: '#047857', fontSize: 13, marginBottom: 12 }}>
                            Sân trống sẵn sàng
                          </div>
                          <Button
                            type="primary"
                            size="small"
                            icon={<PlayCircleOutlined />}
                            style={{ background: '#009B60', borderColor: '#009B60', fontWeight: 600 }}
                            onClick={() => openCheckInModal(court)}
                            block
                          >
                            Nhận sân bắt đầu chơi
                          </Button>
                        </div>
                      )}
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '16px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 12
            }}>
              <Space wrap size="middle">
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>
                  <CalendarOutlined style={{ marginRight: 6, color: '#009B60' }} />
                  Lưới lịch đặt sân theo khung giờ:
                </span>
                <DatePicker
                  value={dayjs(selectedDate)}
                  onChange={(d) => {
                    if (d) {
                      const dateStr = d.format('YYYY-MM-DD');
                      setSelectedDate(dateStr);
                      fetchMatrix(dateStr);
                    }
                  }}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  style={{ width: 140 }}
                />
                <Button
                  size="middle"
                  type={selectedDate === getTodayStr() ? 'primary' : 'default'}
                  style={selectedDate === getTodayStr() ? { background: '#009B60', borderColor: '#009B60' } : {}}
                  onClick={() => {
                    const today = getTodayStr();
                    setSelectedDate(today);
                    fetchMatrix(today);
                  }}
                >
                  Hôm nay
                </Button>
                <Button
                  size="middle"
                  type={selectedDate === getTomorrowStr() ? 'primary' : 'default'}
                  style={selectedDate === getTomorrowStr() ? { background: '#009B60', borderColor: '#009B60' } : {}}
                  onClick={() => {
                    const tomorrow = getTomorrowStr();
                    setSelectedDate(tomorrow);
                    fetchMatrix(tomorrow);
                  }}
                >
                  Ngày mai
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => { fetchLiveBoard(); fetchMatrix(selectedDate); }}
                  loading={matrixLoading}
                >
                  Tải lại
                </Button>
              </Space>
            </div>

            <div style={{
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              overflowX: 'auto',
              padding: 8
            }}>
              {matrixLoading && matrixData.courts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  Đang tải sơ đồ lịch sân...
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 6, minWidth: 800 }}>
                  <thead>
                    <tr>
                      <th style={{
                        width: 130,
                        padding: '10px 8px',
                        background: '#f1f5f9',
                        borderRadius: 8,
                        color: '#334155',
                        fontSize: 13,
                        fontWeight: 700,
                        textAlign: 'center',
                        border: '1px solid #cbd5e1'
                      }}>
                        Khung giờ
                      </th>
                      {matrixData.courts.map((court) => (
                        <th key={court._id} style={{
                          minWidth: 160,
                          padding: '10px 8px',
                          background: '#009B60',
                          color: '#ffffff',
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 700,
                          textAlign: 'center',
                          boxShadow: '0 2px 4px rgba(0, 155, 96, 0.2)'
                        }}>
                          <div>{court.name}</div>
                          <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.9 }}>
                            {court.operationalStatus === 'IN_USE' ? 'Đang có khách' : court.operationalStatus === 'CLEANING' ? 'Dọn dẹp' : 'Sẵn sàng'}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.timeSlots.map((slot) => (
                      <tr key={slot._id}>
                        <td style={{
                          padding: '8px',
                          background: '#f8fafc',
                          borderRadius: 8,
                          textAlign: 'center',
                          fontWeight: 700,
                          color: '#1e293b',
                          fontSize: 13,
                          border: '1px solid #e2e8f0'
                        }}>
                          <FieldTimeOutlined style={{ marginRight: 4, color: '#009B60' }} />
                          {slot.startTime} - {slot.endTime}
                        </td>
                        {matrixData.courts.map((court) => {
                          const cell = (matrixData.matrix[court._id] || []).find((c) => c.timeSlotId === slot._id) || {
                            status: 'AVAILABLE'
                          };
                          return renderMatrixCell(court, slot, cell);
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <span>
              <HistoryOutlined /> Lịch sử ca chơi
            </span>
          }
          key="history"
        >
          <Table
            dataSource={historySessions}
            rowKey="_id"
            loading={historyLoading}
            pagination={{
              current: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              onChange: (page) => fetchHistorySessions(page)
            }}
            columns={[
              {
                title: 'Mã ca',
                dataIndex: 'sessionCode',
                key: 'sessionCode',
                render: (code) => <Tag color="blue">{code}</Tag>
              },
              {
                title: 'Sân',
                dataIndex: ['courtId', 'name'],
                key: 'courtName'
              },
              {
                title: 'Khách hàng',
                key: 'customer',
                render: (_, r) => (
                  <div>
                    <span style={{ fontWeight: 600 }}>
                      {r.customerDisplayName || r.bookingId?.customerId?.fullName || 'Khách vãng lai'}
                    </span>
                    {r.isWalkIn && (
                      <Tag color="cyan" style={{ marginLeft: 6, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                        Vãng lai
                      </Tag>
                    )}
                  </div>
                )
              },
              {
                title: 'Giờ nhận sân',
                dataIndex: 'checkInAt',
                key: 'checkInAt',
                render: (d) => d ? new Date(d).toLocaleTimeString('vi-VN') + ' ' + new Date(d).toLocaleDateString('vi-VN') : '--'
              },
              {
                title: 'Giờ trả sân',
                dataIndex: 'checkOutAt',
                key: 'checkOutAt',
                render: (d) => d ? new Date(d).toLocaleTimeString('vi-VN') + ' ' + new Date(d).toLocaleDateString('vi-VN') : '--'
              },
              {
                title: 'Tổng tiền',
                dataIndex: 'totalAmount',
                key: 'totalAmount',
                render: (v) => <b>{(v || 0).toLocaleString('vi-VN')} đ</b>
              },
              {
                title: 'Trạng thái',
                dataIndex: 'status',
                key: 'status',
                render: (st) => (
                  <Tag color={st === 'COMPLETED' ? 'green' : st === 'IN_PROGRESS' ? 'processing' : 'default'}>
                    {st === 'COMPLETED' ? 'Hoàn thành' : st === 'IN_PROGRESS' ? 'Đang chơi' : st}
                  </Tag>
                )
              }
            ]}
          />
        </Tabs.TabPane>
      </Tabs>

      <Modal
        title="Nhận Sân Bắt Đầu Ca Chơi"
        open={checkInModalVisible}
        onCancel={() => setCheckInModalVisible(false)}
        onOk={() => handleCheckInSubmit(false)}
        okText="Xác nhận nhận sân"
        cancelText="Hủy"
        okButtonProps={{ disabled: checkInType === 'walkin' && Boolean(getWalkInCalculationInfo()?.isInvalid) }}
        width={620}
      >
        <div style={{ marginBottom: 14 }}>
          <Radio.Group
            value={checkInType}
            onChange={(e) => setCheckInType(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="booking">Từ Đơn Đặt Trước</Radio.Button>
            <Radio.Button value="walkin">Khách Vãng Lai Tại Quầy</Radio.Button>
          </Radio.Group>
        </div>

        {earlyCheckInAlert && (
          <Alert
            message="Xác nhận vào sân sớm"
            description={
              <div>
                <p style={{ margin: '4px 0 10px 0' }}>{earlyCheckInAlert.message}</p>
                <Space>
                  <Button
                    type="primary"
                    size="small"
                    style={{ background: '#2563eb', borderColor: '#2563eb' }}
                    onClick={() => {
                      setAcceptEarlyCheckInState(true);
                      handleCheckInSubmit(true);
                    }}
                  >
                    Đồng ý tính thêm phụ phí và vào sân
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setEarlyCheckInAlert(null);
                      setAcceptEarlyCheckInState(false);
                    }}
                  >
                    Không đồng ý (Chờ đúng giờ)
                  </Button>
                </Space>
              </div>
            }
            type="warning"
            showIcon
            style={{ marginBottom: 14 }}
          />
        )}

        <Form form={checkInForm} layout="vertical">
          {checkInType === 'booking' ? (
            <Form.Item
              name="bookingId"
              label="Chọn đơn đặt sân đã xác nhận"
              rules={[{ required: true, message: 'Vui lòng chọn đơn đặt sân!' }]}
              style={{ marginBottom: 12 }}
            >
              <Select placeholder="Chọn khách hàng hoặc mã đơn...">
                {confirmedBookings.map((b) => {
                  const bState = getBookingCheckInState(b, null);
                  return (
                    <Option key={b._id} value={b._id} disabled={!bState.canCheckIn}>
                      {b.bookingCode} - {b.customerId?.fullName || b.customerDisplayName || 'Khách đặt'} ({b.startTime} - {b.endTime} tại {b.courtId?.name || b.courtId?.courtName}) {!bState.canCheckIn ? `— [${bState.reason}]` : ''}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          ) : (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="courtId"
                    label="Chọn sân"
                    rules={[{ required: true, message: 'Vui lòng chọn sân!' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <Select placeholder="Chọn sân...">
                      {((matrixData.courts && matrixData.courts.length > 0) ? matrixData.courts : courtsData).map(c => {
                        const liveCourt = courtsData.find(cd => cd._id === c._id);
                        const isOccupied = liveCourt?.operationalStatus === 'IN_USE' || c.operationalStatus === 'IN_USE';
                        return (
                          <Option key={c._id} value={c._id} disabled={isOccupied}>
                            {c.name || c.courtName} {isOccupied ? ' — [Đang bận]' : ''}
                          </Option>
                        );
                      })}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="timeSlotId"
                    label="Khung giờ ca đấu"
                    rules={[{ required: true, message: 'Vui lòng chọn khung giờ ca đấu!' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <Select placeholder="Chọn khung giờ..." popupMatchSelectWidth={false}>
                      {((availableTimeSlots && availableTimeSlots.length > 0) ? availableTimeSlots : (matrixData.timeSlots || [])).map((slot) => {
                        const [sh, sm] = (slot.startTime || '00:00').split(':').map(Number);
                        const [endH, endM] = (slot.endTime || '00:00').split(':').map(Number);
                        const slotStartMinutes = sh * 60 + sm;
                        const slotEndMinutes = endH * 60 + endM;
                        const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

                        const isPastDate = selectedDate < getTodayStr();
                        const isFutureDate = selectedDate > getTodayStr();
                        const isToday = selectedDate === getTodayStr();

                        const isPast = isPastDate || (isToday && slotEndMinutes <= nowMinutes);
                        const isFuture = isFutureDate || (isToday && (slotStartMinutes - nowMinutes > 15));
                        const isDisabled = isPast || isFuture;

                        const cleanLabel = slot.label ? slot.label.replace(/\s*\([^)]*\)/g, '').trim() : '';
                        const displayTitle = cleanLabel ? `${slot.startTime} - ${slot.endTime} • ${cleanLabel}` : `${slot.startTime} - ${slot.endTime}`;

                        let statusTag = '';
                        if (isPast) statusTag = ' — [Đã qua giờ]';
                        else if (isFuture) statusTag = ' — [Chưa tới giờ]';

                        return (
                          <Option key={slot._id} value={slot._id} disabled={isDisabled}>
                            {displayTitle}{statusTag}
                          </Option>
                        );
                      })}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="walkInCustomerName"
                    label="Tên khách hàng"
                    rules={[{ required: true, message: 'Vui lòng nhập tên khách!' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <Input placeholder="Nhập họ và tên..." />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="walkInCustomerPhone" label="Số điện thoại" style={{ marginBottom: 12 }}>
                    <Input placeholder="0987654321 (tùy chọn)" />
                  </Form.Item>
                </Col>
              </Row>

              {checkInType === 'walkin' && (() => {
                const info = getWalkInCalculationInfo();
                if (!info) return null;
                if (info.isInvalid) {
                  return (
                    <Alert
                      message={info.message}
                      type="warning"
                      showIcon
                      style={{ marginBottom: 12 }}
                    />
                  );
                }
                return (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '10px 14px',
                    marginBottom: 12
                  }}>
                    <Row gutter={16} align="middle">
                      <Col span={14}>
                        <div style={{ fontSize: 13, marginBottom: 2 }}>
                          <span style={{ color: '#64748b' }}>Giờ chơi: </span>
                          <b>{info.inTime}</b>
                          <span style={{ color: '#94a3b8', margin: '0 6px' }}>–</span>
                          <b style={{ color: '#2563eb' }}>{info.outTime}</b>
                          <Tag color="blue" style={{ marginLeft: 8, fontSize: 11, padding: '0 6px', lineHeight: '18px' }}>
                            {info.billedMinutes} phút
                          </Tag>
                        </div>
                        {info.isProrated ? (
                          <div style={{ fontSize: 11, color: '#059669', fontStyle: 'italic' }}>
                            ✓ Khách vào giữa ca: Tự động tính cước theo giờ thực tế
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>
                            Trọn ca thi đấu tiêu chuẩn
                          </div>
                        )}
                      </Col>
                      <Col span={10} style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Tạm tính tiền sân</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: '#009B60' }}>
                          {info.fee.toLocaleString('vi-VN')} đ
                        </div>
                      </Col>
                    </Row>
                  </div>
                );
              })()}
            </>
          )}

          <Form.Item name="note" label="Ghi chú" style={{ marginBottom: 0 }}>
            <Input placeholder="Yêu cầu riêng của khách (nếu có)..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Gia Hạn Thời Gian Chơi"
        open={extendModalVisible}
        onCancel={() => setExtendModalVisible(false)}
        onOk={handleExtendSubmit}
        okText="Xác nhận gia hạn"
        cancelText="Đóng"
      >
        {selectedSessionForExtend && (
          <div>
            <p><b>Mã ca:</b> {selectedSessionForExtend.sessionCode}</p>
            <p><b>Thời gian kết thúc hiện tại:</b> {selectedSessionForExtend.scheduledEndTime ? new Date(selectedSessionForExtend.scheduledEndTime).toLocaleTimeString('vi-VN') : '--'}</p>
            <Divider />

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                Thời gian gia hạn thêm:
              </label>
              <Radio.Group
                value={extendDuration}
                onChange={(e) => setExtendDuration(e.target.value)}
                buttonStyle="solid"
                size="large"
              >
                <Radio.Button value={30}>+ 30 Phút (+50.000 đ)</Radio.Button>
                <Radio.Button value={60}>+ 60 Phút (+100.000 đ)</Radio.Button>
              </Radio.Group>
            </div>

            {extendConflict && (
              <Alert
                message="Xung đột lịch với ca tiếp theo"
                description={
                  <div>
                    <p>{extendConflict.message}</p>
                    <p>Các sân trống có thể chuyển đổi: {extendConflict.alternateCourts?.map(c => c.name).join(', ')}</p>
                  </div>
                }
                type="warning"
                showIcon
              />
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="Chuyển Ca Chơi Sang Sân Khác"
        open={switchCourtModalVisible}
        onCancel={() => setSwitchCourtModalVisible(false)}
        onOk={handleSwitchCourtSubmit}
        okText="Chuyển sân"
        cancelText="Hủy"
      >
        <Form form={switchCourtForm} layout="vertical">
          <Form.Item
            name="newCourtId"
            label="Chọn sân mới"
            rules={[{ required: true, message: 'Vui lòng chọn sân mới!' }]}
          >
            <Select placeholder="Chọn sân khả dụng...">
              {availableCourtsForSwitch.map((c) => (
                <Option key={c._id} value={c._id}>{c.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="reason" label="Lý do chuyển sân">
            <Input placeholder="Ví dụ: Đèn sân chập chờn / Nhường sân ca sau..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Trả Sân & Xuất Hóa Đơn"
        open={checkOutModalVisible}
        onCancel={() => setCheckOutModalVisible(false)}
        onOk={handleCheckOutSubmit}
        confirmLoading={checkoutSubmitting}
        okText="Xác nhận trả sân"
        cancelText="Đóng"
      >
        {selectedSessionForCheckOut && (
          <div>
            <div style={{ background: '#f9fafb', padding: 14, borderRadius: 8, marginBottom: 16 }}>
              <p style={{ margin: '4px 0' }}><b>Mã ca:</b> {selectedSessionForCheckOut.sessionCode}</p>
              <p style={{ margin: '4px 0' }}><b>Sân:</b> {selectedSessionForCheckOut.courtId?.name}</p>
              <p style={{ margin: '4px 0' }}><b>Tiền giờ cơ sở:</b> {(selectedSessionForCheckOut.baseCourtFee || 0).toLocaleString('vi-VN')} đ</p>
              {selectedSessionForCheckOut.earlyCheckInFee > 0 && (
                <p style={{ margin: '4px 0', color: '#f59e0b' }}>
                  <b>Phí vào sớm:</b> +{selectedSessionForCheckOut.earlyCheckInFee.toLocaleString('vi-VN')} đ
                </p>
              )}
              {selectedSessionForCheckOut.extensions?.length > 0 && (
                <p style={{ margin: '4px 0', color: '#2563eb' }}>
                  <b>Phí gia hạn:</b> +{selectedSessionForCheckOut.extensions.reduce((s, e) => s + e.extendedFee, 0).toLocaleString('vi-VN')} đ
                </p>
              )}
            </div>

            <Alert
              message="Xác nhận trả sân"
              description="Nhân viên kiểm tra trang thiết bị và xác nhận để tiến hành thanh toán hóa đơn."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <p style={{ fontSize: 13, color: '#6b7280' }}>
              Sau khi xác nhận, sân sẽ chuyển sang trạng thái <b>ĐANG DỌN DẸP</b> và hệ thống sẽ tự động tạo hóa đơn thanh toán tại quầy.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#009B60' }}>
            <DollarOutlined />
            <span>Thanh Toán Hóa Đơn Ca Chơi {checkoutInvoice?.invoiceCode}</span>
          </div>
        }
        open={settleSessionModalVisible}
        onCancel={() => setSettleSessionModalVisible(false)}
        onOk={handleConfirmSessionPayment}
        confirmLoading={submittingSessionSettle}
        okText="Xác nhận thanh toán & Chốt ca"
        cancelText="Đóng"
        width={500}
      >
        {checkoutInvoice && (() => {
          const sub = Number(checkoutInvoice.subtotal) || Number(checkoutInvoice.totalAmount) || 0;
          const finalAmt = Math.max(0, sub - sessionDiscountAmount);
          const numCash = Number(sessionCashReceived) || 0;
          const changeAmt = numCash >= finalAmt ? numCash - finalAmt : 0;
          return (
            <div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 14, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Khách hàng:</span>
                  <b>{checkoutInvoice.customer?.fullName || 'Khách lẻ'}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Sân thi đấu:</span>
                  <b>{checkoutInvoice.sessionDetails?.courtName || '--'}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Tiền giờ chơi:</span>
                  <span>{(checkoutInvoice.sessionDetails?.baseCourtFee || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                {checkoutInvoice.sessionDetails?.earlyCheckInFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#2563eb' }}>
                    <span>Phụ phí vào sớm:</span>
                    <span>+ {(checkoutInvoice.sessionDetails.earlyCheckInFee).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                {checkoutInvoice.sessionDetails?.extensionFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#8b5cf6' }}>
                    <span>Tiền gia hạn thêm giờ:</span>
                    <span>+ {(checkoutInvoice.sessionDetails.extensionFee).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                {checkoutInvoice.sessionDetails?.consumableFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#0d9488' }}>
                    <span>Nước uống / Dịch vụ / Thuê đồ:</span>
                    <span>+ {(checkoutInvoice.sessionDetails.consumableFee).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                {checkoutInvoice.sessionDetails?.rentalDamageFee > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#ea580c' }}>
                    <span>Bồi thường đồ thuê:</span>
                    <span>+ {(checkoutInvoice.sessionDetails.rentalDamageFee).toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                {Array.isArray(checkoutInvoice.items) && checkoutInvoice.items.length > 0 && (
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dotted #cbd5e1', fontSize: 12, color: '#475569' }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>Chi tiết mặt hàng sử dụng:</div>
                    {checkoutInvoice.items.map((it, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 6 }}>
                        <span>• {it.productName} x{it.quantity}</span>
                        <span>{(it.subtotal || it.unitPrice * it.quantity).toLocaleString('vi-VN')} đ</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTop: '1px dashed #cbd5e1' }}>
                  <span>Tạm tính ca chơi:</span>
                  <b>{sub.toLocaleString('vi-VN')} đ</b>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <Row gutter={8}>
                  <Col span={15}>
                    <Input
                      placeholder="Nhập mã voucher (nếu có)..."
                      value={sessionVoucherCode}
                      onChange={(e) => setSessionVoucherCode(e.target.value.toUpperCase())}
                      disabled={Boolean(sessionAppliedVoucher)}
                      prefix={<TagOutlined style={{ color: '#009B60' }} />}
                    />
                  </Col>
                  <Col span={9}>
                    {sessionAppliedVoucher ? (
                      <Button danger block onClick={handleRemoveSessionVoucher}>
                        Hủy mã
                      </Button>
                    ) : (
                      <Button
                        type="primary"
                        block
                        loading={validatingSessionVoucher}
                        onClick={handleApplySessionVoucher}
                        style={{ background: '#009B60', borderColor: '#009B60' }}
                      >
                        Áp dụng
                      </Button>
                    )}
                  </Col>
                </Row>
                {sessionAppliedVoucher && (
                  <div style={{ fontSize: 12, color: '#059669', marginTop: 4 }}>
                    ✓ Đã giảm: {sessionDiscountAmount.toLocaleString('vi-VN')} đ
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Text strong style={{ fontSize: 15 }}>Tổng cần thu:</Text>
                <Text style={{ fontSize: 20, fontWeight: 800, color: '#009B60' }}>
                  {finalAmt.toLocaleString('vi-VN')} đ
                </Text>
              </div>

              <div style={{ marginBottom: 14 }}>
                <Radio.Group
                  value={sessionPaymentMethod}
                  onChange={(e) => setSessionPaymentMethod(e.target.value)}
                  buttonStyle="solid"
                  style={{ width: '100%', display: 'flex' }}
                >
                  <Radio.Button value="CASH" style={{ flex: 1, textAlign: 'center' }}>
                    Tiền mặt
                  </Radio.Button>
                  <Radio.Button value="TRANSFER" style={{ flex: 1, textAlign: 'center' }}>
                    Chuyển khoản VietQR
                  </Radio.Button>
                </Radio.Group>
              </div>

              {sessionPaymentMethod === 'CASH' ? (
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Tiền khách đưa:</div>
                  <InputNumber
                    style={{ width: '100%', fontSize: 16, fontWeight: 700, marginBottom: 8 }}
                    value={sessionCashReceived}
                    onChange={(val) => setSessionCashReceived(val || 0)}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                    placeholder="Nhập số tiền khách đưa..."
                    addonAfter="đ"
                    size="large"
                  />
                  <Space size={6} wrap style={{ marginBottom: 10 }}>
                    {[finalAmt, 50000, 100000, 200000, 500000].map((amt, idx) => (
                      <Button
                        key={idx}
                        size="small"
                        onClick={() => setSessionCashReceived(amt)}
                        style={{ fontSize: 12 }}
                      >
                        {amt === finalAmt ? `Đủ tiền (${amt.toLocaleString('vi-VN')} đ)` : `${amt.toLocaleString('vi-VN')} đ`}
                      </Button>
                    ))}
                  </Space>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, paddingTop: 6, borderTop: '1px dashed #cbd5e1' }}>
                    <span style={{ fontWeight: 600 }}>Tiền thừa trả khách:</span>
                    <span style={{ fontWeight: 800, color: changeAmt > 0 ? '#2563eb' : '#059669', fontSize: 16 }}>
                      {changeAmt.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', background: '#f8fafc', padding: 14, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                    Quét mã QR qua ứng dụng ngân hàng để thanh toán:
                  </div>
                  <img
                    src={`https://img.vietqr.io/image/MB-0382379374-compact2.png?amount=${finalAmt}&addInfo=${encodeURIComponent(`HD ${checkoutInvoice.invoiceCode}`)}&accountName=SAN%20CAU%20LONG%20BCMS`}
                    alt="VietQR"
                    style={{ maxWidth: 180, borderRadius: 8, border: '1px solid #cbd5e1' }}
                  />
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarOutlined style={{ color: '#009B60' }} />
            <span>Thông Tin Lượt Đặt Sân</span>
          </div>
        }
        open={bookingModalVisible}
        onCancel={() => setBookingModalVisible(false)}
        footer={null}
        width={560}
      >
        {selectedSlotCell?.cell?.booking && (
          <div>
            {selectedSlotCell.cell.isLate && (
              <Alert
                message={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#c2410c' }}>
                    <ExclamationCircleOutlined />
                    Khách hàng đang đến trễ {selectedSlotCell.cell.lateMinutes} phút
                  </div>
                }
                description={
                  <div>
                    <p style={{ margin: '6px 0 10px 0', color: '#7c2d12', fontSize: 13, lineHeight: '20px' }}>
                      Hệ thống <b>không tự động hủy đơn</b> khi khách đến trễ. Nhân viên vui lòng gọi điện thoại cho khách theo số bên dưới để xác nhận tình trạng. Chỉ khi xác nhận khách chắc chắn không đến, nhân viên mới thực hiện hủy đơn.
                    </p>
                    <Button
                      type="primary"
                      icon={<PhoneOutlined />}
                      href={`tel:${selectedSlotCell.cell.booking.customer?.phone}`}
                      style={{ background: '#2563eb', borderColor: '#2563eb' }}
                    >
                      Gọi ngay: {selectedSlotCell.cell.booking.customer?.phone || 'Chưa có SĐT'}
                    </Button>
                  </div>
                }
                type="warning"
                showIcon={false}
                style={{ marginBottom: 16, border: '1.5px solid #fb923c', background: '#fff7ed', borderRadius: 8 }}
              />
            )}

            <div style={{
              background: '#f8fafc',
              padding: '16px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              marginBottom: 20
            }}>
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Text type="secondary">Sân thi đấu:</Text>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
                    {selectedSlotCell.court.name}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Khung giờ đặt:</Text>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#009B60' }}>
                    {selectedSlotCell.slot.startTime} - {selectedSlotCell.slot.endTime}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Mã đơn đặt:</Text>
                  <div>
                    <Tag color="blue">{selectedSlotCell.cell.booking.bookingCode}</Tag>
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Trạng thái thanh toán:</Text>
                  <div>
                    <Tag color={selectedSlotCell.cell.booking.paymentStatus === 'PAID' ? 'green' : 'orange'}>
                      {selectedSlotCell.cell.booking.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </Tag>
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Khách hàng:</Text>
                  <div style={{ fontWeight: 600 }}>
                    <UserOutlined style={{ marginRight: 6, color: '#6b7280' }} />
                    {selectedSlotCell.cell.booking.customer?.fullName || selectedSlotCell.cell.booking.customerDisplayName || 'Khách lẻ'}
                    {selectedSlotCell.cell.booking.isWalkIn && (
                      <Tag color="cyan" style={{ marginLeft: 6, fontSize: 11 }}>Khách vãng lai</Tag>
                    )}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Số điện thoại:</Text>
                  <div style={{ fontWeight: 600, color: '#2563eb' }}>
                    <PhoneOutlined style={{ marginRight: 6 }} />
                    <a href={`tel:${selectedSlotCell.cell.booking.customer?.phone}`}>
                      {selectedSlotCell.cell.booking.customer?.phone || '--'}
                    </a>
                  </div>
                </Col>
                {selectedSlotCell.cell.booking.note && (
                  <Col span={24}>
                    <Text type="secondary">Ghi chú:</Text>
                    <div style={{ fontStyle: 'italic', color: '#4b5563' }}>
                      {selectedSlotCell.cell.booking.note}
                    </div>
                  </Col>
                )}
              </Row>
            </div>

            {(() => {
              const bCheckInState = getBookingCheckInState(selectedSlotCell.cell.booking, selectedSlotCell.slot);
              return (
                <>
                  {bCheckInState.isPast && (
                    <Alert
                      message="Ca đấu này đã kết thúc trong quá khứ. Không thể nhận sân."
                      type="error"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  )}
                  {bCheckInState.isFuture && (
                    <Alert
                      message="Chưa đến thời gian nhận sân cho ca đấu này. Hệ thống chỉ cho phép nhận sân trước giờ bắt đầu tối đa 15 phút."
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <Button onClick={() => setBookingModalVisible(false)}>
                      Đóng
                    </Button>

                    {(selectedSlotCell.cell.status === 'CONFIRMED' || selectedSlotCell.cell.status === 'PENDING') && (
                      <>
                        <Button
                          danger
                          icon={<CloseCircleOutlined />}
                          onClick={() => {
                            setCancelReason('Khách đến trễ, nhân viên đã gọi điện thoại xác nhận khách không đến chơi.');
                            setCancelModalVisible(true);
                          }}
                        >
                          Hủy đơn
                        </Button>

                        <Button
                          type="primary"
                          icon={<PlayCircleOutlined />}
                          disabled={!bCheckInState.canCheckIn}
                          style={{
                            background: !bCheckInState.canCheckIn ? '#94a3b8' : '#009B60',
                            borderColor: !bCheckInState.canCheckIn ? '#94a3b8' : '#009B60',
                            cursor: !bCheckInState.canCheckIn ? 'not-allowed' : 'pointer'
                          }}
                          onClick={() => handleCheckInDirectFromBooking(selectedSlotCell.cell.booking._id, selectedSlotCell.court._id)}
                        >
                          Nhận sân ngay
                        </Button>
                      </>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </Modal>

      <Modal
        title="Xác Nhận Hủy Đơn Đặt Sân"
        open={cancelModalVisible}
        onCancel={() => setCancelModalVisible(false)}
        onOk={handleCancelBookingSubmit}
        okText="Xác nhận hủy đơn"
        cancelText="Bỏ qua"
        okButtonProps={{ danger: true, loading: cancelLoading }}
      >
        <Alert
          message="Lưu ý quan trọng"
          description="Nhân viên chỉ bấm hủy đơn sau khi đã gọi điện thoại liên hệ trực tiếp cho khách hàng và xác nhận khách không đến sân."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form layout="vertical">
          <Form.Item label="Lý do hủy đơn" required>
            <Input.TextArea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Nhập lý do hủy đơn sau khi liên hệ khách..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
