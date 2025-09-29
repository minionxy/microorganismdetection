import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

const History = () => {
  const [detections, setDetections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    totalPages: 1,
    totalItems: 0
  });

  const fetchHistory = async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/detections', {
        params: {
          page,
          per_page: 10
        }
      });
      
      console.log('API Response:', response.data);
      
      if (response.data && response.data.success) {
        setDetections(response.data.detections || []);
        setPagination({
          page: response.data.pagination?.page || page,
          perPage: response.data.pagination?.per_page || 10,
          totalPages: response.data.pagination?.total_pages || 1,
          totalItems: response.data.pagination?.total_items || 0
        });
      } else {
        throw new Error(response.data?.error || 'Failed to fetch history');
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error(error.response?.data?.error || 'Failed to load detection history');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    fetchHistory(newPage);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this detection?')) {
      try {
        await axios.delete(`http://localhost:5000/api/detection/${id}`);
        toast.success('Detection deleted successfully');
        fetchHistory(pagination.page); // Refresh current page
      } catch (error) {
        console.error('Error deleting detection:', error);
        toast.error('Failed to delete detection');
      }
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Detection History</h1>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {detections && detections.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {detections.map((detection) => (
                <li key={detection.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link 
                        to={`/results/${detection.id}`}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        {detection.filename || 'Untitled'}
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">
                        {detection.timestamp ? new Date(detection.timestamp).toLocaleString() : 'Unknown date'}
                      </p>
                      {detection.organism_count > 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          {detection.organism_count} organism{detection.organism_count !== 1 ? 's' : ''} detected
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        detection.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : detection.status === 'processing'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {detection.status || 'unknown'}
                      </span>
                      <button
                        onClick={() => handleDelete(detection.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No detection history found.</p>
              <Link 
                to="/upload" 
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Upload your first sample
              </Link>
            </div>
          )}
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
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
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border rounded-md text-sm font-medium disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1 border rounded-md text-sm font-medium disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;