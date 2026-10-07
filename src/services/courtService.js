import api from './api';

export const courtService = {
    getPublicCourts: async () => {
        const response = await api.get('/courts/public');
        return response.data;
    }
};