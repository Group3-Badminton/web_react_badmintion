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
  TimePicker,
  Checkbox,
  Popconfirm,
  Tooltip,
  Badge,
  Segmented,
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
  CoffeeOutlined,
  UnorderedListOutlined,
  BarChartOutlined,
  AppstoreOutlined
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

const normalizeCourtType = (type) => {
  if (!type) return 'STANDARD';
  const t = String(type).trim().toUpperCase();
  if (t === 'VIP' || t.includes('VIP') || t.includes('GỖ')) return 'VIP';
  if (t === 'PREMIUM' || t.includes('PREMIUM') || t.includes('THI ĐẤU') || t.includes('PVC')) return 'PREMIUM';
  return 'STANDARD';
};

const getCourtTypeName = (type) => {
  const norm = normalizeCourtType(type);
  if (norm === 'VIP') return 'Sân VIP';
  if (norm === 'PREMIUM') return 'Sân Thi Đấu';
  return 'Sân Tiêu Chuẩn';
};

const renderCourtTypeTag = (type) => {
  const norm = normalizeCourtType(type);
  if (norm === 'VIP') return <Tag color="gold">Sân VIP</Tag>;
  if (norm === 'PREMIUM') return <Tag color="purple">Sân Thi Đấu</Tag>;
  return <Tag color="green">Sân Tiêu Chuẩn</Tag>;
};

const START_OF_DAY_MIN = 360;
const END_OF_DAY_MIN = 1380;
const TOTAL_DAY_MIN = 1020;
const TIMELINE_HOUR_MARKS = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '23:00'];

const parseTimeToMinutes = (tStr) => {
  if (!tStr || typeof tStr !== 'string' || !tStr.includes(':')) return 0;
  const [h, m] = tStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const getTimelinePosition = (startTimeStr, endTimeStr) => {
  const sMin = Math.max(START_OF_DAY_MIN, Math.min(END_OF_DAY_MIN, parseTimeToMinutes(startTimeStr)));
  const eMin = Math.max(START_OF_DAY_MIN, Math.min(END_OF_DAY_MIN, parseTimeToMinutes(endTimeStr)));
  const leftPct = ((sMin - START_OF_DAY_MIN) / TOTAL_DAY_MIN) * 100;
  const widthPct = Math.max(3, ((eMin - sMin) / TOTAL_DAY_MIN) * 100);
  return { left: `${leftPct}%`, width: `${widthPct}%` };
};

export default function PlayingSessionPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('live_status');
  const [courtsData, setCourtsData] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [matrixData, setMatrixData] = useState({ courts: [], timeSlots: [], matrix: {}, bookings: [] });
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [scheduleViewMode, setScheduleViewMode] = useState('GRID');
  const [gridStep, setGridStep] = useState(15);
  const [courtScheduleFilter, setCourtScheduleFilter] = useState('ALL');

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

  const [walkInStartTime, setWalkInStartTime] = useState(dayjs());
  const [walkInEndTime, setWalkInEndTime] = useState(dayjs().add(1, 'hour'));

  const selectedBookingId = Form.useWatch('bookingId', checkInForm);

  const getBookingCheckInState = (booking) => {
    if (!booking) return { canCheckIn: false, reason: '' };
    const bDate = booking.bookingDate ? booking.bookingDate.split('T')[0] : selectedDate;
    const today = getTodayStr();
    if (bDate < today) {
      return { canCheckIn: false, isPast: true, reason: 'Đã qua ngày' };
    }
    if (bDate > today) {
      return { canCheckIn: false, isFuture: true, reason: 'Chưa tới ngày' };
    }
    const [eh, em] = (booking.endTime || '00:00').split(':').map(Number);
    const [sh, sm] = (booking.startTime || '00:00').split(':').map(Number);
    const sMin = sh * 60 + sm;
    const eMin = eh * 60 + em;
    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();

    if (nowMin >= eMin) {
      return { canCheckIn: false, isPast: true, reason: 'Đã qua giờ' };
    }
    if (sMin - nowMin > 15) {
      const earlyMin = sMin - nowMin;
      return { canCheckIn: true, isEarly: true, earlyMinutes: earlyMin, reason: `Đến sớm ${earlyMin}p` };
    }
    return { canCheckIn: true, isEarly: false };
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
    fetchMatrix(selectedDate, 15);
    fetchLiveBoard();
    const pollInterval = setInterval(() => {
      fetchMatrix(selectedDate, 15);
      fetchLiveBoard(false);
    }, 15000);
    return () => clearInterval(pollInterval);
  }, [selectedDate]);

  const fetchMatrix = async (date = selectedDate, step = 15) => {
    setMatrixLoading(true);
    try {
      const res = await sessionService.getCourtMatrix(date, step);
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
    if (key === 'live_status') {
      fetchLiveBoard();
    } else if (key === 'schedule') {
      fetchLiveBoard();
      fetchMatrix(selectedDate, 15);
    }
  };

  const handleCellClick = async (court, slot, cell) => {
    const isToday = selectedDate === getTodayStr();
    const isPastDate = selectedDate < getTodayStr();

    const [sh, sm] = (slot.startTime || '00:00').split(':').map(Number);
    const [eh, em] = (slot.endTime || '00:00').split(':').map(Number);
    const slotStartMin = sh * 60 + sm;
    const slotEndMin = eh * 60 + em;
    const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();

    const isSlotPast = isPastDate || (isToday && slotEndMin <= nowMin);
    const isSlotFuture = !isPastDate && (isToday ? (slotStartMin > nowMin + 15) : true);

    if (cell.status === 'AVAILABLE') {
      if (isSlotPast) {
        message.warning('Khung giờ này đã kết thúc trong quá khứ, không thể nhận sân!');
        return;
      }

      if (!isToday || isSlotFuture) {
        message.warning('Khách vãng lai chỉ được nhận sân chơi ngay tại thời điểm hiện tại, không nhận thời điểm tương lai hoặc quá khứ!');
        return;
      }

      setSelectedCourtForCheckIn(court);
      setCheckInType('walkin');
      setEarlyCheckInAlert(null);
      setAcceptEarlyCheckInState(false);

      const now = dayjs();
      const m = now.minute();
      const remainder = m % 15;
      const minutesToAdd = remainder === 0 ? 0 : (15 - remainder);
      const nowRounded = now.add(minutesToAdd, 'minute').second(0).millisecond(0);

      const cellStart = dayjs().hour(sh).minute(sm).second(0).millisecond(0);
      const startToUse = cellStart.isBefore(nowRounded) ? nowRounded : cellStart;
      const endToUse = startToUse.add(1, 'hour').second(0).millisecond(0);

      setWalkInStartTime(startToUse);
      setWalkInEndTime(endToUse);

      try {
        const bRes = await bookingService.getAllBookings({ status: 'CONFIRMED', limit: 50 });
        const bookings = bRes?.data?.bookings || bRes?.data || [];
        setConfirmedBookings(Array.isArray(bookings) ? bookings : []);
      } catch (e) {}

      checkInForm.resetFields();
      checkInForm.setFieldsValue({
        courtId: court._id,
        walkInCustomerName: '',
        walkInCustomerPhone: ''
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

  const openCheckInModal = async (court = null, defaultType = 'walkin') => {
    setSelectedCourtForCheckIn(court);
    setCheckInType(defaultType);
    setEarlyCheckInAlert(null);
    setAcceptEarlyCheckInState(false);
    checkInForm.resetFields();

    const now = dayjs();
    const m = now.minute();
    const remainder = m % 15;
    const minutesToAdd = remainder === 0 ? 0 : (15 - remainder);
    const startRounded = now.add(minutesToAdd, 'minute').second(0).millisecond(0);
    setWalkInStartTime(startRounded);
    setWalkInEndTime(startRounded.add(1, 'hour').second(0).millisecond(0));

    try {
      const res = await bookingService.getAllBookings({ status: 'CONFIRMED', limit: 50 });
      const bookings = res?.data?.bookings || res?.data || [];
      setConfirmedBookings(Array.isArray(bookings) ? bookings : []);
    } catch (e) {
      setConfirmedBookings([]);
    }

    const firstAvailableCourt = (matrixData.courts || courtsData).find(c => {
      const live = courtsData.find(cd => cd._id === c._id);
      return live ? live.operationalStatus !== 'IN_USE' : c.operationalStatus !== 'IN_USE';
    });

    const initValues = {
      courtId: court ? court._id : (firstAvailableCourt?._id || matrixData.courts[0]?._id),
      walkInCustomerName: '',
      walkInCustomerPhone: ''
    };
    checkInForm.setFieldsValue(initValues);
    setCheckInModalVisible(true);
  };

  const handleCheckInSubmit = async (forceAcceptEarly = false) => {
    try {
      const values = await checkInForm.validateFields();



      const durMin = (walkInEndTime.hour() * 60 + walkInEndTime.minute()) - (walkInStartTime.hour() * 60 + walkInStartTime.minute());

      if (checkInType === 'walkin') {
        if (durMin < 60) {
          message.warning('Thời lượng chơi tối thiểu cho khách vãng lai phải từ 1 tiếng (60 phút) trở lên!');
          return;
        }
      } else if (checkInType === 'booking') {
        const booking = confirmedBookings.find(b => b._id === values.bookingId);
        if (booking) {
          const bState = getBookingCheckInState(booking);
          if (!bState.canCheckIn) {
            message.warning(bState.reason || 'Đơn đặt sân này không thể nhận sân ở thời điểm hiện tại!');
            return;
          }
          if (bState.isEarly && !acceptEarlyCheckInState && !forceAcceptEarly) {
            message.warning(`Khách đến sớm hơn ${bState.earlyMinutes} phút. Vui lòng tick chọn 'Đồng ý nhận sân sớm' để tiếp tục!`);
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
        startTime: checkInType === 'walkin' ? walkInStartTime.format('HH:mm') : undefined,
        endTime: checkInType === 'walkin' ? walkInEndTime.format('HH:mm') : undefined,
        durationHours: checkInType === 'walkin' ? Number((durMin / 60).toFixed(2)) : 1,
        walkInCustomerName: values.walkInCustomerName || 'Khách vãng lai',
        walkInCustomerPhone: values.walkInCustomerPhone || '',
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
      const errorMsg = err.response?.data?.message || err.message || 'Không thể thực hiện thao tác';
      message.error(errorMsg);
    }
  };

  const openExtendModal = (session) => {
    setSelectedSessionForExtend(session);
    setExtendConflict(null);

    const currentCourtId = (session.courtId?._id || session.courtId)?.toString();
    const currentBookingId = (session.bookingId?._id || session.bookingId || session.booking?._id)?.toString();

    let sessionEndMin = 0;
    if (session.scheduledEndTime) {
      const endD = new Date(session.scheduledEndTime);
      sessionEndMin = endD.getHours() * 60 + endD.getMinutes();
    } else if (session.booking?.endTime) {
      const [eh, em] = session.booking.endTime.split(':').map(Number);
      sessionEndMin = eh * 60 + em;
    }

    const courtBookings = (matrixData.bookings || [])
      .filter((b) => {
        const bCourtId = (b.courtId?._id || b.courtId)?.toString();
        if (bCourtId !== currentCourtId) return false;
        if (currentBookingId && b._id?.toString() === currentBookingId) return false;
        if (!['CONFIRMED', 'CHECKED_IN'].includes(b.status)) return false;
        return true;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const nextBooking = courtBookings.find((b) => {
      const [bsh, bsm] = b.startTime.split(':').map(Number);
      const bStartMin = bsh * 60 + bsm;
      const [beh, bem] = b.endTime.split(':').map(Number);
      const bEndMin = beh * 60 + bem;
      return bEndMin > sessionEndMin;
    });

    let headroomMin = 999;
    if (nextBooking) {
      const [nbStartH, nbStartM] = nextBooking.startTime.split(':').map(Number);
      const nbStartMin = nbStartH * 60 + nbStartM;
      headroomMin = Math.max(0, nbStartMin - sessionEndMin);
    }

    if (headroomMin < 30) {
      setExtendDuration(0);
    } else if (headroomMin < 60) {
      setExtendDuration(30);
    } else {
      setExtendDuration(30);
    }

    setExtendModalVisible(true);
  };

  const handleExtendSubmit = async () => {
    if (!selectedSessionForExtend) return;
    if (!extendDuration || extendDuration <= 0) {
      message.error('Không thể gia hạn: Sân đã có ca tiếp theo hoặc không đủ thời gian tối thiểu 30 phút!');
      return;
    }
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

    const currentCourtId = (session.courtId?._id || session.courtId)?.toString();
    const currentCourt = courtsData.find((c) => c._id?.toString() === currentCourtId);
    const currentType = normalizeCourtType(currentCourt?.courtType || session.courtId?.courtType);

    const now = currentTime;
    const nowH = String(now.getHours()).padStart(2, '0');
    const nowM = String(now.getMinutes()).padStart(2, '0');
    const nowHoursStr = `${nowH}:${nowM}`;

    let endHoursStr = '23:59';
    if (session.scheduledEndTime) {
      const endD = new Date(session.scheduledEndTime);
      endHoursStr = `${String(endD.getHours()).padStart(2, '0')}:${String(endD.getMinutes()).padStart(2, '0')}`;
    } else if (session.bookingId?.endTime || session.booking?.endTime) {
      endHoursStr = session.bookingId?.endTime || session.booking?.endTime;
    }

    const currentBookingId = (session.bookingId?._id || session.bookingId || session.booking?._id)?.toString();

    const sameTypeCourts = courtsData
      .filter(
        (c) =>
          c._id?.toString() !== currentCourtId &&
          c.status === 'ACTIVE' &&
          normalizeCourtType(c.courtType) === currentType
      )
      .map((court) => {
        const isOccupied = court.operationalStatus === 'IN_USE';
        if (isOccupied) {
          return {
            ...court,
            hasConflict: true,
            conflictReason: 'Đang có người chơi'
          };
        }

        const overlappingBooking = (matrixData.bookings || []).find((b) => {
          const bCourtId = (b.courtId?._id || b.courtId)?.toString();
          if (bCourtId !== court._id?.toString()) return false;
          if (currentBookingId && b._id?.toString() === currentBookingId) return false;
          if (!['CONFIRMED', 'CHECKED_IN'].includes(b.status)) return false;
          return b.startTime < endHoursStr && b.endTime > nowHoursStr;
        });

        if (overlappingBooking) {
          return {
            ...court,
            hasConflict: true,
            conflictReason: `Trùng lịch: Khách ${overlappingBooking.customerName || 'đặt trước'} (${overlappingBooking.startTime} - ${overlappingBooking.endTime})`
          };
        }

        return {
          ...court,
          hasConflict: false,
          conflictReason: null
        };
      });

    setAvailableCourtsForSwitch(sameTypeCourts);
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

  const renderMatrixCell = (court, slot, cell, spanCount = 1) => {
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

    let isNearEnd = false;
    let isOvertime = false;
    let remainingMin = null;
    let sessionEndTime = null;

    if (isInProgress) {
      if (cell.session?.scheduledEndTime) {
        sessionEndTime = new Date(cell.session.scheduledEndTime);
      } else if (cell.booking?.endTime) {
        const [beh, bem] = cell.booking.endTime.split(':').map(Number);
        const now = currentTime;
        sessionEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), beh, bem, 0, 0);
      }

      if (sessionEndTime) {
        const diffMs = sessionEndTime.getTime() - currentTime.getTime();
        const diffMin = diffMs / 60000;
        if (diffMs <= 0) {
          isOvertime = true;
          isNearEnd = true;
          remainingMin = 0;
        } else if (diffMin <= 15) {
          isNearEnd = true;
          remainingMin = Math.ceil(diffMin);
        } else {
          remainingMin = Math.ceil(diffMin);
        }
      }
    }

    let cellBg = '#ffffff';
    let cellBorder = '1.5px dashed #cbd5e1';
    let shadow = 'none';

    if (isAvailable) {
      if (isSlotPast) {
        cellBg = '#fbfcfd';
        cellBorder = '1px solid #f1f5f9';
      } else if (isSlotCurrent) {
        cellBg = '#f0fdf4';
        cellBorder = '1.5px solid #86efac';
        shadow = '0 1px 3px rgba(16, 185, 129, 0.1)';
      } else {
        cellBg = '#ffffff';
        cellBorder = '1px solid #e2e8f0';
      }
    } else if (isInProgress) {
      if (isOvertime) {
        cellBg = '#fef2f2';
        cellBorder = '2px solid #ef4444';
        shadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
      } else if (isNearEnd) {
        cellBg = '#fff7ed';
        cellBorder = '2px solid #f97316';
        shadow = '0 2px 8px rgba(249, 115, 22, 0.25)';
      } else {
        cellBg = '#f0fdf4';
        cellBorder = '1.5px solid #10b981';
        shadow = '0 2px 4px rgba(16, 185, 129, 0.18)';
      }
    } else if (isLate) {
      cellBg = '#fff7ed';
      cellBorder = '2px solid #ea580c';
      shadow = '0 2px 6px rgba(234, 88, 12, 0.25)';
    } else if (isBooked) {
      cellBg = '#eff6ff';
      cellBorder = '1.5px solid #3b82f6';
      shadow = '0 2px 5px rgba(59, 130, 246, 0.18)';
    } else if (isCompleted) {
      cellBg = '#f8fafc';
      cellBorder = '1px solid #e2e8f0';
    }

    const ROW_H = gridStep === 15 ? 44 : (gridStep === 30 ? 56 : 68);
    const BORDER_SPACING = 6;
    const cardHeight = spanCount > 1
      ? (spanCount * ROW_H + (spanCount - 1) * BORDER_SPACING - 6)
      : (ROW_H - 6);

    return (
      <td
        key={`${court._id}-${slot._id}`}
        rowSpan={spanCount || 1}
        style={{
          padding: '3px',
          verticalAlign: 'top',
          height: spanCount > 1 ? (spanCount * ROW_H + (spanCount - 1) * BORDER_SPACING) : ROW_H,
          boxSizing: 'border-box'
        }}
        onClick={() => handleCellClick(court, slot, cell)}
      >
        <div
          style={{
            background: cellBg,
            border: isLate ? '2px solid #ea580c' : cellBorder,
            boxShadow: shadow,
            borderRadius: 8,
            padding: isAvailable ? '0 6px' : '6px 8px',
            height: cardHeight,
            minHeight: cardHeight,
            maxHeight: cardHeight,
            boxSizing: 'border-box',
            cursor: (isAvailable && !isSlotCurrent) ? 'default' : 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: isAvailable ? 'center' : 'space-between',
            alignItems: isAvailable ? 'center' : 'stretch',
            transition: 'all 0.15s ease',
            position: 'relative',
            zIndex: isLate ? 20 : 1
          }}
          onMouseEnter={(e) => {
            if (!isAvailable || isSlotCurrent) {
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {isAvailable && (
            isSlotCurrent ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                width: '100%',
                lineHeight: 1
              }}>
                <PlusOutlined style={{ fontSize: 12, color: '#009B60' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>
                  Trống (Hiện tại)
                </span>
              </div>
            ) : null
          )}

          {isLate && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <Tag color="volcano" style={{ fontSize: 10, lineHeight: '18px', padding: '0 4px', margin: 0, fontWeight: 800 }}>
                    <ExclamationCircleOutlined style={{ marginRight: 3 }} /> Trễ {cell.lateMinutes}p ({cell.booking?.startTime} - {cell.booking?.endTime})
                  </Tag>
                  <PhoneOutlined style={{ color: '#ea580c', fontSize: 11 }} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 12, color: '#9a3412', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cell.booking?.customer?.fullName || cell.booking?.customerDisplayName || 'Khách đặt'}
                  {cell.booking?.isWalkIn && (
                    <Tag color="cyan" style={{ marginLeft: 3, fontSize: 9, padding: '0 2px', lineHeight: '14px' }}>VL</Tag>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#c2410c', fontWeight: 600, marginTop: 1 }}>
                  {cell.booking?.customer?.phone || cell.booking?.customerDisplayPhone || '--'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }} onClick={(e) => e.stopPropagation()}>
                <Button
                  size="small"
                  icon={<PhoneOutlined />}
                  style={{ flex: 1, fontSize: 11, height: 22, padding: '0 2px', fontWeight: 600 }}
                  onClick={() => alert(`Gọi điện thoại cho khách: ${cell.booking?.customer?.phone || cell.booking?.customerDisplayPhone || 'Chưa có SĐT'}`)}
                >
                  Gọi
                </Button>
                <Button
                  size="small"
                  danger
                  style={{ flex: 1, fontSize: 11, height: 22, padding: '0 2px', fontWeight: 600 }}
                  onClick={() => {
                    setSelectedSlotCell({ court, slot, cell });
                    setCancelModalVisible(true);
                  }}
                >
                  Hủy sân
                </Button>
              </div>
            </div>
          )}

          {!isLate && isBooked && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <Tag color="blue" style={{ fontSize: 10, lineHeight: '18px', padding: '0 5px', margin: 0, fontWeight: 700 }}>
                    {cell.booking?.startTime && cell.booking?.endTime ? `${cell.booking.startTime} - ${cell.booking.endTime}` : 'Đã đặt'}
                  </Tag>
                  <span style={{ fontSize: 10, color: '#2563eb', fontWeight: 600 }}>
                    #{cell.booking?.bookingCode?.slice(-4)}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#1e40af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cell.booking?.customer?.fullName || cell.booking?.customerDisplayName || 'Khách đặt'}
                  {cell.booking?.isWalkIn && (
                    <Tag color="cyan" style={{ marginLeft: 3, fontSize: 9, padding: '0 2px', lineHeight: '14px' }}>VL</Tag>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {cell.booking?.customer?.phone || cell.booking?.customerDisplayPhone || '--'}
                </div>
              </div>
              {cell.status === 'CONFIRMED' && (
                <div style={{ marginTop: 4 }} onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlayCircleOutlined />}
                    style={{ background: '#009B60', borderColor: '#009B60', width: '100%', fontSize: 11, height: 24, fontWeight: 700 }}
                    onClick={() => handleBookingCardClick(cell.booking, court)}
                  >
                    Check-in
                  </Button>
                </div>
              )}
            </div>
          )}

          {isInProgress && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <Tag
                    color={isOvertime ? 'error' : (isNearEnd ? 'warning' : 'green')}
                    style={{ fontSize: 10, lineHeight: '18px', padding: '0 5px', margin: 0, fontWeight: 700 }}
                  >
                    <PlayCircleOutlined style={{ marginRight: 3 }} />
                    {cell.booking?.startTime && cell.booking?.endTime ? `${cell.booking.startTime} - ${cell.booking.endTime}` : 'Đang chơi'}
                  </Tag>
                  {remainingMin !== null && (
                    <span style={{
                      fontSize: 10,
                      color: isOvertime ? '#dc2626' : (isNearEnd ? '#ea580c' : '#059669'),
                      fontWeight: 700
                    }}>
                      {isOvertime ? 'Hết giờ' : `Còn ${remainingMin}p`}
                    </span>
                  )}
                </div>

                {isNearEnd && sessionEndTime && (
                  <div style={{
                    background: isOvertime ? '#fee2e2' : '#ffedd5',
                    color: isOvertime ? '#b91c1c' : '#c2410c',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 5px',
                    borderRadius: 4,
                    margin: '2px 0 4px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: `1px solid ${isOvertime ? '#fca5a5' : '#fed7aa'}`
                  }}>
                    <span>{isOvertime ? '⚠ HẾT GIỜ:' : '⏳ SẮP HẾT GIỜ:'}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>
                      {formatCountdown(sessionEndTime)}
                    </span>
                  </div>
                )}

                <div style={{ fontWeight: 700, fontSize: 12, color: isOvertime ? '#991b1b' : (isNearEnd ? '#9a3412' : '#065f46'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cell.session?.customerDisplayName || cell.booking?.customer?.fullName || cell.booking?.customerDisplayName || 'Khách đang chơi'}
                  {(cell.session?.isWalkIn || cell.booking?.isWalkIn) && (
                    <Tag color="cyan" style={{ marginLeft: 3, fontSize: 9, padding: '0 2px', lineHeight: '14px' }}>VL</Tag>
                  )}
                </div>
                <div style={{ fontSize: 11, color: isOvertime ? '#dc2626' : (isNearEnd ? '#c2410c' : '#047857'), fontWeight: 600 }}>
                  {cell.session?.sessionCode || cell.booking?.bookingCode || '--'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }} onClick={(e) => e.stopPropagation()}>
                <Button
                  size="small"
                  style={{ flex: 1, fontSize: 11, height: 22, padding: '0 2px', fontWeight: 600 }}
                  onClick={() => openExtendModal(cell.session || { courtId: court._id })}
                >
                  Gia hạn
                </Button>
                <Button
                  size="small"
                  type="primary"
                  style={{
                    flex: 1,
                    background: isOvertime ? '#dc2626' : (isNearEnd ? '#ea580c' : '#009B60'),
                    borderColor: isOvertime ? '#dc2626' : (isNearEnd ? '#ea580c' : '#009B60'),
                    fontSize: 11,
                    height: 22,
                    padding: '0 2px',
                    fontWeight: 700
                  }}
                  onClick={() => openCheckOutModal(cell.session || { courtId: court._id })}
                >
                  Trả sân
                </Button>
              </div>
            </div>
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

  const handleTimelineTrackClick = (e, court) => {
    if (e.target !== e.currentTarget && !e.target.classList.contains('timeline-track-bg')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const clickMin = Math.round((START_OF_DAY_MIN + pct * TOTAL_DAY_MIN) / 15) * 15;
    const h = Math.floor(clickMin / 60);
    const m = clickMin % 60;
    const clickedTime = dayjs().hour(h).minute(m);

    openCheckInModal(court);
    setCheckInType('walkin');
    setWalkInStartTime(clickedTime);
    setWalkInEndTime(clickedTime.add(1, 'hour'));
  };

  const handleBookingCardClick = (b, court) => {
    const targetCourt = court || courtsData.find(c => c._id?.toString() === (b.courtId?._id || b.courtId)?.toString());
    if (b.status === 'CONFIRMED') {
      openCheckInModal(targetCourt);
      setCheckInType('booking');
      checkInForm.setFieldsValue({ bookingId: b._id });
    } else {
      message.info(`Đơn đặt ${b.bookingCode} - ${b.customerName || b.customer?.fullName || 'Khách'} (${b.startTime} - ${b.endTime})`);
    }
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
          <Button
            type="primary"
            style={{ background: '#009B60', borderColor: '#009B60' }}
            onClick={() => openCheckInModal(null, 'walkin')}
          >
            Nhận sân khách vãng lai
          </Button>
        </Space>
      </div>

      <Tabs activeKey={activeTab} onChange={handleTabChange} type="card">
        <Tabs.TabPane
          tab={
            <span>
              <TableOutlined /> Trạng thái sân thực tế
            </span>
          }
          key="live_status"
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  🏸 Trạng thái sân thực tế
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  (Cập nhật thời gian thực)
                </span>
              </div>
              <Space wrap size="small">
                <Tag color="default" style={{ padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                  Tổng: {courtsData.length} sân
                </Tag>
                <Tag color="green" style={{ padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                  Đang chơi: {courtsData.filter(c => c.operationalStatus === 'IN_USE').length}
                </Tag>
                <Tag color="blue" style={{ padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                  Sẵn sàng: {courtsData.filter(c => c.operationalStatus !== 'IN_USE' && c.status !== 'INACTIVE').length}
                </Tag>
                {courtsData.some(c => c.activeSession && isSessionNearEnd(c.activeSession)) && (
                  <Tag color="volcano" style={{ padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                    ⚠️ Sắp hết giờ: {courtsData.filter(c => c.activeSession && isSessionNearEnd(c.activeSession)).length}
                  </Tag>
                )}
              </Space>
            </div>

            <Row gutter={[16, 16]} style={{ display: 'flex', flexWrap: 'wrap' }}>
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
                } else if (court.status === 'INACTIVE') {
                  borderColor = '#9ca3af';
                  badgeColor = 'default';
                  statusText = 'TẠM NGƯNG';
                }

                return (
                  <Col xs={24} sm={12} md={12} lg={8} xl={6} key={court._id} style={{ display: 'flex' }}>
                    <Card
                      size="small"
                      hoverable
                      style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 10,
                        border: `1.5px solid ${borderColor}`,
                        boxShadow: nearEnd ? '0 0 12px rgba(239, 68, 68, 0.35)' : '0 1px 4px rgba(0,0,0,0.04)',
                        background: nearEnd ? '#fff5f5' : '#ffffff',
                        transition: 'all 0.25s ease'
                      }}
                      bodyStyle={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: 14
                      }}
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{court.name}</span>
                            {renderCourtTypeTag(court.courtType)}
                          </div>
                          <Tag color={badgeColor} style={{ margin: 0, fontWeight: 600 }}>{statusText}</Tag>
                        </div>
                      }
                    >
                      {court.operationalStatus === 'IN_USE' && session ? (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{
                              background: nearEnd ? '#fee2e2' : '#f0fdf4',
                              border: `1px solid ${nearEnd ? '#fca5a5' : '#bbf7d0'}`,
                              borderRadius: 8,
                              padding: '8px 12px',
                              marginBottom: 10,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <ClockCircleOutlined style={{ color: nearEnd ? '#dc2626' : '#16a34a', fontSize: 15 }} />
                                <span style={{ fontSize: 11, fontWeight: 700, color: nearEnd ? '#991b1b' : '#166534', textTransform: 'uppercase' }}>
                                  {nearEnd ? 'Sắp hết giờ' : 'Thời gian còn'}
                                </span>
                              </div>
                              <div style={{
                                fontSize: 16,
                                fontWeight: 800,
                                color: nearEnd ? '#dc2626' : '#15803d',
                                fontFamily: 'monospace'
                              }}>
                                {formatCountdown(session.scheduledEndTime)}
                              </div>
                            </div>

                            <div style={{ fontSize: 12, color: '#334155', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#64748b' }}><UserOutlined style={{ marginRight: 4 }} />Khách:</span>
                                <span style={{ fontWeight: 600, color: '#0f172a', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {session.customerDisplayName || session.bookingId?.customerId?.fullName || 'Khách vãng lai'}
                                  {session.isWalkIn && <Tag color="cyan" style={{ marginLeft: 4, fontSize: 10, padding: '0 4px', margin: 0 }}>VL</Tag>}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#64748b' }}><FieldTimeOutlined style={{ marginRight: 4 }} />Khung giờ:</span>
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                  {session.bookingId?.startTime && session.bookingId?.endTime
                                    ? `${session.bookingId.startTime} - ${session.bookingId.endTime}`
                                    : (session.scheduledStartTime ? `${new Date(session.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(session.scheduledEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '--')}
                                  {session.extensions?.length > 0 && (
                                    <Tag color="cyan" style={{ marginLeft: 4, fontSize: 10, padding: '0 4px', margin: 0 }}>
                                      +{session.extensions.reduce((sum, e) => sum + e.extendedMinutes, 0)}p
                                    </Tag>
                                  )}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#64748b' }}><DollarOutlined style={{ marginRight: 4 }} />Tạm tính:</span>
                                <span style={{ fontWeight: 700, color: '#009B60' }}>
                                  {(session.totalAmount || 0).toLocaleString('vi-VN')} đ
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <Button
                                size="small"
                                icon={<CoffeeOutlined />}
                                onClick={() => navigate(`/admin/pos?sessionId=${session._id}`)}
                                style={{
                                  flex: 1,
                                  background: '#f0fdf4',
                                  borderColor: '#86efac',
                                  color: '#166534',
                                  fontWeight: 600,
                                  fontSize: 12
                                }}
                              >
                                + Dịch vụ / POS
                              </Button>
                              <Button
                                type="primary"
                                size="small"
                                icon={<FieldTimeOutlined />}
                                style={{ flex: 1, background: '#2563eb', borderColor: '#2563eb', fontWeight: 600, fontSize: 12 }}
                                onClick={() => openExtendModal(session)}
                              >
                                + Gia hạn
                              </Button>
                            </div>
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
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                          <div style={{ textAlign: 'center', padding: '16px 0 12px 0' }}>
                            <CheckCircleOutlined style={{ fontSize: 36, color: '#10b981', marginBottom: 8 }} />
                            <div style={{ fontWeight: 700, color: '#047857', fontSize: 14 }}>
                              Sân trống sẵn sàng
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                              Chưa có khách chơi lúc này
                            </div>
                          </div>
                          <div style={{ marginTop: 'auto' }}>
                            <Button
                              type="primary"
                              size="middle"
                              icon={<PlayCircleOutlined />}
                              style={{ background: '#009B60', borderColor: '#009B60', fontWeight: 600, height: 38 }}
                              onClick={() => openCheckInModal(court)}
                              block
                            >
                              Nhận sân bắt đầu chơi
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <span>
              <CalendarOutlined /> Lịch đặt & Ca đấu theo giờ
            </span>
          }
          key="schedule"
        >
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
                  Lịch đặt & Ca đấu theo giờ:
                </span>
                <DatePicker
                  value={dayjs(selectedDate)}
                  onChange={(d) => {
                    if (d) {
                      const dateStr = d.format('YYYY-MM-DD');
                      setSelectedDate(dateStr);
                      fetchMatrix(dateStr, 15);
                    }
                  }}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  style={{ width: 140 }}
                />
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => { fetchLiveBoard(); fetchMatrix(selectedDate, 15); }}
                  loading={matrixLoading}
                >
                  Tải lại
                </Button>
              </Space>
            </div>

            {matrixLoading && matrixData.courts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 0', color: '#64748b' }}>
                Đang tải sơ đồ lịch sân...
              </div>
            ) : (
              <div style={{
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                overflowX: 'auto',
                overflowY: 'auto',
                maxHeight: 'calc(100vh - 210px)',
                padding: 8
              }}>
                {(() => {
                  const displayedCourts = matrixData.courts;

                  if (displayedCourts.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                        Không có sân nào trong hệ thống.
                      </div>
                    );
                  }

                  return (
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 6, minWidth: 800, tableLayout: 'fixed' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 30, background: '#ffffff' }}>
                        <tr>
                          <th style={{
                            width: 140,
                            minWidth: 140,
                            padding: '10px 8px',
                            background: '#f1f5f9',
                            borderRadius: 8,
                            color: '#334155',
                            fontSize: 13,
                            fontWeight: 700,
                            textAlign: 'center',
                            border: '1px solid #cbd5e1',
                            position: 'sticky',
                            top: 0,
                            left: 0,
                            zIndex: 35
                          }}>
                            Khung giờ
                          </th>
                          {displayedCourts.map((court) => (
                            <th key={court._id} style={{
                              minWidth: 160,
                              padding: '10px 8px',
                              background: '#009B60',
                              color: '#ffffff',
                              borderRadius: 8,
                              fontSize: 14,
                              fontWeight: 700,
                              textAlign: 'center',
                              boxShadow: '0 2px 4px rgba(0, 155, 96, 0.2)',
                              position: 'sticky',
                              top: 0,
                              zIndex: 30
                            }}>
                              <div>{court.name}</div>
                              <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.9 }}>
                                {renderCourtTypeTag(court.courtType)}
                              </div>
                              <div style={{ fontSize: 10, fontWeight: 500, opacity: 0.85, marginTop: 2 }}>
                                {court.operationalStatus === 'IN_USE' ? '● Đang có khách' : court.operationalStatus === 'CLEANING' ? '● Dọn dẹp' : '● Sẵn sàng'}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const isCurrentAvailableCell = (c, s) => {
                            if (!c || c.status !== 'AVAILABLE') return false;
                            if (!s) return false;
                            const isToday = selectedDate === getTodayStr();
                            if (!isToday) return false;
                            const [sh, sm] = (s.startTime || '00:00').split(':').map(Number);
                            const [eh, em] = (s.endTime || '00:00').split(':').map(Number);
                            const sStartMin = sh * 60 + sm;
                            const sEndMin = eh * 60 + em;
                            const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
                            return (nowMin >= sStartMin - 15) && (nowMin < sEndMin);
                          };

                          return matrixData.timeSlots.map((slot, slotIndex) => {
                            const isToday = selectedDate === getTodayStr();
                            const [sh, sm] = (slot.startTime || '00:00').split(':').map(Number);
                            const [eh, em] = (slot.endTime || '00:00').split(':').map(Number);
                            const slotStartMin = sh * 60 + sm;
                            const slotEndMin = eh * 60 + em;
                            const nowMin = currentTime.getHours() * 60 + currentTime.getMinutes();
                            const isCurrentSlot = isToday && nowMin >= slotStartMin && nowMin < slotEndMin;

                            const rowHeight = gridStep === 15 ? 44 : (gridStep === 30 ? 56 : 68);

                            return (
                              <tr key={slot._id} style={{ height: rowHeight }}>
                                <td style={{
                                  width: 140,
                                  minWidth: 140,
                                  height: rowHeight,
                                  maxHeight: rowHeight,
                                  boxSizing: 'border-box',
                                  padding: '4px 8px',
                                  background: isCurrentSlot ? '#dcfce7' : '#f8fafc',
                                  borderRadius: 8,
                                  textAlign: 'center',
                                  fontWeight: 700,
                                  color: isCurrentSlot ? '#15803d' : '#1e293b',
                                  fontSize: 13,
                                  border: isCurrentSlot ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                                  verticalAlign: 'middle',
                                  boxShadow: isCurrentSlot ? '0 1px 3px rgba(16, 185, 129, 0.2)' : 'none',
                                  position: 'sticky',
                                  left: 0,
                                  zIndex: 15
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                    <ClockCircleOutlined style={{ color: isCurrentSlot ? '#15803d' : '#009B60', fontSize: 13 }} />
                                    <span>{slot.startTime} - {slot.endTime}</span>
                                  </div>
                                  {isCurrentSlot && (
                                    <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 700, marginTop: 2 }}>
                                      ● Đang diễn ra
                                    </div>
                                  )}
                                </td>
                                {displayedCourts.map((court) => {
                                  const courtCells = matrixData.matrix[court._id] || [];
                                  const cell = courtCells[slotIndex] || { status: 'AVAILABLE' };

                                  const bookingKey = cell.booking?._id
                                    ? `${cell.booking._id}_${cell.booking.itemId || court._id}`
                                    : (cell.session ? `session_${cell.session._id}` : null);

                                  if (bookingKey) {
                                    const prevCell = slotIndex > 0 ? courtCells[slotIndex - 1] : null;
                                    const prevKey = prevCell?.booking?._id
                                      ? `${prevCell.booking._id}_${prevCell.booking.itemId || court._id}`
                                      : (prevCell?.session ? `session_${prevCell.session._id}` : null);
                                    if (prevKey === bookingKey) {
                                      return null;
                                    }

                                    let spanCount = 1;
                                    for (let nextIdx = slotIndex + 1; nextIdx < matrixData.timeSlots.length; nextIdx++) {
                                      const nextCell = courtCells[nextIdx];
                                      const nextKey = nextCell?.booking?._id
                                        ? `${nextCell.booking._id}_${nextCell.booking.itemId || court._id}`
                                        : (nextCell?.session ? `session_${nextCell.session._id}` : null);
                                      if (nextKey === bookingKey) {
                                        spanCount++;
                                      } else {
                                        break;
                                      }
                                    }
                                    return renderMatrixCell(court, slot, cell, spanCount, slotIndex);
                                  }

                                  const isCurAvail = isCurrentAvailableCell(cell, slot);
                                  if (isCurAvail) {
                                    const prevCell = slotIndex > 0 ? courtCells[slotIndex - 1] : null;
                                    const prevSlot = slotIndex > 0 ? matrixData.timeSlots[slotIndex - 1] : null;
                                    const wasPrevCurAvail = isCurrentAvailableCell(prevCell, prevSlot);
                                    if (wasPrevCurAvail) {
                                      return null;
                                    }

                                    let spanCount = 1;
                                    for (let nextIdx = slotIndex + 1; nextIdx < matrixData.timeSlots.length; nextIdx++) {
                                      const nextCell = courtCells[nextIdx];
                                      const nextSlot = matrixData.timeSlots[nextIdx];
                                      if (isCurrentAvailableCell(nextCell, nextSlot)) {
                                        spanCount++;
                                      } else {
                                        break;
                                      }
                                    }
                                    return renderMatrixCell(court, slot, cell, spanCount, slotIndex);
                                  }

                                  return renderMatrixCell(court, slot, cell, 1, slotIndex);
                                })}
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            )}
          </div>
        </Tabs.TabPane>
      </Tabs>

      <Modal
        title={checkInType === 'walkin' ? '⚡ Nhận Sân Khách Vãng Lai (Chơi Ngay)' : '📋 Nhận Sân Từ Đơn Đặt Trước'}
        open={checkInModalVisible}
        onCancel={() => setCheckInModalVisible(false)}
        onOk={() => handleCheckInSubmit(false)}
        okText="Xác nhận nhận sân"
        cancelText="Hủy"
        okButtonProps={{ disabled: checkInType === 'walkin' && walkInEndTime.diff(walkInStartTime, 'minute') < 60 }}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Radio.Group
            value={checkInType}
            onChange={(e) => setCheckInType(e.target.value)}
            buttonStyle="solid"
            style={{ width: '100%', display: 'flex' }}
          >
            <Radio.Button value="walkin" style={{ flex: 1, textAlign: 'center' }}>
              ⚡ Khách vãng lai nhận sân ngay
            </Radio.Button>
            <Radio.Button value="booking" style={{ flex: 1, textAlign: 'center' }}>
              📋 Nhận sân từ đơn đặt trước
            </Radio.Button>
          </Radio.Group>
        </div>

        {checkInType === 'walkin' && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 6,
            padding: '8px 12px',
            marginBottom: 14,
            fontSize: 12,
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <ClockCircleOutlined style={{ color: '#16a34a', fontSize: 14 }} />
            <span>Khách vãng lai chỉ nhận sân chơi ngay tại thời điểm hiện tại. Giờ bắt đầu đã tự động làm tròn lên 15 phút (<b>{walkInStartTime.format('HH:mm')}</b>) để chuẩn bị khởi động.</span>
          </div>
        )}

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
            <>
              <Form.Item
                name="bookingId"
                label="Chọn đơn đặt sân đã xác nhận"
                rules={[{ required: true, message: 'Vui lòng chọn đơn đặt sân!' }]}
                style={{ marginBottom: 12 }}
              >
                <Select placeholder="Chọn khách hàng hoặc mã đơn..." onChange={() => setAcceptEarlyCheckInState(false)}>
                  {confirmedBookings.map((b) => {
                    const bState = getBookingCheckInState(b);
                    return (
                      <Option key={b._id} value={b._id} disabled={!bState.canCheckIn}>
                        {b.bookingCode} - {b.customerId?.fullName || b.customerDisplayName || 'Khách đặt'} ({b.startTime} - {b.endTime} tại {b.courtId?.name || b.courtId?.courtName}) {!bState.canCheckIn ? `— [${bState.reason}]` : bState.isEarly ? `— [Đến sớm ${bState.earlyMinutes}p]` : ''}
                      </Option>
                    );
                  })}
                </Select>
              </Form.Item>

              {(() => {
                const selB = confirmedBookings.find(b => b._id === selectedBookingId);
                const bState = selB ? getBookingCheckInState(selB) : null;
                if (!bState || !bState.isEarly) return null;
                const courtType = normalizeCourtType(selB?.courtId?.courtType);
                const isWeekend = currentTime.getDay() === 0 || currentTime.getDay() === 6;
                const curH = currentTime.getHours();
                const isPeak = !isWeekend && (curH >= 17);
                let hourlyRate = 80000;
                let rateTag = <Tag color="green">Giờ thường</Tag>;
                if (courtType === 'VIP') {
                  hourlyRate = isWeekend ? 180000 : isPeak ? 160000 : 120000;
                } else if (courtType === 'PREMIUM') {
                  hourlyRate = isWeekend ? 220000 : isPeak ? 200000 : 160000;
                } else {
                  hourlyRate = isWeekend ? 140000 : isPeak ? 120000 : 80000;
                }
                if (isWeekend) rateTag = <Tag color="red">Cuối tuần</Tag>;
                else if (isPeak) rateTag = <Tag color="orange">Giờ vàng tối</Tag>;
                const earlyFee = Math.round((hourlyRate / 60) * bState.earlyMinutes);
                return (
                  <Alert
                    type="warning"
                    showIcon
                    message={`Khách đến sớm hơn ${bState.earlyMinutes} phút`}
                    description={
                      <div>
                        <div>Ca đặt dự kiến: <b>{selB.startTime} - {selB.endTime}</b>. Giờ hiện tại: <b>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b>.</div>
                        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>Áp dụng khung giá:</span> {rateTag} <span>({hourlyRate.toLocaleString('vi-VN')} đ/h)</span>
                        </div>
                        <div style={{ marginTop: 4 }}>
                          Phụ phí nhận sân sớm ước tính: <b style={{ color: '#ea580c' }}>{earlyFee.toLocaleString('vi-VN')} đ</b>.
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <Checkbox
                            checked={acceptEarlyCheckInState}
                            onChange={(e) => setAcceptEarlyCheckInState(e.target.checked)}
                          >
                            <span style={{ fontWeight: 600, color: '#009B60' }}>
                              Đồng ý nhận sân sớm cho khách (Early Check-in)
                            </span>
                          </Checkbox>
                        </div>
                      </div>
                    }
                    style={{ marginBottom: 14 }}
                  />
                );
              })()}
            </>
          ) : (
            <>
              <Row gutter={16} style={{ marginBottom: 4 }}>
                <Col span={24}>
                  <Form.Item
                    name="courtId"
                    label="Chọn sân thi đấu"
                    rules={[{ required: true, message: 'Vui lòng chọn sân!' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <Select placeholder="Chọn sân...">
                      {((matrixData.courts && matrixData.courts.length > 0) ? matrixData.courts : courtsData).map(c => {
                        const liveCourt = courtsData.find(cd => cd._id === c._id);
                        const isOccupied = checkInType === 'walkin' && (liveCourt?.operationalStatus === 'IN_USE' || c.operationalStatus === 'IN_USE');
                        return (
                          <Option key={c._id} value={c._id} disabled={isOccupied}>
                            {c.name || c.courtName} {isOccupied ? ' — [Đang có khách]' : ''}
                          </Option>
                        );
                      })}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16} style={{ marginBottom: 8 }}>
                <Col span={12}>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Giờ bắt đầu (Hiện tại):</label>
                  <TimePicker
                    format="HH:mm"
                    value={walkInStartTime}
                    disabled
                    style={{ width: '100%', height: 38, background: '#f8fafc', fontWeight: 700 }}
                  />
                </Col>
                <Col span={12}>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Giờ kết thúc:</label>
                  <TimePicker
                    format="HH:mm"
                    minuteStep={15}
                    value={walkInEndTime}
                    onChange={(val) => {
                      if (val) {
                        const sMin = walkInStartTime.hour() * 60 + walkInStartTime.minute();
                        const eMin = val.hour() * 60 + val.minute();
                        if (eMin - sMin < 60) {
                          message.warning('Khách vãng lai tối thiểu phải từ 1 tiếng (60 phút) trở lên!');
                          setWalkInEndTime(walkInStartTime.add(1, 'hour').second(0).millisecond(0));
                        } else {
                          setWalkInEndTime(val.second(0).millisecond(0));
                        }
                      }
                    }}
                    style={{ width: '100%', height: 38 }}
                    allowClear={false}
                  />
                </Col>
              </Row>

              {(() => {
                const sMin = walkInStartTime.hour() * 60 + walkInStartTime.minute();
                const eMin = walkInEndTime.hour() * 60 + walkInEndTime.minute();
                const currentDurMin = eMin - sMin;
                return (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Chọn nhanh:</span>
                    {[
                      { label: '1 giờ', mins: 60 },
                      { label: '1.5 giờ', mins: 90 },
                      { label: '2 giờ', mins: 120 },
                      { label: '2.5 giờ', mins: 150 },
                      { label: '3 giờ', mins: 180 }
                    ].map((preset, idx) => {
                      const isSelected = currentDurMin === preset.mins;
                      return (
                        <Button
                          key={idx}
                          size="small"
                          type={isSelected ? 'primary' : 'default'}
                          onClick={() => setWalkInEndTime(walkInStartTime.add(preset.mins, 'minute').second(0).millisecond(0))}
                          style={{
                            fontSize: 12,
                            ...(isSelected ? { background: '#009B60', borderColor: '#009B60', fontWeight: 700 } : {})
                          }}
                        >
                          {preset.label}
                        </Button>
                      );
                    })}
                  </div>
                );
              })()}

              {(() => {
                const sMin = walkInStartTime.hour() * 60 + walkInStartTime.minute();
                const eMin = walkInEndTime.hour() * 60 + walkInEndTime.minute();
                const durMin = eMin - sMin;
                const isValidDur = durMin >= 60;
                const isWeekend = currentTime.getDay() === 0 || currentTime.getDay() === 6;
                const startH = walkInStartTime.hour();
                const isPeak = !isWeekend && (startH >= 17);
                const chosenCourtId = checkInForm.getFieldValue('courtId') || selectedCourtForCheckIn?._id;
                const targetCourt = courtsData.find(c => c._id?.toString() === chosenCourtId?.toString());
                const courtType = normalizeCourtType(targetCourt?.courtType);
                let hourlyRate = 80000;
                let rateTag = <Tag color="green">Giờ thường</Tag>;
                if (courtType === 'VIP') {
                  hourlyRate = isWeekend ? 180000 : isPeak ? 160000 : 120000;
                } else if (courtType === 'PREMIUM') {
                  hourlyRate = isWeekend ? 220000 : isPeak ? 200000 : 160000;
                } else {
                  hourlyRate = isWeekend ? 140000 : isPeak ? 120000 : 80000;
                }
                if (isWeekend) rateTag = <Tag color="red">Cuối tuần</Tag>;
                else if (isPeak) rateTag = <Tag color="orange">Giờ vàng tối</Tag>;
                const fee = isValidDur ? Math.round((hourlyRate / 60) * durMin) : 0;
                if (!isValidDur) {
                  return (
                    <Alert
                      type="warning"
                      showIcon
                      message="Thời lượng không hợp lệ"
                      description="Thời gian chơi tối thiểu cho khách vãng lai phải từ 1 tiếng (60 phút) trở lên và giờ kết thúc phải sau giờ bắt đầu!"
                      style={{ marginBottom: 12 }}
                    />
                  );
                }
                return (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                    <Row gutter={16} align="middle">
                      <Col span={14}>
                        <div style={{ fontSize: 13, marginBottom: 2 }}>
                          <span style={{ color: '#64748b' }}>Khung giờ: </span>
                          <b>{walkInStartTime.format('HH:mm')}</b>
                          <span style={{ color: '#94a3b8', margin: '0 6px' }}>–</span>
                          <b style={{ color: '#2563eb' }}>{walkInEndTime.format('HH:mm')}</b>
                          <Tag color="blue" style={{ marginLeft: 8, fontSize: 11, padding: '0 6px', lineHeight: '18px' }}>
                            {durMin} phút ({(durMin / 60).toFixed(1)}h)
                          </Tag>
                        </div>
                        <div style={{ fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: '#475569' }}>Áp dụng:</span>
                          {rateTag}
                          <span style={{ color: '#64748b', fontSize: 11 }}>({hourlyRate.toLocaleString('vi-VN')} đ/h)</span>
                        </div>
                      </Col>
                      <Col span={10} style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Tạm tính tiền sân</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: '#009B60' }}>
                          {fee.toLocaleString('vi-VN')} đ
                        </div>
                      </Col>
                    </Row>
                  </div>
                );
              })()}

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="walkInCustomerName"
                    label="Tên khách hàng"
                    rules={[{ required: true, message: 'Vui lòng nhập tên khách!' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <Input placeholder="Nhập họ và tên khách..." />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="walkInCustomerPhone"
                    label="Số điện thoại"
                    style={{ marginBottom: 12 }}
                  >
                    <Input placeholder="0987654321..." />
                  </Form.Item>
                </Col>
              </Row>
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
        okButtonProps={{ disabled: !extendDuration || extendDuration <= 0 }}
      >
        {selectedSessionForExtend && (() => {
          const currentCourtId = (selectedSessionForExtend.courtId?._id || selectedSessionForExtend.courtId)?.toString();
          const currentBookingId = (selectedSessionForExtend.bookingId?._id || selectedSessionForExtend.bookingId || selectedSessionForExtend.booking?._id)?.toString();

          let sessionEndMin = 0;
          let sessionEndTimeDisplay = '--';
          if (selectedSessionForExtend.scheduledEndTime) {
            const endD = new Date(selectedSessionForExtend.scheduledEndTime);
            sessionEndMin = endD.getHours() * 60 + endD.getMinutes();
            sessionEndTimeDisplay = `${String(endD.getHours()).padStart(2, '0')}:${String(endD.getMinutes()).padStart(2, '0')}`;
          } else if (selectedSessionForExtend.booking?.endTime) {
            const [eh, em] = selectedSessionForExtend.booking.endTime.split(':').map(Number);
            sessionEndMin = eh * 60 + em;
            sessionEndTimeDisplay = selectedSessionForExtend.booking.endTime;
          }

          const courtBookings = (matrixData.bookings || [])
            .filter((b) => {
              const bCourtId = (b.courtId?._id || b.courtId)?.toString();
              if (bCourtId !== currentCourtId) return false;
              if (currentBookingId && b._id?.toString() === currentBookingId) return false;
              if (!['CONFIRMED', 'CHECKED_IN'].includes(b.status)) return false;
              return true;
            })
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          const nextBooking = courtBookings.find((b) => {
            const [bsh, bsm] = b.startTime.split(':').map(Number);
            const bStartMin = bsh * 60 + bsm;
            const [beh, bem] = b.endTime.split(':').map(Number);
            const bEndMin = beh * 60 + bem;
            return bEndMin > sessionEndMin;
          });

          let headroomMin = 999;
          if (nextBooking) {
            const [nbStartH, nbStartM] = nextBooking.startTime.split(':').map(Number);
            const nbStartMin = nbStartH * 60 + nbStartM;
            headroomMin = Math.max(0, nbStartMin - sessionEndMin);
          }

          const canExtend30 = headroomMin >= 30;
          const canExtend60 = headroomMin >= 60;
          const cannotExtendAny = !canExtend30;

          return (
            <div>
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                <p style={{ margin: '4px 0' }}><b>Mã ca:</b> {selectedSessionForExtend.sessionCode}</p>
                <p style={{ margin: '4px 0' }}>
                  <b>Thời gian kết thúc hiện tại:</b> <Tag color="blue" style={{ fontSize: 13, fontWeight: 700 }}>{sessionEndTimeDisplay}</Tag>
                </p>
                {nextBooking ? (
                  <p style={{ margin: '4px 0', color: headroomMin < 60 ? '#b91c1c' : '#475569' }}>
                    <b>Ca tiếp theo của sân:</b> Khách {nextBooking.customerName || 'đặt trước'} ({nextBooking.startTime} - {nextBooking.endTime})
                  </p>
                ) : (
                  <p style={{ margin: '4px 0', color: '#16a34a' }}>
                    <b>Lịch sân tiếp theo:</b> Sân còn trống đến hết ngày, thoải mái gia hạn.
                  </p>
                )}
              </div>

              {cannotExtendAny ? (
                <Alert
                  message="Không thể gia hạn thêm cho ca này"
                  description={
                    nextBooking
                      ? `Sân đã có ca tiếp theo của khách "${nextBooking.customerName || 'đặt trước'}" bắt đầu lúc ${nextBooking.startTime}. Theo quy định, không được phép gia hạn qua giờ của ca sau!`
                      : 'Không đủ thời lượng tối thiểu 30 phút để gia hạn.'
                  }
                  type="error"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              ) : (
                <>
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
                      <Radio.Button value={30} disabled={!canExtend30}>
                        + 30 Phút (+50.000 đ)
                      </Radio.Button>
                      <Radio.Button value={60} disabled={!canExtend60}>
                        + 60 Phút (+100.000 đ) {!canExtend60 && '(Trùng ca sau)'}
                      </Radio.Button>
                    </Radio.Group>
                  </div>

                  {!canExtend60 && canExtend30 && (
                    <Alert
                      message="Giới hạn thời gian gia hạn"
                      description={`Ca tiếp theo bắt đầu lúc ${nextBooking.startTime}. Sân chỉ còn trống ${headroomMin} phút, do đó chỉ được gia hạn tối đa 30 phút.`}
                      type="warning"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  )}
                </>
              )}

              {extendConflict && (
                <Alert
                  message="Xung đột lịch với ca tiếp theo"
                  description={extendConflict.message}
                  type="warning"
                  showIcon
                  style={{ marginTop: 12 }}
                />
              )}
            </div>
          );
        })()}
      </Modal>

      <Modal
        title="Chuyển Ca Chơi Sang Sân Khác (Đổi Sân)"
        open={switchCourtModalVisible}
        onCancel={() => setSwitchCourtModalVisible(false)}
        onOk={handleSwitchCourtSubmit}
        okText="Chuyển sân"
        cancelText="Hủy"
        okButtonProps={{ disabled: availableCourtsForSwitch.filter((c) => !c.hasConflict).length === 0 }}
      >
        {selectedSessionForSwitch && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span><b>Mã ca:</b> {selectedSessionForSwitch.sessionCode}</span>
                <span><b>Khách:</b> {selectedSessionForSwitch.customerDisplayName || selectedSessionForSwitch.bookingId?.customerId?.fullName || 'Khách chơi'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span><b>Sân hiện tại:</b> {selectedSessionForSwitch.courtId?.name}</span>
                {renderCourtTypeTag(selectedSessionForSwitch.courtId?.courtType)}
              </div>
            </div>

            <Alert
              type="info"
              showIcon
              message={
                <span>
                  Quy tắc đổi sân: Chỉ được phép đổi sang các sân <b>cùng loại ({getCourtTypeName(selectedSessionForSwitch.courtId?.courtType)})</b> và <b>không có lịch đặt trùng giờ</b> trong suốt thời gian chơi còn lại của ca.
                </span>
              }
              style={{ marginBottom: 14 }}
            />

            {availableCourtsForSwitch.filter((c) => !c.hasConflict).length === 0 && (
              <Alert
                type="warning"
                showIcon
                message="Không có sân trống phù hợp"
                description={`Hiện tại tất cả các sân ${getCourtTypeName(selectedSessionForSwitch.courtId?.courtType)} khác đều đang có người chơi hoặc đã có lịch đặt trước trùng với giờ chơi của ca này.`}
                style={{ marginBottom: 14 }}
              />
            )}
          </div>
        )}

        <Form form={switchCourtForm} layout="vertical">
          <Form.Item
            name="newCourtId"
            label="Chọn sân mới cùng loại"
            rules={[{ required: true, message: 'Vui lòng chọn sân mới!' }]}
          >
            <Select
              placeholder={availableCourtsForSwitch.filter((c) => !c.hasConflict).length > 0 ? "Chọn sân khả dụng..." : "Không có sân khả dụng cùng loại"}
              disabled={availableCourtsForSwitch.filter((c) => !c.hasConflict).length === 0}
            >
              {availableCourtsForSwitch.map((c) => (
                <Option key={c._id} value={c._id} disabled={c.hasConflict}>
                  {c.name} ({getCourtTypeName(c.courtType)}) {c.hasConflict ? ` [⚠ ${c.conflictReason}]` : ' [✓ Trống]'}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="reason"
            label="Lý do chuyển sân"
            rules={[{ required: true, message: 'Vui lòng nhập lý do đổi sân!' }]}
          >
            <Input placeholder="Ví dụ: Đèn sân chập chờn / Khách yêu cầu đổi..." />
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
              Sau khi xác nhận, sân sẽ lập tức chuyển sang trạng thái <b>SẴN SÀNG</b> và hệ thống sẽ tự động tạo hóa đơn thanh toán tại quầy.
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
                {checkoutInvoice.sessionDetails?.prepaidDeposit > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#059669', fontWeight: 600 }}>
                    <span>Đã thanh toán trước (Đặt cọc/Online):</span>
                    <span>- {(checkoutInvoice.sessionDetails.prepaidDeposit).toLocaleString('vi-VN')} đ</span>
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
                      Đơn đặt sân sẽ <b>tự động hủy sau 15 phút</b> nếu khách không đến nhận sân. Nhân viên vui lòng gọi điện thoại nhắc khách trước khi hết thời gian giữ sân.
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
