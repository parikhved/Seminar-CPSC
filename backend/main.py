import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import analytics, auth, recalls, shortlist

app = FastAPI(
    title="CPSC Compliance & Analytics API",
    description="Sprint 1: Recall Prioritization System",
    version="1.0.0",
)

frontend_url = os.getenv("FRONTEND_URL", "").strip()

allow_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://cpsc-compliance.vercel.app",
]

if frontend_url and frontend_url not in allow_origins:
    allow_origins.append(frontend_url)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(recalls.router)
app.include_router(shortlist.router)
app.include_router(analytics.router)


# ── Root Endpoints ────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "message": "CPSC Compliance & Analytics API — Sprint 1",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "cpsc-compliance-api", "sprint": 1}
