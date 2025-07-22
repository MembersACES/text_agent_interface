#!/bin/bash

# Google Cloud Run Deployment Script
# Make sure you have gcloud CLI installed and configured

# Configuration
PROJECT_ID="aces-ai"
SERVICE_NAME="acesagentinterface"
REGION="australia-southeast1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Starting deployment to Google Cloud Run..."

# Set the project
echo "📋 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Build the Docker image
echo "🔨 Building Docker image..."
if ! docker build -t $IMAGE_NAME .; then
    echo "❌ Docker build failed!"
    exit 1
fi

# Push the image to Google Container Registry
echo "📤 Pushing image to Google Container Registry..."
if ! docker push $IMAGE_NAME; then
    echo "❌ Docker push failed!"
    exit 1
fi

# Verify the image exists in the registry
echo "🔍 Verifying image in registry..."
if ! gcloud container images describe $IMAGE_NAME > /dev/null 2>&1; then
    echo "❌ Image not found in registry after push!"
    exit 1
fi

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 3000 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10

echo "✅ Deployment completed!"
echo "🌐 Your app is available at: https://$SERVICE_NAME-$REGION.a.run.app"
echo ""
echo "📝 Important notes:"
echo "1. Set up environment variables in Google Cloud Console:"
echo "   - Go to Cloud Run → $SERVICE_NAME → Edit & Deploy New Revision"
echo "   - Add environment variables in the Variables tab"
echo "2. Make sure your Google OAuth redirect URI includes: https://$SERVICE_NAME-$REGION.a.run.app/api/auth/callback/google"
echo "3. For sensitive data, consider using Google Secret Manager" 