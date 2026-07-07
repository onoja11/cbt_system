const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://startrite_cbt_api.test';

export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('intranet_access_token');

  // Establish default headers and automatically append Sanctum tokens if present
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  // Strip leading slashes if passed mistakenly to prevent malformed URL parsing
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  const response = await fetch(`${BASE_URL}/${formattedEndpoint}`, config);
  
  return response;
};