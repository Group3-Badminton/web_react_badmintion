import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:9999/api',
    headers: {
        'Content-Type': 'application/json'
    }
});
// Tự động đính kèm Token JWT vào Header trước mỗi yêu cầu gửi đi
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('bcms_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
export default api;