import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    google_id = Column(String(100), unique=True, index=True, nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    dob = Column(String(50), nullable=True)  # Date of birth fetched or entered
    target_role = Column(String(100), nullable=True)  # e.g. SDE-1 Backend
    expected_lpa = Column(String(50), nullable=True)  # e.g. 18-25 LPA
    interested_companies = Column(Text, nullable=True)  # e.g. "Google, Uber, Zepto, Cred"
    experience_level = Column(String(50), nullable=True)  # Final Year / Fresher / 1-2 YOE
    primary_stack = Column(String(100), nullable=True)  # Python/FastAPI, MERN, Go, Java
    onboarding_completed = Column(Integer, default=0)  # 0 = No, 1 = Yes
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    sessions = relationship("InterviewSession", back_populates="user")
    roadmaps = relationship("UserRoadmap", back_populates="user", cascade="all, delete-orphan")
    chat_messages = relationship("RoadmapChatMessage", back_populates="user", cascade="all, delete-orphan")

class UserRoadmap(Base):
    __tablename__ = "user_roadmaps"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(100), nullable=False)
    target_company = Column(String(100), nullable=True)
    level = Column(String(50), default="Beginner")
    tech_stack = Column(String(255), nullable=True)
    roadmap_data = Column(Text, nullable=False)  # JSON string of complete roadmap
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="roadmaps")

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    candidate_name = Column(String(100), default="Candidate")
    target_role = Column(String(100), nullable=False)
    archetype = Column(String(50), default="PRODUCT_STARTUP")
    project_description = Column(Text, nullable=False)
    extracted_profile = Column(Text, nullable=True)  # JSON string of scanned tech & loopholes
    current_turn = Column(Integer, default=0)
    max_turns = Column(Integer, default=10)
    status = Column(String(20), default="IN_PROGRESS")  # IN_PROGRESS, COMPLETED
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="sessions")
    turns = relationship("TurnLog", back_populates="session", cascade="all, delete-orphan", order_by="TurnLog.turn_number")
    diagnostic = relationship("DiagnosticReport", back_populates="session", uselist=False, cascade="all, delete-orphan")

class TurnLog(Base):
    __tablename__ = "turn_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    turn_number = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)
    user_answer = Column(Text, nullable=True)
    interviewer_notes = Column(Text, nullable=True)  # AI's internal reasoning/loophole notes
    created_at = Column(DateTime, default=utc_now)

    session = relationship("InterviewSession", back_populates="turns")

class DiagnosticReport(Base):
    __tablename__ = "diagnostic_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    hire_decision = Column(String(50), nullable=False)
    seniority_signal = Column(String(50), nullable=False)
    rambling_index = Column(String(50), default="Moderate")
    raw_markdown_report = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    session = relationship("InterviewSession", back_populates="diagnostic")

class RoadmapChatMessage(Base):
    __tablename__ = "roadmap_chat_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    level = Column(String(50), default="Beginner", index=True)
    role = Column(String(20), nullable=False)  # "user" | "assistant"
    content = Column(Text, nullable=False)
    suggested_followups = Column(Text, nullable=True)  # JSON string of follow-up strings
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="chat_messages")
