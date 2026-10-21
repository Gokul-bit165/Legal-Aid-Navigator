"""Requests router – create request, get status, list requests, approve booking
"""

import json
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, LegalAidRequest, WorkflowStage, WorkflowSubtask
from app.statuses import urgency_from_form
from app import audit
from pydantic import BaseModel
from app.schemas import (
    CreateRequestIn, CreateRequestOut,
    RequestStatusOut, StageOut, SubtaskOut, RequestSummaryOut,
    AppointmentSlotOut, BookingConfirmationOut,
    ApproveBookingIn, RequestListItemOut,
)
from app.routers.auth import get_current_user
from app.workflow import STAGE_DEFS, start_workflow_thread, start_booking_thread

router = APIRouter(prefix="/api/v1/requests", tags=["requests"])


def _next_request_id(db: Session) -> str:
    """Generate sequential display ID like LA-2025-00001."""
    count = db.query(LegalAidRequest).count()
    year = datetime.utcnow().year
    return f"LA-{year}-{count + 1:05d}"


def _prettify_mode(mode: str) -> str:
    m = {"in_person": "In person", "phone": "Phone", "video": "Video call"}
    return m.get(mode, mode.replace("_", " ").title() if mode else "")


@router.post("", response_model=CreateRequestOut, status_code=201)
def create_request(
    body: CreateRequestIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    f = body.form

    req = LegalAidRequest(
        request_id=_next_request_id(db),
        user_id=user.id,
        # Location
        country=f.location.country,
        state=f.location.state,
        district=f.location.district,
        city=f.location.city,
        pin_code=f.location.pin_code,
        # Legal issue
        issue_type=f.legal_issue.issue_type,
        issue_description=f.legal_issue.description,
        court_case_in_progress=f.legal_issue.court_case_in_progress,
        court_deadline=f.legal_issue.court_deadline,
        urgency=f.legal_issue.urgency,
        # Eligibility
        eligibility_category=f.eligibility.eligibility_category,
        eligibility_details=f.eligibility.eligibility_details,
        supporting_document=f.eligibility.supporting_document,
        # Contact
        full_name=f.contact.full_name,
        mobile_number=f.contact.mobile_number,
        email=f.contact.email,
        preferred_contact=f.contact.preferred_contact,
        consultation_mode=f.contact.consultation_mode,
        # Appointment
        preferred_date=f.appointment.preferred_date,
        preferred_time_slot=f.appointment.preferred_time_slot,
        appt_mode=f.appointment.consultation_mode,
        alt_date=f.appointment.alt_date,
        alt_time_slot=f.appointment.alt_time_slot,
        additional_notes=f.appointment.additional_notes,
    )
    req.is_urgent, req.urgent_reason = urgency_from_form(
        f.legal_issue.urgency, f.legal_issue.court_deadline
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    audit.log(db, req.id, user.username, "submitted", "Application submitted by applicant")
    if req.is_urgent:
        audit.log(db, req.id, "system", "flag_urgent", req.urgent_reason or "")
    db.commit()

    # Create all 6 stages + subtasks
    for sdef in STAGE_DEFS:
        stage = WorkflowStage(
            request_id=req.id,
            stage_number=sdef["number"],
            name=sdef["name"],
        )
        db.add(stage)
        db.commit()
        db.refresh(stage)

        for order, (label, desc) in enumerate(sdef["subtasks"]):
            # Template substitution for eligibility category
            desc_filled = desc.replace("{eligibility_category}", req.eligibility_category or "N/A")
            st = WorkflowSubtask(
                stage_id=stage.id,
                order=order,
                label=label,
                description=desc_filled,
            )
            db.add(st)
        db.commit()

    # Start workflow in background
    start_workflow_thread(req.id)

    return CreateRequestOut(id=req.id, request_id=req.request_id)


@router.get("", response_model=List[RequestListItemOut])
def list_requests(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return all requests for the authenticated user (most recent first)."""
    reqs = (
        db.query(LegalAidRequest)
        .filter(LegalAidRequest.user_id == user.id)
        .order_by(LegalAidRequest.created_at.desc())
        .all()
    )
    return [
        RequestListItemOut(
            id=r.id,
            request_id=r.request_id,
            status=r.status,
            current_stage=r.current_stage,
            issue_type=r.issue_type or "—",
            location=f"{r.state or ''}, {r.district or ''}".strip(", "),
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in reqs
    ]


def build_status_out(req: LegalAidRequest) -> RequestStatusOut:
    # Build stages
    stages_out = []
    for stage in req.stages:
        subtasks = [
            SubtaskOut(
                id=st.id,
                label=st.label,
                description=st.description,
                status=st.status,
                completed_at=st.completed_at,
                error=st.error,
            )
            for st in stage.subtasks
        ]
        result = None
        if stage.result_json:
            try:
                result = json.loads(stage.result_json)
            except Exception:
                pass
        stages_out.append(
            StageOut(
                stage_number=stage.stage_number,
                name=stage.name,
                status=stage.status,
                started_at=stage.started_at,
                completed_at=stage.completed_at,
                error=stage.error,
                subtasks=subtasks,
                result_json=result,
            )
        )

    # Build summary
    location_parts = [p for p in [req.state, req.district, req.city] if p]
    summary = RequestSummaryOut(
        location=", ".join(location_parts) if location_parts else "—",
        legal_issue=req.issue_type or "—",
        eligibility_category=req.eligibility_category or "—",
        name=req.full_name or "—",
        mobile_number=req.mobile_number or "—",
        email=req.email or "—",
        preferred_date=req.preferred_date or "—",
        preferred_time_slot=req.preferred_time_slot or "—",
        consultation_mode=_prettify_mode(req.appt_mode or req.consultation_mode or ""),
    )

    # Extract slots from stage 4 result
    available_slots = None
    stage4 = next((s for s in stages_out if s.stage_number == 4), None)
    if stage4 and stage4.result_json and stage4.status == "completed":
        raw_slots = stage4.result_json.get("slots", [])
        available_slots = [AppointmentSlotOut(**s) for s in raw_slots]

    # Extract booking confirmation from stage 6 result
    booking_confirmation = None
    stage6 = next((s for s in stages_out if s.stage_number == 6), None)
    if stage6 and stage6.result_json and stage6.status == "completed":
        try:
            booking_confirmation = BookingConfirmationOut(**stage6.result_json)
        except Exception:
            pass

    return RequestStatusOut(
        id=req.id,
        request_id=req.request_id,
        status=req.status,
        current_stage=req.current_stage,
        created_at=req.created_at,
        updated_at=req.updated_at,
        stages=stages_out,
        summary=summary,
        available_slots=available_slots,
        booking_confirmation=booking_confirmation,
    )


@router.get("/{request_id}/status", response_model=RequestStatusOut)
def get_status(
    request_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    req = db.query(LegalAidRequest).filter(LegalAidRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.user_id != user.id:
        raise HTTPException(403, "Not your request")
    return build_status_out(req)


class ReviewIn(BaseModel):
    n8n_request_id: str
    service_id: str = ""
    service_name: str = ""
    service_match_status: str = "unverified"


@router.post("/{request_id}/review")
def record_review(
    request_id: str,
    body: ReviewIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Record that the request-review workflow saved this request for human review."""
    req = db.query(LegalAidRequest).filter(LegalAidRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.user_id != user.id:
        raise HTTPException(403, "Not your request")
    req.n8n_request_id = body.n8n_request_id
    req.service_id = body.service_id
    req.service_name = body.service_name
    req.service_match_status = "verified" if body.service_match_status == "verified" else "unverified"
    audit.log(
        db, req.id, user.username, "sent_for_human_review",
        f"{body.service_name or body.service_id} · service {req.service_match_status} · ref {body.n8n_request_id}",
    )
    db.commit()
    return {"success": True}


@router.post("/{request_id}/book")
def approve_booking(
    request_id: str,
    body: ApproveBookingIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    req = db.query(LegalAidRequest).filter(LegalAidRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.user_id != user.id:
        raise HTTPException(403, "Not your request")
    if req.fee_detected:
        raise HTTPException(409, "Booking stopped: an unexpected fee was detected. A staff member must review it.")
    if req.status != "awaiting_approval":
        raise HTTPException(400, "Request is not awaiting booking approval")

    # Validate slot exists
    stage4 = db.query(WorkflowStage).filter(
        WorkflowStage.request_id == request_id,
        WorkflowStage.stage_number == 4,
    ).first()
    if not stage4 or not stage4.result_json:
        raise HTTPException(400, "No slots available")

    data = json.loads(stage4.result_json)
    slot_ids = [s["id"] for s in data.get("slots", [])]
    if body.slot_id not in slot_ids:
        raise HTTPException(400, "Invalid slot ID")

    # Launch booking in background
    start_booking_thread(req.id, body.slot_id)

    return {"success": True}
