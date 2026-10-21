"""Quick smoke-test for all API endpoints."""
import httpx, json, time

BASE = "http://localhost:8000"

# 1. Register
print("=== Register ===")
r = httpx.post(f"{BASE}/api/v1/auth/register", json={"username":"testuser","email":"test@test.com","password":"Test1234"})
print(r.status_code, r.json() if r.status_code < 500 else r.text)
token = r.json().get("access_token","") if r.status_code in (200,201) else ""

# 2. Login (if already registered)
if not token:
    print("=== Login ===")
    r = httpx.post(f"{BASE}/api/v1/auth/login", json={"username":"testuser","password":"Test1234"})
    print(r.status_code, r.json())
    token = r.json().get("access_token","")

headers = {"Authorization": f"Bearer {token}"}

# 3. Me
print("\n=== Me ===")
r = httpx.get(f"{BASE}/api/v1/auth/me", headers=headers)
print(r.status_code, r.json())

# 4. Create Request
print("\n=== Create Request ===")
form = {
    "location": {"country":"India","state":"Tamil Nadu","district":"Chennai","city":"Chennai","pin_code":"600001"},
    "legal_issue": {"issue_type":"Family Law","description":"Divorce consultation needed","court_case_in_progress":"no","court_deadline":"","urgency":"medium"},
    "eligibility": {"eligibility_category":"SC/ST","eligibility_details":"Below poverty line","supporting_document":"ration_card"},
    "contact": {"full_name":"Test User","mobile_number":"9876543210","email":"test@test.com","preferred_contact":"phone","consultation_mode":"in_person"},
    "appointment": {"preferred_date":"2025-11-01","preferred_time_slot":"10:00 AM","consultation_mode":"in_person","alt_date":"2025-11-05","alt_time_slot":"02:00 PM","additional_notes":""},
    "consent": {"consent_use_of_info": True,"consent_accuracy": True,"consent_booking_approval": True},
    "completedSteps": [1,2,3,4,5,6],
    "currentStep": 6
}
r = httpx.post(f"{BASE}/api/v1/requests", json={"form":form}, headers=headers)
print(r.status_code, r.json())
req_id = r.json().get("id","")

# 5. Poll status a few times
print("\n=== Polling Status (will poll 6 times, 5s apart) ===")
for i in range(6):
    time.sleep(5)
    r = httpx.get(f"{BASE}/api/v1/requests/{req_id}/status", headers=headers)
    data = r.json()
    print(f"  Poll {i+1}: status={data['status']} current_stage={data['current_stage']}")
    stages_summary = [(s['stage_number'], s['name'], s['status']) for s in data['stages']]
    for sn, name, st in stages_summary:
        print(f"    Stage {sn}: {name} → {st}")
    if data['status'] == 'awaiting_approval':
        # Grab slots
        slots = data.get('available_slots', [])
        if slots:
            print(f"\n  Available slots: {len(slots)}")
            for s in slots:
                print(f"    {s['date']} {s['time_slot']} @ {s['authority_name']}")
            # Book first slot
            slot_id = slots[0]['id']
            print(f"\n=== Booking slot {slot_id} ===")
            r = httpx.post(f"{BASE}/api/v1/requests/{req_id}/book", json={"slot_id": slot_id}, headers=headers)
            print(r.status_code, r.json())
            # Poll a bit more for confirmation
            for j in range(4):
                time.sleep(3)
                r = httpx.get(f"{BASE}/api/v1/requests/{req_id}/status", headers=headers)
                data = r.json()
                print(f"  Post-booking poll {j+1}: status={data['status']} stage={data['current_stage']}")
                if data.get('booking_confirmation'):
                    print(f"  ✅ CONFIRMED: {data['booking_confirmation']}")
                    break
        break

print("\n✅ API smoke test complete!")
