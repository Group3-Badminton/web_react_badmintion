import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  DatePicker,
  Tag,
  Space,
  Steps,
  Divider,
  Input,
  Radio,
  Spin,
  Alert,
  Modal,
  Result,
  Descriptions,
  message,
  Tooltip,
  Badge
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  ThunderboltOutlined,
  TagOutlined,
  DollarOutlined,
  UserOutlined,
  PhoneOutlined,
  QrcodeOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  SafetyCertificateOutlined,
  SmileOutlined,
  CopyOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingService } from '../../services/bookingService';
import san1 from '../../assets/sân1.png';
import san2 from '../../assets/sân2.png';
import san3 from '../../assets/sân3.png';

const { Title, Text, Paragraph } = Typography;

const COURT_IMAGES = [san1, san2, san3, san1];

export default function CustomerBookingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Các bước đặt sân
  const [currentStep, setCurrentStep] = useState(0);

  // Dữ liệu ban đầu
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [courts, setCourts] = useState([]);

  // Bước 1: Sân được chọn
  const [selectedCourt, setSelectedCourt] = useState(null);

  // Bước 2: Ngày & Khung giờ
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Bước 3: Thông tin khách hàng & Mã giảm giá
  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerAddress, setCustomerAddress] = useState(user?.address || '');
  const [note, setNote] = useState('');

  // Voucher
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState(null);

  // Phương thức thanh toán
  const [paymentMethod, setPaymentMethod] = useState('VIETQR');

  // Đặt sân
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Tải danh sách sân
  useEffect(() => {
    const fetchCourts = async () => {
      try {
        setLoadingCourts(true);
        const res = await bookingService.getCourts();
        if (res.success && res.data) {
          setCourts(res.data);
          if (res.data.length > 0) {
            setSelectedCourt(res.data[0]);
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

  // Cập nhật thông tin khách khi user context có dữ liệu
  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.fullName || '');
      if (!customerPhone) setCustomerPhone(user.phone || '');
      if (!customerEmail) setCustomerEmail(user.email || '');
      if (!customerAddress) setCustomerAddress(user.address || '');
    }
  }, [user]);

  // Tải tình trạng khung giờ của Sân theo Ngày được chọn
  useEffect(() => {
    if (!selectedCourt || !selectedDate) return;

    const fetchAvailability = async () => {
      try {
        setLoadingSlots(true);
        setSelectedSlot(null);
        const dateStr = selectedDate.format('YYYY-MM-DD');
        const res = await bookingService.getCourtAvailability(selectedCourt._id, dateStr);
        if (res.success && res.data) {
          setAvailabilityData(res.data);
        }
      } catch (err) {
        message.error(err?.response?.data?.message || 'Lỗi tải lịch khung giờ!');
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchAvailability();
  }, [selectedCourt, selectedDate]);

  // Áp dụng mã Voucher
  const handleApplyVoucher = async (codeToApply) => {
    const code = (codeToApply || voucherCodeInput).trim().toUpperCase();
    if (!code) {
      message.warning('Vui lòng nhập mã giảm giá!');
      return;
    }

    const currentPrice = selectedSlot ? selectedSlot.price : 100000;
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

  // Tính toán số tiền
  const basePrice = selectedSlot ? selectedSlot.price : 0;
  const discountAmount = appliedVoucher ? appliedVoucher.discount : 0;
  const finalTotalAmount = Math.max(0, basePrice - discountAmount);

  // Xử lý gửi đơn đặt sân
  const handleConfirmBooking = async () => {
    if (!selectedCourt) {
      message.error('Vui lòng chọn sân thi đấu!');
      setCurrentStep(0);
      return;
    }

    if (!selectedSlot) {
      message.error('Vui lòng chọn khung giờ muốn chơi!');
      setCurrentStep(1);
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      message.warning('Vui lòng cung cấp Họ tên và Số điện thoại liên hệ!');
      return;
    }

    try {
      setSubmittingBooking(true);
      const bookingPayload = {
        courtId: selectedCourt._id,
        bookingDate: selectedDate.format('YYYY-MM-DD'),
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        voucherCode: appliedVoucher ? appliedVoucher.voucherCode : undefined,
        price: basePrice,
        discount: discountAmount,
        totalAmount: finalTotalAmount,
        paymentMethod,
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

  // Reset form để đặt thêm đơn mới
  const handleResetAndBookAgain = () => {
    setIsSuccessModalOpen(false);
    setCreatedBooking(null);
    setSelectedSlot(null);
    setAppliedVoucher(null);
    setVoucherCodeInput('');
    setNote('');
    setCurrentStep(1);
  };

  // Sao chép mã đơn
  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    message.success(`Đã sao chép mã đơn: ${code}`);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 8px 48px' }}>
      {/* Tiêu đề & Giới thiệu */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <Tag color="#009B60" style={{ fontSize: 13, padding: '4px 12px', borderRadius: 16 }}>
          ⚡ HỆ THỐNG ĐẶT SÂN CẦU LÔNG TRỰC TUYẾN 24/7
        </Tag>
        <Title level={2} style={{ marginTop: 12, marginBottom: 6, color: '#0f172a' }}>
          Đặt Lịch Sân Cầu Lông Nhanh Chóng
        </Title>
        <Paragraph type="secondary" style={{ fontSize: 15 }}>
          Chọn sân yêu thích, chọn khung giờ theo ngày và nhận xác nhận tức thì với giá ưu đãi.
        </Paragraph>
      </div>

      {/* Thanh tiến trình Steps */}
      <Card
        style={{
          borderRadius: 16,
          marginBottom: 24,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          border: '1px solid #f0f0f0'
        }}
      >
        <Steps
          current={currentStep}
          onChange={(step) => {
            if (step === 1 && !selectedCourt) {
              message.warning('Vui lòng chọn sân trước!');
              return;
            }
            if (step === 2 && (!selectedCourt || !selectedSlot)) {
              message.warning('Vui lòng chọn sân và khung giờ trước!');
              return;
            }
            setCurrentStep(step);
          }}
          items={[
            {
              title: '1. Chọn Sân',
              description: selectedCourt ? selectedCourt.courtName : 'Chọn sân phù hợp'
            },
            {
              title: '2. Ngày & Khung Giờ',
              description: selectedSlot ? `${selectedSlot.startTime} - ${selectedSlot.endTime}` : 'Chọn giờ chơi'
            },
            {
              title: '3. Xác Nhận & Thanh Toán',
              description: 'Voucher & Hoàn tất'
            }
          ]}
        />
      </Card>

      {/* BƯỚC 1: CHỌN SÂN */}
      {currentStep === 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>
              🏸 Danh Sách Sân Cầu Lông Đang Mở
            </Title>
            <Text type="secondary">Vui lòng nhấp chọn một sân để tiếp tục</Text>
          </div>

          {loadingCourts ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin size="large" />
              <Paragraph style={{ marginTop: 12 }}>Đang tải danh sách sân...</Paragraph>
            </div>
          ) : (
            <Row gutter={[20, 20]}>
              {courts.map((court, index) => {
                const isSelected = selectedCourt?._id === court._id;
                const courtImg = COURT_IMAGES[index % COURT_IMAGES.length];

                return (
                  <Col xs={24} sm={12} md={12} lg={6} key={court._id}>
                    <Card
                      hoverable
                      onClick={() => setSelectedCourt(court)}
                      cover={
                        <div style={{ position: 'relative', height: 160, overflow: 'hidden' }}>
                          <img
                            alt={court.courtName}
                            src={courtImg}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          {isSelected && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                background: '#009B60',
                                color: '#fff',
                                borderRadius: '50%',
                                width: 28,
                                height: 28,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                              }}
                            >
                              <CheckCircleOutlined style={{ fontSize: 16 }} />
                            </div>
                          )}
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 8,
                              left: 8,
                              background: 'rgba(15, 23, 42, 0.75)',
                              color: '#fff',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 12
                            }}
                          >
                            <EnvironmentOutlined style={{ marginRight: 4 }} />
                            {court.location || 'Trong nhà'}
                          </div>
                        </div>
                      }
                      style={{
                        borderRadius: 14,
                        overflow: 'hidden',
                        borderColor: isSelected ? '#009B60' : '#e2e8f0',
                        borderWidth: isSelected ? 2 : 1,
                        boxShadow: isSelected ? '0 8px 24px rgba(0, 155, 96, 0.18)' : '0 2px 10px rgba(0,0,0,0.04)',
                        transition: 'all 0.25s ease'
                      }}
                      bodyStyle={{ padding: 16 }}
                    >
                      <Tag color={court.courtType?.includes('VIP') ? 'gold' : 'green'} style={{ marginBottom: 6 }}>
                        {court.courtType}
                      </Tag>
                      <Title level={5} style={{ margin: '4px 0 6px', fontSize: 16 }}>
                        {court.courtName}
                      </Title>
                      <Paragraph
                        type="secondary"
                        ellipsis={{ rows: 2 }}
                        style={{ fontSize: 13, marginBottom: 16, minHeight: 40 }}
                      >
                        {court.description || 'Sân đạt tiêu chuẩn thi đấu, ánh sáng chống chói cao cấp.'}
                      </Paragraph>

                      <Button
                        type={isSelected ? 'primary' : 'default'}
                        block
                        style={{
                          backgroundColor: isSelected ? '#009B60' : undefined,
                          borderColor: isSelected ? '#009B60' : undefined,
                          borderRadius: 8,
                          fontWeight: 500
                        }}
                      >
                        {isSelected ? '✓ Đã Chọn Sân Này' : 'Chọn Sân'}
                      </Button>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}

          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="primary"
              size="large"
              disabled={!selectedCourt}
              onClick={() => setCurrentStep(1)}
              style={{
                backgroundColor: '#009B60',
                borderColor: '#009B60',
                borderRadius: 8,
                padding: '0 32px'
              }}
              icon={<ArrowRightOutlined />}
            >
              Tiếp Tục Chọn Ngày & Khung Giờ
            </Button>
          </div>
        </div>
      )}

      {/* BƯỚC 2: CHỌN NGÀY & KHUNG GIỜ */}
      {currentStep === 1 && (
        <div>
          {/* Banner sân đang chọn */}
          <Card
            style={{
              borderRadius: 14,
              marginBottom: 20,
              background: 'linear-gradient(135deg, #f0fdf4 0%, #e6fcf5 100%)',
              borderColor: '#bbf7d0'
            }}
            bodyStyle={{ padding: '16px 20px' }}
          >
            <Row justify="space-between" align="middle" gutter={[12, 12]}>
              <Col>
                <Space size={12}>
                  <div
                    style={{
                      background: '#009B60',
                      color: '#fff',
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22
                    }}
                  >
                    🏸
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 16, color: '#0f172a' }}>
                      {selectedCourt?.courtName}
                    </Text>
                    <div>
                      <Tag color="green">{selectedCourt?.courtType}</Tag>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        <EnvironmentOutlined /> {selectedCourt?.location}
                      </Text>
                    </div>
                  </div>
                </Space>
              </Col>
              <Col>
                <Button size="small" onClick={() => setCurrentStep(0)}>
                  Đổi sân khác
                </Button>
              </Col>
            </Row>
          </Card>

          {/* Chọn ngày đặt sân */}
          <Card
            style={{ borderRadius: 14, marginBottom: 20 }}
            bodyStyle={{ padding: 20 }}
          >
            <Row gutter={[20, 16]} align="middle">
              <Col xs={24} sm={12} md={10}>
                <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
                  <CalendarOutlined style={{ color: '#009B60', marginRight: 6 }} />
                  Chọn Ngày Đặt Sân:
                </Text>
                <DatePicker
                  value={selectedDate}
                  onChange={(date) => setSelectedDate(date || dayjs())}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  style={{ width: '100%', height: 42, borderRadius: 8 }}
                />
              </Col>

              <Col xs={24} sm={12} md={14}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <Space orientation="vertical" size={2}>
                    <Text strong style={{ color: '#334155' }}>
                      Ngày: {selectedDate.format('dddd, [ngày] DD/MM/YYYY')}
                    </Text>
                    <div>
                      {selectedDate.day() === 0 || selectedDate.day() === 6 ? (
                        <Tag color="orange" style={{ borderRadius: 4 }}>
                          ⭐ Cuối Tuần (Áp dụng giá cuối tuần)
                        </Tag>
                      ) : (
                        <Tag color="blue" style={{ borderRadius: 4 }}>
                          📅 Ngày Trong Tuần (Giá tiêu chuẩn)
                        </Tag>
                      )}
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Bảng giá được cập nhật tự động theo loại ngày
                      </Text>
                    </div>
                  </Space>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Danh sách khung giờ */}
          <Card
            style={{ borderRadius: 14, marginBottom: 24 }}
            bodyStyle={{ padding: 20 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={4} style={{ margin: 0 }}>
                <ClockCircleOutlined style={{ color: '#009B60', marginRight: 8 }} />
                Danh Sách Khung Giờ Thi Đấu
              </Title>
              <Space>
                <Badge status="success" text="Còn trống" />
                <Badge status="error" text="Đã được đặt" />
              </Space>
            </div>

            {loadingSlots ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
                <Paragraph style={{ marginTop: 12 }}>Đang kiểm tra tình trạng khung giờ...</Paragraph>
              </div>
            ) : availabilityData && availabilityData.slots?.length > 0 ? (
              <Row gutter={[16, 16]}>
                {availabilityData.slots.map((slot) => {
                  const isBooked = slot.isBooked;
                  const isSelected = selectedSlot?.startTime === slot.startTime;

                  return (
                    <Col xs={24} sm={12} md={8} lg={6} key={slot.startTime}>
                      <div
                        onClick={() => {
                          if (!isBooked) {
                            setSelectedSlot(slot);
                          }
                        }}
                        style={{
                          border: isSelected
                            ? '2px solid #009B60'
                            : isBooked
                            ? '1px dashed #cbd5e1'
                            : '1px solid #e2e8f0',
                          backgroundColor: isSelected
                            ? '#f0fdf4'
                            : isBooked
                            ? '#f8fafc'
                            : '#ffffff',
                          borderRadius: 12,
                          padding: '14px 16px',
                          cursor: isBooked ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 4px 12px rgba(0, 155, 96, 0.15)' : 'none',
                          opacity: isBooked ? 0.65 : 1,
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <Text strong style={{ fontSize: 15, color: isSelected ? '#009B60' : '#1e293b' }}>
                            {slot.startTime} - {slot.endTime}
                          </Text>
                          {isSelected && <CheckCircleOutlined style={{ color: '#009B60', fontSize: 16 }} />}
                        </div>

                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                          {slot.label}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong style={{ color: isBooked ? '#94a3b8' : '#e11d48', fontSize: 14 }}>
                            {slot.price.toLocaleString('vi-VN')} đ
                          </Text>

                          {isBooked ? (
                            <Tag color="default" style={{ margin: 0, borderRadius: 4, fontSize: 11 }}>
                              Đã đặt
                            </Tag>
                          ) : (
                            <Tag color="green" style={{ margin: 0, borderRadius: 4, fontSize: 11 }}>
                              Còn trống
                            </Tag>
                          )}
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            ) : (
              <Alert
                message="Không có khung giờ nào khả dụng"
                description="Vui lòng thử chọn một ngày khác hoặc liên hệ bộ phận hỗ trợ."
                type="info"
                showIcon
              />
            )}
          </Card>

          {/* Thanh điều hướng */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              size="large"
              icon={<ArrowLeftOutlined />}
              onClick={() => setCurrentStep(0)}
              style={{ borderRadius: 8 }}
            >
              Quay lại chọn sân
            </Button>

            <Button
              type="primary"
              size="large"
              disabled={!selectedSlot}
              onClick={() => setCurrentStep(2)}
              style={{
                backgroundColor: '#009B60',
                borderColor: '#009B60',
                borderRadius: 8,
                padding: '0 32px'
              }}
              icon={<ArrowRightOutlined />}
            >
              Tiếp tục: Xác nhận thông tin
            </Button>
          </div>
        </div>
      )}

      {/* BƯỚC 3: THÔNG TIN KHÁCH HÀNG & THANH TOÁN */}
      {currentStep === 2 && (
        <div>
          <Row gutter={[24, 24]}>
            {/* Cột trái: Thông tin khách & Voucher & Phương thức thanh toán */}
            <Col xs={24} lg={15}>
              {/* Thông tin liên hệ */}
              <Card
                title={
                  <Space>
                    <UserOutlined style={{ color: '#009B60' }} />
                    <span>Thông Tin Khách Hàng Đặt Sân</span>
                  </Space>
                }
                style={{ borderRadius: 14, marginBottom: 20 }}
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>
                      Họ và Tên khách hàng <span style={{ color: 'red' }}>*</span>
                    </Text>
                    <Input
                      placeholder="Nguyễn Văn A"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      style={{ height: 40, borderRadius: 8 }}
                    />
                  </Col>

                  <Col xs={24} sm={12}>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>
                      Số điện thoại liên hệ <span style={{ color: 'red' }}>*</span>
                    </Text>
                    <Input
                      placeholder="0901234567"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      style={{ height: 40, borderRadius: 8 }}
                    />
                  </Col>

                  <Col xs={24} sm={12}>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>
                      Email nhận xác nhận
                    </Text>
                    <Input
                      placeholder="email@gmail.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      style={{ height: 40, borderRadius: 8 }}
                    />
                  </Col>

                  <Col xs={24} sm={12}>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>
                      Địa chỉ
                    </Text>
                    <Input
                      placeholder="Cần Thơ..."
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      style={{ height: 40, borderRadius: 8 }}
                    />
                  </Col>

                  <Col xs={24}>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>
                      Ghi chú thêm cho sân (tùy chọn)
                    </Text>
                    <Input.TextArea
                      rows={2}
                      placeholder="Ví dụ: Cần mượn thêm vợt, mua thêm nước khoáng, yêu cầu chuẩn bị lưới..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      style={{ borderRadius: 8 }}
                    />
                  </Col>
                </Row>
              </Card>

              {/* Mã giảm giá (Voucher) */}
              <Card
                title={
                  <Space>
                    <TagOutlined style={{ color: '#009B60' }} />
                    <span>Mã Khuyến Mãi / Voucher</span>
                  </Space>
                }
                style={{ borderRadius: 14, marginBottom: 20 }}
              >
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
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
                    <Text orientation="vertical" style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>
                      Gợi ý mã giảm giá hôm nay:
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
              </Card>

              {/* Phương thức thanh toán */}
              <Card
                title={
                  <Space>
                    <DollarOutlined style={{ color: '#009B60' }} />
                    <span>Hình Thức Thanh Toán</span>
                  </Space>
                }
                style={{ borderRadius: 14, marginBottom: 20 }}
              >
                <Radio.Group
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    <div
                      onClick={() => setPaymentMethod('VIETQR')}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: paymentMethod === 'VIETQR' ? '2px solid #009B60' : '1px solid #e2e8f0',
                        backgroundColor: paymentMethod === 'VIETQR' ? '#f0fdf4' : '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <Radio value="VIETQR">
                        <Space>
                          <QrcodeOutlined style={{ fontSize: 18, color: '#009B60' }} />
                          <Text strong>Thanh toán tức thì qua VietQR (Quét mã App Ngân hàng)</Text>
                        </Space>
                      </Radio>
                      <Tag color="green">Khuyên Dùng</Tag>
                    </div>

                    <div
                      onClick={() => setPaymentMethod('TRANSFER')}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: paymentMethod === 'TRANSFER' ? '2px solid #009B60' : '1px solid #e2e8f0',
                        backgroundColor: paymentMethod === 'TRANSFER' ? '#f0fdf4' : '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <Radio value="TRANSFER">
                        <Space>
                          <Text strong>Chuyển khoản ngân hàng trực tiếp</Text>
                        </Space>
                      </Radio>
                    </div>

                    <div
                      onClick={() => setPaymentMethod('CASH')}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: paymentMethod === 'CASH' ? '2px solid #009B60' : '1px solid #e2e8f0',
                        backgroundColor: paymentMethod === 'CASH' ? '#f0fdf4' : '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <Radio value="CASH">
                        <Space>
                          <Text strong>Thanh toán tiền mặt tại quầy khi nhận sân</Text>
                        </Space>
                      </Radio>
                    </div>
                  </Space>
                </Radio.Group>
              </Card>
            </Col>

            {/* Cột phải: Tóm tắt đơn đặt sân & Xác nhận */}
            <Col xs={24} lg={9}>
              <Card
                title="Tóm Tắt Đơn Đặt Sân"
                style={{
                  borderRadius: 14,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                  border: '1px solid #e2e8f0',
                  position: 'sticky',
                  top: 24
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="Sân Đặt">
                      <Text strong>{selectedCourt?.courtName}</Text>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{selectedCourt?.courtType}</div>
                    </Descriptions.Item>

                    <Descriptions.Item label="Địa Điểm">
                      <Text type="secondary">{selectedCourt?.location}</Text>
                    </Descriptions.Item>

                    <Descriptions.Item label="Ngày Chơi">
                      <Text strong style={{ color: '#009B60' }}>
                        {selectedDate.format('DD/MM/YYYY')}
                      </Text>
                    </Descriptions.Item>

                    <Descriptions.Item label="Khung Giờ">
                      <Tag color="geekblue" style={{ fontSize: 13 }}>
                        <ClockCircleOutlined /> {selectedSlot?.startTime} - {selectedSlot?.endTime}
                      </Tag>
                    </Descriptions.Item>
                  </Descriptions>
                </div>

                <Divider style={{ margin: '16px 0' }} />

                {/* Bảng chi tiết giá */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text type="secondary">Tiền thuê sân:</Text>
                    <Text strong>{basePrice.toLocaleString('vi-VN')} đ</Text>
                  </div>

                  {discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#16a34a' }}>
                      <Text style={{ color: '#16a34a' }}>Giảm giá khuyến mãi:</Text>
                      <Text strong style={{ color: '#16a34a' }}>
                        - {discountAmount.toLocaleString('vi-VN')} đ
                      </Text>
                    </div>
                  )}

                  <Divider style={{ margin: '12px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Text strong style={{ fontSize: 16 }}>
                      Tổng thanh toán:
                    </Text>
                    <Text strong style={{ fontSize: 24, color: '#009B60' }}>
                      {finalTotalAmount.toLocaleString('vi-VN')} đ
                    </Text>
                  </div>
                </div>

                <Button
                  type="primary"
                  size="large"
                  block
                  loading={submittingBooking}
                  onClick={handleConfirmBooking}
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
                  Xác Nhận & Đặt Sân Ngay
                </Button>

                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <SafetyCertificateOutlined style={{ color: '#009B60' }} /> Đảm bảo giữ sân 100% sau khi đặt
                  </Text>
                </div>

                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <Button type="link" onClick={() => setCurrentStep(1)} icon={<ArrowLeftOutlined />}>
                    Quay lại chọn giờ khác
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      )}

      {/* MODAL THÔNG BÁO ĐẶT SÂN THÀNH CÔNG & MÃ VIETQR */}
      <Modal
        open={isSuccessModalOpen}
        onCancel={() => setIsSuccessModalOpen(false)}
        footer={null}
        width={650}
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
                  đã được ghi nhận vào hệ thống.
                </span>
              }
            />

            {/* Chi tiết đơn */}
            <Card
              size="small"
              style={{
                borderRadius: 12,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                marginBottom: 20
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
                <Descriptions.Item label="Sân">
                  <Text strong>{selectedCourt?.courtName}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Ngày Chơi">
                  {dayjs(createdBooking.bookingDate).format('DD/MM/YYYY')}
                </Descriptions.Item>
                <Descriptions.Item label="Khung Giờ">
                  <Tag color="geekblue">
                    {createdBooking.startTime} - {createdBooking.endTime}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Tổng Tiền">
                  <Text strong style={{ color: '#009B60', fontSize: 16 }}>
                    {(createdBooking.totalAmount || 0).toLocaleString('vi-VN')} đ
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Hình Thức">
                  <Tag color="blue">{createdBooking.paymentMethod}</Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Nếu thanh toán VIETQR: Hiển thị mã QR ngân hàng thanh toán nhanh */}
            {createdBooking.paymentMethod === 'VIETQR' && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'center',
                  marginBottom: 20
                }}
              >
                <Text strong style={{ color: '#166534', fontSize: 15, display: 'block', marginBottom: 12 }}>
                  <QrcodeOutlined style={{ marginRight: 6 }} />
                  Quét Mã VietQR Để Thanh Toán Nhanh
                </Text>
                <img
                  alt="VietQR"
                  src={`https://img.vietqr.io/image/970422-0901234567-compact2.png?amount=${createdBooking.totalAmount}&addInfo=${createdBooking.bookingCode}&accountName=CLB%20CAU%20LONG`}
                  style={{
                    maxWidth: 240,
                    width: '100%',
                    borderRadius: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <div style={{ marginTop: 10, fontSize: 13, color: '#475569' }}>
                  Nội dung chuyển khoản: <Text code strong>{createdBooking.bookingCode}</Text>
                </div>
              </div>
            )}

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
