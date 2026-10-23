import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Radio,
  Spin,
  Alert,
  Modal,
  Result,
  Descriptions,
  Table,
  message
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  TagOutlined,
  DollarOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  CopyOutlined,
  BankOutlined,
  FileTextOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services/bookingService';
import san1 from '../../assets/sân1.png';
import san2 from '../../assets/sân2.png';
import san3 from '../../assets/sân3.png';

const { Title, Text, Paragraph } = Typography;

const COURT_IMAGES = [san1, san2, san3, san1];

// Chuyển đổi giờ HH:mm sang phút
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Chuyển đổi phút sang giờ HH:mm
const formatMinutesToTime = (totalMinutes) => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export default function CustomerBookingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Dữ liệu sân
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [courts, setCourts] = useState([]);

  // 1. Sân được chọn (hỗ trợ nhiều sân)
  const [selectedCourts, setSelectedCourts] = useState([]);

  // 2. Ngày & Khung giờ
  const [selectedDate, setSelectedDate] = useState(dayjs());
  // 2. Thời gian chơi: Hỗ trợ cả khung giờ chung lẫn từng sân riêng biệt
  const [commonStartTime, setCommonStartTime] = useState('08:00');
  const [commonEndTime, setCommonEndTime] = useState('10:00');
  // courtSchedules: { [courtId]: { startTime: '08:00', endTime: '10:00' } }
  const [courtSchedules, setCourtSchedules] = useState({});

  // 3. Ghi chú (Thông tin khách hàng lấy tự động từ user)
  const [note, setNote] = useState('');

  // 4. Voucher & Thanh toán
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  // Chi tiết tính giá theo từng sân và từng khoảng thời gian (lấy từ backend)
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [priceCalculation, setPriceCalculation] = useState({
    courtBreakdowns: [],
    totalBasePrice: 0,
    discount: 0,
    finalTotalAmount: 0,
    appliedVoucher: null
  });

  // Modal Khóa Đơn / Xác Nhận Đặt Sân (Review chi tiết từng khoảng giờ trước khi lưu)
  const [isConfirmLockModalOpen, setIsConfirmLockModalOpen] = useState(false);

  // Modal Thành Công
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Tải danh sách sân ban đầu
  useEffect(() => {
    const fetchCourts = async () => {
      try {
        setLoadingCourts(true);
        const res = await bookingService.getCourts();
        if (res.success && res.data) {
          setCourts(res.data);
          if (res.data.length > 0) {
            setSelectedCourts([res.data[0]]);
            setCourtSchedules({
              [res.data[0]._id]: { startTime: '08:00', endTime: '10:00' }
            });
          }
        }
      } catch (err) {
        message.error('Không thể tải danh sách sân cầu lông!');
      } finally {
        setLoadingCourts(false);
      }
    };
    fetchCourts();
  }, []);

  // Lấy lịch đặt của 1 sân (nếu chưa có thì lấy theo khung giờ chung)
  const getCourtSchedule = useCallback((courtId) => {
    if (courtSchedules[courtId]) {
      return courtSchedules[courtId];
    }
    return { startTime: commonStartTime, endTime: commonEndTime };
  }, [courtSchedules, commonStartTime, commonEndTime]);

  // Kiểm tra tính hợp lệ của tất cả các sân được chọn
  const areAllCourtsValid = useMemo(() => {
    if (selectedCourts.length === 0) return false;
    for (const c of selectedCourts) {
      const sch = getCourtSchedule(c._id);
      const sMin = parseTimeToMinutes(sch.startTime);
      const eMin = parseTimeToMinutes(sch.endTime);
      if (eMin <= sMin || (eMin - sMin) < 30) {
        return false;
      }
    }
    return true;
  }, [selectedCourts, getCourtSchedule]);

  // Tính lại toàn bộ bảng giá từ Backend mỗi khi thay đổi sân, ngày, giờ từng sân, hoặc voucher
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
      }
    } catch (err) {
      console.error('Lỗi tính giá chi tiết:', err);
    } finally {
      setLoadingPrice(false);
    }
  }, [selectedCourts, selectedDate, getCourtSchedule, appliedVoucher, areAllCourtsValid]);

  useEffect(() => {
    fetchPriceCalculation();
  }, [fetchPriceCalculation]);

  // Xử lý chọn / bỏ chọn nhiều sân
  const handleToggleCourt = (court) => {
    const isSelected = selectedCourts.some((selectedCourt) => selectedCourt._id === court._id);

    if (isSelected) {
      if (selectedCourts.length === 1) {
        message.warning('Vui lòng chọn ít nhất 1 sân thi đấu!');
        return;
      }

      setSelectedCourts((prev) => prev.filter((selectedCourt) => selectedCourt._id !== court._id));
      return;
    }

    setCourtSchedules((schedules) => ({
      ...schedules,
      [court._id]: schedules[court._id] || { startTime: commonStartTime, endTime: commonEndTime }
    }));
    setSelectedCourts((prev) => (
      prev.some((selectedCourt) => selectedCourt._id === court._id) ? prev : [...prev, court]
    ));
  };

  // Chọn tất cả hoặc bỏ bớt
  const handleSelectAllCourts = () => {
    if (selectedCourts.length === courts.length) {
      if (courts.length > 0) setSelectedCourts([courts[0]]);
    } else {
      const newSchedules = { ...courtSchedules };
      courts.forEach((c) => {
        if (!newSchedules[c._id]) {
          newSchedules[c._id] = { startTime: commonStartTime, endTime: commonEndTime };
        }
      });
      setCourtSchedules(newSchedules);
      setSelectedCourts([...courts]);
    }
  };

  // Đổi giờ chung
  const handleCommonStartTimeChange = (val, timeStr) => {
    const chosen = timeStr || (val ? val.format('HH:mm') : '');
    if (!chosen) return;
    setCommonStartTime(chosen);
    const newStartMin = parseTimeToMinutes(chosen);
    const curEndMin = parseTimeToMinutes(commonEndTime);
    const currentDur = curEndMin > newStartMin ? curEndMin - newStartMin : 60;
    const targetDur = Math.max(30, currentDur);
    setCommonEndTime(formatMinutesToTime(newStartMin + targetDur));
  };

  const handleCommonEndTimeChange = (val, timeStr) => {
    const chosen = timeStr || (val ? val.format('HH:mm') : '');
    if (!chosen) return;
    setCommonEndTime(chosen);
  };

  // Áp dụng khung giờ chung cho tất cả các sân
  const handleApplyCommonTimeToAllCourts = () => {
    const updated = {};
    selectedCourts.forEach((c) => {
      updated[c._id] = { startTime: commonStartTime, endTime: commonEndTime };
    });
    setCourtSchedules((prev) => ({ ...prev, ...updated }));
    message.success(`Đã áp dụng khung giờ ${commonStartTime} - ${commonEndTime} cho tất cả ${selectedCourts.length} sân!`);
  };

  // Đổi giờ bắt đầu cho 1 sân cụ thể
  const handleCourtStartTimeChange = (courtId, val, timeStr) => {
    const chosen = timeStr || (val ? val.format('HH:mm') : '');
    if (!chosen) return;
    setCourtSchedules((prev) => {
      const cur = prev[courtId] || { startTime: commonStartTime, endTime: commonEndTime };
      const newStartMin = parseTimeToMinutes(chosen);
      const curEndMin = parseTimeToMinutes(cur.endTime);
      const currentDur = curEndMin > newStartMin ? curEndMin - newStartMin : 60;
      const targetDur = Math.max(30, currentDur);
      const newEnd = formatMinutesToTime(newStartMin + targetDur);
      return {
        ...prev,
        [courtId]: {
          startTime: chosen,
          endTime: newEnd
        }
      };
    });
  };

  // Đổi giờ kết thúc cho 1 sân cụ thể
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

  // Áp dụng voucher
  const handleApplyVoucher = async (codeToApply) => {
    const code = (codeToApply || voucherCodeInput).trim().toUpperCase();
    if (!code) {
      message.warning('Vui lòng nhập mã giảm giá!');
      return;
    }

    const currentPrice = priceCalculation.totalBasePrice > 0 ? priceCalculation.totalBasePrice : 100000;
    try {
      setValidatingVoucher(true);
      const res = await bookingService.validateVoucher(code, currentPrice);
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

  // Hủy voucher
  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCodeInput('');
    message.info('Đã hủy áp dụng mã giảm giá');
  };

  // Mở modal khóa đơn và kiểm tra chi tiết giá từng khoảng giờ
  const handleOpenLockModal = () => {
    if (selectedCourts.length === 0) {
      message.error('Vui lòng chọn ít nhất 1 sân thi đấu!');
      return;
    }

    if (!areAllCourtsValid) {
      message.error('Vui lòng kiểm tra lại khung giờ của các sân (tối thiểu 30 phút và giờ kết thúc sau giờ bắt đầu)!');
      return;
    }

    setIsConfirmLockModalOpen(true);
  };

  // Thực hiện khóa đơn và gửi đơn đặt sân lên Backend
  const handleExecuteBooking = async () => {
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
        paymentMethod,
        note: note.trim()
      };

      const res = await bookingService.createBooking(bookingPayload);
      if (res.success && res.data) {
        setIsConfirmLockModalOpen(false);
        setCreatedBooking(res.data);
        setIsSuccessModalOpen(true);
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Đặt sân không thành công, vui lòng thử lại!');
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Đặt thêm đơn mới
  const handleResetAndBookAgain = () => {
    setIsSuccessModalOpen(false);
    setCreatedBooking(null);
    if (courts.length > 0) {
      setSelectedCourts([courts[0]]);
      setCourtSchedules({
        [courts[0]._id]: { startTime: '08:00', endTime: '10:00' }
      });
    }
    setCommonStartTime('08:00');
    setCommonEndTime('10:00');
    setAppliedVoucher(null);
    setVoucherCodeInput('');
    setPaymentMethod('CASH');
    setNote('');
  };


  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    message.success(`Đã sao chép mã đơn: ${code}`);
  };

  // Dữ liệu bảng chi tiết cho từng khoảng giờ
  const breakdownTableData = [];
  (priceCalculation.courtBreakdowns || []).forEach((cb) => {
    (cb.intervals || []).forEach((inv, idx) => {
      breakdownTableData.push({
        key: `${cb.courtId}-${idx}`,
        courtName: cb.courtName,
        courtType: cb.courtType,
        courtSchedule: `${cb.startTime} - ${cb.endTime}`,
        timeRange: `${inv.startTime} - ${inv.endTime}`,
        durationHours: `${inv.durationHours} tiếng`,
        priceType: inv.priceType,
        hourlyRate: inv.hourlyRate,
        amount: inv.amount
      });
    });
  });

  const breakdownColumns = [
    {
      title: 'Sân Thi Đấu',
      dataIndex: 'courtName',
      key: 'courtName',
      render: (text, record) => (
        <div>
          <Text strong style={{ color: '#009B60' }}>🏸 {text}</Text>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            {record.courtType} <Tag color="blue" style={{ fontSize: 10, padding: '0 4px', margin: '0 0 0 4px' }}>Giờ đặt: {record.courtSchedule}</Tag>
          </div>
        </div>
      )
    },
    {
      title: 'Khoảng Giờ',
      dataIndex: 'timeRange',
      key: 'timeRange',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text orientation="vertical" type="secondary" style={{ fontSize: 11 }}>
            ({record.durationHours})
          </Text>
        </Space>
      )
    },

    {
      title: 'Loại Giá',
      dataIndex: 'priceType',
      key: 'priceType',
      render: (type) => {
        const isPeak = type.includes('cao điểm') || type.includes('vàng');
        return (
          <Tag color={isPeak ? 'volcano' : 'blue'} style={{ borderRadius: 4, fontWeight: 500 }}>
            {type}
          </Tag>
        );
      }
    },
    {
      title: 'Đơn Giá / Giờ',
      dataIndex: 'hourlyRate',
      key: 'hourlyRate',
      align: 'right',
      render: (rate) => `${(rate || 0).toLocaleString('vi-VN')} đ/h`
    },
    {
      title: 'Thành Tiền',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amt) => (
        <Text strong style={{ color: '#009B60', fontSize: 14 }}>
          {(amt || 0).toLocaleString('vi-VN')} đ
        </Text>
      )
    }
  ];

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '16px 12px 48px' }}>
      {/* Tiêu đề & Giới thiệu */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <Tag color="#009B60" style={{ fontSize: 13, padding: '4px 14px', borderRadius: 16, fontWeight: 500 }}>
          ⚡ HỆ THỐNG ĐẶT SÂN CẦU LÔNG TRỰC TUYẾN 24/7
        </Tag>
        <Title level={2} style={{ marginTop: 12, marginBottom: 6, color: '#0f172a' }}>
          Đặt Lịch Sân Cầu Lông Trực Tuyến
        </Title>
        <Paragraph type="secondary" style={{ fontSize: 15, maxWidth: 680, margin: '0 auto' }}>
          Tính giá riêng cho từng sân và từng khung giờ (tách rõ cao điểm / thấp điểm). Đồng bộ và xác minh dữ liệu giá minh bạch 100%.
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        {/* CỘT TRÁI: FORM CHỌN SÂN, THỜI GIAN, THÔNG TIN & THANH TOÁN */}
        <Col xs={24} lg={14} xl={15}>
          {/* 1. CHỌN SÂN */}
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <Space>
                  <span style={{ fontSize: 18 }}>🏸</span>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>1. Chọn Sân Thi Đấu</span>
                  <Tag color="green" style={{ borderRadius: 10, fontWeight: 600 }}>
                    ✓ Đã chọn: {selectedCourts.length} sân
                  </Tag>
                </Space>
                <Space size={8}>
                  <Button size="small" onClick={handleSelectAllCourts} style={{ fontSize: 12, borderRadius: 6 }}>
                    {selectedCourts.length === courts.length ? 'Bỏ chọn bớt' : 'Chọn tất cả'}
                  </Button>
                  <Tag color="cyan">{courts.length} Sân Đang Mở</Tag>
                </Space>
              </div>
            }
            style={{
              borderRadius: 14,
              marginBottom: 20,
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              border: '1px solid #e2e8f0'
            }}
          >
            {loadingCourts ? (
              <div style={{ textAlign: 'center', padding: '36px 0' }}>
                <Spin size="large" />
                <Paragraph style={{ marginTop: 10 }}>Đang tải danh sách sân...</Paragraph>
              </div>
            ) : (
              <Row gutter={[16, 16]}>
                {courts.map((court, index) => {
                  const isSelected = selectedCourts.some((c) => c._id === court._id);
                  const courtImg = COURT_IMAGES[index % COURT_IMAGES.length];

                  return (
                    <Col xs={24} sm={12} md={8} key={court._id}>
                      <div
                        onClick={() => handleToggleCourt(court)}
                        style={{
                          border: isSelected ? '2px solid #009B60' : '1px solid #e2e8f0',
                          backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                          borderRadius: 12,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.25s ease',
                          boxShadow: isSelected
                            ? '0 6px 18px rgba(0, 155, 96, 0.16)'
                            : '0 1px 4px rgba(0,0,0,0.04)',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100%'
                        }}
                      >
                        {isSelected && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              background: '#009B60',
                              color: '#fff',
                              borderRadius: '50%',
                              width: 26,
                              height: 26,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                              zIndex: 2
                            }}
                          >
                            <CheckCircleOutlined style={{ fontSize: 15 }} />
                          </div>
                        )}
                        <div style={{ height: 110, overflow: 'hidden', position: 'relative' }}>
                          <img
                            src={courtImg}
                            alt={court.courtName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 6,
                              left: 6,
                              background: 'rgba(15, 23, 42, 0.75)',
                              color: '#fff',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 11
                            }}
                          >
                            <EnvironmentOutlined style={{ marginRight: 3 }} />
                            {court.location || 'Trong nhà'}
                          </div>
                        </div>

                        <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <Text strong style={{ fontSize: 14, color: isSelected ? '#009B60' : '#0f172a' }}>
                                {court.courtName}
                              </Text>
                              <Tag color={court.courtType?.includes('VIP') ? 'gold' : 'green'} style={{ margin: 0, fontSize: 11 }}>
                                {court.courtType}
                              </Tag>
                            </div>
                            <Paragraph
                              type="secondary"
                              ellipsis={{ rows: 1 }}
                              style={{ fontSize: 12, margin: '4px 0 10px' }}
                            >
                              {court.description || 'Sân đạt chuẩn thi đấu'}
                            </Paragraph>
                          </div>

                          <Button
                            size="small"
                            type={isSelected ? 'primary' : 'default'}
                            block
                            style={{
                              backgroundColor: isSelected ? '#009B60' : undefined,
                              borderColor: isSelected ? '#009B60' : undefined,
                              borderRadius: 6,
                              fontWeight: 500,
                              fontSize: 12
                            }}
                          >
                            {isSelected ? '✓ Đã Chọn' : '+ Chọn Sân Này'}
                          </Button>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Card>

          {/* 2. CHỌN NGÀY & GIỜ CHƠI */}
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <Space>
                  <span style={{ fontSize: 18 }}>📅</span>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>2. Chọn Ngày & Khung Giờ Chơi Cho Từng Sân</span>
                </Space>
                <Tag color="purple" style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6 }}>
                  ⚡ Hỗ trợ mỗi sân một khung giờ khác nhau & tính giá độc lập
                </Tag>
              </div>
            }
            style={{
              borderRadius: 14,
              marginBottom: 20,
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              border: '1px solid #e2e8f0'
            }}
          >
            {/* Hàng chọn ngày & Khung giờ mặc định chung */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16 }}>
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} md={8}>
                  <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
                    <CalendarOutlined style={{ color: '#009B60', marginRight: 6 }} />
                    Ngày Đặt Sân:
                  </Text>
                  <DatePicker
                    value={selectedDate}
                    onChange={(date) => setSelectedDate(date || dayjs())}
                    disabledDate={(current) => current && current < dayjs().startOf('day')}
                    format="DD/MM/YYYY"
                    allowClear={false}
                    style={{ width: '100%', height: 40, borderRadius: 8 }}
                  />
                  <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                    {selectedDate.format('dddd, [ngày] DD/MM/YYYY')}
                  </div>
                </Col>

                <Col xs={24} md={16}>
                  <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: 10, border: '1px dashed #94a3b8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                      <Text strong style={{ fontSize: 13, color: '#334155' }}>
                        ⚡ Khung giờ chung (Áp dụng nhanh cho các sân):
                      </Text>
                      <Button
                        size="small"
                        type="primary"
                        ghost
                        icon={<CheckCircleOutlined />}
                        onClick={handleApplyCommonTimeToAllCourts}
                        style={{ borderRadius: 6, fontSize: 12 }}
                      >
                        Áp dụng cho tất cả {selectedCourts.length} sân
                      </Button>
                    </div>

                    <Row gutter={[12, 8]}>
                      <Col xs={12}>
                        <TimePicker
                          value={dayjs(commonStartTime, 'HH:mm')}
                          onChange={handleCommonStartTimeChange}
                          format="HH:mm"
                          minuteStep={15}
                          needConfirm={false}
                          allowClear={false}
                          style={{ width: '100%', height: 38, borderRadius: 6 }}
                        />
                      </Col>
                      <Col xs={12}>
                        <TimePicker
                          value={dayjs(commonEndTime, 'HH:mm')}
                          onChange={handleCommonEndTimeChange}
                          format="HH:mm"
                          minuteStep={15}
                          needConfirm={false}
                          allowClear={false}
                          style={{ width: '100%', height: 38, borderRadius: 6 }}
                        />
                      </Col>
                    </Row>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Danh sách khung giờ riêng của từng sân đã chọn */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
                <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                  🏸 Tùy chỉnh khung giờ riêng cho từng sân ({selectedCourts.length} sân đã chọn):
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  (Bạn có thể chỉnh giờ độc lập cho từng sân bên dưới)
                </Text>
              </div>

              {selectedCourts.length === 0 ? (
                <Alert
                  type="info"
                  message="Vui lòng chọn ít nhất 1 sân ở bước 1 để thiết lập khung giờ!"
                  showIcon
                  style={{ borderRadius: 8 }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedCourts.map((c) => {
                    const sch = getCourtSchedule(c._id);
                    const sMin = parseTimeToMinutes(sch.startTime);
                    const eMin = parseTimeToMinutes(sch.endTime);
                    const durMin = Math.max(0, eMin - sMin);
                    const durHours = durMin > 0 ? (durMin / 60).toFixed(1) : 0;
                    const isValid = eMin > sMin && durMin >= 30;

                    return (
                      <div
                        key={c._id}
                        style={{
                          background: '#ffffff',
                          borderRadius: 10,
                          border: isValid ? '1px solid #cbd5e1' : '1.5px solid #ef4444',
                          padding: '12px 16px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                        }}
                      >
                        <Row gutter={[16, 12]} align="middle">
                          <Col xs={24} sm={8} md={7}>
                            <Space size={6} wrap>
                              <Text strong style={{ fontSize: 15, color: '#009B60' }}>
                                🏸 {c.courtName}
                              </Text>
                              <Tag color={c.courtType?.includes('VIP') ? 'gold' : 'green'} style={{ margin: 0, fontSize: 11 }}>
                                {c.courtType}
                              </Tag>
                            </Space>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                              {c.location || 'Sân tiêu chuẩn'}
                            </div>
                          </Col>

                          <Col xs={12} sm={7} md={6}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                              <ClockCircleOutlined style={{ color: '#009B60', marginRight: 4 }} />
                              Giờ bắt đầu:
                            </Text>
                            <TimePicker
                              value={dayjs(sch.startTime, 'HH:mm')}
                              onChange={(val, str) => handleCourtStartTimeChange(c._id, val, str)}
                              format="HH:mm"
                              minuteStep={15}
                              needConfirm={false}
                              allowClear={false}
                              style={{ width: '100%', height: 38, borderRadius: 6 }}
                            />
                          </Col>

                          <Col xs={12} sm={7} md={6}>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                              <ClockCircleOutlined style={{ color: '#e11d48', marginRight: 4 }} />
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

                          <Col xs={24} sm={2} md={5} style={{ textAlign: 'right' }}>
                            {isValid ? (
                              <Tag color="green" style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, margin: 0 }}>
                                ✓ {durHours} tiếng ({durMin}p)
                              </Tag>
                            ) : (
                              <Tag color="error" style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, margin: 0 }}>
                                ⚠️ Cần tối thiểu 30p
                              </Tag>
                            )}
                          </Col>
                        </Row>
                      </div>
                    );
                  })}
                </div>
              )}

              {!areAllCourtsValid && (
                <Alert
                  style={{ marginTop: 14, borderRadius: 8 }}
                  type="warning"
                  showIcon
                  message="Một số sân có khung giờ chưa hợp lệ: Giờ kết thúc phải sau giờ bắt đầu và thời lượng chơi tối thiểu là 30 phút!"
                />
              )}
            </div>
          </Card>

          {/* 3. THÔNG TIN KHÁCH HÀNG (TỰ ĐỘNG TỪ TÀI KHOẢN) */}
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <UserOutlined style={{ color: '#009B60', fontSize: 18 }} />
                  <span style={{ fontWeight: 600, fontSize: 16 }}>3. Thông Tin Khách Hàng Đặt Sân</span>
                </Space>
                <Tag color="green" icon={<CheckCircleOutlined />}>Tự Động Từ Tài Khoản</Tag>
              </div>
            }
            style={{
              borderRadius: 14,
              marginBottom: 20,
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              border: '1px solid #e2e8f0'
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: 12,
                padding: '16px 20px',
                border: '1px solid #e2e8f0',
                marginBottom: 16
              }}
            >
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={12}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        backgroundColor: '#009B60',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        fontWeight: 600,
                        boxShadow: '0 2px 8px rgba(0, 155, 96, 0.25)'
                      }}
                    >
                      {user?.fullName ? user.fullName.charAt(0).toUpperCase() : <UserOutlined />}
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Họ và tên khách hàng</Text>
                      <Text strong style={{ fontSize: 16, color: '#0f172a' }}>
                        {user?.fullName || 'Khách hàng'}
                      </Text>
                    </div>
                  </div>
                </Col>

                <Col xs={24} sm={12}>
                  <div style={{ background: '#fff', padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Số điện thoại liên hệ</Text>
                    <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                      📞 {user?.phone || 'Chưa cập nhật SĐT'}
                    </Text>
                  </div>
                </Col>

                <Col xs={24} sm={12}>
                  <div style={{ background: '#fff', padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Email tài khoản</Text>
                    <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                      ✉️ {user?.email || 'Chưa cập nhật email'}
                    </Text>
                  </div>
                </Col>

                <Col xs={24} sm={12}>
                  <div style={{ background: '#fff', padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Địa chỉ</Text>
                    <Text strong style={{ fontSize: 14, color: '#0f172a' }}>
                      📍 {user?.address || 'Cần Thơ'}
                    </Text>
                  </div>
                </Col>
              </Row>

              <div
                style={{
                  marginTop: 14,
                  paddingTop: 10,
                  borderTop: '1px dashed #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8
                }}
              >
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  🔒 Thông tin người đặt sân được tự động liên kết từ tài khoản để Ban Quản Trị (Admin) tiếp nhận. Bạn không cần phải điền lại.
                </div>
                <Button
                  type="link"
                  size="small"
                  onClick={() => navigate('/customer/profile')}
                  style={{ padding: 0, fontSize: 12, color: '#009B60' }}
                >
                  Cập nhật hồ sơ ↗
                </Button>
              </div>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
                Ghi chú thêm cho ban quản lý sân (tùy chọn):
              </Text>
              <Input.TextArea
                rows={2}
                placeholder="Ví dụ: Cần mượn thêm vợt, mua thêm nước khoáng, yêu cầu chuẩn bị lưới..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ borderRadius: 8 }}
              />
            </div>
          </Card>

          {/* 4. MÃ KHUYẾN MÃI & THANH TOÁN */}
          <Card
            title={
              <Space>
                <DollarOutlined style={{ color: '#009B60', fontSize: 18 }} />
                <span style={{ fontWeight: 600, fontSize: 16 }}>4. Mã Khuyến Mãi & Phương Thức Thanh Toán</span>
              </Space>
            }
            style={{
              borderRadius: 14,
              marginBottom: 20,
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              border: '1px solid #e2e8f0'
            }}
          >
            {/* Voucher */}
            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
                <TagOutlined style={{ color: '#009B60', marginRight: 6 }} />
                Mã Khuyến Mãi / Voucher:
              </Text>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <Input
                  placeholder="Nhập mã voucher (VD: CHAOMUNG20, GIAM30K)"
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
                    style={{ height: 40, borderRadius: 8, backgroundColor: '#009B60', borderColor: '#009B60' }}
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
                  style={{ borderRadius: 8 }}
                />
              ) : (
                <div>
                  <Text style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 6 }}>
                    Gợi ý mã giảm giá hôm nay (nhấn để chọn nhanh):
                  </Text>
                  <Space wrap>
                    <Tag
                      color="purple"
                      style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
                      onClick={() => handleApplyVoucher('CHAOMUNG20')}
                    >
                      🏷️ CHAOMUNG20 (-20%)
                    </Tag>
                    <Tag
                      color="magenta"
                      style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
                      onClick={() => handleApplyVoucher('GIAM30K')}
                    >
                      🏷️ GIAM30K (-30k)
                    </Tag>
                    <Tag
                      color="gold"
                      style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
                      onClick={() => handleApplyVoucher('VIPBADMINTON')}
                    >
                      🏷️ VIPBADMINTON (-50k)
                    </Tag>
                  </Space>
                </div>
              )}
            </div>

            <Divider style={{ margin: '16px 0' }} />

            {/* Payment Method */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
                <DollarOutlined style={{ color: '#009B60', marginRight: 6 }} />
                Hình Thức Thanh Toán:
              </Text>
              <Radio.Group
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <div
                  onClick={() => setPaymentMethod('CASH')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: paymentMethod === 'CASH' ? '2px solid #009B60' : '1px solid #e2e8f0',
                    backgroundColor: paymentMethod === 'CASH' ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <Radio value="CASH">
                    <Space align="center" style={{ marginLeft: 6 }}>
                      <DollarOutlined style={{ fontSize: 18, color: '#009B60' }} />
                      <div>
                        <Text strong style={{ fontSize: 14, display: 'block' }}>
                          Tiền mặt tại quầy khi nhận sân
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Thanh toán trực tiếp tại quầy lễ tân khi đến nhận sân chơi
                        </Text>
                      </div>
                    </Space>
                  </Radio>
                  <Tag color="green">Mặc định</Tag>
                </div>

                <div
                  onClick={() => setPaymentMethod('TRANSFER')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: paymentMethod === 'TRANSFER' ? '2px solid #009B60' : '1px solid #e2e8f0',
                    backgroundColor: paymentMethod === 'TRANSFER' ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <Radio value="TRANSFER">
                    <Space align="center" style={{ marginLeft: 6 }}>
                      <BankOutlined style={{ fontSize: 18, color: '#7c3aed' }} />
                      <div>
                        <Text strong style={{ fontSize: 14, display: 'block' }}>
                          Chuyển khoản ngân hàng trực tiếp
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Chuyển tiền vào tài khoản ngân hàng của sân
                        </Text>
                      </div>
                    </Space>
                  </Radio>
                </div>
              </Radio.Group>
            </div>
          </Card>
        </Col>

        {/* CỘT PHẢI: BẢNG GIÁ CHI TIẾT TỪNG SÂN VÀ TỪNG KHOẢNG GIỜ (STICKY) */}
        <Col xs={24} lg={10} xl={9}>
          <Card
            title={
              <Space>
                <FileTextOutlined style={{ color: '#009B60' }} />
                <span style={{ fontWeight: 600 }}>Chi Tiết Tính Giá & Tóm Tắt</span>
              </Space>
            }
            extra={loadingPrice && <Spin size="small" />}
            style={{
              borderRadius: 14,
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              border: '1px solid #e2e8f0',
              position: 'sticky',
              top: 24
            }}
          >
            {/* Thông tin cơ bản */}
            <div style={{ marginBottom: 14, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <Row justify="space-between" align="middle">
                <Col>
                  <Text type="secondary" style={{ fontSize: 12 }}>Ngày chơi:</Text>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedDate.format('DD/MM/YYYY')}</div>
                </Col>
                <Col style={{ textAlign: 'right' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Thời gian:</Text>
                  <div>
                    {selectedCourts.length === 1 ? (
                      <Tag color="geekblue" style={{ margin: 0 }}>
                        {priceCalculation.courtBreakdowns[0]?.startTime || commonStartTime} - {priceCalculation.courtBreakdowns[0]?.endTime || commonEndTime}
                      </Tag>
                    ) : (
                      <Tag color="purple" style={{ margin: 0 }}>
                        {selectedCourts.length} sân (giờ riêng)
                      </Tag>
                    )}
                  </div>
                </Col>
              </Row>
            </div>

            {/* Chi tiết từng sân và các khoảng giờ */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text strong style={{ fontSize: 13 }}>
                  🏸 Bảng giá chi tiết ({priceCalculation.courtBreakdowns?.length || 0} sân):
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>Tính độc lập từng sân</Text>
              </div>

              {priceCalculation.courtBreakdowns && priceCalculation.courtBreakdowns.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {priceCalculation.courtBreakdowns.map((cb) => (
                    <div
                      key={cb.courtId}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        padding: '10px 12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
                        <Space size={6} wrap>
                          <Text strong style={{ color: '#009B60', fontSize: 14 }}>{cb.courtName}</Text>
                          <Tag color={cb.courtType?.includes('VIP') ? 'gold' : 'green'} style={{ margin: 0, fontSize: 10 }}>
                            {cb.courtType}
                          </Tag>
                          <Tag color="geekblue" style={{ margin: 0, fontSize: 10 }}>
                            🕒 {cb.startTime} - {cb.endTime} ({cb.durationHours}h)
                          </Tag>
                        </Space>
                        <Text strong style={{ color: '#009B60', fontSize: 13 }}>
                          {(cb.totalAmount || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </div>

                      {/* Các khoảng giờ của sân này */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {(cb.intervals || []).map((inv, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: '#f8fafc',
                              padding: '5px 8px',
                              borderRadius: 6,
                              fontSize: 12
                            }}
                          >
                            <Space size={4}>
                              <Text strong style={{ fontSize: 12 }}>{inv.startTime}-{inv.endTime}</Text>
                              <Tag
                                color={inv.priceType.includes('cao điểm') || inv.priceType.includes('vàng') ? 'volcano' : 'blue'}
                                style={{ fontSize: 10, padding: '0 4px', margin: 0 }}
                              >
                                {inv.priceType.includes('cao điểm') ? 'Cao điểm' : 'Thường'}
                              </Tag>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                ({inv.hourlyRate.toLocaleString('vi-VN')}đ/h)
                              </Text>
                            </Space>

                            <Text strong style={{ color: '#334155' }}>
                              {inv.amount.toLocaleString('vi-VN')} đ
                            </Text>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#94a3b8' }}>
                  Chưa chọn sân hoặc thời gian
                </div>
              )}
            </div>

            <Divider style={{ margin: '14px 0' }} />

            {/* Bảng chi tiết tổng tiền */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">Tổng thành tiền các sân:</Text>
                <Text strong>{priceCalculation.totalBasePrice.toLocaleString('vi-VN')} đ</Text>
              </div>

              {priceCalculation.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#16a34a' }}>
                  <Text style={{ color: '#16a34a' }}>Giảm giá khuyến mãi:</Text>
                  <Text strong style={{ color: '#16a34a' }}>
                    - {priceCalculation.discount.toLocaleString('vi-VN')} đ
                  </Text>
                </div>
              )}

              <Divider style={{ margin: '10px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text strong style={{ fontSize: 15 }}>
                  Tổng thanh toán:
                </Text>
                <Text strong style={{ fontSize: 24, color: '#009B60' }}>
                  {priceCalculation.finalTotalAmount.toLocaleString('vi-VN')} đ
                </Text>
              </div>
            </div>

            <Button
              type="primary"
              size="large"
              block
              loading={submittingBooking}
              disabled={selectedCourts.length === 0 || !areAllCourtsValid || priceCalculation.totalBasePrice === 0}
              onClick={handleOpenLockModal}
              style={{
                backgroundColor: '#009B60',
                borderColor: '#009B60',
                height: 48,
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(0, 155, 96, 0.3)'
              }}
              icon={<CheckCircleOutlined />}
            >
              Xác Nhận & Khóa Đơn
            </Button>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <SafetyCertificateOutlined style={{ color: '#009B60' }} /> Hệ thống tự động xác minh giá chuẩn xác 100%
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* MODAL KHÓA ĐƠN & XÁC NHẬN ĐẶT SÂN (RULE 5) */}
      <Modal
        open={isConfirmLockModalOpen}
        onCancel={() => setIsConfirmLockModalOpen(false)}
        width={760}
        centered
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#009B60', fontSize: 20 }} />
            <span style={{ fontSize: 18, fontWeight: 700 }}>Xác Nhận & Khóa Đơn Đặt Sân</span>
          </Space>
        }
        footer={[
          <Button key="back" onClick={() => setIsConfirmLockModalOpen(false)} style={{ borderRadius: 8 }}>
            Quay Lại Điều Chỉnh
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={submittingBooking}
            onClick={handleExecuteBooking}
            style={{
              backgroundColor: '#009B60',
              borderColor: '#009B60',
              borderRadius: 8,
              padding: '0 24px',
              fontWeight: 600
            }}
            icon={<CheckCircleOutlined />}
          >
            Đồng Ý & Khóa Đơn Ngay
          </Button>
        ]}
      >
        <div style={{ padding: '8px 0' }}>
          <Alert
            message="Chi tiết bảng giá từng sân và từng khoảng thời gian"
            description="Mỗi sân và mỗi khung giờ được áp dụng đơn giá riêng theo đúng cấu hình hệ thống (không gộp chung giá)."
            type="info"
            showIcon
            style={{ marginBottom: 16, borderRadius: 8 }}
          />

          {/* Bảng chi tiết từng khoảng giờ theo Rule 5 */}
          <Table
            dataSource={breakdownTableData}
            columns={breakdownColumns}
            pagination={false}
            size="small"
            bordered
            style={{ marginBottom: 16 }}
          />

          {/* Tóm tắt tổng tiền từng sân & tổng đơn */}
          <Card size="small" style={{ borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 16 }}>
            <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered={false}>
              <Descriptions.Item label="Ngày chơi">
                <Text strong>{selectedDate.format('DD/MM/YYYY')} ({selectedDate.format('dddd')})</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian đặt">
                {selectedCourts.length === 1 ? (
                  <Tag color="geekblue">
                    {priceCalculation.courtBreakdowns[0]?.startTime || commonStartTime} - {priceCalculation.courtBreakdowns[0]?.endTime || commonEndTime}
                  </Tag>
                ) : (
                  <Tag color="purple">
                    Khung giờ riêng cho từng sân ({selectedCourts.length} sân)
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Khách hàng">
                <Text strong>{user?.fullName || 'Khách hàng'}</Text> {user?.phone && `(${user.phone})`}
              </Descriptions.Item>
              <Descriptions.Item label="Hình thức">
                <Tag color="blue">{paymentMethod === 'TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt tại quầy'}</Tag>
              </Descriptions.Item>

              {/* Hiển thị tổng tiền từng sân */}
              <Descriptions.Item label="Tổng tiền từng sân" span={2}>
                <Space wrap size={[8, 8]}>
                  {(priceCalculation.courtBreakdowns || []).map((cb) => (
                    <Tag key={cb.courtId} color="green" style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12 }}>
                      🏸 <strong>{cb.courtName}</strong> ({cb.startTime} - {cb.endTime}): {(cb.totalAmount || 0).toLocaleString('vi-VN')} đ
                    </Tag>
                  ))}
                </Space>
              </Descriptions.Item>

              {priceCalculation.discount > 0 && (
                <Descriptions.Item label="Mã giảm giá (Voucher)" span={2}>
                  <Text style={{ color: '#16a34a', fontWeight: 600 }}>
                    🏷️ {priceCalculation.appliedVoucher?.voucherCode}: -{priceCalculation.discount.toLocaleString('vi-VN')} đ
                  </Text>
                </Descriptions.Item>
              )}

              <Descriptions.Item label="Tổng tiền toàn đơn" span={2}>
                <Text strong style={{ fontSize: 20, color: '#009B60' }}>
                  {priceCalculation.finalTotalAmount.toLocaleString('vi-VN')} đ
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </div>
      </Modal>

      {/* MODAL THÀNH CÔNG */}
      <Modal
        open={isSuccessModalOpen}
        onCancel={() => setIsSuccessModalOpen(false)}
        footer={null}
        width={720}
        centered
        style={{ borderRadius: 16 }}
      >
        {createdBooking && (
          <div style={{ padding: '12px 8px 8px' }}>
            <Result
              status="success"
              title="Đặt Sân Cầu Lông Thành Công!"
              subTitle={
                <span>
                  Đơn đặt sân mang mã{' '}
                  <Text strong style={{ color: '#009B60', fontSize: 16 }}>
                    #{createdBooking.bookingCode}
                  </Text>{' '}
                  đã được ghi nhận vào hệ thống với giá xác minh chuẩn xác.
                </span>
              }
            />
            <Alert
              message="Đơn đang chờ Admin/Staff duyệt"
              description="Yêu cầu đã được lưu. Trạng thái sẽ cập nhật sau khi nhân viên xác nhận hoặc từ chối."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />

            {/* Chi tiết đơn */}
            <Card
              size="small"
              style={{
                borderRadius: 10,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                marginBottom: 16
              }}
            >
              <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered={false}>
                <Descriptions.Item label="Mã Đơn">
                  <Space>
                    <Text strong>#{createdBooking.bookingCode}</Text>
                    <Button
                      size="small"
                      type="text"
                      icon={<CopyOutlined />}
                      onClick={() => copyCode(createdBooking.bookingCode)}
                    />
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Sân Đã Đặt">
                  <Text strong>
                    {createdBooking.courtNames ||
                      (createdBooking.courts
                        ? createdBooking.courts.map((c) => c?.courtName).join(', ')
                        : createdBooking.courtId?.courtName ||
                          selectedCourts.map((c) => c.courtName).join(', '))}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Ngày Chơi">
                  {dayjs(createdBooking.bookingDate).format('DD/MM/YYYY')}
                </Descriptions.Item>
                <Descriptions.Item label="Khung Giờ">
                  {createdBooking.bookings && createdBooking.bookings.length > 1 ? (
                    <Space wrap size={[4, 4]}>
                      {createdBooking.bookings.map((b) => (
                        <Tag key={b._id} color="geekblue" style={{ fontSize: 11 }}>
                          {b.courtId?.courtName || 'Sân'}: {b.startTime} - {b.endTime}
                        </Tag>
                      ))}
                    </Space>
                  ) : (
                    <Tag color="geekblue">
                      {createdBooking.startTime} - {createdBooking.endTime}
                    </Tag>
                  )}
                </Descriptions.Item>

                <Descriptions.Item label="Tổng Tiền Đơn">
                  <Text strong style={{ color: '#009B60', fontSize: 16 }}>
                    {(createdBooking.totalAmount || 0).toLocaleString('vi-VN')} đ
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Thanh Toán">
                  <Tag color="red">Chưa thanh toán</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Hình Thức" span={2}>
                  <Tag color="blue">
                    {createdBooking.paymentMethod === 'TRANSFER'
                      ? 'Chuyển khoản ngân hàng'
                      : 'Tiền mặt tại quầy khi nhận sân (Mặc định)'}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Bảng chi tiết khung giờ trong modal thành công */}
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
                📋 Chi tiết các khoảng giờ đã khóa đơn:
              </Text>
              <Table
                dataSource={breakdownTableData}
                columns={breakdownColumns}
                pagination={false}
                size="small"
                bordered
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <Button onClick={() => navigate('/')} style={{ borderRadius: 8, height: 40, padding: '0 24px' }}>
                Về Trang Chủ
              </Button>
              <Button
                type="primary"
                onClick={handleResetAndBookAgain}
                style={{
                  borderRadius: 8,
                  height: 40,
                  padding: '0 24px',
                  backgroundColor: '#009B60',
                  borderColor: '#009B60'
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
