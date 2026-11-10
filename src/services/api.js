import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env?.VITE_API_BASE_URL || 'http://localhost:9999/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Gắn Bearer Token tự động vào mỗi request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bcms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Bắt lỗi phản hồi: Token hết hạn, không hợp lệ, hoặc tài khoản bị khóa/xóa (401 / 403)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    const currentPath = window.location.pathname;

    // Các trang công khai / auth thì không cần đá ra login
    const isAuthPage = currentPath.startsWith('/login') ||
                       currentPath.startsWith('/register') ||
                       currentPath.startsWith('/reset-Password');

    // 401: Token hết hạn, không tồn tại, sai chữ ký, hoặc User bị xóa
    // 403: Tài khoản bị vô hiệu hóa / bị khóa (status !== 'ACTIVE')
    if ((status === 401 || (status === 403 && error.response?.data?.message?.includes('khóa') || error.response?.data?.message?.includes('vô hiệu'))) && !isAuthPage) {
      const hadToken = !!localStorage.getItem('bcms_token');
      localStorage.removeItem('bcms_token');
      localStorage.removeItem('bcms_user');

      if (hadToken) {
        // Thông báo lý do đá ra nếu có
        const message = error.response?.data?.message || 'Phiên đăng nhập đã hết hạn hoặc tài khoản bị vô hiệu hóa.';
        sessionStorage.setItem('bcms_auth_error', message);
        window.location.href = '/login';
      }
    }

    // Chuyển đổi các lỗi hệ thống / MongoDB sang tiếng Việt thân thiện
    if (error.response?.data?.message) {
      const msg = error.response.data.message;
      if (typeof msg === 'string' && (msg.includes('E11000') || msg.includes('duplicate key'))) {
        if (msg.includes('phone')) {
          error.response.data.message = 'Số điện thoại này đã tồn tại trong hệ thống. Vui lòng kiểm tra lại!';
        } else if (msg.includes('email')) {
          error.response.data.message = 'Email này đã tồn tại trong hệ thống. Vui lòng sử dụng email khác!';
        } else {
          error.response.data.message = 'Dữ liệu này đã tồn tại trong hệ thống (bị trùng lặp)!';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
