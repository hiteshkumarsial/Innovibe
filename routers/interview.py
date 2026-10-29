from datetime import datetime
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.database import get_db
from app.models.session import InterviewSession, TurnLog, DiagnosticReport
from app.schemas.interview import (
    StartInterviewRequest,
    StartInterviewResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    InterviewSessionDetail,
    DiagnosticReportDTO,
    TurnLogDTO
)
from app.services.llm_service import llm_service

def parse_diagnostic_dto(diag: DiagnosticReport) -> Optional[DiagnosticReportDTO]:
    if not diag:
        return None

    overall_score = 0
    section_scores = []
    what_went_right = []
    what_went_wrong = []
    say_this_instead = []
    raw_markdown = diag.raw_markdown_report

    try:
        data = json.loads(diag.raw_markdown_report)
        if isinstance(data, dict):
            raw_markdown = data.get("raw_markdown_report") or data.get("markdown") or ""
            overall_score = data.get("overall_score", 0)
            section_scores = data.get("section_scores", [])
            what_went_right = data.get("what_went_right", [])
            what_went_wrong = data.get("what_went_wrong", [])
            say_this_instead = data.get("say_this_instead", [])
    except Exception:
        raw_markdown = diag.raw_markdown_report

    if not section_scores:
        is_no_hire = "no-hire" in diag.hire_decision.lower()
        overall_score = 48 if is_no_hire else 84
        section_scores = [
            {"name": "Architecture & System Design", "score": 10 if is_no_hire else 17, "max_score": 20, "feedback": "Modularity and architectural decoupling."},
            {"name": "Trade-offs & Alternatives", "score": 8 if is_no_hire else 16, "max_score": 20, "feedback": "Justification of tool selection versus alternatives."},
            {"name": "Failure Modes & Edge Cases", "score": 9 if is_no_hire else 16, "max_score": 20, "feedback": "Resilience under network partitions and memory crashes."},
            {"name": "Database & Scale Mechanics", "score": 11 if is_no_hire else 18, "max_score": 20, "feedback": "Query profiling, indexing, and connection management."},
            {"name": "Communication & Precision", "score": 10 if is_no_hire else 17, "max_score": 20, "feedback": "Conciseness and engineering precision."}
        ]

    return DiagnosticReportDTO(
        hire_decision=diag.hire_decision,
        seniority_signal=diag.seniority_signal,
        rambling_index=diag.rambling_index,
        raw_markdown_report=raw_markdown,
        created_at=diag.created_at or datetime.now(),
        overall_score=overall_score,
        section_scores=section_scores,
        what_went_right=what_went_right,
        what_went_wrong=what_went_wrong,
        say_this_instead=say_this_instead
    )

router = APIRouter(prefix="/interview", tags=["Interview"])

@router.post("/start", response_model=StartInterviewResponse, status_code=status.HTTP_201_CREATED)
async def start_interview(
    payload: StartInterviewRequest,
    db: AsyncSession = Depends(get_db)
):
    """Initializes a new technical grilling session and produces the opening question."""
    profile_summary = await llm_service.scan_profile(
        project_description=payload.project_description,
        target_role=payload.target_role,
        archetype=payload.archetype
    )

    opening_question = profile_summary.get(
        "opening_question",
        "Describe your core project's architecture and the single hardest bug you personally solved."
    )

    session = InterviewSession(
        user_id=payload.user_id,
        candidate_name=payload.candidate_name,
        target_role=payload.target_role,
        archetype=payload.archetype,
        project_description=payload.project_description,
        extracted_profile=json.dumps(profile_summary),
        current_turn=1,
        max_turns=payload.max_turns,
        status="IN_PROGRESS"
    )
    db.add(session)
    await db.flush()

    # Create Turn 1 record with the opening question
    turn_1 = TurnLog(
        session_id=session.id,
        turn_number=1,
        question=opening_question
    )
    db.add(turn_1)
    await db.commit()
    await db.refresh(session)

    return StartInterviewResponse(
        session_id=session.id,
        status=session.status,
        current_turn=session.current_turn,
        max_turns=session.max_turns,
        opening_question=opening_question,
        profile_summary=profile_summary
    )

@router.post("/answer", response_model=SubmitAnswerResponse)
async def submit_answer(
    payload: SubmitAnswerRequest,
    db: AsyncSession = Depends(get_db)
):
    """Submits the candidate's answer for the active turn and generates the next follow-up probe."""
    stmt = (
        select(InterviewSession)
        .options(selectinload(InterviewSession.turns), selectinload(InterviewSession.diagnostic))
        .where(InterviewSession.id == payload.session_id)
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if session.status != "IN_PROGRESS":
        raise HTTPException(status_code=400, detail="This interview session has already concluded")

    # Find the current turn log
    current_turn_log = None
    for turn in session.turns:
        if turn.turn_number == session.current_turn:
            current_turn_log = turn
            break

    if not current_turn_log:
        raise HTTPException(status_code=500, detail="Internal state error: active turn log missing")

    # Save candidate's answer
    current_turn_log.user_answer = payload.answer

    # Prepare turn history for context
    turn_history = []
    for t in session.turns:
        if t.user_answer:
            turn_history.append({"turn": t.turn_number, "question": t.question, "answer": t.user_answer})

    profile_data = json.loads(session.extracted_profile) if session.extracted_profile else {}

    # Check if max turns reached
    if session.current_turn >= session.max_turns:
        # Finalize interview and generate Diagnostic
        session.status = "COMPLETED"
        report_data = await llm_service.generate_diagnostic_report(
            candidate_name=session.candidate_name,
            target_role=session.target_role,
            archetype=session.archetype,
            project_description=session.project_description,
            turn_history=turn_history
        )

        diagnostic = DiagnosticReport(
            session_id=session.id,
            hire_decision=report_data.get("hire_decision", "Leaning No-Hire"),
            seniority_signal=report_data.get("seniority_signal", "Junior"),
            rambling_index=report_data.get("rambling_index", "Moderate"),
            raw_markdown_report=json.dumps(report_data)
        )
        db.add(diagnostic)
        session.diagnostic = diagnostic
        await db.commit()

        return SubmitAnswerResponse(
            session_id=session.id,
            current_turn=session.current_turn,
            max_turns=session.max_turns,
            is_completed=True,
            next_question=None,
            interviewer_reaction="Session complete. Generating your Bar Raiser performance diagnostic report."
        )

    # Next Turn
    next_turn_number = session.current_turn + 1
    llm_res = await llm_service.generate_followup_question(
        archetype=session.archetype,
        profile_summary=profile_data,
        turn_history=turn_history,
        latest_answer=payload.answer,
        turn_number=next_turn_number,
        max_turns=session.max_turns
    )

    next_question = llm_res.get("next_question", "Explain the trade-offs of your implementation.")
    reaction = llm_res.get("interviewer_reaction", "Noted.")
    current_turn_log.interviewer_notes = reaction

    # Create next turn entry
    next_turn_log = TurnLog(
        session_id=session.id,
        turn_number=next_turn_number,
        question=next_question
    )
    session.current_turn = next_turn_number
    db.add(next_turn_log)
    await db.commit()

    return SubmitAnswerResponse(
        session_id=session.id,
        current_turn=session.current_turn,
        max_turns=session.max_turns,
        is_completed=False,
        next_question=next_question,
        interviewer_reaction=reaction
    )

@router.post("/{session_id}/finish", response_model=InterviewSessionDetail)
async def finish_interview(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Forces an interview session to conclude immediately and triggers the diagnostic report."""
    stmt = (
        select(InterviewSession)
        .options(selectinload(InterviewSession.turns), selectinload(InterviewSession.diagnostic))
        .where(InterviewSession.id == session_id)
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if session.status != "COMPLETED":
        session.status = "COMPLETED"
        turn_history = [
            {"turn": t.turn_number, "question": t.question, "answer": t.user_answer or "No answer provided"}
            for t in session.turns
        ]
        report_data = await llm_service.generate_diagnostic_report(
            candidate_name=session.candidate_name,
            target_role=session.target_role,
            archetype=session.archetype,
            project_description=session.project_description,
            turn_history=turn_history
        )

        diagnostic = DiagnosticReport(
            session_id=session.id,
            hire_decision=report_data.get("hire_decision", "Leaning No-Hire"),
            seniority_signal=report_data.get("seniority_signal", "Junior"),
            rambling_index=report_data.get("rambling_index", "Moderate"),
            raw_markdown_report=json.dumps(report_data)
        )
        db.add(diagnostic)
        session.diagnostic = diagnostic
        await db.commit()
        await db.refresh(session, attribute_names=["turns", "diagnostic"])

    return InterviewSessionDetail(
        id=session.id,
        candidate_name=session.candidate_name,
        target_role=session.target_role,
        archetype=session.archetype,
        project_description=session.project_description,
        status=session.status,
        current_turn=session.current_turn,
        max_turns=session.max_turns,
        created_at=session.created_at,
        turns=[TurnLogDTO(turn_number=t.turn_number, question=t.question, user_answer=t.user_answer, created_at=t.created_at) for t in session.turns],
        diagnostic=parse_diagnostic_dto(session.diagnostic)
    )

@router.get("/{session_id}", response_model=InterviewSessionDetail)
async def get_interview_detail(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Retrieves full interview history, current question, and diagnostic report."""
    stmt = (
        select(InterviewSession)
        .options(selectinload(InterviewSession.turns), selectinload(InterviewSession.diagnostic))
        .where(InterviewSession.id == session_id)
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    return InterviewSessionDetail(
        id=session.id,
        candidate_name=session.candidate_name,
        target_role=session.target_role,
        archetype=session.archetype,
        project_description=session.project_description,
        status=session.status,
        current_turn=session.current_turn,
        max_turns=session.max_turns,
        created_at=session.created_at,
        turns=[TurnLogDTO(turn_number=t.turn_number, question=t.question, user_answer=t.user_answer, created_at=t.created_at) for t in session.turns],
        diagnostic=parse_diagnostic_dto(session.diagnostic)
    )
