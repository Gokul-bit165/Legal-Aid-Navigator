"""
Workflow Engine
===============
Drives the 6-stage legal-aid request lifecycle in a background thread.

Stages
------
1. Request Submitted      – instant on create
2. Finding Relevant Services  – auto after 4 s
3. Verifying Eligibility      – auto after 6 s
4. Fetching Appointment Slots – auto after 5 s (stores slot data in result_json)
5. Booking Appointment        – PAUSED, waits for user to call /book
6. Confirmation               – auto after booking is approved
"""

import json
import time
import uuid
from datetime import datetime
from threading import Thread
from typing import Optional

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import LegalAidRequest, WorkflowStage, WorkflowSubtask


# ── Stage metadata ─────────────────────────────────────────────────────────────

STAGE_DEFS = [
    {
        "number": 1,
        "name": "Request Submitted",
        "subtasks": [
            ("Request received",       "Your request has been logged in our system."),
            ("Details recorded",       "All form information has been saved securely."),
            ("Workflow initialised",   "Processing pipeline has started."),
        ],
    },
    {
        "number": 2,
        "name": "Finding Relevant Services",
        "subtasks": [
            ("Searching legal-aid database",   "Looking up authorities by state and district."),
            ("Filtering by issue type",        "Matching your legal issue to relevant services."),
            ("Verifying authority details",    "Confirming contact and jurisdiction details."),
        ],
    },
    {
        "number": 3,
        "name": "Verifying Eligibility",
        "subtasks": [
            ("Eligibility category identified",     "Category: {eligibility_category}"),
            ("Checking criteria with relevant authority", "Verifying income limits and supporting information."),
            ("Finalising eligibility assessment",   "Reviewing documents and matching with official rules."),
        ],
    },
    {
        "number": 4,
        "name": "Fetching Appointment Slots",
        "subtasks": [
            ("Contacting authority portal",         "Connecting to the scheduling system."),
            ("Retrieving available dates",          "Fetching open slots that match your preferences."),
            ("Selecting best options for you",      "Filtering by your preferred date and time."),
        ],
    },
    {
        "number": 5,
        "name": "Booking Appointment",
        "subtasks": [
            ("Sending booking request",             "Submitting your appointment confirmation."),
            ("Receiving booking reference",         "Awaiting confirmation number from authority."),
        ],
    },
    {
        "number": 6,
        "name": "Confirmation",
        "subtasks": [
            ("Appointment confirmed",               "Your appointment has been officially registered."),
            ("Notification sent",                   "Confirmation details have been recorded."),
        ],
    },
]

# Delays between stages (seconds)
STAGE_DELAYS = {1: 0, 2: 4, 3: 6, 4: 5, 5: None, 6: 3}  # None = waits for user


def _now() -> datetime:
    return datetime.utcnow()


def _slot_authority(state: str) -> str:
    """Generate a realistic authority name from the state."""
    mapping = {
        "Tamil Nadu":    "District Legal Services Authority, Chennai",
        "Karnataka":     "Karnataka State Legal Services Authority, Bengaluru",
        "Maharashtra":   "Maharashtra State Legal Services Authority, Mumbai",
        "Delhi":         "Delhi State Legal Services Authority, New Delhi",
        "Uttar Pradesh": "U.P. State Legal Services Authority, Lucknow",
        "Kerala":        "Kerala State Legal Services Authority, Thiruvananthapuram",
        "West Bengal":   "West Bengal State Legal Services Authority, Kolkata",
        "Rajasthan":     "Rajasthan State Legal Services Authority, Jaipur",
        "Gujarat":       "Gujarat State Legal Services Authority, Gandhinagar",
        "Andhra Pradesh":"Andhra Pradesh State Legal Services Authority, Amaravati",
        "Telangana":     "Telangana State Legal Services Authority, Hyderabad",
    }
    return mapping.get(state, f"State Legal Services Authority, {state or 'India'}")


def _generate_slots(request: LegalAidRequest) -> list[dict]:
    from datetime import date, timedelta
    # Name the authority after the applicant's own district so the slots match the service they chose.
    authority = (
        f"District Legal Services Authority, {request.district}"
        if request.district else _slot_authority(request.state or "")
    )
    base_date = date.today()
    slots = []
    times = ["10:00 AM – 11:00 AM", "11:30 AM – 12:30 PM", "02:00 PM – 03:00 PM"]
    districts = [
        request.district or "Main Office",
        f"Sub-Court, {request.city or request.district or 'City Centre'}",
    ]
    for i in range(3):
        d = base_date + timedelta(days=5 + i * 3)
        slots.append({
            "id": str(uuid.uuid4()),
            "date": d.isoformat(),
            "time_slot": times[i % len(times)],
            "authority_name": authority,
            "location": districts[i % len(districts)],
            "mode": request.appt_mode or "in_person",
        })
    return slots


# ── DB helpers ─────────────────────────────────────────────────────────────────

def _get_stage(db: Session, req_id: str, stage_num: int) -> Optional[WorkflowStage]:
    return db.query(WorkflowStage).filter(
        WorkflowStage.request_id == req_id,
        WorkflowStage.stage_number == stage_num,
    ).first()


def _complete_subtask(db: Session, stage_id: str, order: int):
    st = db.query(WorkflowSubtask).filter(
        WorkflowSubtask.stage_id == stage_id,
        WorkflowSubtask.order == order,
    ).first()
    if st:
        st.status = "completed"
        st.completed_at = _now()
        db.commit()


def _run_stage(db: Session, req_id: str, stage_num: int, result_json: Optional[dict] = None):
    """Mark a stage in_progress, tick its subtasks, then complete it."""
    stage = _get_stage(db, req_id, stage_num)
    if not stage:
        return

    # Start stage
    stage.status = "in_progress"
    stage.started_at = _now()
    db.commit()

    # Update request
    req = db.query(LegalAidRequest).filter(LegalAidRequest.id == req_id).first()
    if req:
        req.current_stage = stage_num
        req.updated_at = _now()
        db.commit()

    # Tick subtasks one by one (simulate real work)
    subtask_delay = 1.5
    for order in range(len(stage.subtasks)):
        time.sleep(subtask_delay)
        _complete_subtask(db, stage.id, order)

    # Complete stage
    stage.status = "completed"
    stage.completed_at = _now()
    if result_json:
        stage.result_json = json.dumps(result_json)
    db.commit()


# ── Main workflow runner ───────────────────────────────────────────────────────

def run_workflow(request_id_str: str):
    """
    Background thread: runs stages 1-4 automatically with delays,
    then sets stage 5 to 'awaiting_approval' and halts.
    Stage 5 → 6 is triggered by the /book endpoint.
    """
    db = SessionLocal()
    try:
        # ── Stage 1: Request Submitted (instant) ──
        _run_stage(db, request_id_str, 1)

        # ── Stage 2: Finding Services ──
        time.sleep(STAGE_DELAYS[2])
        _run_stage(db, request_id_str, 2)

        # ── Stage 3: Verifying Eligibility ──
        time.sleep(STAGE_DELAYS[3])
        req = db.query(LegalAidRequest).filter(LegalAidRequest.id == request_id_str).first()
        eligibility_result = {
            "eligible": True,
            "category": req.eligibility_category if req else "",
            "note": "Applicant meets income and category criteria.",
        }
        _run_stage(db, request_id_str, 3, result_json=eligibility_result)

        # ── Stage 4: Fetching Appointment Slots ──
        time.sleep(STAGE_DELAYS[4])
        req = db.query(LegalAidRequest).filter(LegalAidRequest.id == request_id_str).first()
        slots = _generate_slots(req) if req else []
        slot_result = {"slots": slots}
        _run_stage(db, request_id_str, 4, result_json=slot_result)

        # ── Stage 5: Awaiting user approval ──
        stage5 = _get_stage(db, request_id_str, 5)
        if stage5:
            stage5.status = "awaiting_approval"
            stage5.started_at = _now()
            db.commit()

        # Update overall status to awaiting approval
        req = db.query(LegalAidRequest).filter(LegalAidRequest.id == request_id_str).first()
        if req:
            req.status = "awaiting_approval"
            req.current_stage = 5
            req.updated_at = _now()
            db.commit()

    except Exception as e:
        # Mark current stage as failed
        try:
            req = db.query(LegalAidRequest).filter(LegalAidRequest.id == request_id_str).first()
            if req:
                stage = _get_stage(db, request_id_str, req.current_stage)
                if stage:
                    stage.status = "failed"
                    stage.error = str(e)
                req.status = "failed"
                req.updated_at = _now()
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def complete_booking(request_id_str: str, slot_id: str):
    """
    Called after user approves a slot.
    Runs stage 5 (Booking) and stage 6 (Confirmation).
    """
    db = SessionLocal()
    try:
        # Find the chosen slot from stage 4 result
        stage4 = _get_stage(db, request_id_str, 4)
        chosen_slot = None
        if stage4 and stage4.result_json:
            data = json.loads(stage4.result_json)
            for s in data.get("slots", []):
                if s["id"] == slot_id:
                    chosen_slot = s
                    break

        # Mark stage 5 as in_progress and complete it
        stage5 = _get_stage(db, request_id_str, 5)
        if stage5:
            stage5.status = "in_progress"
            stage5.started_at = _now()
            db.commit()

            req = db.query(LegalAidRequest).filter(LegalAidRequest.id == request_id_str).first()
            if req:
                req.status = "in_progress"
                req.current_stage = 5
                req.updated_at = _now()
                db.commit()

            # Tick subtasks
            time.sleep(1.5)
            _complete_subtask(db, stage5.id, 0)
            time.sleep(1.5)
            _complete_subtask(db, stage5.id, 1)

            booking_ref = f"BK-{uuid.uuid4().hex[:8].upper()}"
            if req:
                from app import audit
                audit.log(db, req.id, "agent", "booking_confirmed",
                          f"Simulated portal returned reference {booking_ref}")
                db.commit()
            booking_result = {
                "confirmation_number": booking_ref,
                "slot": chosen_slot,
            }
            stage5.status = "completed"
            stage5.completed_at = _now()
            stage5.result_json = json.dumps(booking_result)
            db.commit()

        # ── Stage 6: Confirmation ──
        time.sleep(STAGE_DELAYS[6])
        conf_result = {
            "confirmation_number": booking_ref if chosen_slot else "CONF-" + uuid.uuid4().hex[:6].upper(),
            "authority_name": chosen_slot["authority_name"] if chosen_slot else "",
            "date": chosen_slot["date"] if chosen_slot else "",
            "time_slot": chosen_slot["time_slot"] if chosen_slot else "",
            "location": chosen_slot["location"] if chosen_slot else "",
            "mode": chosen_slot["mode"] if chosen_slot else "",
            "notes": "Please bring a valid photo ID and supporting documents to your appointment.",
        }
        _run_stage(db, request_id_str, 6, result_json=conf_result)

        # Mark request complete
        req = db.query(LegalAidRequest).filter(LegalAidRequest.id == request_id_str).first()
        if req:
            req.status = "completed"
            req.current_stage = 6
            req.updated_at = _now()
            db.commit()

    except Exception as e:
        try:
            req = db.query(LegalAidRequest).filter(LegalAidRequest.id == request_id_str).first()
            if req:
                req.status = "failed"
                req.updated_at = _now()
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def start_workflow_thread(request_id_str: str):
    t = Thread(target=run_workflow, args=(request_id_str,), daemon=True)
    t.start()


def start_booking_thread(request_id_str: str, slot_id: str):
    t = Thread(target=complete_booking, args=(request_id_str, slot_id), daemon=True)
    t.start()
