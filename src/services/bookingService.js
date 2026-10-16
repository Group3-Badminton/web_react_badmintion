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

  // 4. Lấy danh sách sân cho bộ lọc
  getCourts: async () => {
    const response = await api.get('/bookings/courts');
    return response.data;
  },

  // 5. Tạo đơn đặt sân mới (nếu cần đặt tại quầy)
  createBooking: async (bookingData) => {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  }
};
