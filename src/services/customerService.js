import api from './api';

export const customerService = {
  // UC-6.1 & UC-6.5: Lấy danh sách & Tìm kiếm, lọc khách hàng
  getCustomers: async (params = {}) => {
    const response = await api.get('/customers', { params });
    return response.data;
  },

  // Lấy chi tiết thông tin khách hàng
  getCustomerDetail: async (id) => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  // UC-6.2: Tạo khách hàng tại quầy / điện thoại
  createCustomer: async (data) => {
    const response = await api.post('/customers', data);
    return response.data;
  },

  // UC-6.3: Cập nhật thông tin khách hàng
  updateCustomer: async (id, data) => {
    const response = await api.patch(`/customers/${id}`, data);
    return response.data;
  },

  // UC-6.4: Vô hiệu hóa khách hàng (Soft delete)
  deactivateCustomer: async (id) => {
    const response = await api.patch(`/customers/${id}/deactivate`);
    return response.data;
  },

  // Mở khóa / Kích hoạt lại khách hàng
  activateCustomer: async (id) => {
    const response = await api.patch(`/customers/${id}/activate`);
    return response.data;
  }
};
