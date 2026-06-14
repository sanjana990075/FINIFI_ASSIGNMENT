import axios from 'axios';

const api = axios.create({
  baseURL: '',
  headers: {
    Accept: 'application/json',
  },
});

export const uploadDocument = async (formData) => {
  const response = await api.post('/api/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getMatchStatus = async (poNumber) => {
  const response = await api.get(`/api/match/${encodeURIComponent(poNumber)}`);
  return response.data;
};

export const getErrorMessage = (error) => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
};
