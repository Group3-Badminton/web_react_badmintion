import api from './api';

export const sessionService = {
  getCourtMatrix: async (date) => {
    const response = await api.get('/sessions/matrix', { params: { date } });
    return response.data;
  },

  getLiveBoard: async () => {
    const response = await api.get('/sessions/current');
    return response.data;
  },

  // 2. Lấy danh sách lịch sử các phiên chơi
  getAllSessions: async (params = {}) => {
    const response = await api.get('/sessions', { params });
    return response.data;
  },

  // 3. Lấy chi tiết phiên chơi
  getSessionById: async (id) => {
    const response = await api.get(`/sessions/${id}`);
    return response.data;
  },

  // 4. UC-12.1: Bắt đầu phiên chơi (Check-in)
  checkIn: async (payload) => {
    const response = await api.post('/sessions/check-in', payload);
    return response.data;
  },

  // 5. UC-12.2: Gia hạn thời gian chơi (+30m hoặc +60m)
  extendSession: async (id, payload) => {
    const response = await api.post(`/sessions/${id}/extend`, payload);
    return response.data;
  },

  // 6. Đổi sân cho phiên đang chơi
  switchCourt: async (id, payload) => {
    const response = await api.post(`/sessions/${id}/switch-court`, payload);
    return response.data;
  },

  // 7. UC-12.3: Kết thúc phiên chơi (Check-out)
  checkOut: async (id, payload = {}) => {
    const response = await api.post(`/sessions/${id}/check-out`, payload);
    return response.data;
  },

  // 8. Hoàn tất dọn dẹp sân (chuyển về AVAILABLE)
  completeCleaning: async (courtId) => {
    const response = await api.post(`/sessions/courts/${courtId}/clean-complete`);
    return response.data;
  },

  // 9. Thêm đồ thuê / nước uống vào phiên chơi
  addRentalItem: async (id, payload) => {
    const response = await api.post(`/sessions/${id}/rentals`, payload);
    return response.data;
  }
};

export default sessionService;
