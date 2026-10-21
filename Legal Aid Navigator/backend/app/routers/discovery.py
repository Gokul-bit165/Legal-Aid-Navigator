"""
Discovery router – search legal aid authorities, services, eligibility criteria.
Provides realistic data for Indian states / districts.
"""

from typing import Optional
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/v1/discovery", tags=["discovery"])


# ── Static authority database ──────────────────────────────────────────────────

AUTHORITIES = [
    {
        "id": "dlsa-chennai",
        "name": "District Legal Services Authority, Chennai",
        "state": "Tamil Nadu",
        "district": "Chennai",
        "address": "High Court Campus, Chennai – 600104",
        "phone": "+91-44-2534-5678",
        "email": "dlsa.chennai@tn.gov.in",
        "website": "https://tnslsa.tn.gov.in",
        "services": ["Free Legal Aid", "Lok Adalat", "Legal Awareness Camps", "Victim Compensation"],
        "issue_types": ["Family Law", "Criminal Law", "Property Disputes", "Labour Law", "Consumer Complaints"],
        "eligible_categories": ["SC/ST", "Women", "Children", "Persons with Disability", "Industrial Workmen", "Persons in Custody", "Below Poverty Line"],
        "hours": "Mon–Sat 10:00 AM – 5:00 PM",
    },
    {
        "id": "tnslsa",
        "name": "Tamil Nadu State Legal Services Authority",
        "state": "Tamil Nadu",
        "district": "Chennai",
        "address": "High Court Buildings, Chennai – 600104",
        "phone": "+91-44-2535-1234",
        "email": "tnslsa@tn.gov.in",
        "website": "https://tnslsa.tn.gov.in",
        "services": ["Panel Lawyers", "Supreme Court Legal Aid", "NALSA Schemes", "Legal Literacy"],
        "issue_types": ["Family Law", "Criminal Law", "Civil Disputes", "Constitutional Rights"],
        "eligible_categories": ["SC/ST", "Women", "Children", "Below Poverty Line", "Victims of Trafficking", "Senior Citizens"],
        "hours": "Mon–Fri 10:00 AM – 5:30 PM",
    },
    {
        "id": "dlsa-coimbatore",
        "name": "District Legal Services Authority, Coimbatore",
        "state": "Tamil Nadu",
        "district": "Coimbatore",
        "address": "District Court Complex, Coimbatore – 641018",
        "phone": "+91-422-230-5678",
        "email": "dlsa.coimbatore@tn.gov.in",
        "website": "https://tnslsa.tn.gov.in",
        "services": ["Free Legal Aid", "Lok Adalat", "Legal Awareness Camps"],
        "issue_types": ["Family Law", "Criminal Law", "Property Disputes", "Labour Law"],
        "eligible_categories": ["SC/ST", "Women", "Children", "Below Poverty Line"],
        "hours": "Mon–Sat 10:00 AM – 5:00 PM",
    },
    {
        "id": "dlsa-madurai",
        "name": "District Legal Services Authority, Madurai",
        "state": "Tamil Nadu",
        "district": "Madurai",
        "address": "District Court Complex, Madurai – 625020",
        "phone": "+91-452-234-9012",
        "email": "dlsa.madurai@tn.gov.in",
        "website": "https://tnslsa.tn.gov.in",
        "services": ["Free Legal Aid", "Lok Adalat", "Mediation", "Victim Compensation"],
        "issue_types": ["Family Law", "Criminal Law", "Property Disputes", "Consumer Complaints"],
        "eligible_categories": ["SC/ST", "Women", "Children", "Below Poverty Line", "Senior Citizens"],
        "hours": "Mon–Sat 10:00 AM – 5:00 PM",
    },
    {
        "id": "kslsa",
        "name": "Karnataka State Legal Services Authority",
        "state": "Karnataka",
        "district": "Bengaluru",
        "address": "High Court of Karnataka, Bengaluru – 560001",
        "phone": "+91-80-2295-1234",
        "email": "kslsa@karnataka.gov.in",
        "website": "https://kslsa.kar.nic.in",
        "services": ["Free Legal Aid", "Lok Adalat", "Panel Lawyers", "NALSA Schemes"],
        "issue_types": ["Family Law", "Criminal Law", "Property Disputes", "Labour Law", "Consumer Complaints"],
        "eligible_categories": ["SC/ST", "Women", "Children", "Persons with Disability", "Below Poverty Line"],
        "hours": "Mon–Sat 10:00 AM – 5:00 PM",
    },
    {
        "id": "mhslsa",
        "name": "Maharashtra State Legal Services Authority",
        "state": "Maharashtra",
        "district": "Mumbai",
        "address": "High Court, Fort, Mumbai – 400032",
        "phone": "+91-22-2262-5678",
        "email": "mslsa@maharashtra.gov.in",
        "website": "https://mslsa.maharashtra.gov.in",
        "services": ["Free Legal Aid", "Lok Adalat", "Panel Lawyers", "Legal Literacy Programmes"],
        "issue_types": ["Family Law", "Criminal Law", "Property Disputes", "Labour Law", "Cyber Crime"],
        "eligible_categories": ["SC/ST", "Women", "Children", "Persons with Disability", "Below Poverty Line", "Victims of Trafficking"],
        "hours": "Mon–Fri 10:00 AM – 5:30 PM",
    },
    {
        "id": "dslsa-delhi",
        "name": "Delhi State Legal Services Authority",
        "state": "Delhi",
        "district": "New Delhi",
        "address": "Patiala House Courts, New Delhi – 110001",
        "phone": "+91-11-2374-5678",
        "email": "dslsa@delhi.gov.in",
        "website": "https://dslsa.org",
        "services": ["Free Legal Aid", "Lok Adalat", "Mediation", "Legal Awareness"],
        "issue_types": ["Family Law", "Criminal Law", "Property Disputes", "Labour Law", "Consumer Complaints", "Cyber Crime"],
        "eligible_categories": ["SC/ST", "Women", "Children", "Persons with Disability", "Below Poverty Line", "Senior Citizens"],
        "hours": "Mon–Sat 10:00 AM – 5:00 PM",
    },
    {
        "id": "upslsa",
        "name": "U.P. State Legal Services Authority",
        "state": "Uttar Pradesh",
        "district": "Lucknow",
        "address": "High Court, Lucknow – 226001",
        "phone": "+91-522-261-5678",
        "email": "upslsa@up.gov.in",
        "website": "https://upslsa.up.nic.in",
        "services": ["Free Legal Aid", "Lok Adalat", "Panel Lawyers", "NALSA Schemes"],
        "issue_types": ["Family Law", "Criminal Law", "Property Disputes", "Labour Law"],
        "eligible_categories": ["SC/ST", "Women", "Children", "Persons with Disability", "Below Poverty Line"],
        "hours": "Mon–Sat 10:00 AM – 5:00 PM",
    },
    {
        "id": "kslsa-kerala",
        "name": "Kerala State Legal Services Authority",
        "state": "Kerala",
        "district": "Thiruvananthapuram",
        "address": "High Court Campus, Ernakulam – 682031",
        "phone": "+91-484-239-5678",
        "email": "kelsa@kerala.gov.in",
        "website": "https://kelsa.kerala.gov.in",
        "services": ["Free Legal Aid", "Lok Adalat", "Mediation Centres", "Legal Aid Clinics"],
        "issue_types": ["Family Law", "Criminal Law", "Property Disputes", "Environmental Law"],
        "eligible_categories": ["SC/ST", "Women", "Children", "Persons with Disability", "Below Poverty Line", "Transgender Persons"],
        "hours": "Mon–Fri 10:00 AM – 5:00 PM",
    },
    {
        "id": "tslsa",
        "name": "Telangana State Legal Services Authority",
        "state": "Telangana",
        "district": "Hyderabad",
        "address": "High Court of Telangana, Hyderabad – 500066",
        "phone": "+91-40-2344-5678",
        "email": "tslsa@telangana.gov.in",
        "website": "https://tslsa.telangana.gov.in",
        "services": ["Free Legal Aid", "Lok Adalat", "Panel Lawyers", "ADR Centres"],
        "issue_types": ["Family Law", "Criminal Law", "Property Disputes", "Labour Law", "Consumer Complaints"],
        "eligible_categories": ["SC/ST", "Women", "Children", "Below Poverty Line", "Senior Citizens"],
        "hours": "Mon–Sat 10:00 AM – 5:00 PM",
    },
]


# ── Eligibility criteria ─────────────────────────────────────────────────────

ELIGIBILITY_CRITERIA = {
    "SC/ST": {
        "description": "Scheduled Castes and Scheduled Tribes members",
        "documents": ["Caste Certificate", "Ration Card", "Aadhaar Card"],
        "income_limit": "No income limit",
    },
    "Women": {
        "description": "Women and girls (irrespective of income)",
        "documents": ["Identity Proof", "Aadhaar Card"],
        "income_limit": "No income limit",
    },
    "Children": {
        "description": "Children under 18 years of age",
        "documents": ["Birth Certificate", "School ID"],
        "income_limit": "No income limit",
    },
    "Persons with Disability": {
        "description": "Persons with 40% or more disability",
        "documents": ["Disability Certificate", "Identity Proof"],
        "income_limit": "No income limit",
    },
    "Below Poverty Line": {
        "description": "Families living below the poverty line",
        "documents": ["BPL Card", "Income Certificate", "Aadhaar Card"],
        "income_limit": "Annual income ≤ ₹3,00,000",
    },
    "Industrial Workmen": {
        "description": "Workers in industrial establishments",
        "documents": ["Employment Card", "Identity Proof"],
        "income_limit": "Annual income ≤ ₹3,00,000",
    },
    "Senior Citizens": {
        "description": "Persons aged 60 years or above",
        "documents": ["Age Proof", "Identity Proof", "Aadhaar Card"],
        "income_limit": "Annual income ≤ ₹3,00,000",
    },
    "Victims of Trafficking": {
        "description": "Victims of human trafficking",
        "documents": ["FIR Copy", "Identity Proof"],
        "income_limit": "No income limit",
    },
    "Persons in Custody": {
        "description": "Persons in jail or police custody",
        "documents": ["Custody Order"],
        "income_limit": "No income limit",
    },
    "Transgender Persons": {
        "description": "Transgender individuals",
        "documents": ["Identity Proof", "Aadhaar Card"],
        "income_limit": "No income limit",
    },
}


@router.get("/authorities")
def search_authorities(
    state: Optional[str] = Query(None, description="Filter by state"),
    district: Optional[str] = Query(None, description="Filter by district"),
    issue_type: Optional[str] = Query(None, description="Filter by legal issue type"),
    category: Optional[str] = Query(None, description="Filter by eligibility category"),
):
    """Search legal aid authorities with optional filters."""
    results = AUTHORITIES
    if state:
        results = [a for a in results if a["state"].lower() == state.lower()]
    if district:
        results = [a for a in results if a["district"].lower() == district.lower()]
    if issue_type:
        results = [a for a in results if any(issue_type.lower() in it.lower() for it in a["issue_types"])]
    if category:
        results = [a for a in results if any(category.lower() in c.lower() for c in a["eligible_categories"])]
    return {"authorities": results, "total": len(results)}


@router.get("/eligibility-criteria")
def get_eligibility_criteria():
    """Return all eligibility categories and their requirements."""
    return {"criteria": ELIGIBILITY_CRITERIA}


@router.get("/issue-types")
def get_issue_types():
    """Return all supported legal issue types."""
    all_types = set()
    for a in AUTHORITIES:
        all_types.update(a["issue_types"])
    return {"issue_types": sorted(all_types)}


@router.get("/states")
def get_states():
    """Return all states with legal aid representation."""
    states = sorted(set(a["state"] for a in AUTHORITIES))
    return {"states": states}
