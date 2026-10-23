import api from './api';

export const userService = {
    // 1. Lấy thông tin cá nhân mới nhất
    getProfile: async () => {
        const response = await api.get('/users/profile');
        return response.data;
    },
    // 2. Cập nhật Họ tên và Số điện thoại
    updateProfile: async (data) => {
        const response = await api.put('/users/profile', data);
        return response.data;
    },
    getCustomers: async () => {
        const response = await api.get('/users/customers');
        return response.data;
    },
    unlockCustomer: async (id) => {
        const response = await api.patch(`/users/customers/${id}/unlock`);
        return response.data;
    }
};