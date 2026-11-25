"""
Flagship 1: Labour Connect.
Implements complete agricultural labour discovery, job posting, application,
hiring confirmation, wage recording, and worker-job matching.
"""
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import Optional, List
import uuid
import json
from datetime import datetime, timezone

from backend.app.db.database import get_db_connection

router = APIRouter(prefix="/labour", tags=["Labour Connect"])

class JobCreate(BaseModel):
    farmer_id: str = "usr_farmer"
    farmer_name: str = "Suresh Gowda"
    farm_id: Optional[str] = "farm_001"
    title: str = Field(..., description="Job title, e.g. Tomato Harvesting & Sorting")
    job_type: str = Field(..., description="Land preparation, Sowing, Transplantation, Irrigation, Weeding, Harvesting, Loading and unloading")
    crop_type: str = Field(..., description="Target crop")
    work_location: str = Field(..., description="Village / Taluk / Field Location")
    work_date: str = Field(..., description="YYYY-MM-DD")
    working_hours: str = Field("07:00 - 15:00", description="Shift timings")
    wage_per_day: float = Field(..., gt=0, description="Daily wage in INR")
    required_workers: int = Field(..., gt=0, description="Number of workers needed")

class ProfileUpdate(BaseModel):
    user_id: str
    skills: List[str]
    daily_wage_rate: float
    availability_status: str
    location: str

@router.get("/jobs")
def list_jobs(status_filter: Optional[str] = "open", job_type: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM labour_jobs"
    params = []
    conditions = []
    
    if status_filter and status_filter != "all":
        conditions.append("status = ?")
        params.append(status_filter)
    if job_type:
        conditions.append("job_type = ?")
        params.append(job_type)
        
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY created_at DESC"
    
    rows = cursor.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/jobs", status_code=status.HTTP_201_CREATED)
def create_job(job: JobCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    job_id = f"job_{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc).isoformat()
    
    cursor.execute("""
    INSERT INTO labour_jobs (id, farmer_id, farmer_name, farm_id, title, job_type, crop_type, work_location, work_date, working_hours, wage_per_day, required_workers, hired_workers_count, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'open', ?)
    """, (
        job_id, job.farmer_id, job.farmer_name, job.farm_id, job.title, job.job_type,
        job.crop_type, job.work_location, job.work_date, job.working_hours, job.wage_per_day,
        job.required_workers, now
    ))
    conn.commit()
    created = cursor.execute("SELECT * FROM labour_jobs WHERE id = ?", (job_id,)).fetchone()
    conn.close()
    return dict(created)

@router.get("/jobs/{job_id}")
def get_job_details(job_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    job = cursor.execute("SELECT * FROM labour_jobs WHERE id = ?", (job_id,)).fetchone()
    if not job:
        conn.close()
        raise HTTPException(status_code=404, detail="Job not found")
        
    applications = cursor.execute("""
    SELECT a.*, u.phone as labour_phone, u.village as labour_village
    FROM labour_applications a
    JOIN users u ON a.labour_id = u.id
    WHERE a.job_id = ?
    """, (job_id,)).fetchall()
    conn.close()
    
    res = dict(job)
    res["applications"] = [dict(a) for a in applications]
    return res

@router.post("/jobs/{job_id}/apply")
def apply_for_job(job_id: str, labour_id: str = Query(...), labour_name: str = Query("Basavaraj Koravara")):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    job = cursor.execute("SELECT * FROM labour_jobs WHERE id = ?", (job_id,)).fetchone()
    if not job:
        conn.close()
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "open":
        conn.close()
        raise HTTPException(status_code=400, detail="This job is no longer accepting applications")
        
    # Check duplicate application
    existing = cursor.execute("SELECT id FROM labour_applications WHERE job_id = ? AND labour_id = ?", (job_id, labour_id)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="You have already applied for this job")
        
    app_id = f"app_{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc).isoformat()
    
    cursor.execute("""
    INSERT INTO labour_applications (id, job_id, labour_id, labour_name, status, applied_at, wages_earned)
    VALUES (?, ?, ?, ?, 'applied', ?, 0.0)
    """, (app_id, job_id, labour_id, labour_name, now))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Application submitted successfully", "application_id": app_id}

@router.post("/jobs/{job_id}/accept/{labour_id}")
def accept_application(job_id: str, labour_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    job = cursor.execute("SELECT * FROM labour_jobs WHERE id = ?", (job_id,)).fetchone()
    if not job:
        conn.close()
        raise HTTPException(status_code=404, detail="Job not found")
        
    if job["hired_workers_count"] >= job["required_workers"]:
        conn.close()
        raise HTTPException(status_code=400, detail="All required worker positions are already filled")
        
    app = cursor.execute("SELECT * FROM labour_applications WHERE job_id = ? AND labour_id = ?", (job_id, labour_id)).fetchone()
    if not app:
        conn.close()
        raise HTTPException(status_code=404, detail="Application not found")
        
    # Atomically accept application and increment hired count
    cursor.execute("UPDATE labour_applications SET status = 'accepted' WHERE job_id = ? AND labour_id = ?", (job_id, labour_id))
    new_hired = job["hired_workers_count"] + 1
    new_job_status = "in_progress" if new_hired >= job["required_workers"] else job["status"]
    
    cursor.execute("UPDATE labour_jobs SET hired_workers_count = ?, status = ? WHERE id = ?", (new_hired, new_job_status, job_id))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Worker hired successfully", "hired_count": new_hired, "job_status": new_job_status}

@router.post("/jobs/{job_id}/complete")
def complete_job(job_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    job = cursor.execute("SELECT * FROM labour_jobs WHERE id = ?", (job_id,)).fetchone()
    if not job:
        conn.close()
        raise HTTPException(status_code=404, detail="Job not found")
        
    # Mark accepted applications as completed and credit earnings
    wage = job["wage_per_day"]
    accepted_apps = cursor.execute("SELECT labour_id FROM labour_applications WHERE job_id = ? AND status = 'accepted'", (job_id,)).fetchall()
    for row in accepted_apps:
        l_id = row["labour_id"]
        cursor.execute("UPDATE labour_applications SET status = 'completed', wages_earned = ? WHERE job_id = ? AND labour_id = ?", (wage, job_id, l_id))
        cursor.execute("UPDATE labour_profiles SET total_jobs_completed = total_jobs_completed + 1, total_earnings = total_earnings + ? WHERE user_id = ?", (wage, l_id))
        
    cursor.execute("UPDATE labour_jobs SET status = 'completed' WHERE id = ?", (job_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Job marked as completed and worker earnings credited"}

@router.get("/workers")
def list_workers(skill: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    rows = cursor.execute("SELECT * FROM labour_profiles WHERE availability_status = 'available'").fetchall()
    conn.close()
    
    workers = []
    for r in rows:
        w = dict(r)
        w["skills"] = json.loads(w["skills_json"])
        if skill and skill.lower() not in [s.lower() for s in w["skills"]]:
            continue
        workers.append(w)
    return workers

@router.get("/my-profile")
def get_my_profile(user_id: str = "usr_labour"):
    conn = get_db_connection()
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM labour_profiles WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Labour profile not found")
    res = dict(row)
    res["skills"] = json.loads(res["skills_json"])
    return res

@router.get("/my-jobs")
def get_my_jobs(labour_id: str = "usr_labour"):
    conn = get_db_connection()
    cursor = conn.cursor()
    apps = cursor.execute("""
    SELECT a.id as application_id, a.status as app_status, a.applied_at, a.wages_earned,
           j.*
    FROM labour_applications a
    JOIN labour_jobs j ON a.job_id = j.id
    WHERE a.labour_id = ?
    ORDER BY a.applied_at DESC
    """, (labour_id,)).fetchall()
    conn.close()
    return [dict(a) for a in apps]
