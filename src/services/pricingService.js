import api from './api';

export const pricingService = {
  // UC-18.1: Lấy danh sách quy tắc giá thuê sân (kèm bộ lọc)
  getAll: async (params = {}) => {
    const response = await api.get('/pricing', { params });
    return response.data;
  },

  // Lấy chi tiết quy tắc giá
  getById: async (id) => {
    const response = await api.get(`/pricing/${id}`);
    return response.data;
  },

  // UC-18.2: Tạo quy tắc giá mới
  create: async (data) => {
    const response = await api.post('/pricing', data);
    return response.data;
  },

  // UC-18.3: Cập nhật quy tắc giá
  update: async (id, data) => {
    const response = await api.put(`/pricing/${id}`, data);
    return response.data;
  },

  // UC-18.4: Vô hiệu hóa quy tắc giá
  deactivate: async (id) => {
    const response = await api.patch(`/pricing/${id}/deactivate`);
    return response.data;
  },

  // Kích hoạt lại quy tắc giá
  activate: async (id) => {
    const response = await api.patch(`/pricing/${id}/activate`);
    return response.data;
  }
};
