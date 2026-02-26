# n8n Webhook Analysis - Business Info Page

## Overview
When a user clicks "Get Member Profile" on the business-info page, multiple n8n webhook calls are made. This document identifies all webhook calls and highlights opportunities for consolidation.

## ✅ IMPLEMENTED OPTIMIZATIONS

### Direct Google Sheets Integration (Completed)
- **Status:** ✅ **COMPLETED**
- **Change:** Replaced `return_fileIDs` n8n webhook with direct Google Sheets API access
- **Location:** `tools/business_info.py` - `get_file_ids()` function
- **Implementation:**
  - Reads directly from Google Sheets: `1l_ShkAcpS1HBqX8EdXLEVmn3pkliVGwsskkkI0GlLho`
  - Sheet: "Data from Airtable" (GID: 2036128846)
  - Filters by "Business Name" column
  - Uses service account authentication
- **Benefits:**
  - Removed 1 n8n webhook call
  - Faster response (no n8n processing time)
  - More reliable (direct API access)
  - Reduced n8n infrastructure dependency

### Removed Duplicate Frontend Calls (Completed)
- **Status:** ✅ **COMPLETED**
- **Change:** Removed duplicate `return_fileIDs` call from frontend
- **Location:** `BusinessInfoDisplay.tsx` - Removed `fetchFileIDs()` function and useEffect
- **Benefits:**
  - Removed 1 redundant webhook call
  - Backend already returns file IDs in `_processed_file_ids`

## Webhook Calls Flow (After Optimization)

### 1. Initial API Call (Backend)
**Endpoint:** `/api/get-business-info` (backend)
- **Location:** `BusinessInfoTool.tsx` line 56
- **Backend Implementation:** `main.py` line 277 → `tools/business_info.py` line 19

**Backend makes 1 webhook call + 1 direct API call:**

#### a) `search-business-info` (n8n webhook)
- **URL:** `https://membersaces.app.n8n.cloud/webhook/search-business-info`
- **Location:** `tools/business_info.py` line 45
- **Purpose:** Gets basic business information (name, ABN, addresses, contact info, linked utilities)
- **Payload:** `{ "business_name": "..." }`

#### b) File IDs (Direct Google Sheets API) ✅ NEW
- **Method:** Direct Google Sheets API (no n8n webhook)
- **Location:** `tools/business_info.py` - `get_file_ids()` function
- **Sheet:** `1l_ShkAcpS1HBqX8EdXLEVmn3pkliVGwsskkkI0GlLho` / "Data from Airtable"
- **Purpose:** Gets file IDs for contracts, documents, invoices directly from Google Sheets
- **Returns:** File IDs for:
  - LOA File ID
  - WIP
  - Contracts (C&I Electricity, SME Electricity, C&I Gas, SME Gas, Waste, Oil, DMA) with statuses
  - Floor Plan
  - Site Profiling
  - Service Fee Agreement
  - Initial Strategy
  - Amortisation Excel/PDF
  - Cleaning Invoice
  - Oil Invoice
  - Water Invoice

---

### 2. Frontend Additional Webhook Calls

After the backend returns data, the frontend (`BusinessInfoDisplay.tsx`) makes **2 separate webhook calls**:

#### a) `return_EOIIDs`
- **URL:** `https://membersaces.app.n8n.cloud/webhook/return_EOIIDs`
- **Location:** `BusinessInfoDisplay.tsx` line 599
- **Trigger:** `useEffect` on line 683 (runs when `business.name` changes)
- **Purpose:** Gets EOI (Expression of Interest) file IDs
- **Payload:** `{ "business_name": "..." }`
- **Returns:** Array of EOI files with:
  - EOI Type
  - EOI File ID

#### b) `pull_wip_both` ✅ NEW UNIFIED WEBHOOK
- **URL:** `https://membersaces.app.n8n.cloud/webhook-test/pull_wip_both`
- **Location:** `BusinessInfoDisplay.tsx` - `fetchWIPData()` function
- **Trigger:** `useEffect` (runs when `business.name` changes)
- **Purpose:** Gets both additional documents AND engagement forms in one call
- **Payload:** `{ "business_name": "..." }` (supports nested payload structure)
- **Returns:** Unified response with:
  - `additional_documents` (array) - Additional documents from WIP sheet
  - `signedEF_row` (object or null) - Signed engagement form row
  - `engagement_forms` (array) - Google Drive file matches for engagement forms
  - `file_count` (number) - Total file count
  - `has_files` (boolean) - Whether files exist
  - `ok` (boolean) - Success status
  - `business_name` (string) - Business name
- **Replaces:** 
  - ❌ `pull_additional_documents_WIP` (removed)
  - ❌ `pull_signedEOI_WIP` (removed)

---

## Summary

### Total Webhook Calls: **3 calls** (1 from backend + 2 from frontend) ✅ REDUCED FROM 6

1. ✅ `search-business-info` (backend n8n webhook) - **Necessary**
2. ✅ File IDs (backend direct Google Sheets API) - **No webhook needed** ✅ OPTIMIZED
3. ✅ `return_EOIIDs` (frontend n8n webhook) - **Necessary** (but could be consolidated)
4. ✅ `pull_wip_both` (frontend n8n webhook) - **Unified webhook** ✅ OPTIMIZED

### Optimization Results
- **Before:** 6 webhook calls (2 backend + 4 frontend)
- **After:** 3 webhook calls (1 backend + 2 frontend)
- **Reduction:** 50% fewer webhook calls (3 removed)
- **Removed:**
  - ❌ `return_fileIDs` n8n webhook (replaced with direct Google Sheets API)
  - ❌ Duplicate `return_fileIDs` frontend call
  - ❌ `pull_additional_documents_WIP` (merged into `pull_wip_both`)
  - ❌ `pull_signedEOI_WIP` (merged into `pull_wip_both`)

---

## Remaining Optimization Opportunities

### ✅ Completed Optimizations
1. ✅ **Replaced `return_fileIDs` n8n webhook with direct Google Sheets API** - Removed 1 webhook call
2. ✅ **Removed duplicate frontend `return_fileIDs` call** - Removed 1 redundant call
3. ✅ **Unified WIP webhooks** - Merged `pull_additional_documents_WIP` and `pull_signedEOI_WIP` into single `pull_wip_both` webhook - Removed 1 webhook call

### Future Consolidation Opportunities
The 2 remaining frontend webhook calls (`return_EOIIDs`, `pull_wip_both`) could be:
1. **Option A:** Moved to backend - Add them to `get_business_information()` so all data comes in one response
2. **Option B:** Combined into single n8n webhook - Create one webhook that returns all data types
3. **Option C:** Keep separate but batch them - Make both calls in parallel instead of sequentially

### Recommended Next Steps
1. **Move remaining 2 webhook calls to backend** - Modify `get_business_information()` to also fetch:
   - EOI IDs
   - WIP data (additional documents + engagement forms)
   - Return all data in one response
2. **Result:** Reduce from 3 webhook calls to **1 webhook call** (just `search-business-info`)

## Configuration Required

### Google Sheets Service Account Setup
To use the direct Google Sheets integration, ensure:

1. **Service Account Credentials:**
   - Either: `SERVICE_ACCOUNT_FILE` environment variable pointing to JSON file
   - Or: `SERVICE_ACCOUNT_JSON` environment variable with JSON content

2. **Google Sheet Access:**
   - Share the Google Sheet (`1l_ShkAcpS1HBqX8EdXLEVmn3pkliVGwsskkkI0GlLho`) with the service account email
   - Grant "Viewer" or "Editor" permissions

3. **Environment Variables (Optional):**
   - `FILE_IDS_SHEET_ID` - Default: `1l_ShkAcpS1HBqX8EdXLEVmn3pkliVGwsskkkI0GlLho`
   - `FILE_IDS_SHEET_NAME` - Default: `"Data from Airtable"`

---

## Additional Webhook Calls (Context Actions)

These webhooks are called later when users perform specific actions (not on initial load):

- `additional_document_upload` - When uploading additional documents (line 1066, 1203)
- `pull_descrepancy_advocacy_WIP` - For advocacy/discrepancy data (lines 2557, 2760, 2873, 3001)
- `save_advocacy_WIP` - For saving advocacy data (line 3100)
- `opex_finance_email` - For sending finance emails (line 3293)

**Note:** 
- The `return_fileIDs` call after file uploads has been removed. File IDs will be refreshed when the user clicks "Get Member Profile" again.
- The `pull_additional_documents_WIP` and `pull_signedEOI_WIP` webhooks have been replaced with the unified `pull_wip_both` webhook.

These are action-triggered and not part of the initial "Get Member Profile" flow.

