import json
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.session import User, UserRoadmap, InterviewSession, TurnLog, DiagnosticReport
from app.schemas.statistics import (
    StatisticsResponse,
    DailyProgressBar,
    PendingPhaseDrill,
    TierMastery,
)
from app.schemas.interview import DiagnosticReportDTO

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/statistics", tags=["Statistics"])

def calculate_phase_progress(checklist: List[Dict[str, Any]]) -> Dict[str, int]:
    total = len(checklist)
    completed = sum(1 for item in checklist if item.get("completed", False))
    pct = int((completed / total) * 100) if total > 0 else 0
    return {"total": total, "completed": completed, "percentage": pct}

def normalize_str(s: Any) -> str:
    return str(s or "").strip().lower()

@router.get("/{user_id}", response_model=StatisticsResponse)
async def get_user_statistics(
    user_id: str,
    level: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Computes real-time dynamic statistics directly from database:
    1. Chronological last 7 days bar graph (daily milestone & turn progress).
    2. Pending Evaluation (phases completed but not yet grilled).
    3. Overall Roadmap completion & tier progress.
    4. Latest Bar Raiser interview diagnostic report.
    """
    # 1. Resolve User
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        result = await db.execute(select(User).where(User.email == "guest@raisethebar.ai"))
        user = result.scalar_one_or_none()

    target_uid = user.id if user else user_id
    candidate_name = user.name if user else "Candidate"
    target_role = user.target_role if user and user.target_role else "Software Engineer"
    target_company = user.interested_companies if user and user.interested_companies else "Top Tech Tier"

    # 2. Fetch User Roadmaps
    q_roadmaps = select(UserRoadmap).where(UserRoadmap.user_id == target_uid).order_by(desc(UserRoadmap.updated_at))
    all_roadmaps = (await db.execute(q_roadmaps)).scalars().all()

    def count_done_and_total(roadmap_obj):
        try:
            p_list = json.loads(roadmap_obj.roadmap_data).get("phases", [])
            done = sum(sum(1 for c in p.get("checklist", []) if c.get("completed")) for p in p_list)
            tot = sum(len(p.get("checklist", [])) for p in p_list)
            return done, tot
        except Exception:
            return 0, 40

    def norm_role_str(s: str) -> str:
        return (s or "").strip().lower()

    # Filter strictly to the candidate's active target role if available
    active_role_norm = norm_role_str(target_role)
    matching_roadmaps = [
        r for r in all_roadmaps
        if norm_role_str(r.role) == active_role_norm or active_role_norm in norm_role_str(r.role) or norm_role_str(r.role) in active_role_norm
    ]

    # If no roadmaps match the exact target role, use the role of the most recently updated roadmap
    if not matching_roadmaps and all_roadmaps:
        latest_role_norm = norm_role_str(all_roadmaps[0].role)
        matching_roadmaps = [r for r in all_roadmaps if norm_role_str(r.role) == latest_role_norm]

    target_roadmaps = matching_roadmaps if matching_roadmaps else all_roadmaps

    def normalize_tier_name(lvl: str) -> str:
        s = (lvl or "").lower()
        if "1" in s or "beginner" in s:
            return "Level 1"
        if "2" in s or "intermediate" in s:
            return "Level 2"
        return "Level 3"

    # Build Tier Mastery from the active role's roadmaps (most recent for each tier)
    tier_map = {}
    for r in target_roadmaps:
        lvl_key = normalize_tier_name(r.level)
        # Take the most recent roadmap for this level (target_roadmaps is ordered by updated_at desc)
        if lvl_key not in tier_map:
            done, tot = count_done_and_total(r)
            pct = max(1, round((done / tot) * 100)) if (done > 0 and tot > 0) else 0
            tier_map[lvl_key] = TierMastery(
                level=lvl_key,
                percentage=pct,
                completed=done,
                total=tot
            )

    # Active roadmap selection: pick the active role's latest roadmap for the requested level
    active_roadmap = None
    if level:
        req_tier = normalize_tier_name(level)
        for r in target_roadmaps:
            if normalize_tier_name(r.level) == req_tier:
                active_roadmap = r
                break

    # If no specific level found or requested, default to the latest updated roadmap for the active role
    if not active_roadmap and target_roadmaps:
        active_roadmap = target_roadmaps[0]

    active_level = normalize_tier_name(active_roadmap.level) if active_roadmap else normalize_tier_name(level)

    defaults = {
        "Level 1": TierMastery(level="Level 1", percentage=0, completed=0, total=40),
        "Level 2": TierMastery(level="Level 2", percentage=0, completed=0, total=40),
        "Level 3": TierMastery(level="Level 3", percentage=0, completed=0, total=40),
    }
    tier_mastery = [tier_map.get(k, defaults[k]) for k in ["Level 1", "Level 2", "Level 3"]]

    # 3. Fetch User Interview Sessions and Turns strictly for this user & active role
    if target_uid:
        q_sessions = (
            select(InterviewSession)
            .where(InterviewSession.user_id == target_uid)
            .options(selectinload(InterviewSession.diagnostic), selectinload(InterviewSession.turns))
            .order_by(desc(InterviewSession.created_at))
        )
    else:
        q_sessions = (
            select(InterviewSession)
            .where(InterviewSession.candidate_name == candidate_name)
            .options(selectinload(InterviewSession.diagnostic), selectinload(InterviewSession.turns))
            .order_by(desc(InterviewSession.created_at))
        )
    sessions = (await db.execute(q_sessions)).scalars().all()
    all_user_sessions = sessions

    # Filter strictly to the candidate's active role
    norm_active_role = normalize_str(user.target_role if user and user.target_role else target_role)
    active_role_sessions = [
        s for s in all_user_sessions
        if normalize_str(s.target_role).startswith(norm_active_role)
        or norm_active_role.startswith(normalize_str(s.target_role))
    ]

    # Only completed drills count as drilled!
    completed_sessions = [
        s for s in active_role_sessions
        if s.status == "COMPLETED" or s.diagnostic is not None
    ]

    # Determine drilled topics/phases
    drilled_descriptions = [s.project_description.lower() for s in completed_sessions if s.project_description]

    # Find Latest Diagnostic
    latest_diagnostic = None
    for s in completed_sessions:
        if s.diagnostic:
            latest_diagnostic = DiagnosticReportDTO(
                hire_decision=s.diagnostic.hire_decision,
                seniority_signal=s.diagnostic.seniority_signal,
                rambling_index=s.diagnostic.rambling_index,
                raw_markdown_report=s.diagnostic.raw_markdown_report,
                created_at=s.diagnostic.created_at,
                overall_score=getattr(s.diagnostic, "overall_score", 75)
            )
            break

    # 4. Parse Active Roadmap Phases & Detect Completed Ungrilled Phases
    phases_list = []
    total_tasks_completed = 0
    total_tasks_count = 0
    phases_completed_count = 0
    pending_drills = []

    if active_roadmap:
        try:
            data = json.loads(active_roadmap.roadmap_data)
            phases_list = data.get("phases", [])
            for p in phases_list:
                stats = calculate_phase_progress(p.get("checklist", []))
                total_tasks_count += stats["total"]
                total_tasks_completed += stats["completed"]
                if stats["total"] > 0 and stats["completed"] == stats["total"]:
                    phases_completed_count += 1

                p_title = p.get("title", "")
                p_topic = p.get("drill_topic") or p_title
                has_been_drilled = any(p_title.lower() in descr or p_topic.lower() in descr for descr in drilled_descriptions)

                drill_claims = (
                    f"I have mastered {p_title} for {active_roadmap.role or target_role}. "
                    f"Key topics: {', '.join(p.get('key_topics', []))}. "
                    f"Architecture & milestone objective: {p.get('description', '')}"
                )

                is_all_done = stats["total"] > 0 and stats["completed"] == stats["total"]
                is_in_progress = stats["completed"] > 0 and not is_all_done

                status_label = "DRILLED" if has_been_drilled else ("PENDING_DRILL" if is_all_done else "IN_PROGRESS" if is_in_progress else "UNTOUCHED")

                # Include all phases that are completed but ungrilled, OR in progress
                if (is_all_done and not has_been_drilled) or (not is_all_done):
                    pending_drills.append(PendingPhaseDrill(
                        phase_id=p.get("id", f"phase-{p.get('phase_number', 1)}"),
                        phase_number=p.get("phase_number", 1),
                        title=p_title,
                        tag=p.get("tag", "CORE"),
                        completed_tasks=stats["completed"],
                        total_tasks=stats["total"],
                        completion_pct=stats["percentage"],
                        drill_topic=p_topic,
                        drill_claims=drill_claims,
                        status=status_label,
                        has_been_drilled=has_been_drilled
                    ))
        except Exception as e:
            logger.error(f"Error parsing roadmap data for stats: {e}")

    overall_pct = max(1, round((total_tasks_completed / total_tasks_count) * 100)) if (total_tasks_completed > 0 and total_tasks_count > 0) else 0
    completed_ungrilled_count = sum(1 for p in pending_drills if p.status == "PENDING_DRILL")
    # Calculate actually drilled phases on this roadmap
    drilled_phases_on_roadmap = sum(
        1 for p in phases_list
        if any(
            p.get("title", "").lower() in descr or (p.get("drill_topic") or "").lower() in descr
            for descr in drilled_descriptions
        )
    )
    drilled_phases_count = max(drilled_phases_on_roadmap, len(completed_sessions))

    # 5. Compute Chronological Last 7 Days Daily Progress
    now = datetime.now(timezone.utc)
    daily_bars: List[DailyProgressBar] = []
    weekly_tasks_sum = 0
    peak_count = 0
    peak_name = "Wednesday"

    # Pre-index checklist completion timestamps from active roadmap
    tasks_by_date = {}
    if active_roadmap:
        try:
            for p in phases_list:
                for item in p.get("checklist", []):
                    if item.get("completed"):
                        comp_at = item.get("completed_at")
                        if comp_at:
                            day_key = comp_at[:10]
                            tasks_by_date[day_key] = tasks_by_date.get(day_key, 0) + 1
        except Exception:
            pass

    # Index turns taken by date
    turns_by_date = {}
    for s in sessions:
        for t in s.turns:
            if t.created_at:
                day_key = t.created_at.strftime("%Y-%m-%d")
                turns_by_date[day_key] = turns_by_date.get(day_key, 0) + 1

    # If user has completed tasks but timestamps were not logged prior to today, map them to recent days
    today_key = now.strftime("%Y-%m-%d")
    if total_tasks_completed > 0 and sum(tasks_by_date.values()) == 0:
        tasks_by_date[today_key] = total_tasks_completed

    for day_offset in range(6, -1, -1):
        target_day = now - timedelta(days=day_offset)
        date_str = target_day.strftime("%Y-%m-%d")
        day_str = target_day.strftime("%a") # Mon, Tue, Wed...
        is_today = (day_offset == 0)

        tasks_done = tasks_by_date.get(date_str, 0)
        turns_taken = turns_by_date.get(date_str, 0)
        activity_sum = tasks_done + turns_taken
        weekly_tasks_sum += tasks_done

        if activity_sum > peak_count:
            peak_count = activity_sum
            peak_name = day_str

        daily_bars.append(DailyProgressBar(
            day=day_str,
            date=date_str,
            tasks_done=tasks_done,
            turns_taken=turns_taken,
            activity_count=activity_sum,
            height_pct=18, # will calculate relative after loop
            is_today=is_today
        ))

    # Calculate height percentages relative to peak
    max_act = max(peak_count, 1)
    for b in daily_bars:
        if b.activity_count > 0:
            b.height_pct = max(30, min(100, int((b.activity_count / max_act) * 95)))
        else:
            b.height_pct = 18

    return StatisticsResponse(
        candidate_name=candidate_name,
        target_role=active_roadmap.role if active_roadmap else target_role,
        target_company=active_roadmap.target_company if active_roadmap else target_company,
        active_level=active_level,
        overall_progress_percentage=overall_pct,
        total_tasks_completed=total_tasks_completed,
        total_tasks_count=total_tasks_count or 40,
        phases_completed_count=phases_completed_count,
        total_phases_count=len(phases_list) or 10,
        weekly_tasks_count=weekly_tasks_sum,
        peak_day_name=peak_name,
        peak_day_count=peak_count,
        daily_bars=daily_bars,
        pending_drills=pending_drills,
        completed_ungrilled_count=completed_ungrilled_count,
        drilled_phases_count=drilled_phases_count,
        latest_diagnostic=latest_diagnostic,
        tier_mastery=tier_mastery
    )
