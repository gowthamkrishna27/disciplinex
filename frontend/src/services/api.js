const getApiBase = () => {
  if (typeof window === 'undefined') return 'https://disciplinex-7c8o.onrender.com/api';
  const hostname = window.location.hostname;
  const isLocal = 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname === '[::1]' || 
    hostname.startsWith('192.168.') || 
    hostname.startsWith('10.') || 
    hostname.startsWith('172.') || 
    hostname.endsWith('.local');
    
  return isLocal ? `http://${hostname}:5000/api` : 'https://disciplinex-7c8o.onrender.com/api';
};

const API_BASE = getApiBase();

// Production Railway responds instantly; local should be fast
const isLocalApi = API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1') || API_BASE.includes('192.168.');
const REQUEST_TIMEOUT = isLocalApi ? 15000 : 90000; // 15s local, 90s production

console.log(`[API Service] Initialized. Target: ${API_BASE} | Timeout: ${REQUEST_TIMEOUT / 1000}s`);

const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Set up AbortController timeout (dynamic based on local vs production)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`[API Service] Request to ${endpoint} timed out after ${REQUEST_TIMEOUT / 1000}s. Aborting.`);
    controller.abort();
  }, REQUEST_TIMEOUT);

  const config = {
    ...options,
    headers,
    credentials: 'include',
    signal: controller.signal,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  console.log(`[API Service] Sending ${options.method || 'GET'} to ${API_BASE}${endpoint}`);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    
    // Clear the timeout once request is completed
    clearTimeout(timeoutId);

    // Robust response body parsing based on content-type
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const plainText = await response.text();
      data = { message: plainText || `Server returned error status ${response.status}: ${response.statusText}` };
    }

    if (!response.ok) {
      const err = new Error(data.message || 'An error occurred during request');
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    // Clear the timeout in case of exceptions before response
    clearTimeout(timeoutId);

    console.error(`[API Service] Error on ${options.method || 'GET'} ${endpoint}:`, error.name, error.message);
    
    // Translate AbortError (timeout) into user-friendly message
    if (error.name === 'AbortError') {
      const timeoutErr = new Error('Connection timeout: The backend server is taking too long to respond. If this is a production link, the server container might be waking up from cold-sleep. Please wait a few seconds and try again.');
      timeoutErr.status = 408;
      throw timeoutErr;
    }

    // Translate standard Failed to fetch (network down or CORS blocked) into user-friendly diagnostics
    if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      const networkErr = new Error('Network Connection Error: Unable to reach the backend server. Please verify your internet connection, confirm that the backend server is running on port 5000, and ensure no local ad-blocker or firewall is restricting the request.');
      networkErr.status = 503;
      throw networkErr;
    }

    throw error;
  }
};

export { API_BASE };
export const api = {
  get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => request(endpoint, { method: 'POST', body, ...options }),
  put: (endpoint, body, options) => request(endpoint, { method: 'PUT', body, ...options }),
  delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...options }),
};
export default api;

