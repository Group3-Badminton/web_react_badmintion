import api from './api';

export const bookingService = {
  // 1. Lấy danh sách booking (có tìm kiếm, lọc, phân trang, thống kê)
  getAllBookings: async (params = {}) => {
    const response = await api.get('/bookings', { params });
    return response.data;
  },

  // 2. Lấy chi tiết đơn đặt sân theo ID
  getBookingById: async (id) => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  // 3. Cập nhật trạng thái và thông tin đơn đặt sân
  updateBookingStatus: async (id, data) => {
    const response = await api.patch(`/bookings/${id}/status`, data);
    return response.data;
  },

  // 4. Lấy danh sách sân
  getCourts: async () => {
    const response = await api.get('/bookings/courts');
    return response.data;
  },

  // 5. Lấy danh sách khung giờ
  getTimeSlots: async () => {
    const response = await api.get('/bookings/time-slots');
    return response.data;
  },

  // 6. Lấy tình trạng khung giờ & giá tiền theo Sân và Ngày
  getCourtAvailability: async (courtId, bookingDate) => {
    const response = await api.get('/bookings/availability', {
      params: { courtId, bookingDate }
    });
    return response.data;
  },

  // 7. Kiểm tra và áp dụng mã giảm giá
  validateVoucher: async (voucherCode, orderAmount = 0, context = {}) => {
    const response = await api.post('/bookings/validate-voucher', {
      voucherCode,
      orderAmount,
      ...context
    });
    return response.data;
  },

  // 7.5. Tính giá chi tiết cho từng sân và từng khung giờ (tách cao điểm / thấp điểm)
  calculateBookingPrice: async (data) => {
    const response = await api.post('/bookings/calculate-price', data);
    return response.data;
  },

  // 8. Tạo đơn đặt sân mới
  createBooking: async (bookingData) => {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  },

  // AF1: Thay đổi thông tin đặt sân (Change Booking Information)
  changeBookingInfo: async (id, data) => {
    const response = await api.patch(`/bookings/${id}/change-info`, data);
    return response.data;
  },

  // AF2: Từ chối yêu cầu đặt sân (Reject Booking)
  rejectBooking: async (id, data = {}) => {
    const response = await api.patch(`/bookings/${id}/reject`, data);
    return response.data;
  },

  // 9. Lấy danh sách khách hàng phục vụ staff / admin đặt sân
  getCustomers: async () => {
    const response = await api.get('/bookings/customers');
    return response.data;
  }
};

export default bookingService;
