from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.routers import interview_router, auth_router, roadmap_router, statistics_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB tables
    await init_db()
    yield
    # Shutdown logic (if any)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for BarRaiser AI - Dynamic Technical Interview Interrogator",
    version="0.1.0",
    lifespan=lifespan
)

# CORS Middleware (Allows Expo Go mobile client and local web frontends)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev/mobile testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(interview_router, prefix=settings.API_V1_PREFIX)
app.include_router(roadmap_router, prefix=settings.API_V1_PREFIX)
app.include_router(statistics_router, prefix=settings.API_V1_PREFIX)

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "llm_provider": settings.LLM_PROVIDER
    }

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to BarRaiser AI API. Interactive documentation is available at /docs",
        "docs_url": "/docs"
    }
