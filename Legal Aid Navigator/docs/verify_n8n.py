"""
Proof-of-life check for the two n8n workflows.

Run:  python docs/verify_n8n.py
Prints a PASS/FAIL line per check with a timestamp and the request IDs n8n returned, so the
output can be pasted into the submission as evidence. Exit code is 1 if any check fails.

Re-running is safe: the write checks use fixed values, so after the first run n8n answers
"duplicate" instead of saving a new row (and that is itself one of the checks).
"""

import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

BASE = "https://akalya.app.n8n.cloud/webhook"
WF1 = f"{BASE}/9ab4524a-1fc4-4509-8445-34210ebeb486"   # Legal Aid Recommendation
WF2 = f"{BASE}/legal-aid/request"                       # Legal Aid Request Review

WF1_PAYLOAD = {
    "location": {"state": "Tamil Nadu", "district": "Coimbatore", "pincode": "641001",
                 "city": "Coimbatore", "country": "India"},
    "legalIssue": {"category": "Employment and labour disputes",
                   "description": "Employer has not paid wages for three months.",
                   "urgent": False, "courtCaseInProgress": "no", "courtDeadline": ""},
    "eligibility": {"category": "Low income / financially weaker section", "details": "",
                    "supportingDocumentAvailable": True},
    "appointment": {"mode": "in_person", "preferredDate": "2026-12-01",
                    "preferredTimeSlot": "10:00 - 11:00", "altDate": "", "altTimeSlot": "",
                    "additionalNotes": ""},
    "contact": {"preferredContact": "phone", "consultationMode": "in_person"},
    "consent": {"dataUseAccepted": True, "bookingAuthorization": True,
                "accuracyAcknowledged": True},
}


def post(url, body, timeout=120):
    req = urllib.request.Request(
        url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except ValueError:
            return e.code, {"raw": raw[:200]}


if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(errors='replace')

results = []


def check(name, ok, detail=""):
    results.append(ok)
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f"  - {detail}" if detail else ""))


print(f"n8n verification run * {datetime.now(timezone.utc).isoformat(timespec='seconds')}\n")

# ── Workflow 1 ────────────────────────────────────────────────────────────────
print("Workflow 1 - Legal Aid Recommendation")
status, d1 = post(WF1, WF1_PAYLOAD)
check("W1 responds HTTP 200", status == 200, f"HTTP {status}")
needed = ["summary", "missing_information", "urgency", "recommended_next_step", "status",
          "bookingConfirmed", "humanApprovalRequired", "recommended_services"]
missing = [k for k in needed if k not in d1]
check("W1 returns every required field", not missing, f"missing: {missing}" if missing else "")
check("W1 never claims a booking", d1.get("bookingConfirmed") is False)
check("W1 requires human approval", d1.get("humanApprovalRequired") is True)
services = d1.get("recommended_services") or []
check("W1 recommends 1-3 services", 1 <= len(services) <= 3, f"{len(services)} returned")
for s in services:
    print(f"       * {s.get('service_id')}  {s.get('service_name')}  [{s.get('verification_status')}]")
catalogue_id = next((s["service_id"] for s in services if s.get("service_id")), None)

# ── Workflow 2 ────────────────────────────────────────────────────────────────
print("\nWorkflow 2 - Legal Aid Request Review")
good = {"service_id": catalogue_id or "DLSA-COIMBATORE", "service_name": "x",
        "preferred_date": "2026-12-01", "preferred_time": "10:00", "contact_preference": "phone"}

status, d = post(WF2, {k: v for k, v in good.items() if k != "service_id"})
check("W2 rejects a request with no service_id", status == 400 and d.get("success") is False,
      f"HTTP {status}")

status, d = post(WF2, {**good, "preferred_time": "10:00 - 11:00"})
check("W2 rejects a time that is not HH:MM", status == 400, f"HTTP {status}")

status, d = post(WF2, {**good, "service_id": "NOPE-999", "service_name": "Made up"})
check("W2 marks an unknown service as unverified",
      status == 200 and d.get("service_match_status") == "unverified",
      f"match={d.get('service_match_status')}")

status, first = post(WF2, good)
check("W2 saves a valid request (pending human review)",
      status == 200 and first.get("success") is True and first.get("status") == "pending_human_review"
      and bool(first.get("request_id")), f"id={first.get('request_id')}")
check("W2 verifies a catalogue service",
      str(first.get("service_match_status", "")).startswith("verified"),
      f"match={first.get('service_match_status')} for {good['service_id']}")
check("W2 never confirms a booking",
      first.get("bookingConfirmed") is False and first.get("humanApprovalRequired") is True)

status, second = post(WF2, good)
check("W2 does not create a duplicate on retry",
      second.get("duplicate") is True and second.get("request_id") == first.get("request_id"),
      f"duplicate={second.get('duplicate')}, same id={second.get('request_id') == first.get('request_id')}")

print(f"\n{sum(results)}/{len(results)} checks passed")
print("Now open n8n > each workflow > Executions and match the timestamps above.")
sys.exit(0 if all(results) else 1)
