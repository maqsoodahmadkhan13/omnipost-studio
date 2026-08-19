import api from '../lib/api';

export const postService = {
  getPosts: async (params = {}) => {
    const res = await api.get('/posts', { params });
    return res.data;
  },

  getPostById: async (id) => {
    const res = await api.get(`/posts/${id}`);
    return res.data;
  },

  createPost: async (postData) => {
    const res = await api.post('/posts', postData);
    return res.data;
  },

  updatePost: async (id, postData) => {
    const res = await api.put(`/posts/${id}`, postData);
    return res.data;
  },

  deletePost: async (id) => {
    const res = await api.delete(`/posts/${id}`);
    return res.data;
  },

  publishPost: async (id) => {
    const res = await api.post(`/posts/${id}/publish`);
    return res.data;
  },

  schedulePost: async (id, data) => {
    const res = await api.post(`/posts/${id}/schedule`, data);
    return res.data;
  },

  reschedulePost: async (id, data) => {
    const res = await api.post(`/posts/${id}/reschedule`, data);
    return res.data;
  },

  cancelPost: async (id) => {
    const res = await api.post(`/posts/${id}/cancel`);
    return res.data;
  },

  retryPost: async (id, platform = null) => {
    const res = await api.post(`/posts/${id}/retry`, { platform });
    return res.data;
  }
};
