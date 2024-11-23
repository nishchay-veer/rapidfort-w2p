#!/bin/bash

# Read .env file
if [ -f .env ]; then
    export $(cat .env | sed 's/#.*//g' | xargs)
fi

# Create base64 encoded values
ACCESS_KEY=$(echo -n $AWS_ACCESS_KEY_ID | base64)
SECRET_KEY=$(echo -n $AWS_SECRET_ACCESS_KEY | base64)

# Create secrets.yaml
cat << EOF > secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  AWS_ACCESS_KEY_ID: $ACCESS_KEY
  AWS_SECRET_ACCESS_KEY: $SECRET_KEY
EOF

# Create configmap.yaml
cat << EOF > config-map.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  AWS_REGION: "$AWS_REGION"
  AWS_BUCKET_NAME: "$AWS_BUCKET_NAME"
  MONGODB_URI: "mongodb://mongodb:27017/wordtopdf"
  CONVERSION_SERVICE_URL: "http://conversion-service:3001"
  STORAGE_SERVICE_URL: "http://storage-service:3002"
  VITE_API_URL: "http://api-gateway:3000"
EOF

# Apply the configurations
kubectl apply -f secrets.yaml
kubectl apply -f config-map.yaml

# Clean up sensitive files
rm secrets.yaml