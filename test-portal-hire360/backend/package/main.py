from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

# --- Fake Database (in memory) ---
students = [{"id": 1, "name": "Madhumitha", "email": "madhu@gmail.com"}]

counsellors = [{"id": 1, "name": "Ravi", "specialization": "UK Admissions"}]

slots = [
    {"slot_id": 1, "counsellor_id": 1, "date": "2025-06-01", "start_time": "10:00", "is_booked": False},
    {"slot_id": 2, "counsellor_id": 1, "date": "2025-06-01", "start_time": "10:30", "is_booked": False},
    {"slot_id": 3, "counsellor_id": 1, "date": "2025-06-01", "start_time": "11:00", "is_booked": False},
]

appointments = []

# --- Request Model ---
class BookingRequest(BaseModel):
    student_id: int
    slot_id: int

# --- API 1: View all counsellors ---
@app.get("/counsellors")
def get_counsellors():
    return counsellors

# --- API 2: View available slots ---
@app.get("/counsellors/{counsellor_id}/slots")
def get_slots(counsellor_id: int):
    available = [s for s in slots 
                 if s["counsellor_id"] == counsellor_id 
                 and s["is_booked"] == False]
    return available

# --- API 3: Book appointment ---
@app.post("/appointments")
def book_appointment(request: BookingRequest):
    
    # Rule 1: Check slot exists
    slot = next((s for s in slots if s["slot_id"] == request.slot_id), None)
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    
    # Rule 2: Check slot is free
    if slot["is_booked"]:
        raise HTTPException(status_code=400, detail="Slot already booked")
    
    # Rule 3: Check student has no conflict
    conflict = any(
        a["student_id"] == request.student_id and 
        slots[a["slot_id"]-1]["start_time"] == slot["start_time"]
        for a in appointments
    )
    if conflict:
        raise HTTPException(status_code=400, detail="You already have a booking at this time")
    
    # All checks passed — book it
    slot["is_booked"] = True  # Update slot
    
    new_appointment = {
        "appointment_id": len(appointments) + 1,
        "student_id": request.student_id,
        "slot_id": request.slot_id,
        "counsellor_id": slot["counsellor_id"],
        "status": "confirmed"
    }
    appointments.append(new_appointment)
    
    return {"message": "Booking confirmed", "appointment": new_appointment}

# --- API 4: Cancel appointment ---
@app.delete("/appointments/{appointment_id}")
def cancel_appointment(appointment_id: int):
    
    appt = next((a for a in appointments if a["appointment_id"] == appointment_id), None)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if appt["status"] == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel completed appointment")
    
    # Free up the slot
    slot = next((s for s in slots if s["slot_id"] == appt["slot_id"]), None)
    slot["is_booked"] = False  # Slot is free again
    
    appt["status"] = "cancelled"
    return {"message": "Appointment cancelled"}