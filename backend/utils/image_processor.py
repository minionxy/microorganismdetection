import cv2
import numpy as np
import os

def apply_gram_staining(input_path, output_path):
    """
    Apply a simple gram staining effect to the input image
    """
    try:
        # Read the image
        img = cv2.imread(input_path)
        if img is None:
            raise ValueError("Could not read the image")
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply adaptive thresholding to enhance cell boundaries
        thresh = cv2.adaptiveThreshold(
            gray, 255, 
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 11, 2
        )
        
        # Create a purple (gram-positive) and red (gram-negative) mask
        purple_mask = np.zeros_like(img)
        purple_mask[thresh > 0] = (255, 0, 255)  # Purple color (BGR)
        
        red_mask = np.zeros_like(img)
        red_mask[thresh > 0] = (0, 0, 255)  # Red color (BGR)
        
        # Combine with original image
        alpha = 0.6  # Transparency factor
        beta = 1 - alpha
        gram_stained = cv2.addWeighted(img, alpha, purple_mask, beta, 0.0)
        
        # Save the processed image
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        cv2.imwrite(output_path, gram_stained)
        
        return True, "Processing completed successfully"
        
    except Exception as e:
        return False, str(e)