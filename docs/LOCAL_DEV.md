# Local development — text_agent_interface

## Start dev server

```powershell
cd "C:\My Projects\text_agent_interface"
npm run dev
```

Open http://localhost:8080 (or :3000 depending on config).

## Required `.env.local`

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:8080
BACKEND_API_KEY=test-key
OPENAI_API_KEY=...          # Custom video tab (scoping chat)
```

## Three repos — what runs when

| What you're testing | Keep running |
|---------------------|--------------|
| `/videos`, CRM, create flow, library | **Interface** (`npm run dev`) + **Backend** (`uvicorn main:app --reload --port 8000`) |
| Render MP4s, QA zip, publish to library | **claude-videos** CLI on demand (Chrome machine) — see below |

You do **not** need claude-videos running as a server for normal UI work.

## Backend prerequisites (video uploads + library)

In `text_agent_backend` `.env`:

- `BACKEND_API_KEY=test-key` (same as interface + claude-videos)
- `SERVICE_ACCOUNT_JSON` or `SERVICE_ACCOUNT_FILE` with access to the shared Drive folder
- `RESOURCES_VIDEOS_FOLDER_ID=1VmTut-4mztUiz95g2BqnZTMoeCVMhsb9`

See [text_agent_backend/docs/LOCAL_DEV.md](../../text_agent_backend/docs/LOCAL_DEV.md).

## claude-videos one-time setup (render machine)

```powershell
cd "C:\My Projects\claude-videos"
pip install -r requirements.txt
copy .env.example .env.local   # set BACKEND_API_KEY=test-key

cd remotion
npm install
npx remotion browser ensure
npm run prereqs
```

Full detail: [claude-videos/docs/LOCAL_DEV.md](../../claude-videos/docs/LOCAL_DEV.md).

---

## End-to-end local test: CRM testimonial → MP4 in library

Example: **Peninsula Villages Limited** · C&I Electricity testimonial (not yet in the video registry).

### Step A — Interface + backend (UI)

1. Start backend on `:8000` and interface on `:8080`.
2. **Automation → Videos → Create** (or `/videos/create`).
3. **Member testimonial** tab:
   - Select CRM member.
   - Select approved testimonial (upload new docs on **CRM → Commercial → Testimonials**, not on this page).
   - Confirm **Video slug** — e.g. `peninsula-villages-ci-electricity` (auto-generated when not in registry; edit if needed).
4. Click **Start from CRM testimonial**.
5. Copy the CLI steps shown (or use the list below).

Draft rows appear in `/videos` with `file_id=pending` until publish.

### Step B — claude-videos (render machine)

Run from **`C:\My Projects\claude-videos`** unless noted.

```powershell
# 1. Download the CRM source from the Drive link in the CLI panel
#    (PDF works in CRM but understand_testimonial needs .docx today — convert or re-upload Word)

# 2. Build the testimonial bundle (first time for this slug only)
python tools/understand_testimonial.py --docx "path\to\Peninsula-Villages.docx"

# 3. Render + QA
cd remotion
npm run render:only -- peninsula-villages-ci-electricity
npm run postrender

# 4. Upload MP4s + register in backend/Drive
cd ..
npm run publish:local -- --slug peninsula-villages-ci-electricity --kind testimonial --testimonial-id 1
```

Replace `--testimonial-id` with the CRM testimonial id from the create URL (`?testimonial_id=`).

### Step C — Back in the interface

1. Open `/videos` — status should move from draft toward published after publish.
2. Open the video detail page — preview iframe when Drive upload succeeded.
3. QA: open `QA-Review.html` from the latest `remotion/tool-output/_zips_*` folder locally.

---

## Marketing videos (already in registry)

No `understand_testimonial` step — slug already exists (e.g. `find-the-money`):

```powershell
cd "C:\My Projects\claude-videos\remotion"
npm run render:only -- find-the-money
npm run postrender
cd ..
npm run publish:local -- --slug find-the-money --kind marketing
```

Pick slugs from **Create → Marketing** or `/videos`.

---

## Custom project tab

Uses `OPENAI_API_KEY` for scoping chat + slide-review HTML. After review, same render/publish pattern with your chosen slug and `--kind custom` (when supported by publish script).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Slug shows `draft-1` | Restart backend after pull; slug should auto-generate (e.g. `peninsula-villages-ci-electricity`). Clear slug field and re-select member to refresh. |
| `render:only -- draft-1` fails | Slug must match claude-videos bundle — run `understand_testimonial` first with the correct slug. |
| PDF testimonial | CRM allows PDF; pipeline needs `.docx` for `understand_testimonial.py` today. |
| Publish 401 | `BACKEND_API_KEY` must match across all three repos. |
| No Drive preview | Check `SERVICE_ACCOUNT_JSON` and `RESOURCES_VIDEOS_FOLDER_ID` on backend. |

---

## Video hub routes

- `/videos` — library, filters, Drive + DB status
- `/videos/create` — member / marketing / custom
- `/videos/[id]` — detail, status workflow, QA path notes
