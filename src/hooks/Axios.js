import apiClient from '../services/api';

// Maintain backwards compatibility with any existing files importing `api` from `../hooks/Axios`
export const api = apiClient;
export default apiClient;
