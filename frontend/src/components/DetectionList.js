import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { 
  FiTrash2, 
  FiEye, 
  FiClock, 
  FiAlertCircle, 
  FiCheckCircle, 
  FiChevronLeft, 
  FiChevronRight 
} from 'react-icons/fi';

const DetectionList = () => {
  const [detections, setDetections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    totalPages: 1,
    totalItems: 0
  });
  const navigate = useNavigate();

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FiCheckCircle className="text-green-500" />;
      case 'failed':
        return <FiAlertCircle className="text-red-500" />;
      default:
        return <FiClock className="text-yellow-500" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };

  const fetchDetections = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      
      const response = await axios.get('http://localhost:5000/api/detections', {
        params: {
          page,
          per_page: 10
        },
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log('API Response:', response.data);
      
      // Handle different response formats
      const data = response.data;
      let items = [];
      let totalItems = 0;
      let totalPages = 1;
      
      if (data.success && data.data && Array.isArray(data.data.detections)) {
        items = data.data.detections;
        totalItems = data.data.pagination.total_items || items.length;
        totalPages = data.data.pagination.total_pages || 1;
      } else {
        console.error('Unexpected API response format:', response.data);
        toast.error('Unexpected data format received from server');
        return;
      }
      
      setDetections(items);
      setPagination(prev => ({
        ...prev,
        page: page,
        totalPages: totalPages,
        totalItems: totalItems
      }));
      
    } catch (error) {
      console.error('Error fetching detections:', error);
      const errorMessage = error.response?.data?.error || 
                         error.response?.data?.message || 
                         'Failed to load detections';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDetections(1);
  }, [fetchDetections]);

  const handleDelete = async (detectionId) => {
    if (!window.confirm('Are you sure you want to delete this detection?')) {
      return;
    }

    try {
      const response = await axios.delete(`http://localhost:5000/api/detection/${detectionId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (response.data && response.data.success) {
        toast.success('Detection deleted successfully');
        // Refresh the detections list
        fetchDetections(pagination.page);
      } else {
        throw new Error(response.data?.error || 'Failed to delete detection');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to delete detection');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Your Detections</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">List of all your water sample analyses</p>
      </div>
      <div className="border-t border-gray-200">
        {detections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No detections found. Upload an image to get started.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {detections.map((detection) => (
              <li key={`detection-${detection.id}`} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(detection.status)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {detection.filename || `Detection #${detection.id}`}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        <p>Status: <span className="capitalize">{detection.status || 'unknown'}</span></p>
                        <p>Date: {formatDate(detection.timestamp)}</p>
                        {detection.detected_organisms?.length > 0 && (
                          <p>{detection.detected_organisms.length} organism{detection.detected_organisms.length !== 1 ? 's' : ''} detected</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/results/${detection.id}`)}
                      className="p-2 text-indigo-600 hover:text-indigo-900"
                      title="View details"
                    >
                      <FiEye className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(detection.id)}
                      className="p-2 text-red-600 hover:text-red-900"
                      title="Delete detection"
                    >
                      <FiTrash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => fetchDetections(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => fetchDetections(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">
                    {pagination.totalItems === 0 ? 0 : ((pagination.page - 1) * pagination.perPage) + 1}
                  </span> to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.perPage, pagination.totalItems)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.totalItems}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => fetchDetections(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <FiChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => fetchDetections(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <FiChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetectionList;