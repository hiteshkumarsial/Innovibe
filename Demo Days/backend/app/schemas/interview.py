from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class StartInterviewRequest(BaseModel):
    user_id: Optional[str] = None
    candidate_name: Optional[str] = Field("Candidate", description="Name of the candidate")
    target_role: str = Field(..., description="Target role, e.g. SDE-1 Backend or Full-Stack Intern")
    archetype: Optional[str] = Field("PRODUCT_STARTUP", description="PRODUCT_STARTUP | ENTERPRISE_BIGTECH | AI_SCREENING_ROUND")
    project_description: str = Field(..., min_length=20, description="Project summary, tech stack, architecture claims")
    max_turns: Optional[int] = Field(10, ge=3, le=25, description="Number of interrogation turns")

class TurnLogDTO(BaseModel):
    turn_number: int
    question: str
    user_answer: Optional[str] = None
    created_at: datetime

class StartInterviewResponse(BaseModel):
    session_id: str
    status: str
    current_turn: int
    max_turns: int
    opening_question: str
    profile_summary: Dict[str, Any]

class SubmitAnswerRequest(BaseModel):
    session_id: str
    answer: str = Field(..., min_length=2, description="Candidate's technical response to the current question")

class SubmitAnswerResponse(BaseModel):
    session_id: str
    current_turn: int
    max_turns: int
    is_completed: bool
    next_question: Optional[str] = None
    interviewer_reaction: Optional[str] = None

class SectionScoreDTO(BaseModel):
    name: str
    score: int
    max_score: int = 20
    feedback: str

class SayThisInsteadDTO(BaseModel):
    question: str
    ideal_answer: str
    key_points: List[str] = Field(default_factory=list)

class DiagnosticReportDTO(BaseModel):
    hire_decision: str
    seniority_signal: str
    rambling_index: str
    raw_markdown_report: str
    created_at: Optional[datetime] = None
    overall_score: Optional[int] = 0
    section_scores: Optional[List[SectionScoreDTO]] = Field(default_factory=list)
    what_went_right: Optional[List[str]] = Field(default_factory=list)
    what_went_wrong: Optional[List[str]] = Field(default_factory=list)
    say_this_instead: Optional[List[SayThisInsteadDTO]] = Field(default_factory=list)

class InterviewSessionDetail(BaseModel):
    id: str
    candidate_name: str
    target_role: str
    archetype: str
    project_description: str
    status: str
    current_turn: int
    max_turns: int
    created_at: datetime
    turns: List[TurnLogDTO] = []
    diagnostic: Optional[DiagnosticReportDTO] = None
