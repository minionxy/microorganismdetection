import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Statistics from './Statistics';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Bar,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#34D399', '#EF4444', '#FBBF24']; // green, red, yellow

const StatisticsPage = () => {
  const [statistics, setStatistics] = useState({
    total_detections: 0,
    completed_detections: 0,
    failed_detections: 0,
    processing_detections: 0,
    organism_statistics: {},
    latest_detections: [],
    success_rate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const { data } = await axios.get('http://localhost:5000/api/statistics');
        console.log('API Response:', data);

        setStatistics({
          total_detections: data.total_detections ?? 0,
          completed_detections: data.completed_detections ?? 0,
          failed_detections: data.failed_detections ?? 0,
          processing_detections: data.processing_detections ?? 0,
          organism_statistics: data.organism_statistics ?? {},
          latest_detections: data.latest_detections ?? [],
          success_rate: Number(data.success_rate ?? 0).toFixed(1)
        });
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

  // Prepare chart data
  const detectionStatusData = [
    { name: 'Completed', value: statistics.completed_detections },
    { name: 'Failed', value: statistics.failed_detections },
    { name: 'Processing', value: statistics.processing_detections }
  ];

  // Top organisms (limit to 10 for readability)
  const organismData = Object.entries(statistics.organism_statistics)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      {/* Existing summary component */}
      <Statistics statistics={statistics} />

      {/* Charts Section */}
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {/* Pie Chart */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 text-center">
            Detection Status Breakdown
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={detectionStatusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {detectionStatusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 text-center">
            Top Detected Organisms
          </h2>
          {organismData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={organismData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500">No organism data to display.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;
