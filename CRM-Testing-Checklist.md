## Dashboard & CRM – Testing Checklist

**Tester:** _________________________  
**Date:** _________________________  
**Environment:** _________________________ (e.g. staging URL)

**Instructions:**  
Work through each section. For each step, note **Pass / Fail** and briefly what you saw (for example, “Modal opened”, “Error: …”).  
For **Data Request** tests, always select **Request type: Other** so requests are sent to us internally.

---

## 1. Access & navigation

| # | Step | Result | Notes |
|---|------|--------|--------|
| 1.1 | Sign in and open the dashboard (home). | ☐ Pass ☐ Fail | |
| 1.2 | Go to **CRM** (`/crm`). Confirm CRM dashboard loads. | ☐ Pass ☐ Fail | |
| 1.3 | Go to **Members** (`/crm-members`). Confirm list loads. | ☐ Pass ☐ Fail | |
| 1.4 | Search for a member and open their profile. Confirm profile loads with tabs (Overview, Notes, Documents, Tasks, etc.). | ☐ Pass ☐ Fail | |

---

## 2. Client notes

| # | Step | Result | Notes |
|---|------|--------|--------|
| 2.1 | On a member profile, open the **Notes** tab. | ☐ Pass ☐ Fail | |
| 2.2 | Add a new note: choose type (for example, General), enter text, click **Add Note**. Confirm the note appears in the list. | ☐ Pass ☐ Fail | |
| 2.3 | Edit an existing note (if supported). Confirm change is saved. | ☐ Pass ☐ Fail | |
| 2.4 | Delete a note (if applicable). Confirm it is removed. | ☐ Pass ☐ Fail | |
| 2.5 | In **Overview**, find “Client Status Notes” (if present). Add a status note and confirm it appears. | ☐ Pass ☐ Fail | |

---

## 3. Tasks

| # | Step | Result | Notes |
|---|------|--------|--------|
| 3.1 | From a member profile, click **Add task** (sidebar or Tasks tab). Confirm “Create New Task” modal opens. | ☐ Pass ☐ Fail | |
| 3.2 | Create a task: enter title, description, due date, assignee (if shown). Click **Create Task**. Confirm success and task appears. | ☐ Pass ☐ Fail | |
| 3.3 | Go to **Tasks** page (`/tasks`). Confirm your task appears (for example, under “My tasks”). | ☐ Pass ☐ Fail | |
| 3.4 | Change task status (for example, to In Progress or Done). Confirm status updates. | ☐ Pass ☐ Fail | |
| 3.5 | Open task history (if available). Confirm history entries show. | ☐ Pass ☐ Fail | |
| 3.6 | Delete a test task (or mark as cancelled). Confirm it is removed or updated. | ☐ Pass ☐ Fail | |

---

## 4. Documents & uploads

| # | Step | Result | Notes |
|---|------|--------|--------|
| 4.1 | On a member profile, open the **Documents** tab. Confirm sub-tabs: Contracts & signed agreements, Business docs, Signed EOIs, Signed engagement forms, Additional documents. | ☐ Pass ☐ Fail | |
| 4.2 | Open **Additional documents**. Click upload or **Upload Additional Document**. | ☐ Pass ☐ Fail | |
| 4.3 | Select a small test file (for example, PDF or image). Add description if required. Submit. Confirm success message and document appears in the list (or after refresh). | ☐ Pass ☐ Fail | |
| 4.4 | From member **Overview** (Business Info), use **Upload Additional Document** if visible. Repeat upload and confirm it appears in Documents → Additional documents. | ☐ Pass ☐ Fail | |

---

## 5. Linked utility & discrepancy

| # | Step | Result | Notes |
|---|------|--------|--------|
| 5.1 | On a member profile, open the **Discrepancy Adjustments** section (or equivalent data tab showing linked utilities). | ☐ Pass ☐ Fail | |
| 5.2 | Confirm linked utility info shows (for example, Contract End Date, Data Requested, Data Recieved) where applicable. | ☐ Pass ☐ Fail | |
| 5.3 | Click **View full discrepancy check**. Confirm it opens the discrepancy page with the member’s business name pre-filled. | ☐ Pass ☐ Fail | |
| 5.4 | On **Discrepancy check** page (`/resources/discrepancy-check`): enter a known business name, click **Refresh** (or wait for load). Confirm data loads (or “No rows” if none). | ☐ Pass ☐ Fail | |
| 5.5 | Filter by utility identifier (for example, MRIN). Confirm table updates. | ☐ Pass ☐ Fail | |
| 5.6 | Click **Open Google Sheet**. Confirm sheet opens in a new tab (or expected behaviour). | ☐ Pass ☐ Fail | |

---

## 6. Data request (use “Other” for internal testing)

| # | Step | Result | Notes |
|---|------|--------|--------|
| 6.1 | Go to **Data request** page (`/data-request`). | ☐ Pass ☐ Fail | |
| 6.2 | Select a business name. Set **Request type** to **Other**. Enter supplier (for example, “Other Supplier”) and optional details. Submit. Confirm success message and that the request is received internally. | ☐ Pass ☐ Fail | |
| 6.3 | From a member profile, open the **Data Request** button or modal. Again select **Request type: Other**, fill required fields, submit. Confirm success. | ☐ Pass ☐ Fail | |

---

## 7. Pipeline, offers & reports

| # | Step | Result | Notes |
|---|------|--------|--------|
| 7.1 | Open **Pipeline** (`/pipeline`). Confirm stages and offers load. | ☐ Pass ☐ Fail | |
| 7.2 | Open **Offers** (`/offers`). Open an offer detail. Confirm details and activities load. | ☐ Pass ☐ Fail | |
| 7.3 | Open **Reports** (`/reports`) and **Activity report** (`/reports/activities`). Confirm pages load without errors. | ☐ Pass ☐ Fail | |

---

## 8. Other (optional)

| # | Step | Result | Notes |
|---|------|--------|--------|
| 8.1 | Drive filing, signed agreement lodgement, or other document flows (if in scope). | ☐ Pass ☐ Fail | |
| 8.2 | Any broken links or missing images on the above pages. | ☐ Pass ☐ Fail | |

---

## 9. Summary

- **Total steps:** _____  
- **Passed:** _____  
- **Failed:** _____  
- **Blocked:** _____  

**Critical issues (describe):**

_________________________________________  
_________________________________________

**General feedback:**

_________________________________________  
_________________________________________

