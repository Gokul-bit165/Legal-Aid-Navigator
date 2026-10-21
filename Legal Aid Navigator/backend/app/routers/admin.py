"""Admin router – staff view over every legal-aid application."""

from collections import Counter
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import audit
from app.database import get_db
from app.models import AuditEvent, LegalAidRequest, User
from app.routers.auth import get_current_user
from app.routers.requests import build_status_out
from app.statuses import (
    ALL_STATUSES, ASSIGNABLE_STATUSES, CONFIRMED, category, display_status,
)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Administrator access required")
    return user


def _parse_day(value: Optional[str], end: bool = False) -> Optional[datetime]:
    if not value:
        return None
    try:
        d = datetime.strptime(value[:10], "%Y-%m-%d")
    except ValueError:
        raise HTTPException(400, f"Invalid date: {value}")
    return d + timedelta(days=1) if end else d


def _filtered(db: Session, search: str, issue: str, date_from: Optional[str], date_to: Optional[str]):
    q = db.query(LegalAidRequest)
    if search.strip():
        like = f"%{search.strip()}%"
        q = q.filter(or_(
            LegalAidRequest.full_name.ilike(like), LegalAidRequest.request_id.ilike(like),
            LegalAidRequest.mobile_number.ilike(like), LegalAidRequest.email.ilike(like),
        ))
    if issue:
        q = q.filter(LegalAidRequest.issue_type == issue)
    start, end = _parse_day(date_from), _parse_day(date_to, end=True)
    if start:
        q = q.filter(LegalAidRequest.created_at >= start)
    if end:
        q = q.filter(LegalAidRequest.created_at < end)
    return q.order_by(LegalAidRequest.created_at.desc())


def _row(r: LegalAidRequest) -> Dict[str, Any]:
    return {
        "id": r.id,
        "request_id": r.request_id,
        "applicant_name": r.full_name or "—",
        "legal_issue": r.issue_type or "—",
        "location": ", ".join(p for p in [r.district, r.state] if p) or "—",
        "status": display_status(r),
        "is_urgent": bool(r.is_urgent),
        "fee_detected": bool(r.fee_detected),
        "submitted_at": r.created_at,
    }


@router.get("/stats")
def stats(
    date_from: Optional[str] = None, date_to: Optional[str] = None,
    db: Session = Depends(get_db), _: User = Depends(require_admin),
):
    rows = _filtered(db, "", "", date_from, date_to).all()
    cats = Counter(category(r) for r in rows)
    return {
        "total": len(rows),
        "confirmed": cats["confirmed"],
        "in_progress": cats["in_progress"],
        "needs_attention": cats["attention"],
        "urgent": sum(1 for r in rows if r.is_urgent),
    }


@router.get("/requests")
def list_all(
    search: str = "", status: str = "", issue: str = "",
    date_from: Optional[str] = None, date_to: Optional[str] = None,
    page: int = Query(1, ge=1), page_size: int = Query(8, ge=1, le=100),
    db: Session = Depends(get_db), _: User = Depends(require_admin),
):
    rows = _filtered(db, search, issue, date_from, date_to).all()
    if status:
        rows = [r for r in rows if display_status(r) == status]
    total = len(rows)
    start = (page - 1) * page_size
    return {
        "items": [_row(r) for r in rows[start:start + page_size]],
        "total": total, "page": page, "page_size": page_size,
        "issue_types": sorted({i[0] for i in db.query(LegalAidRequest.issue_type).distinct() if i[0]}),
        "statuses": ALL_STATUSES,
    }


def _detail(db: Session, r: LegalAidRequest) -> Dict[str, Any]:
    st = build_status_out(r)
    events = (
        db.query(AuditEvent).filter(AuditEvent.request_id == r.id)
        .order_by(AuditEvent.created_at.asc()).all()
    )
    return {
        "id": r.id,
        "request_id": r.request_id,
        "status": display_status(r),
        "category": category(r),
        "assignable_statuses": ASSIGNABLE_STATUSES,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
        "current_stage": r.current_stage,
        "stages": [s.model_dump() for s in st.stages],
        "available_slots": [s.model_dump() for s in (st.available_slots or [])],
        "booking_confirmation": st.booking_confirmation.model_dump() if st.booking_confirmation else None,
        "applicant": {
            "name": r.full_name or "", "mobile": r.mobile_number or "", "email": r.email or "",
            "preferred_contact": r.preferred_contact or "",
        },
        "request": {
            "state": r.state or "", "district": r.district or "", "city": r.city or "",
            "pin_code": r.pin_code or "",
            "issue_type": r.issue_type or "", "description": r.issue_description or "",
            "court_case_in_progress": r.court_case_in_progress or "",
            "court_deadline": r.court_deadline or "",
            "eligibility_category": r.eligibility_category or "",
            "eligibility_details": r.eligibility_details or "",
            "supporting_document": r.supporting_document or "",
        },
        "appointment": {
            "preferred_date": r.preferred_date or "", "preferred_time_slot": r.preferred_time_slot or "",
            "mode": r.appt_mode or r.consultation_mode or "",
            "alt_date": r.alt_date or "", "alt_time_slot": r.alt_time_slot or "",
        },
        "service": {
            "id": r.service_id or "", "name": r.service_name or "",
            "match_status": r.service_match_status or "", "review_reference": r.n8n_request_id or "",
        },
        "flags": {
            "is_urgent": bool(r.is_urgent), "urgent_reason": r.urgent_reason or "",
            "fee_detected": bool(r.fee_detected), "fee_details": r.fee_details or "",
        },
        "notes": r.admin_notes or "",
        "additional_notes": r.additional_notes or "",
        "audit": [
            {"actor": e.actor, "action": e.action, "detail": e.detail or "", "at": e.created_at}
            for e in events
        ],
    }


@router.get("/requests/{pk}")
def detail(pk: str, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    r = db.query(LegalAidRequest).filter(LegalAidRequest.id == pk).first()
    if not r:
        raise HTTPException(404, "Application not found")
    return _detail(db, r)


class UpdateIn(BaseModel):
    admin_status: Optional[str] = None
    admin_notes: Optional[str] = None
    full_name: Optional[str] = None
    mobile_number: Optional[str] = None
    email: Optional[str] = None
    fee_detected: Optional[bool] = None
    fee_details: Optional[str] = None
    is_urgent: Optional[bool] = None


@router.patch("/requests/{pk}")
def update(
    pk: str, body: UpdateIn,
    db: Session = Depends(get_db), admin: User = Depends(require_admin),
):
    r = db.query(LegalAidRequest).filter(LegalAidRequest.id == pk).first()
    if not r:
        raise HTTPException(404, "Application not found")
    data = body.model_dump(exclude_unset=True)

    if "fee_detected" in data:
        r.fee_detected = bool(data["fee_detected"])
        if data.get("fee_details"):
            r.fee_details = data["fee_details"]
        audit.log(
            db, r.id, admin.username, "fee_flagged" if r.fee_detected else "fee_cleared",
            (r.fee_details or "") if r.fee_detected else "Fee flag cleared by staff",
        )
    if "admin_status" in data:
        new = data["admin_status"]
        if new and new not in ASSIGNABLE_STATUSES:
            raise HTTPException(400, f"Status must be one of: {', '.join(ASSIGNABLE_STATUSES)}")
        # Staff cannot mark a booking confirmed unless a confirmation exists on record.
        if new == CONFIRMED and r.status != "completed" and not r.booking_reference:
            raise HTTPException(400, "No booking confirmation is on record, so this cannot be marked Confirmed.")
        if r.fee_detected and new:
            raise HTTPException(409, "Clear the fee flag before changing the status.")
        audit.log(db, r.id, admin.username, "status_changed", f"{display_status(r)} → {new or 'automatic'}")
        r.admin_status = new or None
    if "is_urgent" in data:
        r.is_urgent = bool(data["is_urgent"])
        r.urgent_reason = r.urgent_reason or ("Flagged urgent by staff" if r.is_urgent else None)
        audit.log(db, r.id, admin.username, "urgent_set" if r.is_urgent else "urgent_cleared")
    if "admin_notes" in data:
        r.admin_notes = data["admin_notes"] or ""
        audit.log(db, r.id, admin.username, "note_updated")
    for field in ("full_name", "mobile_number", "email"):
        if data.get(field) is not None:
            setattr(r, field, data[field].strip())
            audit.log(db, r.id, admin.username, "applicant_edited", field)
    db.commit()
    db.refresh(r)
    return _detail(db, r)


@router.get("/users")
def users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    out = []
    for u in db.query(User).order_by(User.created_at.desc()).all():
        count = db.query(LegalAidRequest).filter(LegalAidRequest.user_id == u.id).count()
        out.append({
            "id": u.id, "username": u.username, "email": u.email,
            "full_name": u.full_name or "", "role": u.role or "applicant",
            "created_at": u.created_at, "applications": count,
        })
    return {"items": out}


@router.get("/appointments")
def appointments(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    items = []
    for r in db.query(LegalAidRequest).order_by(LegalAidRequest.created_at.desc()).all():
        if not r.preferred_date and r.status != "completed":
            continue
        items.append({
            "id": r.id, "request_id": r.request_id, "applicant_name": r.full_name or "—",
            "date": r.preferred_date or "—", "time_slot": r.preferred_time_slot or "—",
            "mode": r.appt_mode or r.consultation_mode or "—",
            "location": ", ".join(p for p in [r.district, r.state] if p) or "—",
            "status": display_status(r), "is_urgent": bool(r.is_urgent),
        })
    return {"items": items}


@router.get("/reports")
def reports(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    rows = db.query(LegalAidRequest).all()
    return {
        "total": len(rows),
        "by_status": dict(Counter(display_status(r) for r in rows)),
        "by_issue": dict(Counter(r.issue_type or "Unspecified" for r in rows)),
        "by_district": dict(Counter(r.district or "Unspecified" for r in rows)),
        "urgent": sum(1 for r in rows if r.is_urgent),
        "fee_stopped": sum(1 for r in rows if r.fee_detected),
        "unverified_service": sum(1 for r in rows if r.service_match_status == "unverified"),
    }
