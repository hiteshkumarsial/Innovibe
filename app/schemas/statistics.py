from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.interview import DiagnosticReportDTO

class DailyProgressBar(BaseModel):
    day: str             # e.g. "Mon"
    date: str            # e.g. "2026-10-29"
    tasks_done: int      # tasks checked off that day
    turns_taken: int     # turns completed that day
    activity_count: int  # combined points/activity
    height_pct: int      # relative height percentage (15 to 100)
    is_today: bool

class PendingPhaseDrill(BaseModel):
    phase_id: str
    phase_number: int
    title: str
    tag: str
    completed_tasks: int
    total_tasks: int
    completion_pct: int
    drill_topic: str
    drill_claims: str
    status: str          # "PENDING_DRILL" (completed tasks, ungrilled) or "IN_PROGRESS"
    has_been_drilled: bool

class TierMastery(BaseModel):
    level: str
    percentage: int
    completed: int
    total: int

class StatisticsResponse(BaseModel):
    candidate_name: str
    target_role: str
    target_company: str
    active_level: str
    overall_progress_percentage: int
    total_tasks_completed: int
    total_tasks_count: int
    phases_completed_count: int
    total_phases_count: int
    weekly_tasks_count: int
    peak_day_name: str
    peak_day_count: int
    daily_bars: List[DailyProgressBar]
    pending_drills: List[PendingPhaseDrill] # completed phases not yet drilled, and in-progress phases
    completed_ungrilled_count: int
    drilled_phases_count: int
    latest_diagnostic: Optional[DiagnosticReportDTO] = None
    tier_mastery: List[TierMastery]
