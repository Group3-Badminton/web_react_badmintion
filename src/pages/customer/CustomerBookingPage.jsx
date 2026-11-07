// CLEAN CODE: Khai báo hooks cần thiết cho trang Đặt sân khách hàng
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  DatePicker,
  TimePicker,
  Tag,
  Space,
  Divider,
  Input,
  Spin,
  Alert,
  Modal,
  Result,
  message
} from 'antd';
// CLEAN CODE: Khai báo các icons cần thiết cho giao diện đặt sân
import {
  CalendarOutlined,
  CheckCircleOutlined,
  TagOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  CopyOutlined,
  SyncOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services/bookingService';
import san1 from '../../assets/sân1.png';
import san2 from '../../assets/sân2.png';
import './CustomerBookingPage.css';

const { Title, Text, Paragraph } = Typography;

// Helper: Chuyển đổi giờ HH:mm sang phút
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Helper: Chuyển đổi phút sang giờ HH:mm
// Helper: Tự động tính khung giờ mặc định hợp lệ theo ngày (tránh khung giờ quá khứ)
const getDefaultTimesForDate = (targetDate = dayjs()) => {
  const isToday = dayjs(targetDate).isSame(dayjs(), 'day');
  if (!isToday) {
    return { startTime: '08:00', endTime: '10:00' };
  }
  const now = dayjs();
  const currentH = now.hour();
  const currentM = now.minute();

  let nextStartH = currentM > 0 ? currentH + 1 : currentH;
  if (nextStartH < 8) nextStartH = 8;
  if (nextStartH >= 22) {
    return { startTime: '21:00', endTime: '22:00' };
  }
  const nextEndH = Math.min(23, nextStartH + 2);
  return {
    startTime: `${String(nextStartH).padStart(2, '0')}:00`,
    endTime: `${String(nextEndH).padStart(2, '0')}:00`
  };
};

const formatMinutesToTime = (totalMinutes) => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export default function CustomerBookingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Dữ liệu sân từ backend
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [courts, setCourts] = useState([]);

  // Danh sách các sân vật lý đã được gán tự động
  const [selectedCourts, setSelectedCourts] = useState([]);
  const [referencePrices, setReferencePrices] = useState({});

  // Bước 2: Ngày & Khung giờ
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const initialTimes = useMemo(() => getDefaultTimesForDate(dayjs()), []);
  const [commonStartTime, setCommonStartTime] = useState(initialTimes.startTime);
  const [commonEndTime, setCommonEndTime] = useState(initialTimes.endTime);
  const [courtSchedules, setCourtSchedules] = useState({});

  // Bước 3: Ghi chú khách hàng
  const [note, setNote] = useState('');

  // Bước 4: Voucher & Thanh toán (CASH duy nhất)
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState(null);

  // Bước 5: Bảng giá tính toán từ Backend
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [priceCalculation, setPriceCalculation] = useState({
    courtBreakdowns: [],
    totalBasePrice: 0,
    discount: 0,
    finalTotalAmount: 0,
    appliedVoucher: null
  });

  // Modal Thành Công
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // 1. Tải danh sách sân từ backend
  useEffect(() => {
    const fetchCourts = async () => {
      try {
        setLoadingCourts(true);
        const res = await bookingService.getCourts();
        if (res.success && Array.isArray(res.data)) {
          const activeCourts = res.data.filter((c) => c.status === 'ACTIVE');
          setCourts(activeCourts);
          if (activeCourts.length > 0) {
            // Mặc định chọn 1 sân đầu tiên
            const defTimes = getDefaultTimesForDate(dayjs());
            setSelectedCourts([activeCourts[0]]);
            setCourtSchedules({
              [activeCourts[0]._id]: { startTime: defTimes.startTime, endTime: defTimes.endTime }
            });
          }
        }
      } catch {
        message.error('Không thể tải danh sách sân cầu lông!');
      } finally {
        setLoadingCourts(false);
      }
    };
    fetchCourts();
  }, []);

  // 2. Tải bảng giá tham khảo thực tế từ backend cho danh sách sân
  useEffect(() => {
    const fetchReferencePrices = async () => {
      if (courts.length === 0) return;
      try {
        const courtOrders = courts.map((c) => ({
          courtId: c._id,
          startTime: '08:00',
          endTime: '09:00'
        }));
        const res = await bookingService.calculateBookingPrice({
          courtOrders,
          bookingDate: selectedDate.format('YYYY-MM-DD')
        });
        if (res.success && Array.isArray(res.data?.courtBreakdowns)) {
          const map = {};
          res.data.courtBreakdowns.forEach((cb) => {
            map[cb.courtId] = cb.totalAmount;
          });
          setReferencePrices(map);
        }
      } catch (err) {
        console.warn('Lỗi tải bảng giá tham khảo từ backend:', err);
      }
    };
    fetchReferencePrices();
  }, [courts, selectedDate]);

  // 3. Nhóm các sân vật lý theo Loại Sân (Court Type)
  const courtTypeGroups = useMemo(() => {
    const groups = {};
    courts.forEach((court) => {
      const typeKey = (court.courtType || 'Sân Tiêu Chuẩn').trim();
      if (!groups[typeKey]) {
        const isVip = typeKey.toLowerCase().includes('vip');
        const groupCourts = courts.filter(
          (c) => (c.courtType || 'Sân Tiêu Chuẩn').trim() === typeKey
        );
        const groupPrices = groupCourts
          .map((c) => referencePrices[c._id])
          .filter((p) => typeof p === 'number' && p > 0);
        const refText = groupPrices.length > 0
          ? `Từ ${Math.min(...groupPrices).toLocaleString('vi-VN')} đ / giờ`
          : 'Giá tính tự động theo khung giờ';

        groups[typeKey] = {
          courtType: typeKey,
          courts: [],
          image: court.image || court.avatar || (isVip ? san2 : san1),
          description: court.description || 'Sân đạt chuẩn thi đấu, mặt thảm chuyên dụng',
          referencePrice: refText
        };
      }
      groups[typeKey].courts.push(court);
    });
    return Object.values(groups);
  }, [courts, referencePrices]);

  // Lấy số lượng sân đã chọn của từng loại sân
  const getSelectedCountForType = useCallback((courtType) => {
    return selectedCourts.filter(
      (c) => (c.courtType || 'Sân Tiêu Chuẩn').trim() === courtType
    ).length;
  }, [selectedCourts]);

  // Tăng số lượng sân của một loại sân
  const handleIncreaseCourtType = (group) => {
    const currentSelectedCount = getSelectedCountForType(group.courtType);
    if (currentSelectedCount >= group.courts.length) {
      message.info(`Hiện tại chỉ còn ${group.courts.length} sân ${group.courtType} khả dụng.`);
      return;
    }

    // Tìm sân vật lý thuộc loại này chưa được chọn
    const availableCourt = group.courts.find(
      (c) => !selectedCourts.some((sc) => sc._id === c._id)
    );
    if (!availableCourt) return;

    setSelectedCourts((prev) => [...prev, availableCourt]);
    setCourtSchedules((prev) => ({
      ...prev,
      [availableCourt._id]: prev[availableCourt._id] || {
        startTime: commonStartTime,
        endTime: commonEndTime
      }
    }));
  };

  // Giảm số lượng sân của một loại sân
  const handleDecreaseCourtType = (courtType) => {
    const matchingCourts = selectedCourts.filter(
      (c) => (c.courtType || 'Sân Tiêu Chuẩn').trim() === courtType
    );
    if (matchingCourts.length === 0) return;

    // Loại bỏ sân vật lý cuối cùng thuộc loại này
    const courtToRemove = matchingCourts[matchingCourts.length - 1];
    setSelectedCourts((prev) => prev.filter((c) => c._id !== courtToRemove._id));
  };

  // Lấy lịch thời gian của một sân
  const getCourtSchedule = useCallback((courtId) => {
    return courtSchedules[courtId] || { startTime: commonStartTime, endTime: commonEndTime };
  }, [courtSchedules, commonStartTime, commonEndTime]);

  // Tiện ích vô hiệu hóa giờ/phút trong quá khứ nếu chọn ngày hôm nay
  const getDisabledHoursAndMinutes = useCallback(() => {
    const isToday = selectedDate.isSame(dayjs(), 'day');
    if (!isToday) {
      return {};
    }
    const currentH = dayjs().hour();
    const currentM = dayjs().minute();
    return {
      disabledHours: () => {
        const hours = [];
        for (let i = 0; i < currentH; i++) {
          hours.push(i);
        }
        return hours;
      },
      disabledMinutes: (selectedHour) => {
        const minutes = [];
        if (selectedHour === currentH) {
          for (let i = 0; i <= currentM; i++) {
            minutes.push(i);
          }
        }
        return minutes;
      }
    };
  }, [selectedDate]);

  // Kiểm tra tính hợp lệ của tất cả các khung giờ sân
  const areAllCourtsValid = useMemo(() => {
    if (selectedCourts.length === 0) return false;
    const isToday = selectedDate.isSame(dayjs(), 'day');
    const currentMinutesNow = dayjs().hour() * 60 + dayjs().minute();

    for (const c of selectedCourts) {
      const sch = getCourtSchedule(c._id);
      const sMin = parseTimeToMinutes(sch.startTime);
      const eMin = parseTimeToMinutes(sch.endTime);
      if (eMin <= sMin || (eMin - sMin) < 30) {
        return false;
      }
      // Không cho phép đặt giờ bắt đầu trong quá khứ nếu là ngày hôm nay
      if (isToday && sMin <= currentMinutesNow) {
        return false;
      }
    }
    return true;
  }, [selectedCourts, getCourtSchedule, selectedDate]);

  // Gọi Backend tính giá có thẩm quyền
  const fetchPriceCalculation = useCallback(async () => {
    if (selectedCourts.length === 0 || !areAllCourtsValid) {
      setPriceCalculation({
        courtBreakdowns: [],
        totalBasePrice: 0,
        discount: 0,
        finalTotalAmount: 0,
        appliedVoucher: null
      });
      return;
    }

    const courtOrders = selectedCourts.map((c) => {
      const sch = getCourtSchedule(c._id);
      return {
        courtId: c._id,
        startTime: sch.startTime,
        endTime: sch.endTime
      };
    });

    try {
      setLoadingPrice(true);
      const res = await bookingService.calculateBookingPrice({
        courtOrders,
        bookingDate: selectedDate.format('YYYY-MM-DD'),
        voucherCode: appliedVoucher ? appliedVoucher.voucherCode : undefined
      });

      if (res.success && res.data) {
        setPriceCalculation(res.data);
        if (appliedVoucher && !res.data.appliedVoucher) {
          setAppliedVoucher(null);
          message.warning(`Mã ${appliedVoucher.voucherCode} không còn áp dụng được do danh sách sân đã thay đổi!`);
        }
      }
    } catch (err) {
      console.error('Lỗi tính giá chi tiết:', err);
    } finally {
      setLoadingPrice(false);
    }
  }, [selectedCourts, selectedDate, getCourtSchedule, appliedVoucher, areAllCourtsValid]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPriceCalculation();
  }, [fetchPriceCalculation]);

  // Đồng bộ khung giờ chung cho tất cả sân đã chọn
  const handleApplyCommonTimeToAllCourts = () => {
    if (selectedCourts.length === 0) return;
    const updated = {};
    selectedCourts.forEach((c) => {
      updated[c._id] = { startTime: commonStartTime, endTime: commonEndTime };
    });
    setCourtSchedules((prev) => ({ ...prev, ...updated }));
    message.success(`Đã đồng bộ khung giờ ${commonStartTime} – ${commonEndTime} cho tất cả ${selectedCourts.length} sân!`);
  };

  // Thay đổi giờ cho 1 sân cụ thể
  const handleCourtStartTimeChange = (courtId, val, timeStr) => {
    const chosen = timeStr || (val ? val.format('HH:mm') : '');
    if (!chosen) return;
    setCourtSchedules((prev) => {
      const cur = prev[courtId] || { startTime: commonStartTime, endTime: commonEndTime };
      const newStartMin = parseTimeToMinutes(chosen);
      const curEndMin = parseTimeToMinutes(cur.endTime);
      const currentDur = curEndMin > newStartMin ? curEndMin - newStartMin : 60;
      const targetDur = Math.max(30, currentDur);
      return {
        ...prev,
        [courtId]: {
          startTime: chosen,
          endTime: formatMinutesToTime(newStartMin + targetDur)
        }
      };
    });
  };

  const handleCourtEndTimeChange = (courtId, val, timeStr) => {
    const chosen = timeStr || (val ? val.format('HH:mm') : '');
    if (!chosen) return;
    setCourtSchedules((prev) => {
      const cur = prev[courtId] || { startTime: commonStartTime, endTime: commonEndTime };
      return {
        ...prev,
        [courtId]: {
          ...cur,
          endTime: chosen
        }
      };
    });
  };

  // Áp dụng Voucher
  const handleApplyVoucher = async (codeToApply) => {
    const code = (codeToApply || voucherCodeInput).trim().toUpperCase();
    if (!code) {
      message.warning('Vui lòng nhập mã giảm giá!');
      return;
    }

    const currentPrice = priceCalculation.totalBasePrice || 0;
    try {
      setValidatingVoucher(true);
      const res = await bookingService.validateVoucher(code, currentPrice, {
        courtBreakdowns: priceCalculation.courtBreakdowns,
        courtTypes: selectedCourts.map((c) => c.courtType)
      });
      if (res.success && res.data) {
        setAppliedVoucher(res.data);
        setVoucherCodeInput(code);
        message.success(`Đã áp dụng mã ${res.data.voucherCode}! Giảm ${res.data.discount.toLocaleString('vi-VN')}đ`);
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Mã giảm giá không hợp lệ hoặc không đủ điều kiện!');
      setAppliedVoucher(null);
    } finally {
      setValidatingVoucher(false);
    }
  };

  // Hủy Voucher
  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCodeInput('');
    message.info('Đã hủy áp dụng mã giảm giá.');
  };

  // Xác nhận tạo booking
  const handleConfirmBooking = async () => {
    if (selectedCourts.length === 0) {
      message.error('Vui lòng chọn ít nhất 1 sân thi đấu ở Bước 1!');
      return;
    }

    if (!areAllCourtsValid) {
      const isToday = selectedDate.isSame(dayjs(), 'day');
      const currentMinutesNow = dayjs().hour() * 60 + dayjs().minute();
      const hasPastSlot = selectedCourts.some((c) => {
        const sch = getCourtSchedule(c._id);
        return isToday && parseTimeToMinutes(sch.startTime) <= currentMinutesNow;
      });
      if (hasPastSlot) {
        message.error('Không thể đặt sân vào khung giờ đã qua trong ngày! Vui lòng chọn giờ sau thời điểm hiện tại.');
      } else {
        message.error('Khung giờ một số sân chưa hợp lệ (tối thiểu 30 phút). Vui lòng kiểm tra lại!');
      }
      return;
    }

    try {
      setSubmittingBooking(true);
      const courtOrders = selectedCourts.map((c) => {
        const sch = getCourtSchedule(c._id);
        return {
          courtId: c._id,
          startTime: sch.startTime,
          endTime: sch.endTime
        };
      });

      const bookingPayload = {
        customerId: user?._id || user?.userId || user?.id,
        customerName: (user?.fullName || 'Khách hàng').trim(),
        customerPhone: (user?.phone || '').trim(),
        customerEmail: user?.email?.trim() || undefined,
        customerAddress: user?.address?.trim() || undefined,
        courtOrders,
        courtIds: selectedCourts.map((c) => c._id),
        courtId: selectedCourts[0]?._id,
        bookingDate: selectedDate.format('YYYY-MM-DD'),
        voucherCode: appliedVoucher ? appliedVoucher.voucherCode : undefined,
        paymentMethod: 'CASH', // Hệ thống chỉ hỗ trợ tiền mặt tại quầy
        note: note.trim()
      };

      const res = await bookingService.createBooking(bookingPayload);
      if (res.success && res.data) {
        setCreatedBooking(res.data);
        setIsSuccessModalOpen(true);
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Đặt sân không thành công, vui lòng thử lại!');
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Reset và đặt thêm đơn mới
  const handleResetAndBookAgain = () => {
    setIsSuccessModalOpen(false);
    setCreatedBooking(null);
    const defTimes = getDefaultTimesForDate(selectedDate);
    if (courts.length > 0) {
      setSelectedCourts([courts[0]]);
      setCourtSchedules({
        [courts[0]._id]: { startTime: defTimes.startTime, endTime: defTimes.endTime }
      });
    }
    setCommonStartTime(defTimes.startTime);
    setCommonEndTime(defTimes.endTime);
    setAppliedVoucher(null);
    setVoucherCodeInput('');
    setNote('');
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    message.success(`Đã sao chép mã đơn: #${code}`);
  };

  return (
    <div className="customer-booking-container">
      {/* Header Banner */}
      <div className="booking-header-banner">
        <Tag color="#10b981" style={{ fontSize: 12, padding: '3px 12px', borderRadius: 12, fontWeight: 600 }}>
          HỆ THỐNG ĐẶT SÂN TRỰC TUYẾN
        </Tag>
        <Title level={2} className="booking-title">
          Đặt Lịch Sân Cầu Lông
        </Title>
        <Paragraph className="booking-subtitle">
          Quy trình 5 bước đơn giản, tự động chọn sân theo loại, minh bạch giá theo từng khung giờ và thanh toán tiện lợi tại quầy.
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        {/* CỘT TRÁI: CÁC BƯỚC 1 - 4 */}
        <Col xs={24} lg={15} xl={16}>
          {/* BƯỚC 1: CHỌN LOẠI SÂN VÀ SỐ LƯỢNG */}
          <Card
            className="booking-step-card"
            title={
              <div className="booking-step-header">
                <div className="booking-step-title-group">
                  <span className="booking-step-number">1</span>
                  <span className="booking-step-title-text">Chọn loại sân và số lượng</span>
                </div>
                <Tag color={selectedCourts.length > 0 ? 'green' : 'default'} style={{ borderRadius: 8, fontWeight: 600 }}>
                  Đã chọn: {selectedCourts.length} sân
                </Tag>
              </div>
            }
          >
            {loadingCourts ? (
              <div style={{ textAlign: 'center', padding: '36px 0' }}>
                <Spin size="large" />
                <Paragraph style={{ marginTop: 10, color: '#64748b' }}>Đang tải danh sách sân khả dụng...</Paragraph>
              </div>
            ) : courtTypeGroups.length === 0 ? (
              <Alert message="Hiện không có sân nào đang mở để đặt lịch." type="warning" showIcon />
            ) : (
              <Row gutter={[16, 16]}>
                {courtTypeGroups.map((group) => {
                  const selectedCount = getSelectedCountForType(group.courtType);
                  const isSelected = selectedCount > 0;
                  const isUnavailable = group.courts.length === 0;

                  return (
                    <Col xs={24} sm={12} key={group.courtType}>
                      <div className={`court-type-card ${isSelected ? 'selected' : ''} ${isUnavailable ? 'unavailable' : ''}`}>
                        <div className="court-type-image-wrapper">
                          <img src={group.image} alt={group.courtType} />
                          <div style={{ position: 'absolute', top: 8, right: 8 }}>
                            <Tag color={isUnavailable ? 'default' : 'green'} style={{ fontWeight: 600, margin: 0 }}>
                              {isUnavailable ? 'Hết sân' : `Còn ${group.courts.length} sân trống`}
                            </Tag>
                          </div>
                        </div>

                        <div className="court-type-content">
                          <div>
                            <div className="court-type-name">{group.courtType}</div>
                            <div className="court-type-desc">{group.description}</div>
                            <div className="court-type-price-ref">
                              <DollarOutlined style={{ marginRight: 4 }} />
                              {group.referencePrice}
                            </div>
                          </div>

                          <div className="quantity-control">
                            <button
                              type="button"
                              className="qty-btn"
                              disabled={selectedCount <= 0}
                              onClick={() => handleDecreaseCourtType(group.courtType)}
                            >
                              −
                            </button>
                            <span className="qty-display">
                              {selectedCount}
                            </span>
                            <button
                              type="button"
                              className="qty-btn"
                              disabled={selectedCount >= group.courts.length}
                              onClick={() => handleIncreaseCourtType(group)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Card>

          {/* BƯỚC 2: CHỌN NGÀY VÀ KHUNG GIỜ CHO TỪNG SÂN */}
          <Card
            className="booking-step-card"
            title={
              <div className="booking-step-header">
                <div className="booking-step-title-group">
                  <span className="booking-step-number">2</span>
                  <span className="booking-step-title-text">Chọn ngày và khung giờ chơi</span>
                </div>
                <Tag color="cyan" style={{ borderRadius: 6 }}>
                  Định dạng 24/7
                </Tag>
              </div>
            }
          >
            {/* Bộ chọn ngày */}
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <Row gutter={[16, 12]} align="middle">
                <Col xs={24} md={10}>
                  <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#334155' }}>
                    <CalendarOutlined style={{ color: '#009B60', marginRight: 6 }} />
                    Ngày đặt sân:
                  </Text>
                  <DatePicker
                    value={selectedDate}
                    onChange={(date) => {
                      const newDate = date || dayjs();
                      setSelectedDate(newDate);
                      const defTimes = getDefaultTimesForDate(newDate);
                      setCommonStartTime(defTimes.startTime);
                      setCommonEndTime(defTimes.endTime);
                      setCourtSchedules((prev) => {
                        const updated = {};
                        selectedCourts.forEach((c) => {
                          updated[c._id] = { startTime: defTimes.startTime, endTime: defTimes.endTime };
                        });
                        return updated;
                      });
                    }}
                    disabledDate={(current) => current && current < dayjs().startOf('day')}
                    format="DD/MM/YYYY"
                    allowClear={false}
                    style={{ width: '100%', height: 40, borderRadius: 8 }}
                  />
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    {selectedDate.format('dddd, [ngày] DD/MM/YYYY')}
                  </Text>
                </Col>

                {/* Tiện ích áp dụng giờ chung */}
                <Col xs={24} md={14}>
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                      <Text strong style={{ fontSize: 12, color: '#475569' }}>
                        Khung giờ chung tiện ích:
                      </Text>
                      <Button
                        size="small"
                        type="link"
                        icon={<SyncOutlined />}
                        onClick={handleApplyCommonTimeToAllCourts}
                        style={{ padding: 0, fontSize: 12, color: '#009B60', fontWeight: 600 }}
                      >
                        Đồng bộ tất cả sân
                      </Button>
                    </div>

                    <Row gutter={[8, 8]}>
                      <Col xs={12}>
                        <TimePicker
                          value={dayjs(commonStartTime, 'HH:mm')}
                          onChange={(val, str) => {
                            if (str) setCommonStartTime(str);
                          }}
                          disabledTime={getDisabledHoursAndMinutes}
                          format="HH:mm"
                          minuteStep={15}
                          needConfirm={false}
                          allowClear={false}
                          style={{ width: '100%', height: 36, borderRadius: 6 }}
                        />
                      </Col>
                      <Col xs={12}>
                        <TimePicker
                          value={dayjs(commonEndTime, 'HH:mm')}
                          onChange={(val, str) => {
                            if (str) setCommonEndTime(str);
                          }}
                          format="HH:mm"
                          minuteStep={15}
                          needConfirm={false}
                          allowClear={false}
                          style={{ width: '100%', height: 36, borderRadius: 6 }}
                        />
                      </Col>
                    </Row>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Danh sách các sân vật lý đã được gán */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 10, fontSize: 13, color: '#0f172a' }}>
                Khung giờ chi tiết cho từng sân ({selectedCourts.length} sân):
              </Text>

              {selectedCourts.length === 0 ? (
                <Alert
                  type="info"
                  message="Vui lòng chọn số lượng sân ở Bước 1 để cấu hình khung giờ."
                  showIcon
                  style={{ borderRadius: 8 }}
                />
              ) : (
                selectedCourts.map((c) => {
                  const sch = getCourtSchedule(c._id);
                  const sMin = parseTimeToMinutes(sch.startTime);
                  const eMin = parseTimeToMinutes(sch.endTime);
                  const durMin = Math.max(0, eMin - sMin);
                  const durHours = durMin > 0 ? (durMin / 60).toFixed(1) : 0;
                  const isToday = selectedDate.isSame(dayjs(), 'day');
                  const currentMinutesNow = dayjs().hour() * 60 + dayjs().minute();
                  const isPastTime = isToday && sMin <= currentMinutesNow;
                  const isValid = eMin > sMin && durMin >= 30 && !isPastTime;

                  // Lấy giá tạm tính từ Backend
                  const matchedBreakdown = (priceCalculation.courtBreakdowns || []).find(
                    (cb) => cb.courtId?.toString() === c._id.toString()
                  );

                  return (
                    <div key={c._id} className={`court-schedule-item ${isValid ? '' : 'invalid'}`}>
                      <Row gutter={[16, 12]} align="middle">
                        <Col xs={24} sm={8}>
                          <Space size={6} wrap>
                            <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                              {c.courtName}
                            </Text>
                            <Tag color={c.courtType?.includes('VIP') ? 'gold' : 'green'} style={{ margin: 0, fontSize: 11 }}>
                              {c.courtType}
                            </Tag>
                          </Space>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            {c.location || 'Trong nhà'}
                          </div>
                        </Col>

                        <Col xs={12} sm={6}>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                            Giờ bắt đầu:
                          </Text>
                          <TimePicker
                            value={dayjs(sch.startTime, 'HH:mm')}
                            onChange={(val, str) => handleCourtStartTimeChange(c._id, val, str)}
                            disabledTime={getDisabledHoursAndMinutes}
                            format="HH:mm"
                            minuteStep={15}
                            needConfirm={false}
                            allowClear={false}
                            style={{ width: '100%', height: 38, borderRadius: 6 }}
                          />
                        </Col>

                        <Col xs={12} sm={6}>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                            Giờ kết thúc:
                          </Text>
                          <TimePicker
                            value={dayjs(sch.endTime, 'HH:mm')}
                            onChange={(val, str) => handleCourtEndTimeChange(c._id, val, str)}
                            format="HH:mm"
                            minuteStep={15}
                            needConfirm={false}
                            allowClear={false}
                            style={{ width: '100%', height: 38, borderRadius: 6 }}
                          />
                        </Col>

                        <Col xs={24} sm={4} style={{ textAlign: 'right' }}>
                          <div>
                            {isValid ? (
                              <Tag color="green" style={{ margin: 0, fontWeight: 500 }}>
                                {durHours}h ({durMin}p)
                              </Tag>
                            ) : isPastTime ? (
                              <Tag color="error" style={{ margin: 0, fontWeight: 500 }}>
                                Giờ đã qua
                              </Tag>
                            ) : (
                              <Tag color="error" style={{ margin: 0 }}>
                                Tối thiểu 30p
                              </Tag>
                            )}
                          </div>
                          {matchedBreakdown && (
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#009B60', marginTop: 4 }}>
                              {matchedBreakdown.totalAmount.toLocaleString('vi-VN')} đ
                            </div>
                          )}
                        </Col>
                      </Row>

                      {!isValid && (
                        <div style={{ color: '#ef4444', fontSize: 11, marginTop: 6 }}>
                          {isPastTime
                            ? '* Khung giờ này đã qua trong ngày. Vui lòng chọn giờ sau thời điểm hiện tại.'
                            : '* Giờ kết thúc phải sau giờ bắt đầu tối thiểu 30 phút.'}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* BƯỚC 3: THÔNG TIN KHÁCH HÀNG */}
          <Card
            className="booking-step-card"
            title={
              <div className="booking-step-header">
                <div className="booking-step-title-group">
                  <span className="booking-step-number">3</span>
                  <span className="booking-step-title-text">Thông tin khách hàng</span>
                </div>
                <Tag color="green">Tự động từ tài khoản</Tag>
              </div>
            }
          >
            <div className="customer-info-box">
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12}>
                  <div className="customer-field-card">
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Họ và tên</Text>
                    <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                      {user?.fullName || 'Khách hàng'}
                    </Text>
                  </div>
                </Col>

                <Col xs={24} sm={12}>
                  <div className="customer-field-card">
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Số điện thoại</Text>
                    <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                      {user?.phone || 'Chưa cập nhật SĐT'}
                    </Text>
                  </div>
                </Col>

                <Col xs={24} sm={12}>
                  <div className="customer-field-card">
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Email</Text>
                    <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                      {user?.email || 'Chưa cập nhật email'}
                    </Text>
                  </div>
                </Col>

                <Col xs={24} sm={12}>
                  <div className="customer-field-card">
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>Địa chỉ</Text>
                    <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                      {user?.address || 'Chưa cập nhật'}
                    </Text>
                  </div>
                </Col>
              </Row>
            </div>

            <div style={{ marginTop: 14 }}>
              <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#334155' }}>
                Ghi chú thêm (tùy chọn):
              </Text>
              <Input.TextArea
                rows={2}
                placeholder="Nhập ghi chú cho nhân viên quầy (ví dụ: mượn vợt, chuẩn bị nước uống...)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ borderRadius: 8 }}
                maxLength={300}
              />
            </div>
          </Card>

          {/* BƯỚC 4: MÃ KHUYẾN MÃI & THANH TOÁN */}
          <Card
            className="booking-step-card"
            title={
              <div className="booking-step-header">
                <div className="booking-step-title-group">
                  <span className="booking-step-number">4</span>
                  <span className="booking-step-title-text">Mã khuyến mãi & Thanh toán</span>
                </div>
              </div>
            }
          >
            {/* Mã khuyến mãi */}
            <div style={{ marginBottom: 18 }}>
              <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#334155' }}>
                <TagOutlined style={{ color: '#009B60', marginRight: 6 }} />
                Mã giảm giá (Voucher):
              </Text>
              <div className="voucher-input-wrapper">
                <Input
                  placeholder="Nhập mã voucher (nếu có)"
                  value={voucherCodeInput}
                  onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                  style={{ height: 40, borderRadius: 8 }}
                  disabled={!!appliedVoucher}
                />
                {appliedVoucher ? (
                  <Button danger onClick={handleRemoveVoucher} style={{ height: 40, borderRadius: 8 }}>
                    Hủy bỏ
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    loading={validatingVoucher}
                    onClick={() => handleApplyVoucher()}
                    style={{ height: 40, borderRadius: 8, backgroundColor: '#009B60', borderColor: '#009B60', fontWeight: 600 }}
                  >
                    Áp Dụng
                  </Button>
                )}
              </div>

              {appliedVoucher ? (
                <Alert
                  message={`Áp dụng thành công mã ${appliedVoucher.voucherCode}!`}
                  description={`${appliedVoucher.voucherName} (Giảm ${appliedVoucher.discount.toLocaleString('vi-VN')} đ)`}
                  type="success"
                  showIcon
                  style={{ borderRadius: 8, marginTop: 10 }}
                />
              ) : (
                <div style={{ marginTop: 6 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Nhập mã giảm giá của bạn để áp dụng chiết khấu trực tiếp trên tổng đơn đặt sân.
                  </Text>
                </div>
              )}
            </div>

            <Divider style={{ margin: '16px 0' }} />

            {/* Phương thức thanh toán duy nhất: Tiền mặt tại quầy */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#334155' }}>
                <DollarOutlined style={{ color: '#009B60', marginRight: 6 }} />
                Phương thức thanh toán:
              </Text>
              <div className="payment-method-card">
                <Space align="center" size={12}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: '#009B60',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18
                  }}>
                    <DollarOutlined />
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 14, display: 'block', color: '#0f172a' }}>
                      Tiền mặt tại quầy khi nhận sân
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Thanh toán trực tiếp cho nhân viên lễ tân khi đến nhận sân chơi
                    </Text>
                  </div>
                </Space>
                <Tag color="green" style={{ margin: 0, fontWeight: 600 }}>
                  Tại quầy
                </Tag>
              </div>
            </div>
          </Card>
        </Col>

        {/* CỘT PHẢI: BƯỚC 5 — TÓM TẮT GIÁ & XÁC NHẬN BOOKING */}
        <Col xs={24} lg={9} xl={8}>
          <Card
            className="booking-summary-card"
            title={
              <div className="booking-step-title-group">
                <span className="booking-step-number">5</span>
                <span className="booking-step-title-text">Tóm tắt & Xác nhận</span>
              </div>
            }
            extra={loadingPrice && <Spin size="small" />}
          >
            {/* Thông tin ngày & sân */}
            <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Ngày chơi:</Text>
                <Text strong style={{ fontSize: 12 }}>{selectedDate.format('DD/MM/YYYY')}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Số lượng sân:</Text>
                <Text strong style={{ fontSize: 12 }}>{selectedCourts.length} sân</Text>
              </div>
            </div>

            {/* Chi tiết từng sân */}
            <div style={{ marginBottom: 14 }}>
              <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6, color: '#475569' }}>
                Chi tiết khung giờ & thành tiền:
              </Text>
              {priceCalculation.courtBreakdowns && priceCalculation.courtBreakdowns.length > 0 ? (
                priceCalculation.courtBreakdowns.map((cb) => (
                  <div key={cb.courtId} className="summary-court-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text strong style={{ fontSize: 13, color: '#0f172a' }}>
                        {cb.courtName}
                      </Text>
                      <Text strong style={{ color: '#009B60', fontSize: 13 }}>
                        {(cb.totalAmount || 0).toLocaleString('vi-VN')} đ
                      </Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
                      <span>{cb.courtType}</span>
                      <span>{cb.startTime} – {cb.endTime} ({cb.durationHours}h)</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '12px 0', color: '#94a3b8', fontSize: 12 }}>
                  Chưa có thông tin sân hoặc khung giờ
                </div>
              )}
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* Chi tiết tính tiền */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>Tạm tính các sân:</Text>
                <Text strong style={{ fontSize: 13 }}>
                  {(priceCalculation.totalBasePrice || 0).toLocaleString('vi-VN')} đ
                </Text>
              </div>

              {priceCalculation.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#16a34a' }}>
                  <Text style={{ color: '#16a34a', fontSize: 13 }}>Giảm giá khuyến mãi:</Text>
                  <Text strong style={{ color: '#16a34a', fontSize: 13 }}>
                    - {(priceCalculation.discount || 0).toLocaleString('vi-VN')} đ
                  </Text>
                </div>
              )}

              <Divider style={{ margin: '10px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                  Tổng thanh toán:
                </Text>
                <Text strong style={{ fontSize: 24, color: '#009B60' }}>
                  {(priceCalculation.finalTotalAmount || 0).toLocaleString('vi-VN')} đ
                </Text>
              </div>
            </div>

            {/* Nút xác nhận đặt sân */}
            <Button
              type="primary"
              size="large"
              block
              className="confirm-booking-btn"
              loading={submittingBooking}
              disabled={selectedCourts.length === 0 || !areAllCourtsValid || priceCalculation.totalBasePrice === 0}
              onClick={handleConfirmBooking}
              icon={<CheckCircleOutlined />}
            >
              Xác Nhận Đặt Sân
            </Button>

            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                <SafetyCertificateOutlined style={{ color: '#009B60', marginRight: 4 }} />
                Minh bạch giá 100% – Thanh toán tại quầy
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* MODAL THÀNH CÔNG */}
      <Modal
        open={isSuccessModalOpen}
        onCancel={() => {
          setIsSuccessModalOpen(false);
          handleResetAndBookAgain();
        }}
        footer={null}
        width={560}
        centered
        style={{ borderRadius: 16 }}
      >
        {createdBooking && (
          <div style={{ padding: '8px 4px' }}>
            <Result
              status="success"
              title="Đặt Sân Thành Công!"
              subTitle={
                <span>
                  Đơn đặt sân mã{' '}
                  <Text strong style={{ color: '#009B60', fontSize: 16 }}>
                    #{createdBooking.bookingCode}
                  </Text>{' '}
                  đã được ghi nhận vào hệ thống.
                </span>
              }
            />

            <Alert
              message="Yêu cầu đang chờ nhân viên duyệt"
              description="Hệ thống đã chuyển đơn của bạn đến ban quản lý. Vui lòng kiểm tra trạng thái tại mục 'Đơn đặt của tôi'."
              type="info"
              showIcon
              style={{ marginBottom: 16, borderRadius: 8 }}
            />

            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary">Mã đơn:</Text>
                <Space>
                  <Text strong>#{createdBooking.bookingCode}</Text>
                  <Button
                    size="small"
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={() => copyCode(createdBooking.bookingCode)}
                  />
                </Space>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary">Ngày chơi:</Text>
                <Text strong>{dayjs(createdBooking.bookingDate).format('DD/MM/YYYY')}</Text>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary">Tổng thanh toán:</Text>
                <Text strong style={{ color: '#009B60', fontSize: 16 }}>
                  {(createdBooking.totalAmount || 0).toLocaleString('vi-VN')} đ
                </Text>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Hình thức:</Text>
                <Tag color="green" style={{ margin: 0 }}>Tiền mặt tại quầy</Tag>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <Button
                onClick={() => navigate('/customer/my-bookings')}
                style={{ borderRadius: 8, height: 40, padding: '0 20px', fontWeight: 500 }}
              >
                Đơn Đặt Của Tôi
              </Button>
              <Button
                type="primary"
                onClick={handleResetAndBookAgain}
                style={{
                  borderRadius: 8,
                  height: 40,
                  padding: '0 20px',
                  backgroundColor: '#009B60',
                  borderColor: '#009B60',
                  fontWeight: 600
                }}
              >
                Đặt Thêm Sân Khác
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
