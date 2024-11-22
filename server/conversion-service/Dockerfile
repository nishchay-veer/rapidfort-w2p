# Use official Node image
FROM node:18-alpine

# Install system dependencies for PDF conversion
RUN apk add --no-cache \
    libreoffice \
    poppler-utils

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start the service
CMD ["npm", "start"]