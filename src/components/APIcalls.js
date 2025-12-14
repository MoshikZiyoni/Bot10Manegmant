import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});



export const callsApi = {
  // Get paginated calls with optional filters
  getCalls: async (page = 1, filters = {}) => {
    const params = new URLSearchParams({ page });

    // Add filters to query params
    if (filters.direction) params.append('direction', filters.direction);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (typeof filters.has_offer !== 'undefined') params.append('has_offer', filters.has_offer ? 'true' : ''); // <-- Add this line


    const response = await api.get(`/api/calls/?${params.toString()}`);
    return response.data;
  },

  // Get single call details
  // getCallDetails: async (callId) => {
  //   const response = await api.get(`/api/calls/${callId}/`);
  //   return response.data;
  // },

  // Get call statistics
  getCallStats: async () => {
    const response = await api.get('/api/calls/stats/');
    return response.data;
  },

  // Initiate an outbound call
  initiateCall: async (phoneNumber, callerId) => {
    const response = await api.post('/api/calls/outbound/', {
      phone_number: phoneNumber,
      caller_id: callerId
    });
    return response.data;
  },

  // --- ADMIN TOOLS (MOCK) ---
  getActiveCalls: async () => {
    const response = await api.get('/api/admin/active-calls/');
    return response.data;
  },

  terminateCall: async (callId) => {
    console.log(`Terminating call ${callId}...`);
    // Using POST for action
    const response = await api.post(`/api/admin/calls/${callId}/terminate/`);
    return response.data;
  },

  getAllUsers: async () => {
    try {
      const response = await api.get('/api/admin/users/');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  updateUserQuota: async (userId, newQuota) => {
    const response = await api.post(`/api/admin/users/${userId}/quota/`, {
      quota_minutes: newQuota
    });
    return response.data;
  },

  getSystemStatus: async () => {
    const response = await api.get('/api/admin/system/status/');
    return response.data;
  },

  toggleSystemStatus: async (newStatus) => {
    const response = await api.post('/api/admin/system/toggle/', {
      status: newStatus
    });
    return response.data;
  }
};

export default api;