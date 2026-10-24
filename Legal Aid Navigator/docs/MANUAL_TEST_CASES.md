# Legal Aid Navigator — Manual Test Cases

For testers and demo rehearsal. Run top to bottom the first time; each case also works on its own.

## 0. Setup

| Item | Value |
|---|---|
| Frontend | http://localhost:5174 |
| Backend API | http://localhost:8000 (docs at `/docs`) |
| Admin login | `admin` / `Admin@12345` |
| Applicant login | `demo_user` / `Demo@12345` |
| Offline demo login | `test` / `test` (no backend account; nothing is saved) |

**Start the apps**
- Backend: from `backend/`, run `DATABASE_URL=sqlite:///./legal_aid.db python -m uvicorn app.main:app --port 8000`
- Frontend: from `frontend/`, run `npm run dev -- --port 5174`

**Seeded demo data** (created on first backend start; all fake): Anita Sharma (confirmed), Rahul Kumar (fee stopped), Meera Patel (urgent), Suresh Reddy (pending), Priya Singh (unverified service), Arjun Nair (confirmed), Kavita Joshi (not eligible), Imran Khan (in progress).

**Important limits to know before testing**
- The booking step is **simulated** inside the backend (fixed delays, generated slots). It stands in for the mock legal aid portal, which has not been built. "Confirmed" for a new application means this simulation finished, not that a real authority confirmed it.
- The simulated portal names the authority after the applicant's district (for example, "District Legal Services Authority, Coimbatore"). Slots and dates are generated, not real.
- The **Appointment status** page shows the application you submitted most recently in that browser.
- Fees are **not detected automatically**. A fee is flagged by a staff member (case ADM-09) or comes from the seeded data.
- n8n runs live on the cloud account. Each new service + date + time combination you submit in section C saves one real record in the n8n data table.

Mark each case: ☐ not run · ✅ pass · ❌ fail (note what you saw).

---

## A. Official scenarios (from the problem statement)

| ID | Scenario | Steps | Expected | Result |
|---|---|---|---|---|
| **TC1** | Eligible person in district → free consultation booked | 1. Log in as `demo_user`.<br>2. Fill all six steps with the values in section F.<br>3. Tick all three consent boxes, click **Finish & Submit**.<br>4. On the recommendations page click **Select this service**, then **Submit for review**.<br>5. Open **Appointment status**. Wait about 15 seconds until Step 5 shows "Available Appointment Slots".<br>6. Pick a slot and click **Confirm Appointment**.<br>7. Wait about 10 seconds, then log in as `admin` and open the application. | Recommendations show DLSA Coimbatore. The review banner shows a request ID and "pending_human_review". Nothing is booked before step 6 (human approval). After step 6 the status page shows a confirmation number. Admin shows **Confirmed** with an "Appointment Confirmed" card and an audit trail that includes `booking approved` and `booking confirmed`. | ☐ |
| **TC2** | Unexpected fee → booking stopped | 1. Log in as `admin`. Open the application for **Rahul Kumar**.<br>2. Check the banner, the stepper and the status.<br>3. Open an application that is **Awaiting User Action** (for example your own TC1 run, before you confirm a slot). In Staff Actions type `₹500 consultation fee` and click **Flag unexpected fee & stop booking**.<br>4. Log in as `demo_user`, open **Appointment status** and try to **Confirm Appointment**. | Rahul: red "Booking stopped" banner, step 4 in red, status "Stopped – Fee Detected", status dropdown disabled. After step 3 the admin status becomes Stopped and the audit trail records `fee flagged`. Step 4: a red message says "Booking stopped: an unexpected fee was detected…", no confirmation appears, and the audit trail shows `booking refused fee`. | ☐ |
| **TC3** | Court deadline in 3 days → urgent help flagged | 1. As `demo_user`, fill the form with **Court case in progress = yes**, **Court deadline = today + 3 days**, **Urgency = normal**.<br>2. Submit through to the recommendations page.<br>3. Log in as `admin`. | The applications list shows an **URGENT** tag next to the name. The detail page shows a red banner "Urgent: Court deadline in 3 days (date)". The audit trail has `flag urgent`. Also check **Meera Patel** (seeded). | ☐ |
| **TC4** | Booking still pending → not reported as lawyer assigned | 1. Log in as `admin`. Open **Suresh Reddy**.<br>2. Read the status and the card under the step panel.<br>3. In Staff Actions choose **Confirmed** and click **Apply**. | Status "Pending Confirmation". Orange card: "Booking pending — not confirmed … No lawyer has been assigned." Step 3 is rejected with "No booking confirmation is on record…" and the status stays Pending. No screen says a lawyer is assigned. | ☐ |

---

## B. Sign-in and access

| ID | Title | Steps | Expected | Result |
|---|---|---|---|---|
| AUTH-01 | Applicant login | Log in as `demo_user`. | Lands on **Location details**. Toast "Welcome back!". | ☐ |
| AUTH-02 | Admin login | Log in as `admin`. | Lands on the **Applications** page with the sidebar. | ☐ |
| AUTH-03 | Wrong password | Log in as `demo_user` with a wrong password. | Error toast. Not signed in. | ☐ |
| AUTH-04 | Applicant cannot open admin | Signed in as `demo_user`, open `/admin`. | Redirected back to the applicant form. | ☐ |
| AUTH-05 | Signed-out access | Log out, then open `/admin` and `/app/location`. | Both redirect to the login page. | ☐ |
| AUTH-06 | Admin API blocked for applicants | Open http://localhost:8000/docs, sign in as `demo_user`, call `GET /api/v1/admin/stats`. | **403** "Administrator access required". Without a token: **401**. | ☐ |
| AUTH-07 | Register | On the login page switch to register, create a new user, then log in. | Account created. Login works. The user is an applicant, not an admin. | ☐ |
| AUTH-08 | Logout | Click **Logout** (applicant bar and admin sidebar). | Returns to login. Back button does not show protected pages with data. | ☐ |

---

## C. Applicant journey

| ID | Title | Steps | Expected | Result |
|---|---|---|---|---|
| APP-01 | Country default | Open **Location details**. | Country shows **India** (not blank). | ☐ |
| APP-02 | Required fields | On each step click **Next** with required fields empty. | Inline "required" messages. You cannot continue. | ☐ |
| APP-03 | District depends on state | Pick Tamil Nadu, then another state. | The district list changes. A district from the old state is cleared. | ☐ |
| APP-04 | Progress bar | Move through the steps. | Completed steps show a tick, the current step is highlighted. On a phone, only numbers show. | ☐ |
| APP-05 | Review page | Reach step 6. | Every value matches what you typed. The email keeps its case. Your description is not capitalised word by word. | ☐ |
| APP-06 | Consent is mandatory | Click **Finish & Submit** with no boxes ticked, then with only some. | Blocked with a message listing what is missing. | ☐ |
| APP-07 | Recommendations | Tick all boxes and submit. | The page "Recommended legal aid options" shows summary, missing information, urgency, next step and 1–3 services. States "does not give legal advice". Booking Confirmed: **No**. Human Approval: **Required**. | ☐ |
| APP-08 | Service card honesty | Look at a service card. | Badge reads "Listed in official directory". Fee and availability read "Needs verification". Nothing says free or booked as a fact. A "Visit source" link opens an official site. | ☐ |
| APP-09 | Submit for review | Select a service and click **Submit for review**. | Green banner with a request ID, "pending_human_review", "No appointment is booked and no provider is assigned". The button cannot be pressed twice. | ☐ |
| APP-10 | Resubmit is not duplicated | Go back and submit the same service, date and time again. | The **same** request ID returns. No second record. | ☐ |
| APP-11 | Service picked but no date | (Developer check) clear the preferred date in browser storage and submit. | A clear message asks you to complete appointment preferences. Nothing is sent. | ☐ |
| APP-12 | Appointment status | Open **Appointment status**. | Request ID, summary on the right, 6-step tracker, stages move on their own. Location has no repeated words. | ☐ |
| APP-13 | Approval gate | Wait for Step 5. | Slots appear. **Confirm Appointment** is disabled until a slot is selected. | ☐ |
| APP-14 | Personal info | Open **Personal info**, edit a field, save. | Change is saved and shown. | ☐ |
| APP-15 | Offline demo login | Log in as `test` / `test` and complete the form. | Recommendations still work. No backend request is created (admin does not show it). | ☐ |

---

## D. Admin portal

| ID | Title | Steps | Expected | Result |
|---|---|---|---|---|
| ADM-01 | Tiles | Open **Applications**. | Four tiles: Total, Confirmed, In Progress, Needs Attention. Numbers match the table when no filters are set. | ☐ |
| ADM-02 | Search | Type `Rahul`, then a request ID, then a phone number. | The table narrows each time. A search with no match shows "No applications match these filters." | ☐ |
| ADM-03 | Status filter | Choose **Pending Confirmation**, then **Stopped – Fee Detected**. | Only matching rows show. | ☐ |
| ADM-04 | Issue filter | Choose a legal issue. | Only that issue shows. | ☐ |
| ADM-05 | Date range | Set From and To dates around today. | Tiles and table both change. A range with nothing in it shows an empty state. | ☐ |
| ADM-06 | Clear filters | Click **Clear filters**. | Everything returns. | ☐ |
| ADM-07 | Pagination | With more than 8 applications, use page 2 and the arrows. | Footer reads "Showing 9 to N of N". Arrows disable at the ends. | ☐ |
| ADM-08 | Open an application | Click a row, then **Back to Applications**. | Detail page opens. Back returns to the list. | ☐ |
| ADM-09 | Flag a fee | On an application that is not stopped, enter fee details and click **Flag unexpected fee & stop booking**. | Status becomes Stopped. Red banner. Status dropdown disables. Audit shows `fee flagged`. Button stays disabled while the fee box is empty. | ☐ |
| ADM-10 | Clear a fee flag | On a stopped application click **Clear fee flag**. | Banner disappears. Status returns to the normal value. Audit shows `fee cleared`. | ☐ |
| ADM-11 | Set status | Choose **Not Eligible** (or another) and **Apply**. | Status badge updates. Audit shows the change. Choosing "Automatic" restores the computed status. | ☐ |
| ADM-12 | Cannot fake Confirmed | On an application without a confirmation, choose **Confirmed** and **Apply**. | Rejected with an explanation. | ☐ |
| ADM-13 | Urgent flag | Click **Mark as urgent**, then **Remove urgent flag**. | The Urgent tag and banner appear and disappear. Audit records each change. | ☐ |
| ADM-14 | Edit applicant | Click **Edit** on Applicant Information, change the phone, **Save**. | New phone shows. Audit shows `applicant edited`. **Cancel** discards edits. | ☐ |
| ADM-15 | Notes | Type a note and **Save notes**. Reload the page. | The note is still there. The button is disabled when nothing has changed. | ☐ |
| ADM-16 | Step detail | Click different numbers on the stepper. | The panel below shows that step's tasks and times. | ☐ |
| ADM-17 | Unverified service | Open **Priya Singh**. | Amber banner "Service unverified …". Status Needs Verification. | ☐ |
| ADM-18 | Sidebar pages | Open Users, Appointments, Authorities, Reports, Settings. | Each loads without an error box. Appointments lists only Confirmed rows as confirmed. Settings shows the backend as reachable. | ☐ |
| ADM-19 | Backend down | Stop the backend and refresh the list. | A red error box with **Retry**, not a blank page. Retry works after the backend is back. | ☐ |
| ADM-20 | Link from appointments | On Appointments click a request ID. | Opens that application's detail page. | ☐ |

---

## E. n8n workflows (live)

| ID | Title | Steps | Expected | Result |
|---|---|---|---|---|
| N8N-01 | Recommendation webhook | Run the form for Coimbatore and submit. | Returns within about a minute. 1–3 services. `bookingConfirmed` false. | ☐ |
| N8N-02 | Verified service | Submit a catalogue service (e.g. `DLSA-COIMBATORE`) for review. | `service_match_status` is `verified_in_catalogue`. | ☐ |
| N8N-03 | Unknown service | In the API docs tool or curl, post a made-up `service_id` to `/webhook/legal-aid/request`. | Saved as pending but `service_unverified`. | ☐ |
| N8N-04 | Validation | Post to the same URL without `service_id`. | HTTP 400 with "service_id is required". | ☐ |
| N8N-05 | Duplicate | Post the same service, date and time twice. | Second reply has `duplicate: true` and the same request ID. | ☐ |
| N8N-06 | Time format | Post `preferred_time` as `10:00 - 11:00`. | HTTP 400 "HH:MM". (The app converts this for you.) | ☐ |
| N8N-07 | Workflow offline | Ask your friend to deactivate a workflow (or turn off the network) and submit. | A clear message ("service is not available…"). No raw error text. No success banner. | ☐ |

---

## F. Reusable form values (TC1)

| Step | Values |
|---|---|
| 1 Location | India · Tamil Nadu · Coimbatore · City `Coimbatore` · PIN `641001` |
| 2 Legal issue | Employment and labour disputes · `My employer has not paid my wages for the last three months.` · Court case: no · Deadline: empty · Urgency: normal |
| 3 Eligibility | Low income / financially weaker section · `Annual household income is below the state limit.` · Supporting document: yes |
| 4 Contact | `Demo User` · `9876543210` · `demo.user@example.com` · Preferred contact: phone · Mode: In-person |
| 5 Appointment | Date: a future date (e.g. 05-11-2026) · Slot: 10:00 - 11:00 · Mode: In person |
| 6 Consent | Tick all three, then **Finish & Submit** |

**TC3 variation:** Step 2 → Court case: yes · Deadline: today + 3 days.

---

## G. Look and feel (spot checks)

| ID | Check | Expected | Result |
|---|---|---|---|
| UI-01 | Desktop width 1400px | Step bar fits on one row. Toasts appear at the bottom and do not cover buttons. | ☐ |
| UI-02 | Phone width ~390px (applicant) | Step numbers on a second row. Forms fill the width. No sideways scrolling. | ☐ |
| UI-03 | Phone width ~390px (admin) | Top bar and tabs replace the sidebar. Stepper scrolls sideways inside its box. Cards stack. Page itself does not scroll sideways. | ☐ |
| UI-04 | Status colours | Confirmed green · In Progress amber · Awaiting User Action blue · Pending orange · Needs Verification red · Stopped dark red · Not Eligible grey. | ☐ |
| UI-05 | Keyboard | Tab through the admin list and detail page. | Focus ring is visible. Buttons and filters are reachable. | ☐ |

---

## H. Safety checks to say out loud in the demo

- The system gives **no legal advice** (note on the recommendations page).
- **No booking happens without the applicant's approval** (Confirm Appointment).
- A **fee stops the booking**, even after approval, and staff must clear it.
- A **pending or unverified** request is never shown as confirmed or as having a lawyer assigned.
- Staff **cannot mark Confirmed** without a confirmation on record.
- Every staff change is written to the **audit trail**.

## Defect log

| # | Case ID | What happened | Expected | Screenshot / notes |
|---|---|---|---|---|
| | | | | |
