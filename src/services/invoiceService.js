import api from './api';

export const invoiceService = {
  getInvoices: async (params = {}) => {
    const response = await api.get('/invoices', { params });
    return response.data;
  },

  getInvoiceById: async (id) => {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },

  validateVoucher: async (payload) => {
    const response = await api.post('/invoices/validate-voucher', payload);
    return response.data;
  },

  settleSessionInvoice: async (id, payload) => {
    const response = await api.post(`/invoices/${id}/settle`, payload);
    return response.data;
  },

  createPosPayment: async (payload) => {
    const response = await api.post('/invoices/pos', payload);
    return response.data;
  }
};
