import api from '../lib/api';

export const socialService = {
  getAccounts: async () => {
    const res = await api.get('/social-accounts');
    return res.data;
  },

  getConnectUrl: async (platform) => {
    const res = await api.get(`/social-accounts/${platform}/connect`);
    return res.data;
  },

  connectMock: async (platform) => {
    const res = await api.post(`/social-accounts/${platform}/mock-connect`);
    return res.data;
  },

  disconnectAccount: async (id) => {
    const res = await api.delete(`/social-accounts/${id}`);
    return res.data;
  }
};
