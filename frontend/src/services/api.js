import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001';

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // token 过期或无效，清除本地存储并跳转到登录页
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证相关 API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// 用户相关 API
export const userAPI = {
  getAllUsers: () => api.get('/users'),
  getUserById: (id) => api.get(`/users/${id}`),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  uploadAvatar: (id, formData) => {
    return api.post(`/users/${id}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// 提案相关 API
export const proposalAPI = {
  getProposals: (params) => api.get('/proposals', { params }),
  getMyDiscussions: (params) => api.get('/proposals/my-discussions', { params }),
  getProposalById: (id) => api.get(`/proposals/${id}`),
  createProposal: (formData) => {
    return api.post('/proposals', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  updateProposal: (id, data) => api.put(`/proposals/${id}`, data),
  deleteProposal: (id) => api.delete(`/proposals/${id}`),
  voteProposal: (id, voteType, chainVoteData = null) => {
    const data = { voteType };
    if (chainVoteData) {
      Object.assign(data, chainVoteData);
    }
    return api.post(`/proposals/${id}/vote`, data);
  },
  getMyVote: (id) => api.get(`/proposals/${id}/my-vote`),
  addComment: (id, content) => api.post(`/proposals/${id}/comments`, { content }),
  addReply: (id, commentId, content) => api.post(`/proposals/${id}/comments/${commentId}/replies`, { content }),
};

// 统计相关 API
export const statisticsAPI = {
  getOverview: () => api.get('/statistics'),
};

// 成就与积分
export const achievementAPI = {
  getMyAchievements: () => api.get('/achievements/me'),
};

// 系统设置
export const settingsAPI = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data) => api.put('/settings', data),
};

// 交易历史相关 API
export const transactionAPI = {
  getMyTransactions: (params) => api.get('/transactions/my-transactions', { params }),
  getAllTransactions: (params) => api.get('/transactions', { params }),
  getAllVotes: (params) => api.get('/transactions/votes', { params }),
  getTransactionByHash: (hash) => api.get(`/transactions/hash/${hash}`),
  getTransactionStatistics: () => api.get('/transactions/statistics'),
};

export default api;

