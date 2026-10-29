import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
import jwt

from app.config import settings
from app.database import get_db
from app.models.session import User
from app.schemas.auth import (
    GoogleAuthRequest,
    EmailLoginRequest,
    UserResponse,
    MockAuthRequest,
    OnboardingRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"

def create_access_token(user_id: str, email: str, name: str) -> str:
    """Generates a cryptographically signed JWT token valid for 30 days."""
    expire = datetime.now(timezone.utc) + timedelta(days=30)
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "exp": expire,
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def user_to_response(user: User) -> UserResponse:
    jwt_token = create_access_token(user.id, user.email, user.name)
    return UserResponse(
        id=user.id,
        google_id=user.google_id,
        email=user.email,
        name=user.name,
        avatar_url=user.avatar_url,
        dob=user.dob,
        target_role=user.target_role,
        expected_lpa=user.expected_lpa,
        interested_companies=user.interested_companies,
        experience_level=user.experience_level,
        primary_stack=user.primary_stack,
        onboarding_completed=bool(user.onboarding_completed),
        token=jwt_token
    )

ROLE_TECH_STACK_MAPPING = {
    "Backend SDE-1": ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker", "Kafka", "System Design", "Git"],
    "Full-Stack Developer": ["React", "Node.js", "TypeScript", "PostgreSQL", "Express", "Docker", "Tailwind CSS", "REST APIs"],
    "Frontend Engineer": ["React", "TypeScript", "Next.js", "Tailwind CSS", "Redux", "Web Performance", "HTML5/CSS3", "GraphQL"],
    "AI / ML Engineer": ["Python", "PyTorch", "LangChain", "Vector DBs", "Hugging Face", "FastAPI", "Pandas", "MLOps"],
    "DevOps / Cloud": ["Docker", "Kubernetes", "AWS", "Terraform", "CI/CD Actions", "Linux", "Nginx", "Prometheus"],
    "Android / Mobile": ["React Native", "Expo", "TypeScript", "Kotlin", "Redux", "Android SDK", "REST APIs", "Jetpack Compose"],
}

@router.get("/tech-stacks")
async def get_recommended_tech_stacks(role: str = "Backend SDE-1"):
    for k, v in ROLE_TECH_STACK_MAPPING.items():
        if k.lower() in role.lower() or role.lower() in k.lower():
            return {"role": role, "recommended_stacks": v}
    return {"role": role, "recommended_stacks": ["Python", "FastAPI", "PostgreSQL", "Docker", "Redis", "System Design", "Git"]}

@router.post("/token-login", response_model=UserResponse)
async def token_login(
    payload: EmailLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Seamless JWT Authentication:
    Allows student to sign in via email/Google identity without messy cloud console redirect setups.
    Issues a signed JWT token and loads or registers their profile in the database.
    """
    email = payload.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    stmt = select(User).where(User.email == email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if user:
        is_generic_name = payload.name in ["Guest Engineer", "Google Candidate", "Candidate"]
        # Never overwrite an existing user's name with a generic fallback
        if payload.name and not is_generic_name:
            user.name = payload.name.strip()
        elif not user.name:
            user.name = payload.name.strip() if payload.name else email.split("@")[0].capitalize()
        if payload.avatar_url and not user.avatar_url:
            user.avatar_url = payload.avatar_url
    else:
        name = payload.name.strip() if payload.name else email.split("@")[0].capitalize()
        user = User(
            email=email,
            name=name,
            avatar_url=payload.avatar_url or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150",
            onboarding_completed=0
        )
        db.add(user)

    await db.commit()
    await db.refresh(user)

    return user_to_response(user)

@router.post("/google", response_model=UserResponse)
async def authenticate_google(
    payload: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db)
):
    """Authenticates candidate via Google OAuth token."""
    if not payload.access_token and not payload.id_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either access_token or id_token must be provided"
        )

    google_data = None
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            if payload.access_token:
                resp = await client.get(
                    GOOGLE_USERINFO_URL,
                    headers={"Authorization": f"Bearer {payload.access_token}"}
                )
                if resp.status_code == 200:
                    google_data = resp.json()

            if not google_data and payload.id_token:
                resp = await client.get(f"{GOOGLE_TOKENINFO_URL}?id_token={payload.id_token}")
                if resp.status_code == 200:
                    google_data = resp.json()
    except Exception as e:
        logger.error(f"Google connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to communicate with Google authentication servers: {str(e)}"
        )

    if not google_data or not google_data.get("email"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google credentials or token expired"
        )

    google_id = google_data.get("sub")
    email = google_data.get("email").strip().lower()
    name = google_data.get("name") or email.split("@")[0]
    avatar_url = google_data.get("picture")

    stmt = select(User).where((User.email == email) | (User.google_id == google_id))
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if user:
        user.name = name
        user.avatar_url = avatar_url
        if google_id:
            user.google_id = google_id
    else:
        user = User(
            google_id=google_id,
            email=email,
            name=name,
            avatar_url=avatar_url,
            dob=None,
            onboarding_completed=0
        )
        db.add(user)

    await db.commit()
    await db.refresh(user)

    return user_to_response(user)

@router.post("/onboarding", response_model=UserResponse)
async def complete_onboarding(
    payload: OnboardingRequest,
    db: AsyncSession = Depends(get_db)
):
    """Saves candidate onboarding targets and flags profile as completed."""
    stmt = select(User).where(User.id == payload.user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not payload.target_role or not payload.target_role.strip():
        raise HTTPException(status_code=400, detail="Target engineering role is required.")
    if not payload.primary_stack or not payload.primary_stack.strip():
        raise HTTPException(status_code=400, detail="At least one technical stack is required.")
    if not payload.expected_lpa or not payload.expected_lpa.strip():
        raise HTTPException(status_code=400, detail="Target compensation goal is required.")
    if not payload.interested_companies or not payload.interested_companies.strip():
        raise HTTPException(status_code=400, detail="At least one target company is required.")

    if payload.name:
        user.name = payload.name.strip()
    if payload.dob:
        user.dob = payload.dob.strip()
    old_role = user.target_role
    new_role = payload.target_role.strip() if payload.target_role else ""
    if new_role and old_role and old_role.strip().lower() != new_role.lower():
        from sqlalchemy import delete
        from app.models.session import UserRoadmap, InterviewSession
        await db.execute(
            delete(UserRoadmap).where(
                UserRoadmap.user_id == user.id,
                UserRoadmap.role != new_role
            )
        )
        await db.execute(
            delete(InterviewSession).where(
                InterviewSession.user_id == user.id
            )
        )

    user.target_role = payload.target_role
    user.expected_lpa = payload.expected_lpa
    user.interested_companies = payload.interested_companies
    user.experience_level = payload.experience_level
    user.primary_stack = payload.primary_stack
    user.onboarding_completed = 1

    await db.commit()
    await db.refresh(user)

    return user_to_response(user)

@router.post("/demo", response_model=UserResponse)
async def demo_login(
    payload: MockAuthRequest,
    db: AsyncSession = Depends(get_db)
):
    """Fallback login for testing / demo evaluation."""
    stmt = select(User).where(User.email == payload.email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        user = User(
            email=payload.email,
            name=payload.name,
            avatar_url=payload.avatar_url or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150",
            dob=None,
            onboarding_completed=0
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user_to_response(user)

@router.get("/me/{user_id}", response_model=UserResponse)
async def get_current_user(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not payload.target_role or not payload.target_role.strip():
        raise HTTPException(status_code=400, detail="Target engineering role is required.")
    if not payload.primary_stack or not payload.primary_stack.strip():
        raise HTTPException(status_code=400, detail="At least one technical stack is required.")
    if not payload.expected_lpa or not payload.expected_lpa.strip():
        raise HTTPException(status_code=400, detail="Target compensation goal is required.")
    if not payload.interested_companies or not payload.interested_companies.strip():
        raise HTTPException(status_code=400, detail="At least one target company is required.")

    return user_to_response(user)


from pydantic import BaseModel
class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    target_role: Optional[str] = None
    expected_lpa: Optional[str] = None
    interested_companies: Optional[str] = None

@router.patch("/profile/{user_id}", response_model=UserResponse)
async def update_profile(
    user_id: str,
    payload: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not payload.target_role or not payload.target_role.strip():
        raise HTTPException(status_code=400, detail="Target engineering role is required.")
    if not payload.primary_stack or not payload.primary_stack.strip():
        raise HTTPException(status_code=400, detail="At least one technical stack is required.")
    if not payload.expected_lpa or not payload.expected_lpa.strip():
        raise HTTPException(status_code=400, detail="Target compensation goal is required.")
    if not payload.interested_companies or not payload.interested_companies.strip():
        raise HTTPException(status_code=400, detail="At least one target company is required.")

    if payload.name is not None and payload.name.strip():
        user.name = payload.name.strip()
    if payload.target_role is not None:
        user.target_role = payload.target_role.strip()
    if payload.expected_lpa is not None:
        user.expected_lpa = payload.expected_lpa.strip()
    if payload.interested_companies is not None:
        user.interested_companies = payload.interested_companies.strip()

    await db.commit()
    await db.refresh(user)
    return user_to_response(user)
