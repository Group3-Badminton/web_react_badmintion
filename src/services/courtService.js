import api from './api';

export const courtService = {
  getCourts: async (params = {}) => {
    const response = await api.get('/courts', { params });
    return response.data;
  },
  getCourtDetail: async (id) => {
    const response = await api.get(`/courts/${id}`);
    return response.data;
  },
  createCourt: async (data) => {
    const response = await api.post('/courts', data);
    return response.data;
  },
  updateCourt: async (id, data) => {
    const response = await api.patch(`/courts/${id}`, data);
    return response.data;
  },
  deactivateCourt: async (id) => {
    const response = await api.patch(`/courts/${id}/deactivate`);
    return response.data;
  }
};
