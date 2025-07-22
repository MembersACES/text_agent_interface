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
docker build -t $IMAGE_NAME .

# Push the image to Google Container Registry
echo "📤 Pushing image to Google Container Registry..."
docker push $IMAGE_NAME

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
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "NEXTAUTH_URL=https://$SERVICE_NAME-$REGION.a.run.app" \
  --set-env-vars "NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.com" \
  --set-env-vars "GOOGLE_CLIENT_ID=your-google-client-id" \
  --set-env-vars "GOOGLE_CLIENT_SECRET=your-google-client-secret" \
  --set-env-vars "NEXTAUTH_SECRET=your-nextauth-secret"

echo "✅ Deployment completed!"
echo "🌐 Your app is available at: https://$SERVICE_NAME-$REGION.a.run.app"
echo ""
echo "📝 Important notes:"
echo "1. Update the environment variables above with your actual values"
echo "2. Make sure your Google OAuth redirect URI includes: https://$SERVICE_NAME-$REGION.a.run.app/api/auth/callback/google"
echo "3. Update your backend URL in NEXT_PUBLIC_API_BASE_URL" 