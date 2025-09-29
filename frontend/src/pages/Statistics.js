import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FiAlertCircle, FiCheckCircle, FiClock, FiZap, FiRefreshCw } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

function Statistics() {
  const [statistics, setStatistics] = useState({
    total_detections: 0,
    completed_detections: 0,
    failed_detections: 0,
    processing_detections: 0,
    organism_statistics: {},
    success_rate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatistics = async () => {
    try {
      const response = await axios.get('/api/statistics');
      const data = response.data;
      
      if (data) {
        const total = data.total_detections || 0;
        const completed = data.status_counts?.completed || 0;
        const failed = data.status_counts?.failed || 0;
        const processing = data.status_counts?.processing || 0;
        
        // Calculate success rate (only consider completed and failed detections)
        const successRate = (completed + failed) > 0 
          ? (completed / (completed + failed)) * 100 
          : 0;
        
        setStatistics({
          total_detections: total,
          completed_detections: completed,
          failed_detections: failed,
          processing_detections: processing,
          organism_statistics: data.organism_counts || {},
          success_rate: successRate
        });
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error('Failed to load statistics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
    
    // Set up polling every 30 seconds
    const interval = setInterval(fetchStatistics, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStatistics();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const {
    total_detections: totalDetections,
    completed_detections: completedDetections,
    failed_detections: failedDetections,
    organism_statistics: organismStats,
    success_rate: successRate
  } = statistics;

  const uniqueTypes = Object.keys(organismStats).length;
  const organismsFound = Object.values(organismStats).reduce((sum, count) => sum + Number(count || 0), 0);
  const organismEntries = Object.entries(organismStats);
  const completionPct = totalDetections > 0 ? Math.round((completedDetections / totalDetections) * 100) : 0;
  const maxOrganismCount = organismEntries.reduce((m, [, c]) => Math.max(m, Number(c || 0)), 0) || 1;

  // Prepare data for charts
  const statusData = [
    { name: 'Completed', value: completedDetections, color: '#10B981' },
    { name: 'Failed', value: failedDetections, color: '#EF4444' },
    { name: 'Processing', value: statistics.processing_detections, color: '#F59E0B' }
  ];

  const organismData = organismEntries.map(([name, count]) => ({
    name,
    count: Number(count),
    color: COLORS[organismEntries.findIndex(([n]) => n === name) % COLORS.length]
  }));

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      {/* Header with refresh button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Detection Statistics</h1>
          <p className="text-gray-500 mt-1">Comprehensive analysis of microorganism detection results</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {isRefreshing ? (
            <>
              <FiRefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Refreshing...
            </>
          ) : (
            <>
              <FiRefreshCw className="-ml-1 mr-2 h-4 w-4" />
              Refresh Data
            </>
          )}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {/* Total Analyses */}
        <div className="bg-white rounded-lg shadow p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Total Analyses</p>
            <FiZap className="text-indigo-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalDetections}</p>
          <p className="text-sm text-gray-500">Images processed</p>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-lg shadow p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Success Rate</p>
            <FiCheckCircle className="text-emerald-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{Number(successRate).toFixed(1)}%</p>
          <p className="text-sm text-gray-500">Successful detections</p>
        </div>

        {/* Organisms Found */}
        <div className="bg-white rounded-lg shadow p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Organisms Found</p>
            <FiZap className="text-indigo-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{organismsFound}</p>
          <p className="text-sm text-gray-500">Total detected</p>
        </div>

        {/* Unique Types */}
        <div className="bg-white rounded-lg shadow p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Unique Types</p>
            <FiAlertCircle className="text-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{uniqueTypes}</p>
          <p className="text-sm text-gray-500">Organism varieties</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Detection Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Detection Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} detections`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detected Organism Types */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Detected Organism Types</h3>
          <div className="h-64">
            {organismEntries.length === 0 ? (
              <p className="text-gray-500 h-full flex items-center justify-center">No organism data available</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={organismData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(value) => [`${value} detections`, 'Count']} />
                  <Legend />
                  <Bar dataKey="count" name="Detections" fill="#8884d8">
                    {organismData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Organism Details Table */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Organism Detection Details</h3>
          <span className="text-sm text-gray-500">
            Showing {organismEntries.length} {organismEntries.length === 1 ? 'type' : 'types'} of organisms
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organism Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detection Count
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {organismEntries.length === 0 ? (
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center" colSpan={3}>
                    No organism data available
                  </td>
                </tr>
              ) : (
                organismEntries
                  .sort((a, b) => b[1] - a[1]) // Sort by count descending
                  .map(([name, count], index) => {
                    const n = Number(count || 0);
                    const pct = organismsFound > 0 ? ((n / organismsFound) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                          {name.replace(/_/g, ' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {n.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Statistics;