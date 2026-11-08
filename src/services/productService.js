import api from './api';

export const productService = {
  /**
   * UC-14.1 & UC-14.6: Lấy danh sách sản phẩm với bộ lọc & phân trang
   */
  getProducts: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  /**
   * UC-14.2: Lấy thông tin chi tiết của sản phẩm theo ID
   */
  getProductById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  /**
   * UC-14.3: Tạo sản phẩm mới (chỉ Admin)
   */
  createProduct: async (data) => {
    const response = await api.post('/products', data);
    return response.data;
  },

  /**
   * UC-14.4: Cập nhật thông tin cơ bản của sản phẩm (chỉ Admin)
   */
  updateProduct: async (id, data) => {
    const response = await api.patch(`/products/${id}`, data);
    return response.data;
  },

  /**
   * UC-14.5: Vô hiệu hóa sản phẩm (chỉ Admin)
   */
  deactivateProduct: async (id) => {
    const response = await api.patch(`/products/${id}/deactivate`);
    return response.data;
  },

  /**
   * Kích hoạt lại sản phẩm (chỉ Admin)
   */
  activateProduct: async (id) => {
    const response = await api.patch(`/products/${id}/activate`);
    return response.data;
  },

  /**
   * UC-14.7: Ghi nhận nhập kho sản phẩm (chỉ Admin)
   */
  stockIn: async (id, data) => {
    const response = await api.post(`/products/${id}/stock-ins`, data);
    return response.data;
  }
};
