"""
Demo data for the admin portal.

Everything created here is synthetic (fake names, numbers and emails) and is tagged in the
notes. It covers the four official test cases plus a few ordinary requests. Runs once: it does
nothing if the seeded admin account already exists.
"""

import json
import secrets
from datetime import date, datetime, timedelta

from app import audit
from app.auth import hash_password
from app.database import SessionLocal
from app.models import (
    LegalAidRequest, User, WorkflowStage, WorkflowSubtask,
)
from app.workflow import STAGE_DEFS

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Admin@12345"
SYNTHETIC = "Synthetic demo record."


def _stages(db, req, upto, active=None, active_status="in_progress", fail_stage=None,
            fail_error=None, results=None):
    """Create the six stages: 1..upto completed, `active` in the given state, rest pending."""
    results = results or {}
    t = req.created_at
    for sdef in STAGE_DEFS:
        n = sdef["number"]
        if fail_stage == n:
            status = "failed"
        elif n <= upto:
            status = "completed"
        elif n == active:
            status = active_status
        else:
            status = "pending"
        t = t + timedelta(minutes=12)
        stage = WorkflowStage(
            request_id=req.id, stage_number=n, name=sdef["name"], status=status,
            started_at=t if status != "pending" else None,
            completed_at=t + timedelta(minutes=4) if status == "completed" else None,
            error=fail_error if status == "failed" else None,
            result_json=json.dumps(results[n]) if n in results else None,
        )
        db.add(stage)
        db.flush()
        for order, (label, desc) in enumerate(sdef["subtasks"]):
            desc = desc.replace("{eligibility_category}", req.eligibility_category or "N/A")
            done = status == "completed"
            db.add(WorkflowSubtask(
                stage_id=stage.id, order=order, label=label, description=desc,
                status="completed" if done else ("failed" if status == "failed" and order == 0 else "pending"),
                completed_at=stage.completed_at if done else None,
            ))


def _applicant(db, username, full_name, email):
    u = db.query(User).filter(User.username == username).first()
    if not u:
        u = User(
            username=username, email=email, full_name=full_name, role="applicant",
            hashed_pw=hash_password(secrets.token_urlsafe(18)),  # not meant for login
        )
        db.add(u)
        db.flush()
    return u


def backdate_audit(db) -> None:
    """Spread each seeded request's audit events after its submission time, not at seeding time."""
    from app.models import AuditEvent
    for req in db.query(LegalAidRequest).join(User, User.id == LegalAidRequest.user_id).filter(User.username.like("seed_%")):
        events = (db.query(AuditEvent).filter(AuditEvent.request_id == req.id)
                  .order_by(AuditEvent.created_at.asc(), AuditEvent.id.asc()).all())
        for i, e in enumerate(events):
            e.created_at = req.created_at + timedelta(minutes=10 * (i + 1))


def seed_demo_data() -> None:
    db = SessionLocal()
    try:
        if db.query(User).filter(User.username == ADMIN_USERNAME).first():
            return

        db.add(User(
            username=ADMIN_USERNAME, email="admin@legalaid.example", full_name="Admin User",
            role="admin", hashed_pw=hash_password(ADMIN_PASSWORD),
        ))
        db.flush()

        today = date.today()
        iso = lambda d: d.isoformat()  # noqa: E731
        base_count = db.query(LegalAidRequest).count()

        def new_request(i, username, name, issue, state, district, category, created_days_ago, **kw):
            u = _applicant(db, username, name, f"{username}@example.com")
            created = datetime.utcnow() - timedelta(days=created_days_ago, hours=i)
            req = LegalAidRequest(
                request_id=f"LA-{today.year}-{base_count + i:05d}", user_id=u.id,
                country="India", state=state, district=district, city=district,
                issue_type=issue, issue_description=kw.pop("description", ""),
                court_case_in_progress=kw.pop("court", "no"), court_deadline=kw.pop("deadline", ""),
                urgency=kw.pop("urgency", "normal"),
                eligibility_category=category, supporting_document="yes",
                full_name=name, mobile_number=f"98{i:08d}"[:10], email=f"{username}@example.com",
                preferred_contact="phone", consultation_mode="in_person", appt_mode="in_person",
                preferred_date=iso(today + timedelta(days=kw.pop("appt_in", 7))),
                preferred_time_slot=kw.pop("slot", "10:00 - 11:00"),
                admin_notes=kw.pop("notes", SYNTHETIC), created_at=created, updated_at=created,
                **{k: v for k, v in kw.items() if k in {
                    "status", "current_stage", "admin_status", "is_urgent", "urgent_reason",
                    "fee_detected", "fee_details", "service_id", "service_name",
                    "service_match_status", "n8n_request_id", "booking_reference"}},
            )
            db.add(req)
            db.flush()
            return req

        # TC1 – eligible person, booked and verified
        r = new_request(1, "seed_anita", "Anita Sharma", "Family and matrimonial disputes",
                        "Karnataka", "Bengaluru", "Low income / financially weaker section", 10,
                        status="completed", current_stage=6, service_id="DLSA-BLR-001",
                        service_name="District Legal Services Authority, Bengaluru Urban",
                        service_match_status="verified", n8n_request_id="req_demo_tc1",
                        booking_reference="DLSA-BLR-2025-4587", appt_in=-2)
        _stages(db, r, 6, results={6: {
            "confirmation_number": "DLSA-BLR-2025-4587",
            "authority_name": "District Legal Services Authority, Bengaluru Urban",
            "date": iso(today - timedelta(days=2)), "time_slot": "10:00 - 11:00",
            "location": "Bengaluru, Karnataka", "mode": "In person",
            "notes": "Booking record and date verified against the mock portal."}})
        audit.log(db, r.id, "seed_anita", "submitted", "TC1 – eligible person in district")
        audit.log(db, r.id, "agent", "service_found", "District Legal Services Authority, Bengaluru Urban")
        audit.log(db, r.id, "seed_anita", "booking_approved", "Applicant approved the proposed booking")
        audit.log(db, r.id, "agent", "booking_verified", "Booking record and date confirmed on portal")

        # TC2 – unexpected fee, booking stopped
        r = new_request(2, "seed_rahul", "Rahul Kumar", "Employment and labour disputes",
                        "Maharashtra", "Mumbai", "Low income / financially weaker section", 9,
                        status="failed", current_stage=4, fee_detected=True,
                        fee_details="Portal showed a ₹500 consultation fee for a free-aid request",
                        service_id="DLSA-MUM-004", service_name="District Legal Services Authority, Mumbai",
                        service_match_status="verified")
        _stages(db, r, 3, fail_stage=4, fail_error="Booking stopped: unexpected fee detected")
        audit.log(db, r.id, "seed_rahul", "submitted", "TC2 – unexpected fee")
        audit.log(db, r.id, "agent", "fee_flagged", "Portal showed a ₹500 consultation fee for a free-aid request")
        audit.log(db, r.id, "agent", "booking_stopped", "Stopped regardless of approval; flagged for staff review")

        # TC3 – court deadline in three days, urgent
        dl = iso(today + timedelta(days=3))
        r = new_request(3, "seed_meera", "Meera Patel", "Property and land disputes",
                        "Gujarat", "Ahmedabad", "Women, including relevant domestic violence cases", 1,
                        status="awaiting_approval", current_stage=5, court="yes", deadline=dl,
                        urgency="urgent", is_urgent=True, urgent_reason=f"Court deadline in 3 days ({dl})",
                        service_id="DLSA-AMD-002", service_name="District Legal Services Authority, Ahmedabad",
                        service_match_status="verified", appt_in=1)
        _stages(db, r, 4, active=5, active_status="awaiting_approval", results={4: {"slots": [
            {"id": "slot-1", "date": iso(today + timedelta(days=1)), "time_slot": "09:00 - 10:00",
             "authority_name": "DLSA Ahmedabad", "location": "Ahmedabad, Gujarat", "mode": "In person"}]}})
        audit.log(db, r.id, "seed_meera", "submitted", "TC3 – court deadline in three days")
        audit.log(db, r.id, "system", "flag_urgent", f"Court deadline in 3 days ({dl})")
        audit.log(db, r.id, "agent", "priority_search", "Prioritised qualified legal assistance")

        # TC4 – portal received the request, booking still pending
        r = new_request(4, "seed_suresh", "Suresh Reddy", "Domestic violence",
                        "Telangana", "Hyderabad", "Women, including relevant domestic violence cases", 3,
                        status="in_progress", current_stage=5, admin_status="Pending Confirmation",
                        service_id="DLSA-HYD-003", service_name="District Legal Services Authority, Hyderabad",
                        service_match_status="verified")
        _stages(db, r, 4, active=5, active_status="in_progress")
        audit.log(db, r.id, "seed_suresh", "submitted", "TC4 – booking still pending")
        audit.log(db, r.id, "agent", "booking_submitted", "Portal acknowledged the request")
        audit.log(db, r.id, "agent", "verification_pending",
                  "Portal status is Pending – no lawyer assigned and no confirmed appointment")

        # Ordinary requests
        r = new_request(5, "seed_priya", "Priya Singh", "Consumer complaints", "Uttar Pradesh", "Lucknow",
                        "Other / state-specific eligibility category", 4, status="in_progress",
                        current_stage=3, service_match_status="unverified", n8n_request_id="req_demo_005",
                        service_name="Selected service could not be verified")
        _stages(db, r, 2, active=3)
        audit.log(db, r.id, "seed_priya", "submitted", "")
        audit.log(db, r.id, "seed_priya", "sent_for_human_review", "service unverified")

        r = new_request(6, "seed_arjun", "Arjun Nair", "Accident compensation", "Kerala", "Kochi",
                        "Low income / financially weaker section", 11, status="completed", current_stage=6,
                        service_id="DLSA-KOC-005", service_name="District Legal Services Authority, Ernakulam",
                        service_match_status="verified", booking_reference="DLSA-KOC-2025-1180", appt_in=-5)
        _stages(db, r, 6, results={6: {
            "confirmation_number": "DLSA-KOC-2025-1180",
            "authority_name": "District Legal Services Authority, Ernakulam",
            "date": iso(today - timedelta(days=5)), "time_slot": "11:00 - 12:00",
            "location": "Kochi, Kerala", "mode": "In person", "notes": ""}})
        audit.log(db, r.id, "seed_arjun", "submitted", "")
        audit.log(db, r.id, "agent", "booking_verified", "Booking record and date confirmed on portal")

        r = new_request(7, "seed_kavita", "Kavita Joshi", "Pension and social welfare issues", "Rajasthan",
                        "Jaipur", "Not sure / need assistance identifying the applicable category", 5,
                        status="in_progress", current_stage=3, admin_status="Not Eligible",
                        notes=SYNTHETIC + " Income above the state limit.")
        _stages(db, r, 3)
        audit.log(db, r.id, "seed_kavita", "submitted", "")
        audit.log(db, r.id, "admin", "status_changed", "In Progress → Not Eligible")

        r = new_request(8, "seed_imran", "Imran Khan", "Criminal matters", "Madhya Pradesh", "Bhopal",
                        "Persons in custody", 6, status="in_progress", current_stage=2)
        _stages(db, r, 1, active=2)
        audit.log(db, r.id, "seed_imran", "submitted", "")

        db.flush()
        backdate_audit(db)
        db.commit()
    finally:
        db.close()
