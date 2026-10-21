"""
Pydantic schemas – request / response bodies for all API routes.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterIn(BaseModel):
    username: str
    email: str
    password: str

class LoginIn(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: str
    username: str
    email: str
    full_name: Optional[str] = None
    role: str = "applicant"
    created_at: datetime

    class Config:
        from_attributes = True

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Create Request ─────────────────────────────────────────────────────────────

class LocationData(BaseModel):
    country: str = ""
    state: str = ""
    district: str = ""
    city: str = ""
    pin_code: str = ""

class LegalIssueData(BaseModel):
    issue_type: str = ""
    description: str = ""
    court_case_in_progress: str = ""
    court_deadline: str = ""
    urgency: str = ""

class EligibilityData(BaseModel):
    eligibility_category: str = ""
    eligibility_details: str = ""
    supporting_document: str = ""

class ContactData(BaseModel):
    full_name: str = ""
    mobile_number: str = ""
    email: str = ""
    preferred_contact: str = ""
    consultation_mode: str = ""

class AppointmentData(BaseModel):
    preferred_date: str = ""
    preferred_time_slot: str = ""
    consultation_mode: str = ""
    alt_date: str = ""
    alt_time_slot: str = ""
    additional_notes: str = ""

class ConsentData(BaseModel):
    consent_use_of_info: bool = False
    consent_accuracy: bool = False
    consent_booking_approval: bool = False

class FormData(BaseModel):
    location: LocationData = LocationData()
    legal_issue: LegalIssueData = LegalIssueData()
    eligibility: EligibilityData = EligibilityData()
    contact: ContactData = ContactData()
    appointment: AppointmentData = AppointmentData()
    consent: ConsentData = ConsentData()
    completedSteps: List[int] = []
    currentStep: int = 1

class CreateRequestIn(BaseModel):
    form: FormData

class CreateRequestOut(BaseModel):
    id: str
    request_id: str


# ── Status response ────────────────────────────────────────────────────────────

class SubtaskOut(BaseModel):
    id: str
    label: str
    description: Optional[str] = None
    status: str
    completed_at: Optional[datetime] = None
    error: Optional[str] = None

    class Config:
        from_attributes = True

class StageOut(BaseModel):
    stage_number: int
    name: str
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    subtasks: List[SubtaskOut] = []
    result_json: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class RequestSummaryOut(BaseModel):
    location: str
    legal_issue: str
    eligibility_category: str
    name: str
    mobile_number: str
    email: str
    preferred_date: str
    preferred_time_slot: str
    consultation_mode: str

class AppointmentSlotOut(BaseModel):
    id: str
    date: str
    time_slot: str
    authority_name: str
    location: str
    mode: str

class BookingConfirmationOut(BaseModel):
    confirmation_number: str
    authority_name: str
    date: str
    time_slot: str
    location: str
    mode: str
    notes: Optional[str] = None

class RequestStatusOut(BaseModel):
    id: str
    request_id: str
    status: str
    current_stage: int
    created_at: datetime
    updated_at: datetime
    stages: List[StageOut]
    summary: RequestSummaryOut
    available_slots: Optional[List[AppointmentSlotOut]] = None
    booking_confirmation: Optional[BookingConfirmationOut] = None

    class Config:
        from_attributes = True


# ── Request list ──────────────────────────────────────────────────────────────

class RequestListItemOut(BaseModel):
    id: str
    request_id: str
    status: str
    current_stage: int
    issue_type: str
    location: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Booking ───────────────────────────────────────────────────────────────────

class ApproveBookingIn(BaseModel):
    slot_id: str
