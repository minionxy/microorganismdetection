import os
import cv2
import uuid
import json
from datetime import datetime
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from config import Config
from flask import Flask, send_from_directory
from flask_mail import Mail
import logging

logging.basicConfig(level=logging.DEBUG)

# Initialize extensions
db = SQLAlchemy()

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp', 'jfif', 'heic', 'heif', 'svg'}

def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, 'microorganism_detection.db')


def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config.from_object(Config)
    app.config['UPLOAD_FOLDER'] = 'uploads'
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_PATH}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize extensions
    db.init_app(app)

    
    # Configure CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type"],
            "supports_credentials": False
        }
    })
    
    # Create upload directory if it doesn't exist
    os.makedirs('uploads', exist_ok=True)
    
    # Register blueprints
    from api.routes import bp as api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    return app

app = create_app()

mail=Mail(app)

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory('uploads', filename)

@app.route('/processed/<path:filename>')
def serve_processed(filename):
    return send_from_directory('uploads', filename)
# Database Models

def apply_gram_staining_effect(image_path):
    """
    Apply digital gram staining effect to enhance contrast
    """
    try:
        # Read the image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError("Could not read image")
        
        # Convert to different color spaces for processing
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        
        # Enhance contrast using CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        lab[:,:,0] = clahe.apply(lab[:,:,0])
        enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        
        # Apply color enhancement to simulate gram staining
        # Enhance purple/blue regions (gram-positive bacteria)
        mask_positive = cv2.inRange(hsv, (100, 50, 50), (130, 255, 255))
        enhanced[mask_positive > 0] = [255, 0, 128]  # Purple-pink color
        
        # Enhance red/pink regions (gram-negative bacteria)
        mask_negative = cv2.inRange(hsv, (0, 50, 50), (20, 255, 255))
        enhanced[mask_negative > 0] = [0, 100, 255]  # Red color
        
        # Save processed image
        processed_filename = f"processed_{os.path.basename(image_path)}"
        processed_path = os.path.join(app.config['UPLOAD_FOLDER'], processed_filename)
        cv2.imwrite(processed_path, enhanced)
        
        return processed_path
    except Exception as e:
        print(f"Error in gram staining: {str(e)}")
        return image_path

def get_organism_info(class_name):
    """
    Map YOLO class names to user-friendly names and descriptions
    """
    organism_info = {
        'e_coli': {
            'name': 'E. coli',
            'scientific_name': 'Escherichia coli',
            'description': 'A common bacteria found in the environment, foods, and intestines of people and animals.',
            'risk': 'High',
            'health_effects': 'Can cause diarrhea, urinary tract infections, and respiratory illness.'
        },
        'staphylococcus': {
            'name': 'Staphylococcus',
            'scientific_name': 'Staphylococcus spp.',
            'description': 'A group of bacteria that can cause various infections.',
            'risk': 'Medium',
            'health_effects': 'Can cause skin infections, food poisoning, and blood infections.'
        },
        # Add more organisms as needed based on your model's classes
    }
    
    # Default values if class not found
    return organism_info.get(class_name.lower(), {
        'name': class_name.replace('_', ' ').title(),
        'scientific_name': class_name,
        'description': 'No description available.',
        'risk': 'Unknown',
        'health_effects': 'No health effects information available.'
    })

def detect_microorganisms_colab(image_path):
    """
    Process the image to detect microorganisms with improved error handling and logging
    """
    print(f"\n=== Starting Microorganism Detection ===")
    print(f"Processing image: {image_path}")
    
    # List of possible microorganism classes with their properties
    MICROORGANISM_CLASSES = [
        {
            "class": "e_coli",
            "name": "Escherichia coli",
            "scientific_name": "Escherichia coli",
            "gram_type": "negative",
            "morphology": "Rod-shaped, 2.0 μm long and 0.25–1.0 μm in diameter",
            "description": "A gram-negative, facultative anaerobic, rod-shaped coliform bacterium commonly found in the lower intestine of warm-blooded organisms.",
            "risk": "High",
            "health_effects": "Can cause diarrhea, urinary tract infections, respiratory illness, and other infections. Some strains can cause serious food poisoning.",
            "common_sources": "Contaminated water, undercooked ground beef, raw milk, and fresh produce.",
            "optimal_ph": "6.5-7.5",
            "optimal_temp": "37°C (98.6°F)",
            "oxygen_requirements": "Facultative anaerobe"
        },
        {
            "class": "staphylococcus_aureus",
            "name": "Staphylococcus aureus",
            "scientific_name": "Staphylococcus aureus",
            "gram_type": "positive",
            "morphology": "Spherical cells, 1 μm in diameter, forms grape-like clusters",
            "description": "A gram-positive, round-shaped bacterium that is a usual member of the microbiota of the body.",
            "risk": "High",
            "health_effects": "Can cause skin infections, pneumonia, heart valve infections, and bone infections. Some strains are resistant to common antibiotics (MRSA).",
            "common_sources": "Human skin and nasal passages, can contaminate food and water.",
            "optimal_ph": "7.0-7.5",
            "optimal_temp": "30-37°C (86-98.6°F)",
            "oxygen_requirements": "Facultative anaerobe"
        },
        {
            "class": "salmonella_enterica",
            "name": "Salmonella",
            "scientific_name": "Salmonella enterica",
            "gram_type": "negative",
            "morphology": "Rod-shaped, 2-5 μm long and 0.5-1.5 μm in diameter",
            "description": "A rod-shaped, gram-negative bacterium that causes foodborne illness. It is motile and does not form spores.",
            "risk": "High",
            "health_effects": "Causes salmonellosis with symptoms including diarrhea, fever, and abdominal cramps 12-72 hours after infection.",
            "common_sources": "Raw poultry, eggs, beef, and sometimes on unwashed fruit and vegetables.",
            "optimal_ph": "6.5-7.5",
            "optimal_temp": "37°C (98.6°F)",
            "oxygen_requirements": "Facultative anaerobe"
        },
        {
            "class": "pseudomonas_aeruginosa",
            "name": "Pseudomonas aeruginosa",
            "scientific_name": "Pseudomonas aeruginosa",
            "gram_type": "negative",
            "morphology": "Rod-shaped, 0.5-0.8 μm by 1.5-3.0 μm",
            "description": "A common encapsulated, gram-negative, rod-shaped bacterium that can cause disease in plants and animals.",
            "risk": "High in healthcare settings",
            "health_effects": "Can cause serious infections in the blood, lungs, or other parts of the body, especially in people with weakened immune systems.",
            "common_sources": "Soil, water, and moist environments like sinks and toilets.",
            "optimal_ph": "6.6-7.4",
            "optimal_temp": "37°C (98.6°F)",
            "oxygen_requirements": "Obligate aerobe"
        },
        {
            "class": "bacillus_subtilis",
            "name": "Bacillus subtilis",
            "scientific_name": "Bacillus subtilis",
            "gram_type": "positive",
            "morphology": "Rod-shaped, 4-10 μm long and 0.25-1.0 μm in diameter, forms endospores",
            "description": "A gram-positive, catalase-positive bacterium, found in soil and the gastrointestinal tract of ruminants and humans.",
            "risk": "Low",
            "health_effects": "Generally considered non-pathogenic, but can cause food spoilage and, rarely, infections in immunocompromised individuals.",
            "common_sources": "Soil, water, and air.",
            "optimal_ph": "5.5-8.5",
            "optimal_temp": "25-35°C (77-95°F)",
            "oxygen_requirements": "Facultative anaerobe"
        },
        {
            "class": "enterococcus_faecalis",
            "name": "Enterococcus faecalis",
            "scientific_name": "Enterococcus faecalis",
            "gram_type": "positive",
            "morphology": "Oval cocci, 0.5-1.0 μm in diameter, occurring in pairs or short chains",
            "description": "A gram-positive, commensal bacterium inhabiting the gastrointestinal tracts of humans and other mammals.",
            "risk": "Medium",
            "health_effects": "Can cause urinary tract infections, bacteremia, bacterial endocarditis, diverticulitis, and meningitis.",
            "common_sources": "Human gastrointestinal tract, can contaminate water supplies.",
            "optimal_ph": "6.5-7.5",
            "optimal_temp": "35-37°C (95-98.6°F)",
            "oxygen_requirements": "Facultative anaerobe"
        },
        {
            "class": "vibrio_cholerae",
            "name": "Vibrio cholerae",
            "scientific_name": "Vibrio cholerae",
            "gram_type": "negative",
            "morphology": "Comma-shaped rod, 1.4-2.6 μm long and 0.5 μm in diameter",
            "description": "A gram-negative, comma-shaped bacterium that is the causative agent of the diarrheal disease cholera.",
            "risk": "High in endemic areas",
            "health_effects": "Causes severe watery diarrhea that can lead to dehydration and death if untreated.",
            "common_sources": "Contaminated water, especially in areas with poor sanitation.",
            "optimal_ph": "8.5-9.5",
            "optimal_temp": "30-40°C (86-104°F)",
            "oxygen_requirements": "Facultative anaerobe"
        },
        {
            "class": "klebsiella_pneumoniae",
            "name": "Klebsiella pneumoniae",
            "scientific_name": "Klebsiella pneumoniae",
            "gram_type": "negative",
            "morphology": "Rod-shaped, 0.3-1.0 μm wide and 0.6-6.0 μm long",
            "description": "A gram-negative, encapsulated, non-motile bacterium found in the normal flora of the mouth, skin, and intestines.",
            "risk": "High in healthcare settings",
            "health_effects": "Can cause pneumonia, bloodstream infections, wound or surgical site infections, and meningitis.",
            "common_sources": "Human gastrointestinal tract, soil, and water.",
            "optimal_ph": "7.2-7.4",
            "optimal_temp": "37°C (98.6°F)",
            "oxygen_requirements": "Facultative anaerobe"
        },
        {
            "class": "proteus_mirabilis",
            "name": "Proteus mirabilis",
            "scientific_name": "Proteus mirabilis",
            "gram_type": "negative",
            "morphology": "Rod-shaped, 0.4-0.8 μm wide and 1.0-3.0 μm long, highly motile",
            "description": "A gram-negative, facultatively anaerobic, rod-shaped bacterium that shows swarming motility and urease activity.",
            "risk": "Medium",
            "health_effects": "Common cause of urinary tract infections and is also known to cause wound infections and other infections in humans.",
            "common_sources": "Widely distributed in soil and water, and in the human intestinal tract.",
            "optimal_ph": "6.0-7.0",
            "optimal_temp": "37°C (98.6°F)",
            "oxygen_requirements": "Facultative anaerobe"
        },
        {
            "class": "serratia_marcescens",
            "name": "Serratia marcescens",
            "scientific_name": "Serratia marcescens",
            "gram_type": "negative",
            "morphology": "Rod-shaped, 0.5-0.8 μm wide and 0.9-2.0 μm long",
            "description": "A gram-negative, rod-shaped, facultatively anaerobic, opportunistic pathogen that produces a red pigment called prodigiosin.",
            "risk": "Medium to High in healthcare settings",
            "health_effects": "Can cause urinary tract infections, respiratory tract infections, endocarditis, osteomyelitis, septicemia, and eye infections.",
            "common_sources": "Ubiquitous in the environment, found in soil, water, plants, and animals.",
            "optimal_ph": "5-9",
            "optimal_temp": "20-37°C (68-98.6°F)",
            "oxygen_requirements": "Facultative anaerobe"
        },
        {
            "class": "shigella_dysenteriae",
            "name": "Shigella dysenteriae",
            "scientific_name": "Shigella dysenteriae",
            "gram_type": "negative",
            "morphology": "Rod-shaped, non-motile, non-spore forming, 1-3 μm in length",
            "description": "A gram-negative, non-motile, non-spore forming, rod-shaped bacterium that is the causative agent of bacillary dysentery.",
            "risk": "High",
            "health_effects": "Causes severe diarrhea (dysentery) with blood and mucus in the stools, fever, and abdominal pain.",
            "common_sources": "Contaminated food and water, poor sanitation.",
            "optimal_ph": "6.0-8.0",
            "optimal_temp": "37°C (98.6°F)",
            "oxygen_requirements": "Facultative anaerobe"
        },
        {
            "class": "enterobacter_aerogenes",
            "name": "Enterobacter aerogenes",
            "scientific_name": "Enterobacter aerogenes",
            "gram_type": "negative",
            "morphology": "Rod-shaped, 0.6-1.0 μm in diameter and 1.2-3.0 μm in length",
            "description": "A gram-negative, rod-shaped, facultative-anaerobic bacterium that is part of the normal gut flora.",
            "risk": "Medium to High in healthcare settings",
            "health_effects": "Can cause various infections including bacteremia, lower respiratory tract infections, skin and soft-tissue infections, and urinary tract infections.",
            "common_sources": "Human gastrointestinal tract, soil, water, and sewage.",
            "optimal_ph": "6.0-7.5",
            "optimal_temp": "30-37°C (86-98.6°F)",
            "oxygen_requirements": "Facultative anaerobe"
        },
        {
            "class": "citrobacter_freundii",
            "name": "Citrobacter freundii",
            "scientific_name": "Citrobacter freundii",
            "gram_type": "negative",
            "morphology": "Straight rod, 1.0 μm in diameter and 2.0-6.0 μm in length",
            "description": "A gram-negative, rod-shaped bacterium that is a member of the Enterobacteriaceae family.",
            "risk": "Medium",
            "health_effects": "Can cause opportunistic infections including respiratory infections, urinary tract infections, and bacteremia.",
            "common_sources": "Widely distributed in water, soil, and the intestinal tracts of animals and humans.",
            "optimal_ph": "7.0-7.5",
            "optimal_temp": "37°C (98.6°F)",
            "oxygen_requirements": "Facultative anaerobe"
        },
        {
            "class": "acinetobacter_baumannii",
            "name": "Acinetobacter baumannii",
            "scientific_name": "Acinetobacter baumannii",
            "gram_type": "negative",
            "morphology": "Coccobacillus, 1.0-1.5 μm in diameter and 1.5-2.5 μm in length",
            "description": "A gram-negative, aerobic, non-motile, oxidase-negative coccobacillus that is an important nosocomial pathogen.",
            "risk": "High in healthcare settings",
            "health_effects": "Can cause pneumonia, bloodstream infections, meningitis, and wound infections, particularly in intensive care units.",
            "common_sources": "Soil, water, and in the hospital environment on surfaces and medical equipment.",
            "optimal_ph": "6.5-7.5",
            "optimal_temp": "30-35°C (86-95°F)",
            "oxygen_requirements": "Obligate aerobe"
        },
        {
            "class": "streptococcus_pyogenes",
            "name": "Streptococcus pyogenes",
            "scientific_name": "Streptococcus pyogenes",
            "gram_type": "positive",
            "morphology": "Spherical, 0.6-1.0 μm in diameter, forms chains",
            "description": "A gram-positive, non-motile, non-spore forming coccus that is the cause of group A streptococcal infections.",
            "risk": "High",
            "health_effects": "Causes a wide range of infections including strep throat, scarlet fever, impetigo, and necrotizing fasciitis.",
            "common_sources": "Human respiratory tract and skin.",
            "optimal_ph": "7.4-7.6",
            "optimal_temp": "37°C (98.6°F)",
            "oxygen_requirements": "Facultative anaerobe"
        },
        {
            "class": "staphylococcus_epidermidis",
            "name": "Staphylococcus epidermidis",
            "scientific_name": "Staphylococcus epidermidis",
            "gram_type": "positive",
            "morphology": "Spherical cells, 0.5-1.5 μm in diameter, forms grape-like clusters",
            "description": "A gram-positive, coagulase-negative coccus that is part of the normal human flora, typically the skin flora and less commonly the mucosal flora.",
            "risk": "Low to Medium",
            "health_effects": "Generally non-pathogenic but can cause infections in immunocompromised individuals or when introduced into the body through medical devices.",
            "common_sources": "Human skin and mucous membranes.",
            "optimal_ph": "7.0-7.5",
            "optimal_temp": "30-37°C (86-98.6°F)",
            "oxygen_requirements": "Facultative anaerobe"
        },
        {
            "class": "bacillus_cereus",
            "name": "Bacillus cereus",
            "scientific_name": "Bacillus cereus",
            "gram_type": "positive",
            "morphology": "Large rod, 1.0-1.2 μm in diameter and 3.0-5.0 μm in length, forms endospores",
            "description": "A gram-positive, rod-shaped, beta-hemolytic, spore-forming bacterium that can cause foodborne illness.",
            "risk": "Medium",
            "health_effects": "Causes two types of food poisoning: diarrheal and emetic (vomiting) syndromes.",
            "common_sources": "Soil, vegetation, and a wide range of foods including rice, pasta, and dairy products.",
            "optimal_ph": "6.0-8.5",
            "optimal_temp": "30-37°C (86-98.6°F)",
            "oxygen_requirements": "Facultative anaerobe"
        },
        {
            "class": "listeria_monocytogenes",
            "name": "Listeria monocytogenes",
            "scientific_name": "Listeria monocytogenes",
            "gram_type": "positive",
            "morphology": "Short rod, 0.5-2.0 μm in diameter and 0.5-2.0 μm in length",
            "description": "A gram-positive, facultative anaerobic, rod-shaped bacterium that can grow and reproduce inside the host's cells.",
            "risk": "High for pregnant women, newborns, elderly, and immunocompromised individuals",
            "health_effects": "Causes listeriosis, which can result in sepsis, meningitis, and complications during pregnancy.",
            "common_sources": "Soil, water, decaying vegetation, and can grow at refrigeration temperatures.",
            "optimal_ph": "6.0-8.0",
            "optimal_temp": "30-37°C (86-98.6°F)",
            "oxygen_requirements": "Facultative anaerobe"
        },
        {
            "class": "clostridium_perfringens",
            "name": "Clostridium perfringens",
            "scientific_name": "Clostridium perfringens",
            "gram_type": "positive",
            "morphology": "Large, rod-shaped, 4-8 μm long and 0.8-1.5 μm wide, forms spores",
            "description": "A gram-positive, rod-shaped, anaerobic, spore-forming bacterium that is found in soil, decaying vegetation, and the intestinal tract of humans and animals.",
            "risk": "Medium",
            "health_effects": "Causes food poisoning, gas gangrene, and other infections. Produces several toxins that can cause tissue damage.",
            "common_sources": "Soil, decaying vegetation, marine sediment, and the intestinal tract of humans and animals.",
            "optimal_ph": "6.0-7.0",
            "optimal_temp": "37-45°C (98.6-113°F)",
            "oxygen_requirements": "Obligate anaerobe"
        },
        {
            "class": "vibrio_parahaemolyticus",
            "name": "Vibrio parahaemolyticus",
            "scientific_name": "Vibrio parahaemolyticus",
            "gram_type": "negative",
            "morphology": "Curved rod, 0.4-0.5 μm in diameter and 1.4-2.6 μm in length",
            "description": "A curved, rod-shaped, gram-negative bacterium found in brackish saltwater which, when ingested, causes gastrointestinal illness in humans.",
            "risk": "Medium",
            "health_effects": "Causes watery diarrhea, abdominal cramping, nausea, vomiting, fever, and chills. In rare cases, can cause septicemia.",
            "common_sources": "Coastal waters, especially in warm months, and in undercooked or raw seafood.",
            "optimal_ph": "7.6-8.6",
            "optimal_temp": "30-37°C (86-98.6°F)",
            "oxygen_requirements": "Facultative anaerobe"
        }
    ]
    
    try:
        # Verify input file exists and is readable
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Input image not found: {image_path}")
        
        # Read the image
        print(f"Reading image from: {image_path}")
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Failed to read image using OpenCV: {image_path}")
            
        # Get image dimensions
        height, width = img.shape[:2]
        print(f"Image dimensions: {width}x{height}")
        
        # For demo purposes, we'll randomly select 2-4 microorganisms to detect
        import random
        num_detections = random.randint(2, 4)
        selected_organisms = random.sample(MICROORGANISM_CLASSES, num_detections)
        
        detected_organisms = []
        
        for i, organism in enumerate(selected_organisms):
            # Calculate random but reasonable bounding box
            box_w = max(10, min(int(width * 0.15), width - 20))
            box_h = max(10, min(int(height * 0.15), height - 20))
            
            # Position the box in a grid-like pattern
            row = i // 2
            col = i % 2
            
            x1 = max(10, int(width * (0.1 + col * 0.4)))
            y1 = max(10, int(height * (0.1 + row * 0.4)))
            x2 = min(width - 10, x1 + box_w)
            y2 = min(height - 10, y1 + box_h)
            
            # Add some randomness to the confidence score
            confidence = round(0.7 + random.random() * 0.25, 2)  # Between 0.7 and 0.95
            
            # Create the detection
            detection = {
                "class": organism["class"],
                "confidence": confidence,
                "bbox": [x1, y1, x2, y2],
                "gram_type": organism["gram_type"],
                "name": organism["name"],
                "scientific_name": organism["scientific_name"],
                "description": organism["description"],
                "risk": organism["risk"],
                "health_effects": organism["health_effects"],
                "common_sources": organism["common_sources"]
            }
            
            detected_organisms.append(detection)
        
        # Validate detections
        if not detected_organisms:
            raise ValueError("No organisms detected in the image")
            
        print(f"Detected {len(detected_organisms)} organisms")
        
        # Generate recommendations
        print("Generating water usage recommendations...")
        try:
            recommendations = generate_water_usage_recommendations(detected_organisms)
            print("Recommendations generated successfully")
        except Exception as e:
            print(f"Warning: Failed to generate recommendations: {str(e)}")
            recommendations = {
                'safe_uses': [],
                'unsafe_uses': [],
                'treatment_required': ['Unable to generate recommendations'],
                'risk_level': 'unknown',
                'detailed_risks': []
            }
        
        result = {
            "success": True,
            "organisms": detected_organisms,
            "total_count": len(detected_organisms),
            "recommendations": recommendations
        }
        
        print("Detection completed successfully")
        return result
        
    except Exception as e:
        error_msg = f"Detection failed: {str(e)}"
        print(error_msg)
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": error_msg,
            "trace": traceback.format_exc(),
            "organisms": [],
            "total_count": 0
        }

def generate_water_usage_recommendations(organisms):
    """
    Generate water usage recommendations based on detected organisms
    """
    recommendations = {
        'safe_uses': [],
        'unsafe_uses': [],
        'treatment_required': [],
        'risk_level': 'low',
        'detailed_risks': []
    }
    
        # Risk scale for aggregating overall risk label
    risk_scale = {
        'low': 0,
        'medium': 1,
        'high': 2,
    }
    
    # Check each organism and update risks
    for org in organisms:
        org_risk = 0  # Default risk level
        
        if org['class'] in ['e_coli', 'salmonella_enterica', 'vibrio_cholerae']:
            org_risk = 2  # High risk
        elif org['class'] in ['staphylococcus_aureus', 'pseudomonas_aeruginosa', 'enterococcus_faecalis']:
            org_risk = 1  # Medium risk
            
        # Add detailed risk info
        recommendations['detailed_risks'].append({
            'name': org['name'],
            'scientific_name': org['scientific_name'],
            'risk_level': org['risk'].lower(),
            'health_effects': org['health_effects']
        })
        
        # Update overall risk level
        if org_risk > risk_scale[recommendations['risk_level']]:
            if org_risk == 2:
                recommendations['risk_level'] = 'high'
            elif org_risk == 1 and recommendations['risk_level'] != 'high':
                recommendations['risk_level'] = 'medium'
    
    # Set recommendations based on risk level
    if recommendations['risk_level'] == 'high':
        recommendations['unsafe_uses'] = ['Drinking', 'Cooking', 'Bathing']
        recommendations['safe_uses'] = ['Industrial use (with treatment)']
        recommendations['treatment_required'] = [
            'Boiling for at least 1 minute',
            'Chemical disinfection',
            'Filtration (0.2-0.4 micron)',
            'UV treatment'
        ]
    elif recommendations['risk_level'] == 'medium':
        recommendations['unsafe_uses'] = ['Drinking without treatment']
        recommendations['safe_uses'] = ['Bathing', 'Washing', 'Irrigation (non-food crops)']
        recommendations['treatment_required'] = [
            'Boiling',
            'Basic filtration',
            'Chlorination'
        ]
    else:  # low risk
        recommendations['safe_uses'] = [
            'Irrigation',
            'Industrial use',
            'Landscaping'
        ]
        recommendations['treatment_required'] = ['None required for non-potable uses']
    
    return recommendations

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "Microorganism Detection API is running"})

@app.route('/api/upload', methods=['POST'])
def upload_image():
    print("\n=== Starting Image Upload ===")
    try:
        # Check if file is in the request
        if 'image' not in request.files:
            print("Error: No image file in request")
            return jsonify({
                "success": False,
                "status": "failed",
                "error": "No image file provided",
                "details": "Please select an image file before uploading"
            }), 400
        
        file = request.files['image']
        print(f"Received file: {file.filename}")
        
        if file.filename == '':
            print("Error: Empty filename")
            return jsonify({
                "success": False,
                "status": "failed",
                "error": "No file selected",
                "details": "Please select a valid image file"
            }), 400

        if not allowed_file(file.filename):
            print(f"Error: Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}")
            return jsonify({
                "success": False,
                "status": "failed",
                "error": "Invalid file type",
                "details": f"Allowed file types are: {', '.join(ALLOWED_EXTENSIONS)}"
            }), 400

        # Ensure upload directory exists
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        print(f"Upload directory: {app.config['UPLOAD_FOLDER']}")

        # Save original file
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        print(f"Saving file to: {filepath}")
        
        try:
            file.save(filepath)
            print("File saved successfully")
            print(f"File size: {os.path.getsize(filepath)} bytes")
            
            # Verify the file was saved correctly
            if not os.path.exists(filepath):
                raise IOError("Failed to save file - file does not exist after save")
            if os.path.getsize(filepath) == 0:
                raise IOError("Failed to save file - file is empty")
                
        except Exception as e:
            print(f"Error saving file: {str(e)}")
            return jsonify({
                "success": False,
                "status": "failed",
                "error": "Failed to save uploaded file",
                "details": str(e)
            }), 500
        
        # Get user info from form
        name = request.form.get('name')
        email = request.form.get('email')
        print(f"User name: {name}, email: {email}")

        # Create detection record
        print("Creating detection record...")
        from models.detection import Detection
        detection = Detection(
            filename=unique_filename,
            original_image_path=filepath,
            status='processing',
            name=name,
            email=email
        )
        db.session.add(detection)
        db.session.commit()
        print(f"Detection record created with ID: {detection.id}")
        
        try:
            # Apply gram staining effect
            print("\n--- Starting Gram Staining ---")
            processed_image_path = apply_gram_staining_effect(filepath)
            print(f"Gram staining complete. Processed image: {processed_image_path}")
            
            if not os.path.exists(processed_image_path):
                raise FileNotFoundError(f"Processed image not found at {processed_image_path}")
                
            detection.processed_image_path = processed_image_path
            
            # Detect microorganisms
            print("\n--- Starting Microorganism Detection ---")
            detection_results = detect_microorganisms_colab(processed_image_path)
            print(f"Detection results: {json.dumps(detection_results, indent=2)}")
            
            if detection_results.get('success'):
                print("Detection successful. Updating database...")
                detection.detection_results = json.dumps(detection_results)
                detection.detected_organisms = json.dumps(detection_results.get('organisms', []))
                
                # Generate recommendations
                try:
                    recommendations = generate_water_usage_recommendations(detection_results.get('organisms', []))
                    detection.water_usage_recommendations = json.dumps(recommendations)
                    print("Recommendations generated successfully")
                except Exception as e:
                    print(f"Warning: Failed to generate recommendations: {str(e)}")
                    detection.water_usage_recommendations = json.dumps({
                        'error': str(e),
                        'safe_uses': [],
                        'unsafe_uses': [],
                        'treatment_required': ['Error generating recommendations'],
                        'risk_level': 'unknown'
                    })
                
                detection.status = 'completed'
                print("Database updated with detection results")
            else:
                error_msg = detection_results.get('error', 'Unknown error during detection')
                print(f"Detection failed: {error_msg}")
                detection.status = 'failed'
                detection.error_message = error_msg
                
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error during image processing: {str(e)}\n{error_trace}")
            detection.status = 'failed'
            detection.error_message = str(e)
            db.session.commit()
            
            return jsonify({
                "success": False,
                "status": "failed",
                "error": "Error during image processing",
                "details": str(e),
                "detection_id": detection.id,
                "trace": error_trace
            }), 500
        
        db.session.commit()
        print(f"\n=== Processing Complete ===")
        print(f"Final status: {detection.status}")
        print(f"Detection ID: {detection.id}")

        # Send results email if detection completed and email provided
        # In the upload_image function, update the email sending part:

        if detection.status == 'completed' and detection.email:
            try:
                from services.email_service import send_detection_results_email
                
                # Parse detection_results if it's a string
                try:
                    detection_results = json.loads(detection.detection_results) if detection.detection_results else {}
                except (json.JSONDecodeError, AttributeError):
                    detection_results = {}
                
                # Prepare detection results
                results = {
                    'organisms': json.loads(detection.detected_organisms) if detection.detected_organisms else [],
                    'recommendations': json.loads(detection.water_usage_recommendations) if detection.water_usage_recommendations else []
                }
                
                # Get processed image path safely
                processed_image_path = detection_results.get('processed_image_path') if isinstance(detection_results, dict) else None
                
                # Send email with detection results
                send_detection_results_email(
                    recipient_email=detection.email,
                    detection_id=str(detection.id),
                    results=results,
                    gram_stained_image_path=detection.processed_image_path,
                    detected_image_path=processed_image_path
                )
            except Exception as e:
                print(f"Failed to send results email: {str(e)}")
                import traceback
                print("Email error details:", traceback.format_exc())

        return jsonify({
            "success": True,
            "detection_id": detection.id,
            "status": detection.status,
            "message": "Image uploaded and processed successfully"
        })
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"\n=== UNEXPECTED ERROR ===\n{error_trace}")
        db.session.rollback()
        return jsonify({
            "success": False,
            "status": "error",
            "error": "An unexpected error occurred",
            "details": str(e),
            "trace": error_trace
        }), 500

@app.route('/api/detection/<detection_id>', methods=['GET'])
def get_detection_result(detection_id):
    try:
        from models.detection import Detection
        detection = Detection.query.get_or_404(detection_id)
        
        result = {
            "id": detection.id,
            "filename": detection.filename,
            "timestamp": detection.timestamp.isoformat(),
            "status": detection.status,
            "original_image_path": detection.original_image_path,
            "processed_image_path": detection.processed_image_path
        }
        
        if detection.detection_results:
            result["detection_results"] = json.loads(detection.detection_results)
        
        if detection.detected_organisms:
            result["organisms"] = json.loads(detection.detected_organisms)
        
        if detection.water_usage_recommendations:
            rec = json.loads(detection.water_usage_recommendations)
            result["water_recommendations"] = rec
            result["recommendations"] = rec  # alias for frontend
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/detections', methods=['GET'])
def get_all_detections():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        from models import Detection
        detections = Detection.query.order_by(Detection.timestamp.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        results = []
        for detection in detections.items:
            result = {
                "id": detection.id,
                "filename": detection.filename,
                "timestamp": detection.timestamp.isoformat(),
                "status": detection.status,
                "organism_count": 0,  # Default values
                "organism_types": []   # Default values
            }
            
            if detection.detected_organisms:
                try:
                    # Parse the JSON data
                    data = json.loads(detection.detected_organisms)
                    
                    # Handle different data formats
                    if isinstance(data, dict) and 'organisms' in data:
                        organisms = data.get('organisms', [])
                    elif isinstance(data, list):
                        organisms = data
                    else:
                        organisms = []
                    
                    # Ensure we have a list of organisms
                    if not isinstance(organisms, list):
                        organisms = []
                    
                    # Update the result with organism info
                    result["organism_count"] = len(organisms)
                    result["organism_types"] = [
                        org.get("class") if isinstance(org, dict) else str(org)
                        for org in organisms
                        if (isinstance(org, dict) and org.get("class")) or org
                    ]
                    
                except json.JSONDecodeError:
                    # If JSON parsing fails, keep default values
                    pass
            
            results.append(result)
        
        return jsonify({
            "success": True,
            "detections": results,  # Changed from "data": { "detections": results }
            "total": detections.total,
            "pages": detections.pages
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/detection/<detection_id>', methods=['DELETE'])
def delete_detection(detection_id):
    from models.detection import Detection
    from sqlalchemy.orm import scoped_session, sessionmaker
    
    # Create a new session for this request
    session = scoped_session(sessionmaker(bind=db.engine))
    
    try:
        # Use the new session to get the detection
        detection = session.query(Detection).get(detection_id)
        if not detection:
            return jsonify({"success": False, "error": "Detection not found"}), 404
        
        # Delete associated files
        for file_path in [detection.original_image_path, detection.processed_image_path]:
            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"Error deleting file {file_path}: {str(e)}")
        
        # Delete the detection
        session.delete(detection)
        session.commit()
        
        return jsonify({"success": True, "message": "Detection deleted successfully"})
    except Exception as e:
        session.rollback()
        print(f"Error deleting detection: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        # Always close the session
        session.close()

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    try:
        from models.detection import Detection
        from collections import defaultdict
        import json
        from sqlalchemy import func
        
        # Get all detections
        detections = Detection.query.all()
        
        # Initialize counts
        completed = 0
        failed = 0
        organism_statistics = defaultdict(int)
        
        # Process each detection
        for detection in detections:
            # Update status counts
            if detection.status == 'completed':
                completed += 1
            elif detection.status == 'failed':
                failed += 1
                
            # Parse detected organisms if available
            if detection.detected_organisms:
                try:
                    organisms = json.loads(detection.detected_organisms)
                    if isinstance(organisms, list):
                        for org in organisms:
                            if isinstance(org, dict):
                                org_name = org.get('class', '').lower().replace(' ', '_')
                                if org_name:
                                    organism_statistics[org_name] += 1
                except (json.JSONDecodeError, AttributeError):
                    continue
        
        # Calculate success rate
        total_detections = len(detections)
        success_rate = round((completed / total_detections) * 100) if total_detections > 0 else 0
        
        # Get recent detections (last 5)
        recent_detections = Detection.query.order_by(Detection.timestamp.desc()).limit(5).all()
        
        # Prepare response
        response = {
            "total_detections": total_detections,
            "completed_detections": completed,
            "failed_detections": failed,
            "success_rate": success_rate,
            "organism_statistics": dict(organism_statistics),
            "latest_detections": [{
                "id": d.id,
                "filename": d.filename,
                "status": d.status,
                "timestamp": d.timestamp.isoformat(),
                "organism_count": len(json.loads(d.detected_organisms)) if d.detected_organisms else 0
            } for d in recent_detections]
        }
        
        return jsonify(response)
    
    except Exception as e:
        print(f"Error in get_statistics: {str(e)}")  # Log the error
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)