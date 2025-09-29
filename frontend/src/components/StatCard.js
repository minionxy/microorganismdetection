// components/StatCard.js
import React from 'react';

const StatCard = ({ icon, title, value }) => (
  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
    <div className="flex items-center">
      <div className="p-3 rounded-full bg-blue-50 text-blue-600">
        {icon}
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

export default StatCard;