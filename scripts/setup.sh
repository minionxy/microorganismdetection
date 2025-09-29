#!/bin/bash

# Microorganism Detection Kit Setup Script
# This script sets up the entire project environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Python version
check_python_version() {
    if command_exists python3; then
        PYTHON_VERSION=$(python3 -c "import sys; print('.'.join(map(str, sys.version_info[:2])))")
        PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
        PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
        
        if [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -ge 8 ]; then
            print_success "Python $PYTHON_VERSION found"
            return 0
        else
            print_error "Python 3.8+ required, found $PYTHON_VERSION"
            return 1
        fi
    else
        print_error "Python 3 not found"
        return 1
    fi
}

# Function to check Node.js version
check_node_version() {
    if command_exists node; then
        NODE_VERSION=$(node --version | sed 's/v//')
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
        
        if [ "$NODE_MAJOR" -ge 16 ]; then
            print_success "Node.js $NODE_VERSION found"
            return 0
        else
            print_error "Node.js 16+ required, found $NODE_VERSION"
            return 1
        fi
    else
        print_error "Node.js not found"
        return 1
    fi
}

# Main setup function
main() {
    print_status "Starting Microorganism Detection Kit Setup..."
    
    # Check if we're in the project root
    if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
    
    # Check system requirements
    print_status "Checking system requirements..."
    
    if ! check_python_version; then
        print_error "Please install Python 3.8 or higher"
        exit 1
    fi
    
    if ! check_node_version; then
        print_error "Please install Node.js 16 or higher"
        exit 1
    fi
    
    # Check for required system packages
    if ! command_exists git; then
        print_error "Git is required but not installed"
        exit 1
    fi
    
    print_success "System requirements check passed"
    
    # Setup backend
    print_status "Setting up backend..."
    
    cd backend
    
    # Create virtual environment
    if [ ! -d "venv" ]; then
        print_status "Creating Python virtual environment..."
        python3 -m venv venv
        print_success "Virtual environment created"
    fi
    
    # Activate virtual environment
    print_status "Activating virtual environment..."
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install Python dependencies
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt
    print_success "Python dependencies installed"
    
    # Create environment file
    if [ ! -f ".env" ]; then
        print_status "Creating environment file..."
        cp .env.example .env
        print_success "Environment file created at backend/.env"
        print_warning "Please update the environment variables in backend/.env"
    fi
    
    # Create necessary directories
    print_status "Creating necessary directories..."
    mkdir -p uploads processed models logs
    print_success "Directories created"
    
    # Initialize database
    print_status "Initializing database..."
    python -c "
from app import app, db
with app.app_context():
    db.create_all()
    print('Database initialized successfully')
" || {
        print_error "Failed to initialize database"
        exit 1
    }
    
    print_success "Backend setup completed"
    
    # Deactivate virtual environment
    deactivate
    
    cd ..
    
    # Setup frontend
    print_status "Setting up frontend..."
    
    cd frontend
    
    # Install Node.js dependencies
    print_status "Installing Node.js dependencies..."
    npm install
    print_success "Node.js dependencies installed"
    
    # Create build directory if it doesn't exist
    mkdir -p build
    
    cd ..
    
    print_success "Frontend setup completed"
    
    # Setup ML model directory
    print_status "Setting up ML model directory..."
    
    mkdir -p ml_model/weights
    
    # Download sample model weights (placeholder)
    print_warning "Please train your YOLOv7 model using the provided Colab notebook"
    print_warning "Place the trained weights in ml_model/weights/microorganism_yolov7_best.pt"
    
    # Setup Docker environment (if Docker is available)
    if command_exists docker; then
        print_status "Docker found, setting up Docker environment..."
        
        # Create Docker network if it doesn't exist
        docker network create microorganism_network 2>/dev/null || true
        
        print_success "Docker environment prepared"
    else
        print_warning "Docker not found - skipping Docker setup"
    fi
    
    # Set permissions for scripts
    print_status "Setting up script permissions..."
    chmod +x scripts/*.sh
    
    # Create logs directory
    mkdir -p logs
    
    print_success "Setup completed successfully!"
    
    # Print next steps
    echo ""
    echo "🎉 Setup Complete! Next steps:"
    echo ""
    echo "1. Backend Development Server:"
    echo "   cd backend"
    echo "   source venv/bin/activate"
    echo "   python app.py"
    echo ""
    echo "2. Frontend Development Server (in a new terminal):"
    echo "   cd frontend"
    echo "   npm start"
    echo ""
    echo "3. Train ML Model:"
    echo "   - Open ml_model/yolov7_training.ipynb in Google Colab"
    echo "   - Follow the notebook instructions to train the model"
    echo "   - Download weights to backend/models/"
    echo ""
    echo "4. Access the application:"
    echo "   - Frontend: http://localhost:3000"
    echo "   - Backend API: http://localhost:5000"
    echo ""
    echo "5. Using Docker (alternative):"
    echo "   docker-compose up -d"
    echo ""
    echo "📋 Important files to configure:"
    echo "   - backend/.env (environment variables)"
    echo "   - backend/models/ (place your trained YOLOv7 weights here)"
    echo ""
    echo "📚 Documentation: Check the docs/ folder for detailed guides"
    echo ""
    print_success "Happy coding! 🚀"
}

# Check if script is run with --help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Microorganism Detection Kit Setup Script"
    echo ""
    echo "Usage: ./scripts/setup.sh [OPTIONS]"
    echo ""
    echo "This script will:"
    echo "  - Check system requirements"
    echo "  - Set up Python virtual environment"
    echo "  - Install backend dependencies"
    echo "  - Install frontend dependencies"
    echo "  - Initialize database"
    echo "  - Create necessary directories"
    echo "  - Set up development environment"
    echo ""
    echo "Requirements:"
    echo "  - Python 3.8+"
    echo "  - Node.js 16+"
    echo "  - Git"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo ""
    exit 0
fi

# Run main function
main "$@"