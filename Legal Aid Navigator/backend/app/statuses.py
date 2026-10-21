"""
Display-status rules for the admin portal.

These are explicit, testable rules (no LLM involved). A pending or unverified request is never
reported as confirmed, and a detected fee always stops the booking.
"""

from datetime import date, datetime
from typing import Optional, Tuple

from app.models import LegalAidRequest

CONFIRMED = "Confirmed"
IN_PROGRESS = "In Progress"
AWAITING_USER = "Awaiting User Action"
PENDING = "Pending Confirmation"
NEEDS_VERIFICATION = "Needs Verification"
STOPPED = "Stopped – Fee Detected"
NOT_ELIGIBLE = "Not Eligible"

ALL_STATUSES = [CONFIRMED, IN_PROGRESS, AWAITING_USER, PENDING, NEEDS_VERIFICATION, STOPPED, NOT_ELIGIBLE]
ASSIGNABLE_STATUSES = [IN_PROGRESS, AWAITING_USER, PENDING, NEEDS_VERIFICATION, NOT_ELIGIBLE, CONFIRMED]


def display_status(r: LegalAidRequest) -> str:
    if r.fee_detected:
        return STOPPED
    if r.admin_status:
        return r.admin_status
    if r.status == "completed":
        return CONFIRMED
    if r.status == "awaiting_approval":
        return AWAITING_USER
    if r.status == "failed":
        return NEEDS_VERIFICATION
    if r.n8n_request_id and r.service_match_status == "unverified":
        return NEEDS_VERIFICATION
    return IN_PROGRESS


def category(r: LegalAidRequest) -> str:
    """Partition used by the dashboard tiles: confirmed | attention | in_progress | closed."""
    s = display_status(r)
    if s == CONFIRMED:
        return "confirmed"
    if s in (NEEDS_VERIFICATION, STOPPED) or r.is_urgent:
        return "attention"
    if s == NOT_ELIGIBLE:
        return "closed"
    return "in_progress"


def urgency_from_form(urgency: str, deadline: str, today: Optional[date] = None) -> Tuple[bool, Optional[str]]:
    """Urgent if the applicant said so, or a court deadline is within three days."""
    today = today or date.today()
    if deadline:
        try:
            days = (datetime.strptime(deadline[:10], "%Y-%m-%d").date() - today).days
            if 0 <= days <= 3:
                return True, f"Court deadline in {days} day{'s' if days != 1 else ''} ({deadline[:10]})"
        except ValueError:
            pass
    if (urgency or "").lower() == "urgent":
        return True, "Applicant marked the request as urgent"
    return False, None
