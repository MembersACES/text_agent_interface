# ACES Text Agent Interface & Backend

This repository contains the frontend for the ACES Text Agent Interface, an ACES dashboard designed to interact with a secure FastAPI backend. This document provides detailed instructions on how to set up, run, and test both the frontend and backend projects.

## Overview

The project consists of two main parts:

1.  **Frontend (This Project):** An ACES application providing a user interface for:
    *   Viewing detailed business information.
    *   Retrieving utility invoices (Electricity, Gas, Waste, Oil).
    *   Initiating templated data requests to suppliers.
    *   Uploading and filing documents directly to Google Drive.
2.  **Backend (`text_agent_backend`):** A secure FastAPI server that:
    *   Handles all business logic and data retrieval.
    *   Protects endpoints with Google OAuth authentication.
    *   Interfaces with n8n webhooks to connect to Google Sheets, Google Drive, and email services.

---

## Getting Started

Follow these steps to get both the backend and frontend development environments up and running.

### Prerequisites

*   [Node.js](https://nodejs.org/en) (v18 or later recommended)
*   [Python](https://www.python.org/) (v3.8 or later recommended) and `pip`
*   Access to the Google Cloud project to get the `GOOGLE_CLIENT_ID`.
*   The `text_agent_backend` project files located at `C:\My Projects\text_agent_backend`.

---

### 1. Backend Setup (`text_agent_backend`)

Navigate to your backend project directory to begin.

```bash
cd "C:\My Projects\text_agent_backend"
```

**Step 1: Create a Virtual Environment (Recommended)**

```bash
# Create the virtual environment
python -m venv venv

# Activate it
# On Windows
.\venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate
```

**Step 2: Install Dependencies**

Ensure you have a `requirements.txt` file containing all necessary packages (e.g., `fastapi`, `uvicorn`, `python-dotenv`, `google-auth`).

```bash
pip install -r requirements.txt
```

**Step 3: Set Up Environment Variables**

Create a `.env` file in the root of your backend project and add your Google Client ID:

```
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID_HERE"
```

**Step 4: Run the Backend Server**

Use `uvicorn` to start the application.

```bash
uvicorn main:app --reload
```

The backend server will now be running at `http://localhost:8000` (or the URL specified in your environment variables).

---

### 2. Frontend Setup (`text_agent_interface`)

Navigate back to this project's directory.

```bash
cd 'C:\My Projects\text_agent_interface'
```

**Step 1: Install Dependencies**

```bash
npm install
```

**Step 2: Set Up Environment Variables**

Create a `.env.local` file in the root of the frontend project. You will need to add the same Google Client ID and also a client secret for NextAuth.

```
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID_HERE"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET_HERE"

# You also need to generate a secret for NextAuth
# Run `openssl rand -base64 32` in your terminal to get a new secret
NEXTAUTH_SECRET="YOUR_NEXTAUTH_SECRET_HERE"
NEXTAUTH_URL="http://localhost:8080"

# API Configuration
NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"
```

**Step 3: Run the Frontend Development Server**

```bash
npm run dev
```

The frontend application will now be running at `http://localhost:8080`.

---

## Testing the Application

1.  Ensure both the backend and frontend servers are running.
2.  Open your browser and navigate to `http://localhost:8080`.
3.  You will be prompted to sign in with your Google account.
4.  Once authenticated, you can use the Business Info tool, retrieve invoices, and test the Drive Filing functionality.
5.  Check the terminal windows for both projects for logs and error messages.



#building 
docker build -t acesagentinterface .

#run
docker run -p 8080:8080 --env-file .env.local acesagentinterface

---

## Base 1 Review - Quick Win Flow

The Base 1 Review is a lead-magnet quick win feature that allows users to upload utility invoices and receive:
- A Base1 Excel workbook (multi-sheet, one utility per sheet + invoice register + summary)
- A short Base1 Summary PDF (1–2 pages)
- A run_id that can be used later to create a Base 2 review after LOA + service fee

### How to Run Locally

1. **Backend Setup:**
   ```bash
   cd "C:\My Projects\text_agent_backend"
   pip install -r requirements.txt  # This will install openpyxl, reportlab, PyPDF2
   uvicorn main:app --reload
   ```
   The backend will run at `http://localhost:8000`

2. **Frontend Setup:**
   ```bash
   cd "C:\My Projects\text_agent_interface"
   npm install
   npm run dev
   ```
   The frontend will run at `http://localhost:8080` (or `http://localhost:3000` depending on your Next.js config)

3. **Access the Base 1 Page:**
   Navigate to `http://localhost:8080/base-1` (or `http://localhost:3000/base-1`)

### Testing the Flow

1. **Create a Run:**
   - Enter Business Name (required)
   - Enter Email (required)
   - Select State (optional)
   - Click "Start Base 1 Review"
   - A run_id will be generated and displayed

2. **Upload Documents:**
   - Drag and drop PDF files or click to select
   - Multiple PDFs can be uploaded
   - Files are validated (PDF only, max 20MB per file)
   - Click "Start Base 1 Review" to upload files (if not already done)

3. **Extract Documents:**
   - Click "Extract Documents" button
   - This runs stub extraction (placeholder fields)
   - Extracted data will appear in the table below

4. **Generate Outputs:**
   - Click "Generate Base 1 Outputs" button
   - This creates:
     - Base1 Excel workbook with all sheets
     - Base1 Summary PDF
   - Download links will appear

5. **Download Files:**
   - Click "Download Base 1 Excel" to get the workbook
   - Click "Download Base 1 Summary PDF" to get the summary

### Where Outputs are Saved

- **Backend Storage:**
  - Documents: `storage/base1/{run_id}/documents/`
  - Outputs: `storage/base1/{run_id}/outputs/`
  - Run metadata: `storage/base1/runs.json`

- **Files Generated:**
  - Excel: `Base1_Review_{run_id_short}.xlsx`
  - PDF: `Base1_Summary_{run_id_short}.pdf`

### API Endpoints

- `POST /api/base1/runs` - Create a new run
- `POST /api/base1/runs/{run_id}/documents` - Upload PDF documents
- `GET /api/base1/runs/{run_id}` - Get run details
- `POST /api/base1/runs/{run_id}/extract` - Run stub extraction
- `POST /api/base1/runs/{run_id}/generate` - Generate Excel and PDF outputs
- `GET /api/base1/runs/{run_id}/outputs/{filename}` - Download generated files

### Notes

- Base 1 is a **lead magnet** - no authentication required
- Extraction is **stub only** - returns placeholder fields with low confidence (0.3)
- Full extraction requires Base 2 (not implemented yet)
- All files are stored locally in the `storage/base1/` directory