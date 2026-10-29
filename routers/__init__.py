from app.routers.interview import router as interview_router
from app.routers.auth import router as auth_router
from app.routers.roadmap import router as roadmap_router
from app.routers.statistics import router as statistics_router

__all__ = ["interview_router", "auth_router", "roadmap_router", "statistics_router"]
