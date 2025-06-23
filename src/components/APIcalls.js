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
  getCallDetails: async (callId) => {
    const response = await api.get(`/api/calls/${callId}/`);
    return response.data;
  },
  
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
  }
};

export default api;