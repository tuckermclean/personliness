#!/bin/bash

# Start script for Personliness application

echo "Starting Personliness application..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please edit .env file to set your configuration, especially:"
    echo "  - OPENAI_API_KEY (required for figure ingestion)"
    echo "  - ADMIN_API_KEY (set a secure key)"
    echo "  - DJANGO_SECRET_KEY (generate a secure key)"
    echo ""
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start containers
echo "Building and starting Docker containers..."
docker-compose up --build

# The application will be available at:
# - API: http://localhost:8000
# - Admin: http://localhost:8000/admin
#
# Default admin credentials (if CREATE_SUPERUSER=true):
# - Username: admin
# - Password: admin
