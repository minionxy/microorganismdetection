import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    config.params = {
      ...config.params,
      _t: Date.now(),
    };
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, config.data || config.params);
    }
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          toast.error(data.error || 'Bad request');
          break;
        case 401:
          toast.error('Unauthorized access');
          break;
        case 403:
          toast.error('Access forbidden');
          break;
        case 404:
          toast.error('Resource not found');
          break;
        case 429:
          toast.error('Too many requests. Please try again later.');
          break;
        case 500:
          toast.error('Internal server error. Please try again.');
          break;
        default:
          toast.error(data.error || `Server error (${status})`);
      }
    } else if (error.request) {
      // Request made but no response received
      toast.error('Cannot connect to server. Please check your connection.');
    } else {
      // Request setup error
      toast.error('Request failed. Please try again.');
    }
    
    return Promise.reject(error);
  }
);

// API service methods
export const apiService = {
  // Health check
  healthCheck: () => api.get('/api/health'),
  
  // Upload image
  uploadImage: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('image', file);
    
    return api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  },
  
  // Get detection result
  getDetectionResult: (detectionId) => api.get(`/api/detection/${detectionId}`),
  
  // Get all detections
  getDetections: (page = 1, perPage = 10) => 
    api.get('/api/detections', {
      params: { page, per_page: perPage }
    }),
  
  // Get image
  getImage: (detectionId, imageType) => 
    api.get(`/api/image/${detectionId}/${imageType}`, {
      responseType: 'blob'
    }),
  
  // Get statistics
  getStatistics: () => api.get('/api/statistics'),
  
  // Delete detection (if implemented)
  deleteDetection: (detectionId) => api.delete(`/api/detection/${detectionId}`),
};

// Utility functions
export const createImageUrl = (detectionId, imageType) => {
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  return `${baseURL}/api/image/${detectionId}/${imageType}`;
};

export const downloadImage = async (detectionId, imageType, filename) => {
  try {
    const response = await apiService.getImage(detectionId, imageType);
    
    // Create blob URL
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${imageType}_${detectionId}.png`;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success('Image downloaded successfully');
  } catch (error) {
    console.error('Download error:', error);
    toast.error('Failed to download image');
  }
};

// File upload utility
export const validateFile = (file) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/tiff', 'image/bmp'];
  const maxSize = 16 * 1024 * 1024; // 16MB
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload PNG, JPG, JPEG, TIFF, or BMP files only.'
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must be less than 16MB.'
    };
  }
  
  return { valid: true };
};

// Error handling utility
export const handleApiError = (error, defaultMessage = 'An error occurred') => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  
  if (error.message) {
    return error.message;
  }
  
  return defaultMessage;
};

// Loading state manager
export class LoadingManager {
  constructor() {
    this.loadingStates = new Map();
    this.listeners = new Set();
  }
  
  setLoading(key, isLoading) {
    this.loadingStates.set(key, isLoading);
    this.notifyListeners();
  }
  
  isLoading(key) {
    return this.loadingStates.get(key) || false;
  }
  
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  notifyListeners() {
    this.listeners.forEach(callback => callback(this.loadingStates));
  }
}

export const loadingManager = new LoadingManager();

// Cache manager
export class CacheManager {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
  
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  clear() {
    this.cache.clear();
  }
  
  delete(key) {
    this.cache.delete(key);
  }
}

export const cacheManager = new CacheManager();

// API hooks for React components
export const useApi = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  
  const callApi = React.useCallback(async (apiCall, options = {}) => {
    const { showLoading = true, cacheKey, onSuccess, onError } = options;
    
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      // Check cache first
      if (cacheKey) {
        const cached = cacheManager.get(cacheKey);
        if (cached) {
          return cached;
        }
      }
      
      const response = await apiCall();
      const data = response.data;
      
      // Cache the result
      if (cacheKey) {
        cacheManager.set(cacheKey, data);
      }
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      return data;
    } catch (err) {
      const errorMessage = handleApiError(err);
      setError(errorMessage);
      
      if (onError) {
        onError(err);
      } else {
        console.error('API Error:', err);
      }
      
      throw err;
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);
  
  return { callApi, loading, error, setLoading, setError };
};
const API_URL = 'http://localhost:5000/api';

export const deleteDetection = async (id) => {
  try {
    const response = await axios.delete(`${API_URL}/detection/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting detection:', error);
    throw error;
  }
};

export default api;