
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { FiSend, FiCheckCircle, FiAlertCircle, FiClock } from 'react-icons/fi';

const DetectionList = () => {
  const [detections, setDetections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
      return 'Invalid date';
    }
  };

  const fetchDetections = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/detections', {
        params: { page: 1, per_page: 100 },
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = response.data;
      if (Array.isArray(data.detections)) {
        setDetections(data.detections);
      } else {
        toast.error('Unexpected data format received from server');
      }
    } catch (error) {
      toast.error('Failed to load detections');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleResendEmail = useCallback(async (detection) => {
    if (!detection.email_recipient) {
      toast.error('No previous recipient to resend to.');
      return;
    }
    try {
      const response = await axios.post('/api/send-results-email', {
        email: detection.email_recipient,
        detection_id: detection.id
      });
      if (response.data && response.data.message) {
        toast.success('Email resent successfully!');
        fetchDetections();
      } else {
        throw new Error(response.data?.error || 'Failed to resend email');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Failed to resend email');
    }
  }, [fetchDetections]);

  useEffect(() => {
    fetchDetections();
  }, [fetchDetections]);

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
        <h3 className="text-lg leading-6 font-medium text-gray-900">Detection History</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">All your water sample analyses</p>
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
                        <p>Email: {detection.email_status === 'success' ? (
                          <span className="text-green-600">Sent</span>
                        ) : detection.email_status === 'failure' ? (
                          <span className="text-red-600">Failed</span>
                        ) : (
                          <span className="text-gray-400">Never sent</span>
                        )}
                        {detection.email_recipient && (
                          <span> to {detection.email_recipient}</span>
                        )}
                        {detection.email_sent_at && (
                          <span> at {formatDate(detection.email_sent_at)}</span>
                        )}
                        </p>
                      </div>
                    </div>
                    {/* Resend Email button for failed/never sent */}
                    {['failure', 'never_sent'].includes(detection.email_status) && detection.email_recipient && (
                      <button
                        onClick={() => handleResendEmail(detection)}
                        className="p-2 text-blue-600 hover:text-blue-900"
                        title="Resend email"
                      >
                        <FiSend className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DetectionList;