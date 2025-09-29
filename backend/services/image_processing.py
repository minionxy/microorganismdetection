import cv2
import numpy as np
from PIL import Image, ImageEnhance
import os
from pathlib import Path

class ImageProcessor:
    """
    Image processing service for microorganism detection
    Handles digital gram staining and image enhancement
    """
    
    def __init__(self):
        self.supported_formats = {'.jpg', '.jpeg', '.png', '.tiff', '.bmp'}
    
    def validate_image(self, image_path):
        """Validate if image can be processed"""
        if not os.path.exists(image_path):
            return False, "Image file not found"
        
        if Path(image_path).suffix.lower() not in self.supported_formats:
            return False, "Unsupported image format"
        
        try:
            img = cv2.imread(image_path)
            if img is None:
                return False, "Cannot read image file"
            return True, "Valid image"
        except Exception as e:
            return False, f"Error reading image: {str(e)}"
    
    def apply_gram_staining_effect(self, image_path, output_path=None):
        """
        Apply digital gram staining effect to enhance bacterial visibility
        
        Args:
            image_path (str): Path to input image
            output_path (str): Path to save processed image
            
        Returns:
            str: Path to processed image or None if failed
        """
        try:
            # Read the image
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError("Could not read image")
            
            # Create output path if not provided
            if output_path is None:
                base_name = Path(image_path).stem
                output_dir = Path(image_path).parent / 'processed'
                output_dir.mkdir(exist_ok=True)
                output_path = output_dir / f"gram_stained_{base_name}.png"
            
            # Step 1: Noise reduction
            img_denoised = cv2.fastNlMeansDenoisingColored(img, None, 10, 10, 7, 21)
            
            # Step 2: Convert to different color spaces for processing
            hsv = cv2.cvtColor(img_denoised, cv2.COLOR_BGR2HSV)
            lab = cv2.cvtColor(img_denoised, cv2.COLOR_BGR2LAB)
            
            # Step 3: Enhance contrast using CLAHE
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            lab[:, :, 0] = clahe.apply(lab[:, :, 0])
            enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
            
            # Step 4: Apply color enhancement to simulate gram staining
            result = enhanced.copy()
            
            # Enhance purple/blue regions (gram-positive bacteria)
            # Create mask for blue/purple regions
            lower_blue = np.array([100, 50, 50])
            upper_blue = np.array([130, 255, 255])
            mask_positive = cv2.inRange(hsv, lower_blue, upper_blue)
            
            # Apply purple color to gram-positive regions
            result[mask_positive > 0] = [180, 50, 200]  # Purple color
            
            # Enhance red/pink regions (gram-negative bacteria)
            lower_red1 = np.array([0, 50, 50])
            upper_red1 = np.array([10, 255, 255])
            lower_red2 = np.array([160, 50, 50])
            upper_red2 = np.array([180, 255, 255])
            
            mask_negative1 = cv2.inRange(hsv, lower_red1, upper_red1)
            mask_negative2 = cv2.inRange(hsv, lower_red2, upper_red2)
            mask_negative = cv2.bitwise_or(mask_negative1, mask_negative2)
            
            # Apply red color to gram-negative regions
            result[mask_negative > 0] = [50, 50, 255]  # Red color
            
            # Step 5: Enhance overall brightness and contrast
            result_pil = Image.fromarray(cv2.cvtColor(result, cv2.COLOR_BGR2RGB))
            
            # Enhance brightness
            brightness_enhancer = ImageEnhance.Brightness(result_pil)
            result_pil = brightness_enhancer.enhance(1.2)
            
            # Enhance contrast
            contrast_enhancer = ImageEnhance.Contrast(result_pil)
            result_pil = contrast_enhancer.enhance(1.3)
            
            # Enhance color saturation
            color_enhancer = ImageEnhance.Color(result_pil)
            result_pil = color_enhancer.enhance(1.1)
            
            # Convert back to OpenCV format and save
            final_result = cv2.cvtColor(np.array(result_pil), cv2.COLOR_RGB2BGR)
            
            # Apply final sharpening
            kernel = np.array([[-1, -1, -1],
                              [-1,  9, -1],
                              [-1, -1, -1]])
            final_result = cv2.filter2D(final_result, -1, kernel)
            
            # Save the processed image
            cv2.imwrite(str(output_path), final_result)
            
            return str(output_path)
            
        except Exception as e:
            print(f"Error in gram staining: {str(e)}")
            return None
    
    def create_side_by_side_comparison(self, original_path, processed_path, output_path):
        """
        Create side-by-side comparison of original and processed images
        
        Args:
            original_path (str): Path to original image
            processed_path (str): Path to processed image
            output_path (str): Path to save comparison image
            
        Returns:
            str: Path to comparison image or None if failed
        """
        try:
            # Read images
            original = cv2.imread(original_path)
            processed = cv2.imread(processed_path)
            
            if original is None or processed is None:
                return None
            
            # Resize images to same height
            height = min(original.shape[0], processed.shape[0])
            width_original = int(original.shape[1] * height / original.shape[0])
            width_processed = int(processed.shape[1] * height / processed.shape[0])
            
            original_resized = cv2.resize(original, (width_original, height))
            processed_resized = cv2.resize(processed, (width_processed, height))
            
            # Create comparison image
            comparison = np.hstack((original_resized, processed_resized))
            
            # Add labels
            font = cv2.FONT_HERSHEY_SIMPLEX
            cv2.putText(comparison, 'Original', (10, 30), font, 1, (255, 255, 255), 2)
            cv2.putText(comparison, 'Gram Stained', (width_original + 10, 30), font, 1, (255, 255, 255), 2)
            
            # Save comparison
            cv2.imwrite(output_path, comparison)
            return output_path
            
        except Exception as e:
            print(f"Error creating comparison: {str(e)}")
            return None
    
    def extract_image_features(self, image_path):
        """
        Extract basic features from the image for analysis
        
        Args:
            image_path (str): Path to image
            
        Returns:
            dict: Image features
        """
        try:
            img = cv2.imread(image_path)
            if img is None:
                return None
            
            # Convert to different color spaces
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            
            # Calculate basic statistics
            features = {
                'height': img.shape[0],
                'width': img.shape[1],
                'channels': img.shape[2],
                'mean_brightness': np.mean(gray),
                'std_brightness': np.std(gray),
                'mean_hue': np.mean(hsv[:, :, 0]),
                'mean_saturation': np.mean(hsv[:, :, 1]),
                'mean_value': np.mean(hsv[:, :, 2]),
                'contrast': np.std(gray),
                'sharpness': self._calculate_sharpness(gray)
            }
            
            return features
            
        except Exception as e:
            print(f"Error extracting features: {str(e)}")
            return None
    
    def _calculate_sharpness(self, gray_image):
        """Calculate image sharpness using Laplacian variance"""
        try:
            laplacian = cv2.Laplacian(gray_image, cv2.CV_64F)
            return laplacian.var()
        except:
            return 0
    
    def preprocess_for_detection(self, image_path, target_size=(640, 640)):
        """
        Preprocess image for YOLOv7 detection
        
        Args:
            image_path (str): Path to input image
            target_size (tuple): Target size for the model
            
        Returns:
            numpy.ndarray: Preprocessed image array
        """
        try:
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                return None
            
            # Convert BGR to RGB
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Resize to target size
            img_resized = cv2.resize(img_rgb, target_size)
            
            # Normalize to [0, 1]
            img_normalized = img_resized.astype(np.float32) / 255.0
            
            # Convert to CHW format (channels, height, width)
            img_chw = np.transpose(img_normalized, (2, 0, 1))
            
            # Add batch dimension
            img_batch = np.expand_dims(img_chw, axis=0)
            
            return img_batch
            
        except Exception as e:
            print(f"Error in preprocessing: {str(e)}")
            return None
    
    def create_thumbnail(self, image_path, output_path, size=(200, 200)):
        """
        Create thumbnail of the image
        
        Args:
            image_path (str): Path to input image
            output_path (str): Path to save thumbnail
            size (tuple): Thumbnail size
            
        Returns:
            str: Path to thumbnail or None if failed
        """
        try:
            with Image.open(image_path) as img:
                img.thumbnail(size, Image.Resampling.LANCZOS)
                img.save(output_path)
                return output_path
        except Exception as e:
            print(f"Error creating thumbnail: {str(e)}")
            return None