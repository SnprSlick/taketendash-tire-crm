#!/bin/bash

# TakeTenDash Server Startup Script for macOS
# This script handles Docker installation and starts the full stack

set -e  # Exit on any error

# Add Docker to PATH if it exists
if [ -d "/Applications/Docker.app/Contents/Resources/bin" ]; then
    export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
fi

echo "🚀 Starting TakeTenDash Server..."

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

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."

    if command -v docker &> /dev/null; then
        print_success "Docker is installed"

        # Check if Docker daemon is running
        if docker info &> /dev/null; then
            print_success "Docker daemon is running"
            return 0
        else
            print_warning "Docker is installed but daemon is not running"
            print_status "Starting Docker Desktop..."
            open -a Docker

            # Wait for Docker to start
            print_status "Waiting for Docker to start..."
            for i in {1..30}; do
                if docker info &> /dev/null; then
                    print_success "Docker is now running"
                    return 0
                fi
                echo -n "."
                sleep 2
            done

            print_error "Docker failed to start within 60 seconds"
            return 1
        fi
    else
        print_error "Docker is not installed"
        return 1
    fi
}

# Install Docker if not present
install_docker() {
    print_status "Docker is not installed. Installing Docker Desktop..."

    # Check if Homebrew is available
    if command -v brew &> /dev/null; then
        print_status "Installing Docker Desktop via Homebrew..."
        brew install --cask docker
    else
        print_warning "Homebrew not found. Please install Docker Desktop manually from https://docker.com/products/docker-desktop"
        print_status "Opening Docker download page..."
        open "https://desktop.docker.com/mac/main/amd64/Docker.dmg"
        echo ""
        print_warning "Please install Docker Desktop and run this script again."
        exit 1
    fi

    print_success "Docker Desktop installed. Please start Docker Desktop and run this script again."
    open -a Docker
    exit 1
}

# Check if .env file exists
check_env_file() {
    print_status "Checking environment configuration..."

    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from .env.example..."
        cp .env.example .env
        print_success "Created .env file from template"
        print_warning "Please review and update the .env file with your configuration"
    else
        print_success ".env file found"
    fi
}

# Stop any existing containers
cleanup_containers() {
    print_status "Cleaning up existing containers..."

    # Stop and remove containers if they exist
    docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true

    print_success "Cleanup complete"
}

# Start the application
start_application() {
    print_status "Starting TakeTenDash application stack..."

    # Build and start containers
    docker-compose -f docker-compose.dev.yml up --build -d

    print_success "Application stack started successfully!"
    echo ""
    print_status "Services are starting up. This may take a few moments..."
    echo ""
    print_status "You can access:"
    echo "  • Frontend: http://localhost:3000"
    echo "  • Backend API: http://localhost:3001"
    echo "  • GraphQL Playground: http://localhost:3001/graphql"
    echo ""
    print_status "To view logs: docker-compose -f docker-compose.dev.yml logs -f"
    print_status "To stop: docker-compose -f docker-compose.dev.yml down"
}

# Main execution
main() {
    echo ""
    print_status "TakeTenDash Server Startup Script"
    print_status "================================="
    echo ""

    # Check if we're in the right directory
    if [ ! -f "docker-compose.dev.yml" ]; then
        print_error "docker-compose.dev.yml not found. Please run this script from the project root."
        exit 1
    fi

    # Check Docker installation and start if needed
    if ! check_docker; then
        install_docker
    fi

    # Check environment configuration
    check_env_file

    # Cleanup any existing containers
    cleanup_containers

    # Start the application
    start_application

    echo ""
    print_success "TakeTenDash is now running!"
    echo ""
}

# Run main function
main "$@"