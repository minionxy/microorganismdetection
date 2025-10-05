import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Button, Typography, Paper, CircularProgress, TextField, FormControlLabel, Checkbox } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios from 'axios';

const UploadDropZone = ({ onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [email, setEmail] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [emailError, setEmailError] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      handleUpload(acceptedFiles[0]);
    }
  }, [email, sendEmail]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.tiff', '.webp']
    },
    multiple: false,
    disabled: isUploading
  });

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    setSendEmail(checked);
    if (checked && email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleUpload = async (file) => {
    if (sendEmail && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('image', file);
    
    if (sendEmail && email) {
      formData.append('email', email);
    }

    try {
      const response = await axios.post('http://localhost:5000/api/detect', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (onUploadComplete) {
        onUploadComplete(response.data);
      }
      
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error processing your image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto', my: 4 }}>
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          textAlign: 'center',
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: isUploading ? 'progress' : 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <Box sx={{ p: 4 }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ mt: 2 }}>Processing your image...</Typography>
          </Box>
        ) : (
          <Box>
            <CloudUploadIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop the image here' : 'Drag & drop an image here, or click to select'}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Supported formats: JPG, PNG, GIF, BMP, TIFF, WEBP
            </Typography>
            <Button variant="contained" color="primary" sx={{ mt: 1 }}>
              Select Image
            </Button>
          </Box>
        )}
      </Paper>
      
      <Box sx={{ mt: 3, p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={sendEmail}
              onChange={handleCheckboxChange}
              color="primary"
            />
          }
          label="Email me the detection results"
          sx={{ mb: 2, display: 'block' }}
        />
        
        {sendEmail && (
          <TextField
            fullWidth
            label="Email Address"
            variant="outlined"
            value={email}
            onChange={handleEmailChange}
            error={!!emailError}
            helperText={emailError}
            placeholder="your.email@example.com"
            size="small"
            sx={{ mt: 1 }}
          />
        )}
        
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2, fontSize: '0.8rem' }}>
          {sendEmail 
            ? 'A detailed report will be sent to your email once processing is complete.'
            : 'Check the box above if you want to receive the detection results via email.'}
          
        </Typography>
      </Box>
    </Box>
  );
};

export default UploadDropZone;