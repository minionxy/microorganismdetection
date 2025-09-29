import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Statistics from './Statistics';
import LoadingSpinner from '../components/LoadingSpinner';

const StatisticsPage = () => {
  const [statistics, setStatistics] = useState({
    total_detections: 0,
    completed_detections: 0,
    failed_detections: 0,
    processing_detections: 0,
    organism_statistics: {},
    success_rate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/statistics');
        console.log('API Response:', response.data);
        
        if (response.data) {
          const data = response.data;
          const total = data.total_detections || 0;
          const completed = data.status_counts?.completed || 0;
          const failed = data.status_counts?.failed || 0;
          
          // Calculate success rate
          const successRate = total > 0 ? (completed / (completed + failed)) * 100 : 0;
          
          setStatistics({
            total_detections: total,
            completed_detections: completed,
            failed_detections: failed,
            processing_detections: data.status_counts?.processing || 0,
            organism_statistics: data.organism_counts || {},
            success_rate: successRate.toFixed(1)
          });
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching statistics:', err);
        setError('Failed to load statistics. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 p-6 rounded-lg max-w-md text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Statistics</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <Statistics statistics={statistics} />;
};

export default StatisticsPage;
