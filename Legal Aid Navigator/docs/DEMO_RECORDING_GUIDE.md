# Demo Recording Guide — Legal Aid Navigator

A shot-by-shot plan for the submission video, built from a timed rehearsal of the real app. Target length: **6–7 minutes**. A 3-minute cut is at the end.

---

## 1. What the video must prove

The brief scores **agentic capability (25)**, **problem fit (20)**, **technical implementation (20)**, **innovation (15)**, **user experience (10)** and **presentation (10)**. The judges want a working agent that makes evidence-based decisions, **pauses for human approval**, acts safely and **verifies the real outcome**.

| Judging area | Show this | Where in the video |
|---|---|---|
| Agentic capability (25) | AI reads the case, uses official sources, recommends; the workflow pauses for a person; an action is taken; the result is checked and logged | Scenes 3–6 |
| Problem fit (20) | A person who cannot afford a lawyer, unsure where to go | Scene 1 |
| Technical implementation (20) | Architecture, n8n executions, rules in code, audit trail, proof script (12/12) | Scenes 2, 7 |
| Innovation (15) | Separation of recommend / request / book; fee stop; "never claims confirmed"; privacy by omission | Scenes 4–6 |
| User experience (10) | Clean applicant flow, honest status wording, admin portal | Scenes 3, 5 |
| Presentation (10) | Clear story, honest limits, calm pacing | All |

The four official scenarios (TC1–TC4) must each be visibly shown. This plan covers all four in about two minutes of screen time.

---

## 2. Before you record

### 2.1 Do these the day before

- [ ] **n8n trial:** the editor showed "12 days left" on 20 Oct, so the trial ends around **1 Nov 2026**. Record soon and check the banner on the day.
- [ ] Ask your friend to confirm **both workflows are published and active** (production URLs only work when active).
- [ ] Ask your friend to **delete the extra test rows** in `legal_aid_requests`, so the table looks tidy. Keep none you can't explain.
- [ ] Run `python docs/verify_n8n.py` and keep the output (it should say **12/12 checks passed**). Take a screenshot.
- [ ] Rehearse the whole flow twice with the stopwatch (section 4 timings).

### 2.2 On the day, 15 minutes before

1. **Close your own dev servers** (the two PowerShell windows running uvicorn and `npm run dev`) so the demo can use the standard ports.
2. Run the launcher. It builds a **fresh demo database** with sample data dated *today*, so the "court deadline in 3 days" record is correct:
   ```
   powershell -ExecutionPolicy Bypass -File docs\start_demo.ps1 -Force
   ```
   It leaves `legal_aid.db` alone. Default URLs: app http://localhost:5174, backend http://localhost:8000.
3. Open **two separate browser windows** (this matters, because both users share the same browser storage):
   - **Window A, applicant:** normal Chrome window. Sign in as `demo_user` / `Demo@12345`.
   - **Window B, staff:** a **Private/Incognito** window. Sign in as `admin` / `Admin@12345`, open the Applications list.
4. Open these tabs ready (not in the recording windows if you can avoid it):
   - n8n **Workflow 1 → Executions**
   - n8n **Workflow 2 → Executions**
   - n8n **Data table `legal_aid_requests`**
   - A terminal in the project folder, with `python docs/verify_n8n.py` typed but not run.
   - `docs/PROJECT_DOCUMENTATION.md` architecture section (or a slide) for Scene 2.
5. Pick a **new appointment date nobody has used** (for example, the last Monday of next month). Used dates: 05, 10, 11, 12 Nov and 01, 14, 15 Dec 2026. A new date makes n8n save a fresh row you can show live.

### 2.3 Hide these on screen

- [ ] **Close `frontend/.env` and `backend/.env` in your editor.** They hold webhook IDs and a database credential.
- [ ] Don't open n8n's **Credentials** page or any API key.
- [ ] Turn on Do Not Disturb. Close chat, mail and notification pop-ups.
- [ ] Hide bookmarks bar; browser zoom 100–110%; one clean tab per window.
- [ ] Set the screen to 1920×1080.

### 2.4 Recording tools

Any of: **OBS Studio** (best control), **Windows Game Bar** (Win+G), or **Clipchamp**. Record at **1080p, 30 fps**, with a microphone test first. Record screen and voice together, or voice-over afterwards. Keep each scene as its own take so one mistake doesn't ruin everything.

---

## 3. Run of show

Times are for the finished video. "Wait" lines are real system delays from the rehearsal; narrate over them or speed them up in the edit.

| # | Time | Scene | Show on screen | Key message |
|---|---|---|---|---|
| 1 | 0:00–0:35 | The problem | Title slide or the login page | A person who can't afford a lawyer doesn't know where to go or whether a booking is real |
| 2 | 0:35–1:20 | The solution and architecture | Architecture diagram | Agents recommend; code enforces safety; people approve |
| 3 | 1:20–2:50 | **TC1 setup:** applicant journey | Window A: the six-step form, consent, recommendations, select, submit | Official sources; no legal advice; human review |
| 4 | 2:50–4:00 | **TC2 then TC1:** fee stop, then booking | Window A and B side by side: slots, staff flags fee, applicant refused, fee cleared, approved, confirmed | The system stops on a fee and only confirms from a real record |
| 5 | 4:00–5:00 | **TC3 and TC4** | Window B: urgent record, pending record | Urgency flagged; pending never shown as "lawyer assigned" |
| 6 | 5:00–5:35 | Admin overview and audit trail | Dashboard tiles, an audit trail | Every decision is traceable |
| 7 | 5:35–6:25 | Proof the agents are real | n8n executions, data table, `verify_n8n.py` 12/12 | Live evidence, not a mock-up |
| 8 | 6:25–7:00 | Limits and next steps | Slide or the doc's limitations list | Honest about what is simulated; clear roadmap |

---

## 4. Scene-by-scene script

### Scene 1 — The problem (0:00–0:35)

**Screen:** title slide: "Legal Aid Navigator — find free legal help and book safely".

> "If you can't afford a lawyer, you face three problems. You don't know whether free legal aid exists for you. You don't know which office covers your district. And once you ask for an appointment, you often don't know whether it was really booked or is still pending. Legal Aid Navigator fixes that. It finds free legal aid, asks a person to approve, and checks what actually happened. And it never gives legal advice."

### Scene 2 — Architecture (0:35–1:20)

**Screen:** the architecture diagram from `docs/PROJECT_DOCUMENTATION.md` section 4.1.

> "There are four parts. A React app for applicants and an admin portal for staff. A FastAPI backend that holds the rules and the audit trail. And two n8n workflows that act as the agent layer, using Google Gemini and official legal services directories.
>
> Workflow 1 recommends services. Workflow 2 saves the chosen service for human review. The important design decision is this: **the AI interprets and recommends, but the safety rules are plain code**. A fee stops a booking, urgency is calculated from the deadline, and a pending booking can never be shown as confirmed. People stay in control: the applicant approves, and staff can review, stop and correct."

### Scene 3 — The applicant journey (1:20–2:50)

**Screen:** Window A. Speed up the typing (2×) or type quickly; keep the consent and recommendations at normal speed.

1. Show the six steps quickly. Use the TC1 values (see the test document, section F), with **your new date**.
2. On the consent page, point to the three separate boxes.
   > "Consent is explicit and in three parts, and the last one says a human must still approve the booking."
3. Click **Finish & Submit**. *(Wait about 10–17 seconds.)*
   > "Behind the scenes, Workflow 1 is reading the case and the official directory, and building recommendations. Notice we send only non-identifying details. The applicant's name, phone and email never go to the AI."
4. On the recommendations page, point out: the summary, missing information, urgency, "does not give legal advice", the **"Listed in official directory"** badge, **"Needs verification"** for fees and availability, and **Booking Confirmed: No**, **Human Approval: Required**.
   > "It's honest about what it doesn't know. It found the office in an official source, but it says fees and availability still need checking."
5. Click **Select this service**, then **Submit for review**. *(About 4 seconds.)*
   > "Workflow 2 validates the request, checks the service against a catalogue, and saves it once. If I retry, it won't create a duplicate."
   Point to the green banner: request ID, "pending human review", "No appointment is booked and no provider is assigned."

### Scene 4 — TC2 then TC1: the fee stop and the booking (2:50–4:00)

**Screen:** open **Appointment status** in Window A. *(The slot picker appears after about 25 seconds. Narrate the architecture or the stages while you wait, or cut the wait.)*

1. Show the six-step tracker and the **Available Appointment Slots**.
   > "The workflow has paused at step 5. Nothing is booked until the applicant approves."
2. Switch to **Window B** (staff). Open this application (search "Demo User"; newest first). Type `₹500 consultation fee shown by the portal` and click **Flag unexpected fee & stop booking**.
   > "Suppose the portal reports a fee on a free-aid request. Staff flag it, the status becomes Stopped, and the booking is blocked."
3. Back in Window A, select a slot and click **Confirm Appointment**.
   > "Even though the applicant approved, the system refuses. It tells them why and sends it to a person. That's test case two."
   Show the red message "Booking stopped: an unexpected fee was detected…".
4. In Window B click **Clear fee flag**. In Window A, confirm the appointment again. *(About 10 seconds to confirm.)*
   > "Once staff resolve the fee, the applicant can approve. Now the booking record is stored."
5. In Window B refresh: **Appointment Confirmed** card with a reference, and the audit trail: *submitted, sent for human review, fee flagged, booking refused fee, fee cleared, booking approved, booking confirmed*.
   > "That's test case one: an eligible person, a human approval, a recorded booking. And every step is in the audit trail."

### Scene 5 — TC3 and TC4 (4:00–5:00)

**Screen:** Window B, Applications list.

- **TC3:** search **Meera Patel**. Show the red **URGENT** tag and the banner "Urgent: Court deadline in 3 days (date)". Show the `flag urgent` audit event.
  > "Test case three. A court deadline within three days is detected by a rule, not by the AI, and flagged for the applicant and the reviewer."
- **TC4:** search **Suresh Reddy**. Show the orange **Pending Confirmation** card: "Booking pending — not confirmed… No lawyer has been assigned." Then try to set the status to **Confirmed** and click **Apply**. Show the rejection.
  > "Test case four. The portal has received the request but not confirmed it. The system keeps it pending and says no lawyer has been assigned. Even staff can't mark it confirmed without a booking record."

### Scene 6 — Admin overview (5:00–5:35)

**Screen:** Window B dashboard, then one audit trail.

> "Staff get a dashboard of every application, with filters, and a full audit trail. Statuses are honest: confirmed, in progress, awaiting the applicant, pending, needs verification, or stopped for a fee."

### Scene 7 — Proof (5:35–6:25)

1. **n8n Workflow 1 → Executions:** show the green run with today's time.
2. **Workflow 2 → Executions** and the **`legal_aid_requests` data table** with the new request ID from Scene 3.
3. In the terminal run `python docs/verify_n8n.py`. Hold on **12/12 checks passed**.
   > "These aren't mock-ups. These are live workflow runs, and a repeatable script that checks that the recommendation never claims a booking, invalid requests are rejected, unknown services are marked unverified, and duplicates are prevented."

### Scene 8 — Limits and next steps (6:25–7:00)

> "To be clear about what's simulated: the booking step runs against a simulated portal inside our backend, and fees are flagged by staff in this demo. Our next step is a mock legal aid portal that returns real pending, confirmed and fee states, then deployment and nearest-office matching. The principle stays the same: the system must prove what happened, not merely say what it intended to do. Thank you."

---

## 5. Honest framing (important)

- Say **"simulated portal"** or **"mock portal"** for the booking step. Don't say a real authority confirmed anything.
- Say **"flagged by staff in this demo"** for the fee. Don't say it was detected automatically from a live portal.
- Recommendations are **"listed in an official directory"**, not "verified free".
- Never say the system **decides eligibility**. It gathers evidence and a person reviews.

Judges respect a clear, honest limitation far more than a claim that falls apart under a question.

---

## 6. Questions judges are likely to ask

| Question | Short answer |
|---|---|
| What makes this agentic and not a chatbot? | It plans steps, uses tools (official sources, a catalogue, the backend), pauses for human approval, takes an action and checks the result. The recommendation, the request and the booking are separate steps. |
| Where does the AI decide and where do rules decide? | AI summarises and recommends. Fees, urgency, status and "no confirmation without a record" are code and are testable. |
| How do you stop it claiming a booking that didn't happen? | Status comes from the stored booking record. A pending or unverified request stays pending, and staff can't mark Confirmed without a record. |
| What happens if the portal fails or shows a fee? | A fee stops the booking even after approval, and staff must clear it. A failure leaves the request pending or needing verification, never confirmed. |
| Is the booking real? | In this build it runs against a simulated portal; the workflows and rules are real and tested. A mock portal returning real states is the next step. |
| How do you protect privacy? | Name, phone and email never go to n8n or the AI. Only non-identifying details do. Staff actions are logged. |
| Does it give legal advice? | No, and it says so on the recommendations page. |
| What about OTP or CAPTCHA? | We never bypass them. A manual human step in the portal flow is on the roadmap. |
| Why n8n? | Visible, auditable workflows that can be shown live, with the AI and web sources wired in quickly. |
| How would it scale? | Add more states' official sources, replace the static authority list with live directories, and move the database off SQLite. |

---

## 7. If something goes wrong on camera

| Problem | What to do |
|---|---|
| The recommendation takes longer than 20 seconds | Keep talking about what Workflow 1 does. If it passes about 60 seconds, stop, refresh and retry. In rehearsal it took 9–17 seconds. |
| The submit step shows an error | Retry once. Workflow 2 answers in about 4 seconds; it failed once in four rehearsal runs and worked on retry. Cut the failed take. |
| Duplicate request ID appears | You reused a date. Pick a new date. |
| The slot picker is slow | It appears about 25 seconds after creating the request. Narrate the architecture or speed it up in the edit. |
| Backend not responding | Re-run `docs\start_demo.ps1 -Force`, then sign in again. |
| Records look wrong | Re-run the launcher. It rebuilds the demo data from scratch. |
| n8n shows an error or is slow | Use the proof script output you saved the day before as a backup shot. |

Always record a **backup** of Scenes 3–4 on the day before.

---

## 8. Final checklist

- [ ] Demo launched fresh (`start_demo.ps1 -Force`) and both windows signed in
- [ ] A new, unused appointment date chosen
- [ ] `.env` files closed; no credentials on screen
- [ ] Notifications off; screen 1920×1080; microphone tested
- [ ] n8n executions, data table and terminal tabs ready
- [ ] `verify_n8n.py` passes 12/12
- [ ] Practised the script once with a stopwatch
- [ ] Narration says "simulated portal" and "flagged by staff"
- [ ] Exported as MP4, 1080p, under the size limit; played back once with sound

---

## 9. Three-minute cut

If the submission limits you to 3 minutes:

| Time | Content |
|---|---|
| 0:00–0:20 | Problem (Scene 1, shortened) |
| 0:20–0:45 | Architecture, one sentence per part |
| 0:45–1:50 | Applicant journey, sped up: form, recommendations, review saved |
| 1:50–2:30 | Fee stop, then approval and confirmed, with the audit trail |
| 2:30–2:50 | Urgent and pending records, 10 seconds each |
| 2:50–3:00 | `verify_n8n.py` 12/12 and the honest limit |
