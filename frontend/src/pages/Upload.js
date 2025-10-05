
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiX, FiImage } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';



const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [nameError, setNameError] = useState('');
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
    setNameError(e.target.value.trim() ? '' : 'Name is required');
  };
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setEmailError(validateEmail(e.target.value) ? '' : 'Please enter a valid email address');
  };

  const onDrop = useCallback((acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        toast.error('Please upload an image file (JPEG, PNG, etc.)');
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size should be less than 5MB');
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.tiff', '.bmp']
    },
    maxFiles: 1,
    multiple: false
  });

  const removeFile = () => {
    setFile(null);
    setPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select an image to upload');
      return;
    }
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('name', name);
    formData.append('email', email);

    try {
      setIsUploading(true);
      const response = await axios.post('http://localhost:5000/api/upload', formData);
      if (response.data && response.data.detection_id) {
        toast.success('Image uploaded successfully! Processing your sample...');
        navigate(`/results/${response.data.detection_id}`);
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (error) {
      let errorMessage = 'Failed to upload image. Please try again.';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.response) {
        if (error.response.status === 413) {
          errorMessage = 'File is too large. Maximum size is 5MB.';
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      }
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="pt-20 pb-10 px-4 sm:px-6 lg:px-8">
  {/* EmailModal removed: modal is no longer used, email is collected in the form above */}
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Water Sample</h1>
          <p className="text-gray-600">
            Upload an image of your water sample to analyze for microorganisms and assess water quality.
          </p>
        </div>


        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* User Info Section */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Information</h2>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={handleNameChange}
                className={`w-full px-3 py-2 border ${nameError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                placeholder="Your Name"
                required
              />
              {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
            </div>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={handleEmailChange}
                className={`w-full px-3 py-2 border ${emailError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                placeholder="your.email@example.com"
                required
              />
              {emailError && <p className="mt-1 text-sm text-red-600">{emailError}</p>}
            </div>
          </div>

          {/* Upload Section */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload Image</h2>
            {!file ? (
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="p-3 bg-indigo-100 rounded-full">
                    <FiUpload className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      {isDragActive 
                        ? 'Drop the image here...' 
                        : 'Drag & drop an image here, or click to select'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Supports: JPG, PNG, WEBP (Max 5MB)
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <FiImage className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB • {file.type.split('/')[1].toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeFile}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Remove file"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Preview Section */}
          {preview && (
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-800 mb-4">Preview</h2>
              <div className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center p-4">
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="max-h-64 max-w-full object-contain rounded"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="px-6 py-4 bg-white border-t border-gray-200 text-right">
            <button
              onClick={handleSubmit}
              disabled={!file || isUploading}
              className={`inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white ${
                !file || isUploading
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors`}
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <FiUpload className="-ml-1 mr-2 h-5 w-5" />
                  Analyze Water Sample
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;