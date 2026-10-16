import api from './api';

export const staffService = {
  getStaffs: async (params = {}) => {
    const response = await api.get('/staffs', { params });
    return response.data;
  },
  getStaffDetail: async (id) => {
    const response = await api.get(`/staffs/${id}`);
    return response.data;
  },
  createStaff: async (data) => {
    const response = await api.post('/staffs', data);
    return response.data;
  },
  updateStaff: async (id, data) => {
    const response = await api.patch(`/staffs/${id}`, data);
    return response.data;
  },
  deactivateStaff: async (id) => {
    const response = await api.patch(`/staffs/${id}/deactivate`);
    return response.data;
  },
  activateStaff: async (id) => {
    const response = await api.patch(`/staffs/${id}/activate`);
    return response.data;
  }
};
