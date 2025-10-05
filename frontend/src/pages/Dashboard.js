import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiUpload, FiBarChart2, FiAlertTriangle, FiCheckCircle, FiClock, FiX } from 'react-icons/fi';
import StatCard from '../components/StatCard';
import DetectionList from '../components/DetectionList';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const Dashboard = () => {
  // Email modal state moved to Upload.js
  // const [showEmailModal, setShowEmailModal] = useState(true);
  // const [email, setEmail] = useState('');
  // const [emailError, setEmailError] = useState('');
  const [stats, setStats] = useState([
    { title: 'Total Scans', value: '0', icon: <FiBarChart2 className="w-6 h-6" />, change: '0%', trend: 'up' },
    { title: 'High Risk', value: '0', icon: <FiAlertTriangle className="w-6 h-6" />, change: '0%', trend: 'up', color: 'red' },
    { title: 'Safe Samples', value: '0', icon: <FiCheckCircle className="w-6 h-6" />, change: '0%', trend: 'up', color: 'green' },
    { title: 'Processing', value: '0', icon: <FiClock className="w-6 h-6" />, trend: 'up', color: 'yellow' },
  ]);
  const [isLoading, setIsLoading] = useState(true);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };
  
  // Email modal logic handled in Upload.js

  // Email modal logic handled in Upload.js

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/statistics');
        const data = response.data;
        const total = data.total_detections || 0;
        const completed = data.completed_detections || 0;
        const failed = data.failed_detections || 0;
        // No explicit processing count in backend, so set to 0 or add if needed
        const processing = 0;
        // High risk: just use total organisms for now
        const highRiskCount = Object.entries(data.organism_statistics || {}).reduce((acc, [_, count]) => acc + count, 0);
        setStats([
          { title: 'Total Scans', value: total.toString(), icon: <FiBarChart2 className="w-6 h-6" />, change: '0%', trend: 'up' },
          { title: 'High Risk', value: highRiskCount.toString(), icon: <FiAlertTriangle className="w-6 h-6" />, change: '0%', trend: 'up', color: 'red' },
          { title: 'Safe Samples', value: completed.toString(), icon: <FiCheckCircle className="w-6 h-6" />, change: '0%', trend: 'up', color: 'green' },
          { title: 'Processing', value: processing.toString(), icon: <FiClock className="w-6 h-6" />, trend: 'up', color: 'yellow' },
        ]);
      } catch (error) {
        console.error('Error fetching statistics:', error);
        toast.error('Failed to load statistics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-10 px-4 sm:px-6 lg:px-8">
      {/* Email Request Modal handled in Upload.js after upload */}

      <div className="max-w-7xl mx-auto">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600">
              Monitor and analyze water quality detection results in real-time
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4">
            <Link
              to="/upload"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <FiUpload className="-ml-1 mr-2 h-5 w-5" />
              New Scan
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Detection List Section */}
        <div className="mb-8">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Detections</h3>
            </div>
            <div className="bg-white overflow-hidden">
              <DetectionList showPagination={false} limit={5} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;