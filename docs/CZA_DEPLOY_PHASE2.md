# Phase 2 — CZA Cloud Run (memberscza GCP)

Dual-deploy the same GitHub branches to **ACES** (existing) and **CZA** (new) for parallel testing. **Cloud SQL and most integrations stay on ACES** until cutover.

## Overview

| Branch | ACES (existing triggers) | CZA (new triggers) |
|--------|--------------------------|---------------------|
| `dev` | `acesagentinterfacedev` + `text-agent-backend-dev` | `czagentinterfacedev` + `text-agent-backend-dev` |
| `main` | `acesagentinterface` + `text-agent-backend` | `czagentinterface` + `text-agent-backend` |

Repo build configs:

- Interface: `cloudbuild.cza.yaml` (CZA) · `cloudbuild.yaml` (ACES)
- Backend: `cloudbuild.cza.yaml` (CZA)

One push to `dev` or `main` runs **both** projects’ triggers when each is connected to the same GitHub repo.

---

## Prerequisites

- [ ] CZA GCP project created (e.g. **memberscza**) with billing enabled
- [ ] APIs enabled: Cloud Run, Cloud Build, Artifact Registry / Container Registry
- [ ] Cloud Build [GitHub connection](https://cloud.google.com/build/docs/automating-builds/github/connect-repo-github) to `MembersACES/text_agent_interface` and `MembersACES/text_agent_backend`
- [ ] OAuth redirect URIs added for CZA URLs (after first deploy — see step 6)
- [ ] ACES Cloud SQL instance name / connection string noted for cross-project access

---

## Step 1 — Deploy CZA backends first

Backends must exist before the interface build can resolve `NEXT_PUBLIC_API_BASE_URL`.

### 1a. Create Cloud Build triggers (backend repo)

In the **CZA GCP project**, create **two triggers**:

| Trigger name | Branch | Config file | Substitutions |
|--------------|--------|-------------|---------------|
| `text-agent-backend-dev` | `^dev$` | `cloudbuild.cza.yaml` | `_CLOUD_RUN_SERVICE=text-agent-backend-dev` |
| `text-agent-backend-prod` | `^main$` | `cloudbuild.cza.yaml` | _(defaults — `text-agent-backend`)_ |

Push to `dev` / `main` (or run trigger manually once) to create the Cloud Run services.

### 1b. Configure Cloud Run env (copy from ACES)

For **each** CZA backend service, copy runtime env from the matching ACES backend (`text-agent-backend-dev` or `text-agent-backend`), then adjust:

| Variable | CZA value |
|----------|-----------|
| `DATABASE_URL` | **Same as ACES** (shared Cloud SQL) |
| `DB_TYPE` | `postgresql` (same as ACES) |
| `GOOGLE_CLIENT_ID` | Same OAuth client as ACES |
| `CORS_EXTRA_ORIGINS` | CZA frontend URLs (add after step 2 deploy), e.g. `https://czagentinterfacedev-PROJECT_NUMBER.australia-southeast2.run.app,https://czagentinterface-PROJECT_NUMBER.australia-southeast2.run.app` |
| All other secrets | Copy from ACES (service account JSON, n8n, Airtable, etc.) |

Also set on the Cloud Run service (same as ACES):

- **Cloud SQL connections** → add the **ACES** instance (cross-project)
- **VPC connector** if ACES backend uses one for private SQL

### 1c. Cross-project Cloud SQL IAM

In the **ACES** project, grant the CZA Cloud Run service account access to the SQL instance:

```bash
# Replace IDs — CZA default compute SA is often:
# PROJECT_NUMBER-compute@developer.gserviceaccount.com

gcloud projects add-iam-policy-binding aces-ai \
  --member="serviceAccount:CZA_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

If using a dedicated Cloud Run SA, use that email instead.

Verify: hit `https://text-agent-backend-dev-PROJECT_NUMBER.australia-southeast2.run.app/health` from the CZA project number.

---

## Step 2 — Deploy CZA interface

### 2a. Create Cloud Build triggers (interface repo)

| Trigger name | Branch | Config file | Substitutions |
|--------------|--------|-------------|---------------|
| `czagentinterfacedev` | `^dev$` | `cloudbuild.cza.yaml` | `_CLOUD_RUN_SERVICE=czagentinterfacedev`, `_BACKEND_SERVICE=text-agent-backend-dev` |
| `czagentinterface-prod` | `^main$` | `cloudbuild.cza.yaml` | _(defaults)_ |

The build sets `NEXT_PUBLIC_API_BASE_URL` to  
`https://${_BACKEND_SERVICE}-$PROJECT_NUMBER.australia-southeast2.run.app`.

### 2b. Configure Cloud Run env (copy from ACES interface)

| Variable | Notes |
|----------|--------|
| `NEXTAUTH_URL` | **Exact CZA service URL** (dev vs prod) |
| `NEXTAUTH_SECRET` | Same as ACES or new — must be set |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Same OAuth app |
| `BACKEND_API_URL` | CZA backend URL (helps server-side API routes) |
| `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS` | Optional — defaults include `czeroanz.com` |
| All other vars | Copy from matching ACES interface service |

---

## Step 3 — Update ACES backend CORS

On **ACES** `text-agent-backend` and `text-agent-backend-dev`, set `CORS_EXTRA_ORIGINS` to include CZA frontend URLs **if** any client ever calls ACES backend directly from CZA origin. Normally CZA frontend → CZA backend, so this is only needed on **CZA backends**. Deploy backend with `CORS_EXTRA_ORIGINS` on CZA services after you know the URLs.

Redeploy CZA backend after setting `CORS_EXTRA_ORIGINS` (env change only — no rebuild required if you update Cloud Run revision).

---

## Step 4 — Google OAuth redirect URIs

In GCP → OAuth client (project `aces-ai` / `672026052958`), add:

```
https://czagentinterfacedev-PROJECT_NUMBER.australia-southeast2.run.app/api/auth/callback/google
https://czagentinterface-PROJECT_NUMBER.australia-southeast2.run.app/api/auth/callback/google
```

Replace `PROJECT_NUMBER` with the CZA project number.

---

## Step 5 — Smoke test

| Test | CZA dev URL |
|------|-------------|
| Login `@acesolutions.com.au` | ✓ |
| Login `@czeroanz.com` | ✓ |
| `/crm-members` loads clients | ✓ (same DB as ACES) |
| Edit client on CZA → visible on ACES dev | ✓ |

Repeat on CZA prod after merging to `main`.

---

## Step 6 — Dual deploy workflow (ongoing)

```
git push origin dev   → ACES dev + CZA dev (4 services total: 2 FE + 2 BE per project... actually 2 FE + 2 BE across 2 projects = 4 deploys)
git push origin main  → ACES prod + CZA prod
```

No extra git steps — both triggers fire from one push.

---

## Step 7 — Cutover (later)

1. Point users / custom domain to CZA prod URL
2. Disable ACES Cloud Build triggers
3. Delete ACES Cloud Run services (keep Cloud SQL until explicitly migrated)
4. Remove ACES hostnames from `CORS_EXTRA_ORIGINS` / code when unused

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Sign-in works, API CORS error | Set `CORS_EXTRA_ORIGINS` on CZA backend; redeploy revision |
| Sign-in works, API 401 | `GOOGLE_CLIENT_ID` mismatch between interface and backend |
| CRM empty / 500 on CZA backend | Cloud SQL IAM or `DATABASE_URL` / connector not set |
| Client calls wrong backend | Rebuild interface — `NEXT_PUBLIC_API_BASE_URL` is baked at build time |
| `org_internal` on CZA login | OAuth app must be External (already fixed locally) |

---

## Service URL cheat sheet

After first deploy, note URLs (pattern):

```
https://czagentinterfacedev-CZA_PROJECT_NUMBER.australia-southeast2.run.app
https://czagentinterface-CZA_PROJECT_NUMBER.australia-southeast2.run.app
https://text-agent-backend-dev-CZA_PROJECT_NUMBER.australia-southeast2.run.app
https://text-agent-backend-CZA_PROJECT_NUMBER.australia-southeast2.run.app
```

Find project number: `gcloud projects describe PROJECT_ID --format='value(projectNumber)'`
