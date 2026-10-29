from pydantic import BaseModel
from typing import Optional

class GoogleAuthRequest(BaseModel):
    access_token: Optional[str] = None
    id_token: Optional[str] = None

class EmailLoginRequest(BaseModel):
    email: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None

class OnboardingRequest(BaseModel):
    user_id: str
    name: Optional[str] = None
    dob: Optional[str] = "2002-08-15"
    target_role: str
    expected_lpa: str
    interested_companies: str
    experience_level: Optional[str] = "Final Year Student"
    primary_stack: Optional[str] = "Backend (Python / Node / Java)"

class UserResponse(BaseModel):
    id: str
    google_id: Optional[str] = None
    email: str
    name: str
    avatar_url: Optional[str] = None
    dob: Optional[str] = None
    target_role: Optional[str] = None
    expected_lpa: Optional[str] = None
    interested_companies: Optional[str] = None
    experience_level: Optional[str] = None
    primary_stack: Optional[str] = None
    onboarding_completed: bool = False
    token: str

class MockAuthRequest(BaseModel):
    name: str = "Kristian Watson"
    email: str = "kristian.watson@student.dev"
    avatar_url: Optional[str] = None
