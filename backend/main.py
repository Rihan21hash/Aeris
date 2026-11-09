"""AERIS — Real-Time Air Quality Intelligence Platform.

Main FastAPI application entry point.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.aqi import router as aqi_router
from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.locations import router as locations_router
from app.api.notifications import router as notifications_router
from app.api.pollutants import router as pollutants_router
from app.api.stations import router as stations_router
from app.core.config import settings
from app.core.database import init_db
from app.services.data_collector import start_scheduler, stop_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("aeris")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events: initialize database tables and background scheduler."""
    logger.info("Initializing AERIS application services...")
    try:
        await init_db()
        logger.info("Database initialized successfully.")
    except Exception as exc:
        logger.warning("Could not auto-initialize DB on startup: %s", exc)

    try:
        start_scheduler()
    except Exception as exc:
        logger.warning("Could not start background scheduler: %s", exc)

    yield

    logger.info("Shutting down AERIS application services...")
    stop_scheduler()


app = FastAPI(
    title="AERIS API",
    description="Real-Time Air Quality Intelligence Platform REST API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS
origins = settings.cors_origins_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health_router, prefix="/api")
app.include_router(aqi_router)
app.include_router(pollutants_router)
app.include_router(locations_router)
app.include_router(stations_router)
app.include_router(notifications_router)
app.include_router(auth_router)


@app.get("/")
async def root():
    """Root info endpoint."""
    return {
        "name": "AERIS",
        "description": "Real-Time Air Quality Intelligence Platform",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

