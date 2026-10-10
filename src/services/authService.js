import api from './api';
export const authService = {
    login: async (credentials) => {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },
    register: async (userData) => {
        const response = await api.post("/auth/register", userData);
        return response.data;
    },
    sendOtp: async (email) => {
        const response = await api.post('/auth/send-otp', { email });
        return response.data;
    },
    verifyOtp: async (data) => {
        const response = await api.post('/auth/verify-otp', data);
        return response.data;
    },
    resetPassword: async (data) => {
        const response = await api.post('/auth/reset-password', data);
        return response.data;
    }
};