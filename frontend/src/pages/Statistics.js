import React from 'react';

const Statistics = ({ statistics }) => {
  const {
    total_detections,
    completed_detections,
    failed_detections,
    processing_detections,
    organism_statistics,
    latest_detections,
    success_rate
  } = statistics;

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Detection Statistics</h1>

      {/* High-level numbers */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-gray-500 text-sm">Total Detections</p>
          <p className="text-2xl font-semibold">{total_detections}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-gray-500 text-sm">Completed</p>
          <p className="text-2xl font-semibold text-green-600">{completed_detections}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-gray-500 text-sm">Failed</p>
          <p className="text-2xl font-semibold text-red-600">{failed_detections}</p>
        </div>
      </div>

      {/* Optional Processing count if present */}
      {processing_detections > 0 && (
        <div className="mt-6 bg-white shadow rounded-lg p-4 text-center">
          <p className="text-gray-500 text-sm">Processing</p>
          <p className="text-2xl font-semibold text-yellow-600">
            {processing_detections}
          </p>
        </div>
      )}

      {/* Success rate */}
      <div className="mt-6 bg-white shadow rounded-lg p-4 text-center">
        <p className="text-gray-500 text-sm">Success Rate</p>
        <p className="text-2xl font-semibold text-blue-600">{success_rate}%</p>
      </div>

      {/* Organism statistics table */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Organism Statistics</h2>
        {organism_statistics && Object.keys(organism_statistics).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 bg-white shadow rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Organism
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Count
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.entries(organism_statistics).map(([name, count]) => (
                  <tr key={name}>
                    <td className="px-4 py-2 text-gray-800">{name}</td>
                    <td className="px-4 py-2 text-gray-800">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No organism data available.</p>
        )}
      </div>

      {/* Latest detections */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Latest Detections</h2>
        {latest_detections && latest_detections.length > 0 ? (
          <ul className="space-y-4">
            {latest_detections.map((item, idx) => (
              <li
                key={idx}
                className="bg-white p-4 shadow rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-gray-800">{item.filename}</p>
                  <p className="text-sm text-gray-500">
                    Status: {item.status} • {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
                {item.detected_organisms && (
                  <p className="mt-2 sm:mt-0 text-sm text-gray-600">
                    Organisms:{" "}
                    {item.detected_organisms
                      .map((o) => o.name || o)
                      .join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No recent detections.</p>
        )}
      </div>
    </div>
  );
};

export default Statistics;
