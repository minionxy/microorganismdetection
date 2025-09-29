import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader,
  Microscope,
  Droplets,
  Beaker,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiImage } from 'react-icons/fi';

const ResultsPage = () => {
  const { detectionId, id } = useParams();
  const effectiveId = detectionId || id;

  const [detection, setDetection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [originalImage, setOriginalImage] = useState('');
  const [processedImage, setProcessedImage] = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    if (!effectiveId) return;

    // Initial fetch
    fetchDetectionResult(false);

    // Start polling; stop when status resolves
    pollRef.current = setInterval(() => {
      fetchDetectionResult(true);
    }, 3000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [effectiveId]);

  const fetchDetectionResult = async (isPoll = false) => {
    try {
      const res = await axios.get(`/api/detection/${effectiveId}`);
      const data = res.data;
      setDetection(data);

      if (data.status === 'completed') {
        // Update image URLs
        if (data.original_image_path) {
          const originalPath = data.original_image_path.startsWith('http')
            ? data.original_image_path
            : `http://localhost:5000/${data.original_image_path.replace(/^\/+/, '')}`;
          setOriginalImage(originalPath);
        }
        
        if (data.processed_image_path) {
          const processedPath = data.processed_image_path.startsWith('http')
            ? data.processed_image_path
            : `http://localhost:5000/${data.processed_image_path.replace(/^\/+/, '')}`;
          setProcessedImage(processedPath);
        }

        // Stop polling
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch (err) {
      console.error('Error fetching detection result:', err);
      toast.error('Failed to load detection results');
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } finally {
      if (!isPoll) setLoading(false);
    }
  };

  const riskChipClasses = (risk) => {
    if (!risk) return 'bg-gray-100 text-gray-800';
    if (risk.toLowerCase() === 'high') return 'bg-red-100 text-red-800';
    if (risk.toLowerCase() === 'medium') return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading detection results...</p>
        </div>
      </div>
    );
  }

  if (!detection) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Detection Not Found</h2>
        <p className="text-gray-600 mb-6">
          The requested detection result could not be found.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Detection Results</h1>
          <p className="text-gray-600">
            Analysis of {detection.filename} • {new Date(detection.timestamp).toLocaleString()}
          </p>
        </div>

        {detection.status === 'processing' && (
          <div className="flex items-center space-x-2 text-yellow-600">
            <Loader className="h-5 w-5 animate-spin" />
            <span>Processing...</span>
          </div>
        )}
      </div>

      {/* Processing notice */}
      {detection.status === 'processing' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <Loader className="h-6 w-6 text-yellow-600 animate-spin" />
            <div>
              <h3 className="text-lg font-medium text-yellow-900">Analysis in Progress</h3>
              <p className="text-yellow-800">
                Your image is being processed with digital gram staining and YOLOv7 detection. 
                Results will appear automatically when complete.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Failure notice */}
      {detection.status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <XCircle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="text-lg font-medium text-red-900">Analysis Failed</h3>
              <p className="text-red-800">
                There was an error processing your image. Please try uploading again or contact support.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {detection.status === 'completed' && (
        <div className="space-y-8">
          {/* Image Analysis */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              <span className="inline-flex items-center gap-2">
                <Microscope className="h-6 w-6 text-gray-700" />
                Image Analysis
              </span>
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original Image */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Original Image</h3>
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  {originalImage ? (
                    <div className="relative">
                      <img 
                        src={originalImage} 
                        alt="Original microscopic image" 
                        className="w-full h-auto max-h-[500px] object-contain p-2"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/placeholder-image.jpg';
                        }}
                      />
                      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        {detection.filename || 'original.jpg'}
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                      <FiImage className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>Original image not available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Processed Image */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">Processed Image</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Gram Stained
                  </span>
                </div>
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  {processedImage ? (
                    <div className="relative">
                      <img 
                        src={processedImage} 
                        alt="Processed microscopic image with gram staining" 
                        className="w-full h-auto max-h-[500px] object-contain p-2"
                        onError={(e) => {
                          if (e.target.src !== '') {
                            e.target.style.display = 'none';
                          }
                        }}
                      />
                      {detection.organisms?.length > 0 && (
                        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                          {detection.organisms.length} organism{detection.organisms.length !== 1 ? 's' : ''} detected
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <FiImage className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>Processed image not available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Detected Microorganisms */}
          {detection.organisms && detection.organisms.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Microscope className="h-5 w-5 text-gray-700" />
                Detected Microorganisms
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {detection.organisms.map((organism, idx) => (
                  <div key={idx} className="bg-white rounded-lg shadow-md overflow-hidden border-l-4 border-blue-500">
                    <div className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">
                            {organism.name || organism.class}
                          </h3>
                          <p className="text-sm text-gray-500">{organism.scientific_name}</p>

                          {organism.gram_type && (
                            <span
                              className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                organism.gram_type?.toLowerCase() === 'positive'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-pink-50 text-pink-700 border-pink-200'
                              }`}
                            >
                              {`Gram ${organism.gram_type}`}
                            </span>
                          )}
                        </div>

                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${riskChipClasses(organism.risk)}`}>
                          {organism.risk || 'Unknown'} Risk
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700">Confidence</h4>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{ width: `${(organism.confidence * 100).toFixed(0)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {organism.confidence ? `${(organism.confidence * 100).toFixed(1)}% confidence` : 'Confidence not available'}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-700">Description</h4>
                          <p className="text-sm text-gray-600">
                            {organism.description || 'No description available'}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-700">Health Effects</h4>
                          <p className="text-sm text-gray-600">
                            {organism.health_effects || 'No health effects information available'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Water Quality Assessment */}
          {detection.recommendations && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-gray-700" />
                  Water Quality Assessment
                </h2>

                {/* Risk banner */}
                <div
                  className={`mb-6 rounded-lg border p-4 flex items-start gap-3 ${
                    detection.recommendations.risk_level === 'high'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : detection.recommendations.risk_level === 'medium'
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                      : 'bg-green-50 border-green-200 text-green-800'
                    }`}
                >
                  {detection.recommendations.risk_level === 'high' ? (
                    <XCircle className="h-5 w-5 mt-0.5" />
                  ) : detection.recommendations.risk_level === 'medium' ? (
                    <AlertTriangle className="h-5 w-5 mt-0.5" />
                  ) : (
                    <CheckCircle className="h-5 w-5 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">
                      {detection.recommendations.risk_level === 'high'
                        ? 'High Risk Level'
                        : detection.recommendations.risk_level === 'medium'
                        ? 'Moderate Risk Level'
                        : 'Low Risk Level'}
                    </p>
                    <p className="text-sm opacity-90">
                      Based on detected microorganisms and their potential health impact
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Safe Uses */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-medium text-green-800 mb-2 flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Safe Uses
                    </h3>
                    <ul className="space-y-1">
                      {detection.recommendations.safe_uses && detection.recommendations.safe_uses.length > 0 ? (
                        detection.recommendations.safe_uses.map((use, i) => (
                          <li key={i} className="text-sm text-green-700">• {use}</li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-500">No specific safe uses identified</li>
                      )}
                    </ul>
                  </div>

                  {/* Unsafe Uses */}
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="font-medium text-red-800 mb-2 flex items-center">
                      <XCircle className="h-5 w-5 mr-2" />
                      Unsafe Uses
                    </h3>
                    <ul className="space-y-1">
                      {detection.recommendations.unsafe_uses && detection.recommendations.unsafe_uses.length > 0 ? (
                        detection.recommendations.unsafe_uses.map((use, i) => (
                          <li key={i} className="text-sm text-red-700">• {use}</li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-500">No significant restrictions</li>
                      )}
                    </ul>
                  </div>

                  {/* Treatment Required */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-800 mb-2 flex items-center">
                      <Beaker className="h-5 w-5 mr-2" />
                      Recommended Treatment
                    </h3>
                    <ul className="space-y-1">
                      {detection.recommendations.treatment_required && detection.recommendations.treatment_required.length > 0 ? (
                        detection.recommendations.treatment_required.map((t, i) => (
                          <li key={i} className="text-sm text-blue-700">• {t}</li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-500">No specific treatment required</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No organisms fallback */}
          {(!detection.organisms || detection.organisms.length === 0) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-green-900 mb-2">
                  No Harmful Microorganisms Detected
                </h3>
                <p className="text-green-800">
                  The sample appears free of detectable pathogenic microorganisms. Consider more testing for comprehensive analysis.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResultsPage;