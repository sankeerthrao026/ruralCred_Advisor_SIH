from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.models.schemas import HealthResponse
from app.services.chroma_service import chroma_service
from app.services.gemini_service import gemini_service
from app.api import profile, finance, logbook, risk, dashboard, advisor, voice, plan

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure ChromaDB vector store is populated on startup
    count = chroma_service.get_count()
    if count == 0:
        print("[INFO] ChromaDB empty on startup. Ingesting approved local datasets...")
        from app.ingestion.ingest import ingest_all_datasets
        try:
            ingest_all_datasets()
            count = chroma_service.get_count()
        except Exception as e:
            print(f"[WARN] Ingestion during startup encountered: {e}")
    
    print("\n" + "=" * 65)
    print("  RuralCred Advisor — System & Vector Pipeline Initialized")
    print(f"  Vector Store: ChromaDB (Collection: ruralcred_knowledge) -> [{count} documents indexed]")
    print("=" * 65 + "\n")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="RuralCred Advisor — Backend REST API, Deterministic Finance & Risk Engine, and ChromaDB RAG",
    lifespan=lifespan,
)

# Enable CORS for Next.js and frontend consumers.
# Explicit allow-list (from ALLOWED_ORIGINS) — never "*" — with full credential support.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
@app.get(f"{settings.API_PREFIX}/health", response_model=HealthResponse)
def health_check():
    doc_count = chroma_service.get_count()
    has_llm = gemini_service.is_available()
    return HealthResponse(
        status="healthy",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        ai_provider="Live Advisory Engine" if has_llm else "Grounded Local Engine",
        vector_store="ChromaDB (ruralcred_knowledge)",
        chromadb_connected=doc_count > 0,
        chromadb_documents=doc_count,
        gemini_configured=has_llm,
        active_mode="Live Advisory + ChromaDB RAG" if has_llm else "Grounded Local Fallback (ChromaDB)",
    )

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health",
    }

# Mount all API routers
app.include_router(profile.router, prefix=settings.API_PREFIX)
app.include_router(finance.router, prefix=settings.API_PREFIX)
app.include_router(logbook.router, prefix=settings.API_PREFIX)
app.include_router(risk.router, prefix=settings.API_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_PREFIX)
app.include_router(advisor.router, prefix=settings.API_PREFIX)
app.include_router(voice.router, prefix=settings.API_PREFIX)
app.include_router(plan.router, prefix=settings.API_PREFIX)
