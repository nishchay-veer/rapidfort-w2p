#!/bin/bash



set -e  

# Colors for output
GREEN='\033[0;32m'
NC='\033[0m' 


success() {
  echo -e "${GREEN}$1${NC}"
}


success "Building and starting Docker containers..."
docker-compose up --build -d


success "Checking container status..."
docker-compose ps


success "To stop and remove containers, use: \"docker-compose down\""


success "Instructions for CI/CD Pipeline with GitHub Actions:"
cat <<EOF
To build and push Docker images to Docker Hub:

1. Ensure that you have set up the following GitHub secrets in your repository:
   - DOCKER_USERNAME: Your Docker Hub username
   - DOCKER_PASSWORD: Your Docker Hub password

2. Add the provided GitHub Actions workflow to your repository:

   .github/workflows/docker-image-publish.yml:

   name: Build and Publish Docker Images

   on:
     push:
       branches: [main]
     pull_request:
       branches: [main]

   env:
     REGISTRY: docker.io
     DOCKER_USERNAME: \${{ secrets.DOCKER_USERNAME }}
     DOCKER_PASSWORD: \${{ secrets.DOCKER_PASSWORD }}
     CLIENT_IMAGE: \${{ secrets.DOCKER_USERNAME }}/word-to-pdf-client
     GATEWAY_IMAGE: \${{ secrets.DOCKER_USERNAME }}/word-to-pdf-gateway
     CONVERSION_IMAGE: \${{ secrets.DOCKER_USERNAME }}/word-to-pdf-conversion
     STORAGE_IMAGE: \${{ secrets.DOCKER_USERNAME }}/word-to-pdf-storage

   jobs:
     build-and-push:
       runs-on: ubuntu-latest

       steps:
         - name: Checkout repository
           uses: actions/checkout@v3

         - name: Set up Docker Buildx
           uses: docker/setup-buildx-action@v2

         - name: Log in to Docker Hub
           uses: docker/login-action@v2
           with:
             username: \${{ env.DOCKER_USERNAME }}
             password: \${{ env.DOCKER_PASSWORD }}

         - name: Build and push Client
           uses: docker/build-push-action@v4
           with:
             context: ./client
             push: true
             tags: |
               \${{ env.CLIENT_IMAGE }}:latest
               \${{ env.CLIENT_IMAGE }}:\${{ github.sha }}

         - name: Build and push API Gateway
           uses: docker/build-push-action@v4
           with:
             context: ./server/api-gateway
             push: true
             tags: |
               \${{ env.GATEWAY_IMAGE }}:latest
               \${{ env.GATEWAY_IMAGE }}:\${{ github.sha }}

         - name: Build and push Conversion Service
           uses: docker/build-push-action@v4
           with:
             context: ./server/conversion-service
             push: true
             tags: |
               \${{ env.CONVERSION_IMAGE }}:latest
               \${{ env.CONVERSION_IMAGE }}:\${{ github.sha }}

         - name: Build and push Storage Service
           uses: docker/build-push-action@v4
           with:
             context: ./server/storage-service
             push: true
             tags: |
               \${{ env.STORAGE_IMAGE }}:latest
               \${{ env.STORAGE_IMAGE }}:\${{ github.sha }}
EOF

success "Script execution completed successfully!"
