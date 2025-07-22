git s# Google Cloud Run Deployment Guide

This guide will help you deploy your Next.js application to Google Cloud Run.

## Prerequisites

1. **Google Cloud CLI** installed and configured
2. **Docker** installed on your machine
3. **Google Cloud Project** with billing enabled
4. **Google Cloud APIs** enabled:
   - Cloud Run API
   - Container Registry API

## Setup Instructions

### 1. Install Google Cloud CLI

```bash
# macOS
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

### 2. Authenticate and Configure

```bash
# Login to Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 3. Configure Environment Variables

Before deploying, you need to update the environment variables in `deploy.sh`:

```bash
# Edit deploy.sh and update these values:
PROJECT_ID="your-actual-project-id"
NEXT_PUBLIC_API_BASE_URL="https://your-backend-url.com"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
NEXTAUTH_SECRET="your-nextauth-secret"
```

### 4. Update Google OAuth Redirect URIs

In your Google Cloud Console:
1. Go to APIs & Services → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add this redirect URI:
   ```
   https://aces-text-agent-interface-us-central1.a.run.app/api/auth/callback/google
   ```
   (Replace `us-central1` with your chosen region)

## Deployment

### Option 1: Using the Deployment Script

```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment
./deploy.sh
```

### Option 2: Manual Deployment

```bash
# Build the Docker image
docker build -t gcr.io/YOUR_PROJECT_ID/aces-text-agent-interface .

# Push to Google Container Registry
docker push gcr.io/YOUR_PROJECT_ID/aces-text-agent-interface

# Deploy to Cloud Run
gcloud run deploy aces-text-agent-interface \
  --image gcr.io/YOUR_PROJECT_ID/aces-text-agent-interface \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "NEXTAUTH_URL=https://aces-text-agent-interface-us-central1.a.run.app" \
  --set-env-vars "NEXT_PUBLIC_API_BASE_URL=https://your-backend-url.com" \
  --set-env-vars "GOOGLE_CLIENT_ID=your-google-client-id" \
  --set-env-vars "GOOGLE_CLIENT_SECRET=your-google-client-secret" \
  --set-env-vars "NEXTAUTH_SECRET=your-nextauth-secret"
```

## Environment Variables

Make sure to set these environment variables in Cloud Run:

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `NEXTAUTH_URL` | Your app's URL | `https://aces-text-agent-interface-us-central1.a.run.app` |
| `NEXT_PUBLIC_API_BASE_URL` | Your backend API URL | `https://your-backend-url.com` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `672026052958-...` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-...` |
| `NEXTAUTH_SECRET` | NextAuth secret key | `your-random-secret` |

## Post-Deployment

### 1. Verify Deployment

Your app will be available at:
```
https://aces-text-agent-interface-us-central1.a.run.app
```

### 2. Monitor Logs

```bash
# View logs
gcloud logs tail --service=aces-text-agent-interface --region=us-central1
```

### 3. Scale Configuration

You can adjust scaling in the Google Cloud Console:
- **Min instances**: 0 (for cost optimization)
- **Max instances**: 10 (adjust based on traffic)
- **Memory**: 1Gi (increase if needed)
- **CPU**: 1 (increase for better performance)

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check that all dependencies are in `package.json`
   - Ensure Docker is running

2. **OAuth Errors**
   - Verify redirect URIs in Google Cloud Console
   - Check environment variables are set correctly

3. **API Connection Issues**
   - Ensure `NEXT_PUBLIC_API_BASE_URL` points to your backend
   - Check CORS settings on your backend

### Useful Commands

```bash
# List Cloud Run services
gcloud run services list --region=us-central1

# Update environment variables
gcloud run services update aces-text-agent-interface \
  --region=us-central1 \
  --set-env-vars "NEW_VAR=value"

# Delete service
gcloud run services delete aces-text-agent-interface --region=us-central1
```

## Cost Optimization

- Set min instances to 0 for cost savings
- Use appropriate memory/CPU allocation
- Monitor usage in Google Cloud Console
- Consider using Cloud Run's free tier (2 million requests/month)

## Security Best Practices

- Use environment variables for secrets
- Enable Cloud Run's built-in security features
- Regularly update dependencies
- Monitor for security vulnerabilities 