"""
SQLAlchemy ORM models for Legal Aid Navigator.

Tables
------
users              – registered accounts
legal_aid_requests – one per form submission
workflow_stages    – six per request (one row per stage)
workflow_subtasks  – sub-tasks inside each stage
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer,
    String, Text, func,
)
from sqlalchemy.orm import relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


# ── Users ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id          = Column(String, primary_key=True, default=_uuid)
    username    = Column(String, unique=True, nullable=False, index=True)
    email       = Column(String, unique=True, nullable=False, index=True)
    full_name   = Column(String, nullable=True)
    hashed_pw   = Column(String, nullable=False)
    role        = Column(String, default="applicant")  # applicant | admin
    created_at  = Column(DateTime, default=datetime.utcnow)

    requests    = relationship("LegalAidRequest", back_populates="user")


# ── Legal Aid Request ─────────────────────────────────────────────────────────

class LegalAidRequest(Base):
    __tablename__ = "legal_aid_requests"

    id           = Column(String, primary_key=True, default=_uuid)
    request_id   = Column(String, unique=True, nullable=False, index=True)  # e.g. LA-2025-00001
    user_id      = Column(String, ForeignKey("users.id"), nullable=False)

    # Overall status
    status        = Column(String, default="in_progress")   # in_progress | completed | failed | awaiting_approval
    current_stage = Column(Integer, default=1)              # 1-6

    # Form data – Location
    country       = Column(String, nullable=True)
    state         = Column(String, nullable=True)
    district      = Column(String, nullable=True)
    city          = Column(String, nullable=True)
    pin_code      = Column(String, nullable=True)

    # Form data – Legal Issue
    issue_type               = Column(String, nullable=True)
    issue_description        = Column(Text, nullable=True)
    court_case_in_progress   = Column(String, nullable=True)
    court_deadline           = Column(String, nullable=True)
    urgency                  = Column(String, nullable=True)

    # Form data – Eligibility
    eligibility_category  = Column(String, nullable=True)
    eligibility_details   = Column(Text, nullable=True)
    supporting_document   = Column(String, nullable=True)

    # Form data – Contact
    full_name          = Column(String, nullable=True)
    mobile_number      = Column(String, nullable=True)
    email              = Column(String, nullable=True)
    preferred_contact  = Column(String, nullable=True)
    consultation_mode  = Column(String, nullable=True)

    # Form data – Appointment
    preferred_date      = Column(String, nullable=True)
    preferred_time_slot = Column(String, nullable=True)
    appt_mode           = Column(String, nullable=True)
    alt_date            = Column(String, nullable=True)
    alt_time_slot       = Column(String, nullable=True)
    additional_notes    = Column(Text, nullable=True)

    # Review / admin fields
    admin_status          = Column(String, nullable=True)   # staff override of the displayed status
    admin_notes           = Column(Text, nullable=True)
    is_urgent             = Column(Boolean, default=False)
    urgent_reason         = Column(String, nullable=True)
    fee_detected          = Column(Boolean, default=False)
    fee_details           = Column(String, nullable=True)
    n8n_request_id        = Column(String, nullable=True)   # id returned by the request-review workflow
    service_id            = Column(String, nullable=True)
    service_name          = Column(String, nullable=True)
    service_match_status  = Column(String, nullable=True)   # verified | unverified
    booking_reference     = Column(String, nullable=True)   # only set by a real/mock portal confirmation

    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user    = relationship("User", back_populates="requests")
    stages  = relationship("WorkflowStage", back_populates="request", order_by="WorkflowStage.stage_number", cascade="all, delete-orphan")


# ── Workflow Stage ─────────────────────────────────────────────────────────────

class WorkflowStage(Base):
    __tablename__ = "workflow_stages"

    id            = Column(String, primary_key=True, default=_uuid)
    request_id    = Column(String, ForeignKey("legal_aid_requests.id"), nullable=False)
    stage_number  = Column(Integer, nullable=False)   # 1-6
    name          = Column(String, nullable=False)
    status        = Column(String, default="pending") # pending | in_progress | completed | failed | awaiting_approval
    started_at    = Column(DateTime, nullable=True)
    completed_at  = Column(DateTime, nullable=True)
    error         = Column(Text, nullable=True)
    result_json   = Column(Text, nullable=True)  # JSON string

    request   = relationship("LegalAidRequest", back_populates="stages")
    subtasks  = relationship("WorkflowSubtask", back_populates="stage", order_by="WorkflowSubtask.order", cascade="all, delete-orphan")


# ── Workflow Subtask ───────────────────────────────────────────────────────────

class WorkflowSubtask(Base):
    __tablename__ = "workflow_subtasks"

    id            = Column(String, primary_key=True, default=_uuid)
    stage_id      = Column(String, ForeignKey("workflow_stages.id"), nullable=False)
    order         = Column(Integer, default=0)
    label         = Column(String, nullable=False)
    description   = Column(String, nullable=True)
    status        = Column(String, default="pending")  # pending | in_progress | completed | failed
    completed_at  = Column(DateTime, nullable=True)
    error         = Column(Text, nullable=True)

    stage = relationship("WorkflowStage", back_populates="subtasks")


# ── Audit event ────────────────────────────────────────────────────────────────

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id          = Column(String, primary_key=True, default=_uuid)
    request_id  = Column(String, ForeignKey("legal_aid_requests.id"), nullable=False, index=True)
    actor       = Column(String, nullable=False)          # username, "system" or "agent"
    action      = Column(String, nullable=False)          # e.g. status_changed, flag_fee, note_updated
    detail      = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
