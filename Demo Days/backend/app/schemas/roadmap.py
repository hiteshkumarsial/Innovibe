from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ChecklistItem(BaseModel):
    id: str
    text: str
    completed: bool = False
    priority: Optional[str] = "high"

class RoadmapPhase(BaseModel):
    id: str
    phase_number: int
    title: str
    duration: str
    tag: str = "FOUNDATIONS"
    description: str
    key_topics: List[str] = Field(default_factory=list)
    checklist: List[ChecklistItem] = Field(default_factory=list)
    drill_topic: Optional[str] = None
    is_expanded: Optional[bool] = False

class RoadmapGenerateRequest(BaseModel):
    user_id: Optional[str] = None
    role: str = "Software Engineer (SDE-1)"
    tech_stack: List[str] = Field(default_factory=list)
    target_company: Optional[str] = "Top Product Company"
    level: str = "Beginner"  # "Beginner", "Intermediate", "Advanced"
    force_refresh: bool = False

class RoadmapToggleItemRequest(BaseModel):
    user_id: str
    roadmap_id: str
    phase_id: str
    item_id: str
    completed: bool

class RoadmapResponse(BaseModel):
    id: str
    user_id: Optional[str]
    role: str
    target_company: str
    level: str
    duration: str = "6-8 Weeks"
    summary: str
    progress_percentage: int = 0
    total_items: int = 0
    completed_items: int = 0
    phases: List[RoadmapPhase]

class TierProgressDTO(BaseModel):
    level: str
    progress_percentage: int
    completed_items: int
    total_items: int

class RoadmapChatRequest(BaseModel):
    user_id: Optional[str] = None
    level: Optional[str] = None
    message: str
    chat_history: List[Dict[str, str]] = Field(default_factory=list)

class RoadmapChatResponse(BaseModel):
    reply: str
    suggested_followups: List[str] = Field(default_factory=list)

class RoadmapContextResponse(BaseModel):
    candidate_name: str
    target_role: str
    target_company: str
    level: str
    progress_percentage: int
    completed_items: int
    total_items: int
    current_phase_number: int
    current_phase_title: str
    current_phase_topics: List[str]
    current_phase_uncompleted_tasks: List[str]
    suggested_prompts: List[str]
    available_tiers: List[TierProgressDTO] = Field(default_factory=list)


class ChatMessageDTO(BaseModel):
    id: str
    user_id: str
    level: str
    role: str
    content: str
    suggested_followups: List[str] = Field(default_factory=list)
    created_at: str

class ChatHistoryResponse(BaseModel):
    user_id: str
    level: str
    messages: List[ChatMessageDTO] = Field(default_factory=list)
