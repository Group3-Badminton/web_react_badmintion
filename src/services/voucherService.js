import api from './api';

export const voucherService = {
  /**
   * UC-15.1 & UC-15.6: Lấy danh sách voucher với bộ lọc & phân trang
   */
  getVouchers: async (params = {}) => {
    const response = await api.get('/vouchers', { params });
    return response.data;
  },

  /**
   * UC-15.2: Xem chi tiết voucher theo ID
   */
  getVoucherById: async (id) => {
    const response = await api.get(`/vouchers/${id}`);
    return response.data;
  },

  /**
   * UC-15.3: Tạo voucher mới (chỉ Admin)
   */
  createVoucher: async (data) => {
    const response = await api.post('/vouchers', data);
    return response.data;
  },

  /**
   * UC-15.4: Cập nhật voucher (chỉ Admin)
   */
  updateVoucher: async (id, data) => {
    const response = await api.patch(`/vouchers/${id}`, data);
    return response.data;
  },

  /**
   * UC-15.5: Vô hiệu hóa voucher (chỉ Admin)
   */
  deactivateVoucher: async (id) => {
    const response = await api.patch(`/vouchers/${id}/deactivate`);
    return response.data;
  },

  /**
   * Kích hoạt lại voucher (chỉ Admin)
   */
  activateVoucher: async (id) => {
    const response = await api.patch(`/vouchers/${id}/activate`);
    return response.data;
  }
};
