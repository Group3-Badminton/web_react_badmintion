import api from './api';

export const notificationService = {
  /**
   * Lấy danh sách thông báo của tài khoản đăng nhập (Customer hoặc Staff/Admin)
   */
  getMyNotifications: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  /**
   * UC-15.1: Lấy danh sách thông báo của Customer
   */
  getCustomerNotifications: async (params = {}) => {
    const response = await api.get('/notifications/customer', { params });
    return response.data;
  },

  /**
   * UC-15.4: Lấy danh sách thông báo nghiệp vụ của Staff & Admin
   */
  getStaffNotifications: async (params = {}) => {
    const response = await api.get('/notifications/staff', { params });
    return response.data;
  },

  /**
   * UC-15.2 & UC-15.5: Xem chi tiết thông báo (tự động đánh dấu đã đọc)
   */
  getNotificationById: async (id) => {
    const response = await api.get(`/notifications/${id}`);
    return response.data;
  },

  /**
   * UC-15.3 & UC-15.6: Vô hiệu hóa thông báo (chuyển status sang INACTIVE)
   */
  deactivateNotification: async (id) => {
    const response = await api.patch(`/notifications/${id}/deactivate`);
    return response.data;
  },

  /**
   * Đánh dấu 1 thông báo là đã đọc
   */
  markAsRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Đánh dấu tất cả thông báo là đã đọc
   */
  markAllAsRead: async () => {
    const response = await api.patch('/notifications/mark-all-read');
    return response.data;
  },

  /**
   * Lấy số lượng thông báo chưa đọc phục vụ hiển thị Badge đỏ
   */
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  }
};

export default notificationService;
