import json
import logging
from typing import Dict, Any, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models.session import User, UserRoadmap, RoadmapChatMessage, utc_now
from typing import Optional
from app.schemas.roadmap import (
    RoadmapGenerateRequest,
    RoadmapToggleItemRequest,
    RoadmapResponse,
    RoadmapPhase,
    ChecklistItem,
    RoadmapChatRequest,
    RoadmapChatResponse,
    RoadmapContextResponse,
    TierProgressDTO,
    ChatMessageDTO,
    ChatHistoryResponse
)
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/roadmap", tags=["Roadmap"])

def normalize_str(s: Any) -> str:
    return str(s or "").strip().lower()

def normalize_level_str(lvl: Any) -> str:
    s = str(lvl or "").strip().lower()
    if "1" in s or "beginner" in s:
        return "Level 1"
    if "2" in s or "intermediate" in s:
        return "Level 2"
    return "Level 3"


def normalize_stack(raw_stack: Any) -> str:
    if isinstance(raw_stack, list):
        items = []
        for x in raw_stack:
            if isinstance(x, str):
                items.extend([s.strip().lower() for s in x.split(",") if s.strip()])
        return ", ".join(sorted(set(items)))
    elif isinstance(raw_stack, str):
        items = [s.strip().lower() for s in raw_stack.split(",") if s.strip()]
        return ", ".join(sorted(set(items)))
    return ""

def calculate_progress(phases: List[Dict[str, Any]]) -> Dict[str, int]:
    total = 0
    completed = 0
    for phase in phases:
        checklist = phase.get("checklist", [])
        for item in checklist:
            total += 1
            if item.get("completed", False):
                completed += 1
    pct = int((completed / total) * 100) if total > 0 else 0
    return {"total": total, "completed": completed, "percentage": pct}

@router.post("/generate", response_model=RoadmapResponse)
async def generate_or_get_roadmap(
    payload: RoadmapGenerateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns an existing personalized roadmap if parameters match (0 Groq calls),
    or generates a new one dynamically with Groq if any parameter has changed.
    """
    user = None
    if payload.user_id:
        result = await db.execute(select(User).where(User.id == payload.user_id))
        user = result.scalar_one_or_none()

    if not user:
        # Fallback to guest user account
        result = await db.execute(select(User).where(User.email == "guest@raisethebar.ai"))
        user = result.scalar_one_or_none()

    # Determine requested parameters
    norm_role = (payload.role or (user.target_role if user and user.target_role else "Software Engineer (SDE-1)")).strip()
    norm_level = (payload.level or "Beginner").strip()
    norm_company = (payload.target_company or (user.interested_companies if user and user.interested_companies else "Top Tech Product Tier")).strip()

    raw_stack = payload.tech_stack or ([user.primary_stack] if user and user.primary_stack else ["Python", "FastAPI", "PostgreSQL", "Redis"])
    canonical_stack = normalize_stack(raw_stack)

    # Convert raw_stack to clean list for LLM service
    stack_for_llm: List[str] = [s for s in canonical_stack.split(", ") if s]
    if not stack_for_llm:
        stack_for_llm = ["Python", "FastAPI", "PostgreSQL", "Redis"]

    # Check for existing stored roadmap for this user with exact parameters
    if user and not payload.force_refresh:
        q = (
            select(UserRoadmap)
            .where(UserRoadmap.user_id == user.id)
            .order_by(desc(UserRoadmap.updated_at))
        )
        existing_list = (await db.execute(q)).scalars().all()
        for existing in existing_list:
            role_match = normalize_str(existing.role) == normalize_str(norm_role)
            level_match = normalize_str(existing.level) == normalize_str(norm_level)
            comp_match = normalize_str(existing.target_company) == normalize_str(norm_company)

            # Match stack: if existing has tech_stack, compare normalized; if existing has None, allow match
            existing_stack_norm = normalize_stack(existing.tech_stack)
            stack_match = (existing_stack_norm == canonical_stack) or (not existing.tech_stack)

            if role_match and level_match and comp_match and stack_match:
                try:
                    data = json.loads(existing.roadmap_data)
                    stats = calculate_progress(data.get("phases", []))
                    logger.info(
                        f"CACHE HIT: Returning stored roadmap {existing.id} for user={user.id} "
                        f"[role='{norm_role}', level='{norm_level}', company='{norm_company}']. Zero Groq calls."
                    )
                    return RoadmapResponse(
                        id=existing.id,
                        user_id=user.id,
                        role=existing.role,
                        target_company=existing.target_company or norm_company,
                        level=existing.level,
                        duration=data.get("duration", "6-8 Weeks"),
                        summary=data.get("summary", ""),
                        progress_percentage=stats["percentage"],
                        total_items=stats["total"],
                        completed_items=stats["completed"],
                        phases=data.get("phases", [])
                    )
                except Exception as e:
                    logger.error(f"Failed to parse stored roadmap data: {e}")

    # If force_refresh or any parameter changed: generate fresh roadmap via Groq
    logger.info(
        f"CACHE MISS / PARAMETER CHANGED: Querying Groq API for user={user.id if user else 'anon'} "
        f"[role='{norm_role}', level='{norm_level}', company='{norm_company}', stack='{canonical_stack}']"
    )

    raw_roadmap = await llm_service.generate_roadmap(
        role=norm_role,
        tech_stack=stack_for_llm,
        target_company=norm_company,
        level=norm_level
    )

    phases = raw_roadmap.get("phases", [])
    stats = calculate_progress(phases)

    roadmap_id = f"rm-{user.id if user else 'anon'}-{norm_level}"
    if user:
        # Check if an existing entry with exact parameters exists (e.g. from force_refresh)
        q_exact = (
            select(UserRoadmap)
            .where(
                UserRoadmap.user_id == user.id,
                UserRoadmap.role == norm_role,
                UserRoadmap.level == norm_level,
                UserRoadmap.target_company == norm_company
            )
        )
        existing_entry = (await db.execute(q_exact)).scalar_one_or_none()
        if existing_entry:
            existing_entry.roadmap_data = json.dumps(raw_roadmap)
            existing_entry.tech_stack = canonical_stack
            existing_entry.updated_at = utc_now()
            await db.commit()
            await db.refresh(existing_entry)
            roadmap_id = existing_entry.id
        else:
            new_roadmap = UserRoadmap(
                user_id=user.id,
                role=norm_role,
                target_company=norm_company,
                level=norm_level,
                tech_stack=canonical_stack,
                roadmap_data=json.dumps(raw_roadmap)
            )
            db.add(new_roadmap)
            await db.commit()
            await db.refresh(new_roadmap)
            roadmap_id = new_roadmap.id

    return RoadmapResponse(
        id=roadmap_id,
        user_id=user.id if user else payload.user_id,
        role=norm_role,
        target_company=norm_company,
        level=norm_level,
        duration=raw_roadmap.get("duration", "6-8 Weeks"),
        summary=raw_roadmap.get("summary", "Structured mastery roadmap designed for high-signal interview preparation."),
        progress_percentage=stats["percentage"],
        total_items=stats["total"],
        completed_items=stats["completed"],
        phases=phases
    )

@router.get("/{user_id}", response_model=RoadmapResponse)
async def get_latest_roadmap(user_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch the latest active roadmap for a user."""
    q = select(UserRoadmap).where(UserRoadmap.user_id == user_id).order_by(desc(UserRoadmap.created_at))
    roadmap = (await db.execute(q)).scalar_one_or_none()
    if not roadmap:
        raise HTTPException(status_code=404, detail="No active roadmap found for user")

    data = json.loads(roadmap.roadmap_data)
    stats = calculate_progress(data.get("phases", []))

    return RoadmapResponse(
        id=roadmap.id,
        user_id=roadmap.user_id,
        role=roadmap.role,
        target_company=roadmap.target_company or "Top Tech Tier",
        level=roadmap.level,
        duration=data.get("duration", "6-8 Weeks"),
        summary=data.get("summary", ""),
        progress_percentage=stats["percentage"],
        total_items=stats["total"],
        completed_items=stats["completed"],
        phases=data.get("phases", [])
    )

@router.post("/toggle-item")
async def toggle_checklist_item(
    payload: RoadmapToggleItemRequest,
    db: AsyncSession = Depends(get_db)
):
    """Toggles completion of a specific task in the roadmap."""
    roadmap = await db.get(UserRoadmap, payload.roadmap_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    data = json.loads(roadmap.roadmap_data)
    phases = data.get("phases", [])

    item_found = False
    for phase in phases:
        if phase.get("id") == payload.phase_id:
            for item in phase.get("checklist", []):
                if item.get("id") == payload.item_id:
                    item["completed"] = payload.completed
                    item_found = True
                    break

    if not item_found:
        raise HTTPException(status_code=404, detail="Checklist item not found in phase")

    roadmap.roadmap_data = json.dumps(data)
    roadmap.updated_at = utc_now()
    await db.commit()

    stats = calculate_progress(phases)
    return {
        "status": "success",
        "phase_id": payload.phase_id,
        "item_id": payload.item_id,
        "completed": payload.completed,
        "progress_percentage": stats["percentage"],
        "completed_items": stats["completed"],
        "total_items": stats["total"]
    }

@router.get("/context/{user_id}", response_model=RoadmapContextResponse)
async def get_roadmap_chat_context(
    user_id: str,
    level: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Fetches user roadmap statistics, active phase, pre-defined prompts, and available tiers."""
    # Find user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        result = await db.execute(select(User).where(User.email == "guest@raisethebar.ai"))
        user = result.scalar_one_or_none()

    candidate_name = user.name if user else "Candidate"
    target_role = user.target_role if user and user.target_role else "Software Engineer"
    target_company = user.interested_companies if user and user.interested_companies else "Top Tech Tier"

    # Fetch all stored roadmaps for user to build available tier progress list
    target_uid = user.id if user else user_id
    q_all = select(UserRoadmap).where(UserRoadmap.user_id == target_uid).order_by(desc(UserRoadmap.updated_at))
    all_roadmaps = (await db.execute(q_all)).scalars().all()

    tier_map = {}
    for r in all_roadmaps:
        try:
            r_data = json.loads(r.roadmap_data)
            r_stats = calculate_progress(r_data.get("phases", []))
            tier_map[r.level.capitalize()] = TierProgressDTO(
                level=r.level.capitalize(),
                progress_percentage=r_stats["percentage"],
                completed_items=r_stats["completed"],
                total_items=r_stats["total"]
            )
        except Exception:
            pass

    # Ensure all 3 tiers are present
    defaults = {
        "Beginner": TierProgressDTO(level="Beginner", progress_percentage=0, completed_items=0, total_items=40),
        "Intermediate": TierProgressDTO(level="Intermediate", progress_percentage=0, completed_items=0, total_items=120),
        "Advanced": TierProgressDTO(level="Advanced", progress_percentage=0, completed_items=0, total_items=120),
    }
    available_tiers = [tier_map.get(k, defaults[k]) for k in ["Beginner", "Intermediate", "Advanced"]]

    # Select the requested tier roadmap, or most recently updated, or first
    selected_roadmap = None
    if level:
        req_norm = level.strip().lower()
        for r in all_roadmaps:
            if r.level and r.level.strip().lower() == req_norm:
                selected_roadmap = r
                break

    if not selected_roadmap and all_roadmaps:
        selected_roadmap = all_roadmaps[0]

    active_level = selected_roadmap.level if selected_roadmap else (level or "Beginner")

    if not selected_roadmap:
        fallback_totals = {"Beginner": 40, "Intermediate": 120, "Advanced": 120}
        return RoadmapContextResponse(
            candidate_name=candidate_name,
            target_role=target_role,
            target_company=target_company,
            level=active_level,
            progress_percentage=0,
            completed_items=0,
            total_items=fallback_totals.get(active_level, 40),
            current_phase_number=1,
            current_phase_title="Tooling, Terminal & Version Control Discipline" if active_level == "Beginner" else "System Internals & Core Design",
            current_phase_topics=["Unix Terminal", "Git Workflow", "Linters"] if active_level == "Beginner" else ["Concurrency", "Memory Models", "Profiling"],
            current_phase_uncompleted_tasks=["Configure environment", "Set up Git"] if active_level == "Beginner" else ["Profile cache hit rates", "Implement lock-free queue"],
            suggested_prompts=[
                f"Where should I start with Phase 1 in {active_level} roadmap?",
                "What free resources and docs do you recommend?",
                f"How do I pace my {active_level} milestones?",
                "Give me a 30-minute action plan for today",
                "What are the top interview questions for this phase?"
            ],
            available_tiers=available_tiers
        )

    data = json.loads(selected_roadmap.roadmap_data)
    phases = data.get("phases", [])
    stats = calculate_progress(phases)

    # Find the current in-progress phase
    current_phase = None
    uncompleted_tasks = []
    for p in phases:
        checklist = p.get("checklist", [])
        uncompleted = [item["text"] for item in checklist if not item.get("completed", False)]
        if uncompleted:
            current_phase = p
            uncompleted_tasks = uncompleted
            break

    if not current_phase and phases:
        current_phase = phases[-1]

    phase_num = current_phase.get("phase_number", 1) if current_phase else 1
    phase_title = current_phase.get("title", "Foundations") if current_phase else "Foundations"
    phase_topics = current_phase.get("key_topics", ["Core Internals"]) if current_phase else ["Core Internals"]
    first_task = uncompleted_tasks[0] if uncompleted_tasks else "Complete phase milestone"

    suggested = [
        f"Recommend best free resources & tutorials for Phase {phase_num}: {phase_title}",
        f"I'm stuck on: \"{first_task[:50]}...\" — how do I approach this?",
        f"Explain {phase_topics[0] if phase_topics else 'the core trade-off'} with a simple code example",
        f"What are the most common interview traps for {phase_title}?",
        f"I'm falling behind schedule on my {active_level} track, how do I pace my milestones?"
    ]

    return RoadmapContextResponse(
        candidate_name=candidate_name,
        target_role=selected_roadmap.role or target_role,
        target_company=selected_roadmap.target_company or target_company,
        level=selected_roadmap.level or active_level,
        progress_percentage=stats["percentage"],
        completed_items=stats["completed"],
        total_items=stats["total"],
        current_phase_number=phase_num,
        current_phase_title=phase_title,
        current_phase_topics=phase_topics,
        current_phase_uncompleted_tasks=uncompleted_tasks,
        suggested_prompts=suggested,
        available_tiers=available_tiers
    )

@router.post("/assistant-chat", response_model=RoadmapChatResponse)
async def roadmap_assistant_chat(
    payload: RoadmapChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """Conversational roadmap assistant that answers candidate questions with live roadmap context."""
    user = None
    if payload.user_id:
        result = await db.execute(select(User).where(User.id == payload.user_id))
        user = result.scalar_one_or_none()
    if not user:
        result = await db.execute(select(User).where(User.email == "guest@raisethebar.ai"))
        user = result.scalar_one_or_none()

    candidate_name = user.name if user else "Candidate"
    target_role = user.target_role if user and user.target_role else "Software Engineer"
    target_company = user.interested_companies if user and user.interested_companies else "Top Tech Tier"

    # Find roadmap matching level if provided, otherwise latest
    target_uid = user.id if user else payload.user_id
    q = select(UserRoadmap).where(UserRoadmap.user_id == target_uid)
    if payload.level:
        q = q.where(UserRoadmap.level == payload.level)
    q = q.order_by(desc(UserRoadmap.updated_at))
    roadmap = (await db.execute(q)).scalars().first()

    level = roadmap.level if roadmap else "Beginner"
    progress_pct = 0
    completed_items = 0
    total_items = 40
    current_phase_title = "Core Foundations"
    current_phase_number = 1
    uncompleted_tasks = []

    if roadmap:
        try:
            data = json.loads(roadmap.roadmap_data)
            phases = data.get("phases", [])
            stats = calculate_progress(phases)
            progress_pct = stats["percentage"]
            completed_items = stats["completed"]
            total_items = stats["total"]
            for p in phases:
                checklist = p.get("checklist", [])
                uncompleted = [item["text"] for item in checklist if not item.get("completed", False)]
                if uncompleted:
                    current_phase_title = p.get("title", current_phase_title)
                    current_phase_number = p.get("phase_number", 1)
                    uncompleted_tasks = uncompleted
                    break
        except Exception as e:
            logger.error(f"Error reading roadmap data in chat: {e}")

    # Persist user message to SQLite database
    if user:
        try:
            user_msg_db = RoadmapChatMessage(
                user_id=user.id,
                level=level,
                role="user",
                content=payload.message
            )
            db.add(user_msg_db)
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to persist user chat message: {e}")

    result = await llm_service.roadmap_mentor_chat(
        candidate_name=candidate_name,
        target_role=roadmap.role if roadmap else target_role,
        target_company=roadmap.target_company if roadmap else target_company,
        level=level,
        progress_pct=progress_pct,
        completed_items=completed_items,
        total_items=total_items,
        current_phase_title=current_phase_title,
        current_phase_number=current_phase_number,
        uncompleted_tasks=uncompleted_tasks,
        user_message=payload.message,
        chat_history=payload.chat_history
    )

    reply_text = result.get("reply", "I am here to help you conquer your roadmap.")
    followups = result.get("suggested_followups", [])

    # Persist assistant reply to SQLite database
    if user:
        try:
            assistant_msg_db = RoadmapChatMessage(
                user_id=user.id,
                level=level,
                role="assistant",
                content=reply_text,
                suggested_followups=json.dumps(followups)
            )
            db.add(assistant_msg_db)
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to persist assistant chat message: {e}")

    return RoadmapChatResponse(
        reply=reply_text,
        suggested_followups=followups
    )

@router.get("/chat-history/{user_id}", response_model=ChatHistoryResponse)
async def get_roadmap_chat_history(
    user_id: str,
    level: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Retrieves stored roadmap chat history for a user and level."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        result = await db.execute(select(User).where(User.email == "guest@raisethebar.ai"))
        user = result.scalar_one_or_none()

    target_uid = user.id if user else user_id
    q = select(RoadmapChatMessage).where(RoadmapChatMessage.user_id == target_uid)
    if level and level != "All":
        q = q.where(RoadmapChatMessage.level == level)
    q = q.order_by(RoadmapChatMessage.created_at.asc())

    rows = (await db.execute(q)).scalars().all()

    messages = []
    for r in rows:
        followups = []
        if r.suggested_followups:
            try:
                followups = json.loads(r.suggested_followups)
            except Exception:
                followups = []
        messages.append(ChatMessageDTO(
            id=r.id,
            user_id=r.user_id,
            level=r.level,
            role=r.role,
            content=r.content,
            suggested_followups=followups,
            created_at=r.created_at.isoformat() if r.created_at else utc_now().isoformat()
        ))

    return ChatHistoryResponse(
        user_id=target_uid,
        level=level or "All",
        messages=messages
    )

@router.delete("/chat-history/{user_id}")
async def clear_roadmap_chat_history(
    user_id: str,
    level: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Clears stored roadmap chat messages for a user."""
    from sqlalchemy import delete
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        result = await db.execute(select(User).where(User.email == "guest@raisethebar.ai"))
        user = result.scalar_one_or_none()

    target_uid = user.id if user else user_id
    stmt = delete(RoadmapChatMessage).where(RoadmapChatMessage.user_id == target_uid)
    if level and level != "All":
        stmt = stmt.where(RoadmapChatMessage.level == level)
    await db.execute(stmt)
    await db.commit()
    return {"status": "cleared", "user_id": target_uid, "level": level or "All"}

