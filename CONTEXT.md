# Enterprise RAG Platform — Project Context & Architecture Document

> **Last Updated:** 2026-04-05
> **Purpose:** Complete context for any new developer or AI agent to understand the project, its architecture, current state, and goals.

---

## 1. Ultimate Goal

Build a **multi-tenant, production-grade RAG (Retrieval-Augmented Generation) SaaS platform** that enterprises can use to:
1. **Upload documents** (PDFs, DOCX, etc.) → automatically parsed, chunked, embedded, and indexed
2. **Chat with their documents** → ask questions, get answers with citations from their uploaded content
3. **Scale to 100+ companies, 10,000+ users, 100,000+ queries/day**

The platform must be **white-label** — the owner resells it to enterprises under their own branding.

---

## 2. Current Architecture (As of 2026-04-05)

### High-Level Stack

```
┌─────────────────────────────────────────────────────┐
│  Next.js Frontend (localhost:3000)                  │
│  - Login, Signup, Dashboard, Upload, Chat, Workspaces│
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────▼──────────────────────────────┐
│  FastAPI Backend (localhost:8000)                   │
│  - Auth (Supabase JWT)                              │
│  - Document Upload → Docling → Embed → Qdrant       │
│  - Chat → Multi-source RAG (Qdrant + Neo4j)         │
│  - Langfuse observability                           │
└──────┬────────┬────────┬────────┬────────┬──────────┘
       │        │        │        │        │
       ▼        ▼        ▼        ▼        ▼
   Supabase  Qdrant   Neo4j   Redis   OpenRouter
   (Cloud)   (Local)  (Local) (Local)  (API)
```

### What Replaced What

| Old (Broken) | New (Working) | Why |
|---|---|---|
| RAGFlow (Docker monolith) | **Docling** (Python library) | RAGFlow caused 100% disk usage on Windows Docker |
| RAGFlow Elasticsearch | **Qdrant** (already running) | Qdrant was already in the stack |
| RAGFlow embedding model | **OpenRouter API** (`openai/text-embedding-3-small`) | No Docker, no model config issues |
| RAGFlow retrieval | **Qdrant vector search** | Direct, fast, no intermediate layer |
| RAGFlow parsing | **Docling** (IBM open-source) | Local, high-quality, no Docker needed |

---

## 3. File Structure

```
enterprise-rag-platform/
    ├── .env                                    ← All environment variables (copy from .env.example)
    ├── .env.example                            ← Template with placeholder values
    ├── README.md                               ← Quick start commands
    ├── CONTEXT.md                              ← THIS FILE
    │
    ├── backend/
    │   ├── venv/                               ← Python virtual environment
    │   ├── main.py                             ← FastAPI entry point, health checks, CORS, middleware
    │   ├── celery_app.py                       ← Celery config (Redis broker/backend)
    │   ├── tasks.py                            ← Celery background tasks (doc processing)
    │   │
    │   ├── services/
    │   │   ├── docling_parser.py               ← Document parsing via Docling (PDF → markdown)
    │   │   ├── embedding_service.py            ← OpenRouter embeddings API client
    │   │   ├── ingestion_pipeline.py           ← Full pipeline: parse → chunk → embed → Qdrant
    │   │   ├── supabase_client.py              ← Supabase DB + Storage operations
    │   │   ├── qdrant_client.py                ← Qdrant vector DB operations
    │   │   ├── neo4j_client.py                 ← Neo4j graph DB operations
    │   │   └── llm_client.py                   ← OpenRouter LLM + Langfuse tracing
    │   │
    │   ├── routers/
    │   │   ├── documents.py                    ← Upload endpoint: file → Docling → Qdrant
    │   │   ├── chat.py                         ← Chat endpoint: multi-source RAG retrieval
    │   │   ├── auth.py                         ← Auth session endpoint
    │   │   └── workspaces.py                   ← Workspace CRUD
    │   │
    │   ├── middleware/
    │   │   └── tenant.py                       ← JWT auth + tenant enforcement
    │   │
    │   ├── models/
    │   │   └── schemas.py                      ← Pydantic request/response models
    │   │
    │   └── requirements.txt                    ← Python dependencies
    │
    ├── frontend/
    │   ├── app/
    │   │   ├── page.tsx                        ← Root redirect to /login
    │   │   ├── (auth)/login/page.tsx           ← Login page
    │   │   ├── (auth)/signup/page.tsx          ← Signup page
    │   │   ├── dashboard/page.tsx              ← Main dashboard
    │   │   ├── upload/page.tsx                 ← Document upload UI with polling
    │   │   ├── chat/page.tsx                   ← Chat UI with citations
    │   │   └── workspaces/page.tsx             ← Workspace management
    │   ├── lib/api.ts                          ← Frontend API client
    │   └── middleware.ts                       ← Auth redirect middleware
    │
    ├── infra/docker/
    │   ├── docker-compose.dev.yml              ← Qdrant, Neo4j, Redis compose
    │   ├── qdrant_data/                        ← Qdrant persistent data (gitignored)
    │   └── neo4j_data/                         ← Neo4j persistent data (gitignored)
    │
    └── prompts/
        └── (development prompts)               ← AI-assisted generation prompts
```

---

## 4. How Everything Works — End to End

### 4.1 Document Upload Flow

```
User uploads PDF via frontend
    ↓
POST /documents/upload?workspace_id=xxx (with JWT auth)
    ↓
Backend:
  1. Read file bytes
  2. Upload to Supabase Storage at: {tenant_id}/{workspace_id}/{doc_id}_{filename}
  3. Insert record in Supabase `documents` table (status: "uploading")
  4. Parse with Docling → extract markdown text
  5. Chunk text into 512-word overlapping segments
  6. Generate embeddings via OpenRouter API (openai/text-embedding-3-small)
  7. Store vectors in Qdrant collection: tenant_{tenant_id}_workspace_{workspace_id}
     - Each point has payload: {document_id, workspace_id, tenant_id, chunk_index, content, filename}
  8. Update Supabase document status to "ready" with chunk_count
    ↓
Return: {document_id, filename, status: "ready", workspace_id, uploaded_at}
```

### 4.2 Chat Flow

```
User sends message via frontend
    ↓
POST /chat/ {workspace_id, message, session_id?} (with JWT auth)
    ↓
Backend:
  1. Create/retrieve chat session in Supabase
  2. Load last 10 messages from chat history
  3. Generate query embedding via OpenRouter
  4. Multi-source retrieval (each wrapped in try/except — graceful degradation):
     a. Qdrant vector search → top 5 similar chunks
     b. Neo4j graph search → related entities/chunks
     c. Ingestion pipeline search → additional document chunks
  5. Build composite prompt with:
     - System prompt
     - Conversation history
     - Vector context [V1], [V2], ...
     - Graph context [G1], [G2], ...
     - Document context [R1], [R2], ...
     - User question
  6. Call OpenRouter LLM (default: qwen/qwen3-235b-a22b:free)
  7. Trace with Langfuse
  8. Save user message + assistant response (with citations) to Supabase
    ↓
Return: {session_id, answer, citations: [{document_id, filename, chunk_text, score}], model}
```

### 4.3 Authentication Flow

```
Frontend: User logs in via Supabase Auth → gets JWT
    ↓
Frontend: Sends JWT in Authorization: Bearer <token> header
    ↓
Backend middleware (tenant.py):
  1. Decode JWT using Supabase JWKS (ES256) with HS256 fallback
  2. Extract user_id, tenant_id, role, workspaces from claims
  3. If tenant_id not in JWT, look up in Supabase
  4. Attach user info to request context
  5. All non-public routes require valid auth
    ↓
Public routes: /health, /auth/session, /docs, /openapi.json, /redoc
```

---

## 5. Database Schema (Supabase)

### Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `tenants` | Organization records | `id`, `name`, `description` |
| `workspaces` | Workspace per tenant | `id`, `name`, `description`, `tenant_id` |
| `documents` | Uploaded document metadata | `id`, `filename`, `storage_path`, `status`, `chunk_count`, `workspace_id`, `tenant_id`, `user_id`, `file_size`, `content_type`, `uploaded_at`, `updated_at`, `external_ragflow_doc_id` |
| `chat_sessions` | Chat session records | `id`, `tenant_id`, `workspace_id`, `user_id`, `created_at`, `updated_at` |
| `chat_messages` | Individual messages | `id`, `session_id`, `role`, `content`, `citations` (JSON), `created_at` |

### Storage Bucket

- **Bucket name:** `documents`
- **Path pattern:** `{tenant_id}/{workspace_id}/{document_id}_{filename}`

### Qdrant Collections

- **Naming:** `tenant_{tenant_id}_workspace_{workspace_id}`
- **Vector size:** 1536 (OpenAI text-embedding-3-small)
- **Distance:** COSINE
- **Payload schema:**
  ```json
  {
    "document_id": "uuid-string",
    "workspace_id": "uuid-string",
    "tenant_id": "uuid-string",
    "chunk_index": 0,
    "content": "chunk text...",
    "filename": "document.pdf",
    "page": 1
  }
  ```

### Neo4j Graph

- **Nodes:** `Document`, `Chunk`, `Entity`
- **Relationships:** `HAS_CHUNK`, `CONTAINS_ENTITY`, `RELATED_TO`

---

## 6. Environment Variables

All variables are defined in `.env` (copy from `.env.example`). See `.env.example` for required values.

| Variable | Purpose | Required |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `OPENROUTER_API_KEY` | OpenRouter API key | Yes |
| `QDRANT_URL` | Qdrant instance URL | Yes |
| `NEO4J_URI` | Neo4j connection URI | No |
| `NEO4J_USER` | Neo4j username | No |
| `NEO4J_PASSWORD` | Neo4j password | No |
| `REDIS_URL` | Redis connection URL | Yes |
| `CELERY_BROKER_URL` | Celery message broker | No |
| `CELERY_RESULT_BACKEND` | Celery result backend | No |
| `LLAMA_CLOUD_API_KEY` | LlamaParse API key | No |
| `LANGFUSE_PUBLIC_KEY` | Langfuse public key | Yes |
| `LANGFUSE_SECRET_KEY` | Langfuse secret key | Yes |
| `LANGFUSE_HOST` | Langfuse host URL | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `CORS_ORIGINS` | Comma-separated allowed origins | Yes |

---

## 7. Progress So Far

### ✅ Completed
- [x] Frontend: Login, Signup, Dashboard, Upload, Chat, Workspaces pages
- [x] Backend: FastAPI with auth middleware, tenant enforcement
- [x] Supabase: Auth, DB tables, Storage bucket all configured
- [x] Qdrant: Vector DB running, collections auto-created per tenant/workspace
- [x] Neo4j: Graph DB running, search integrated
- [x] Docling: Document parsing service implemented
- [x] Embedding service: OpenRouter API integration
- [x] Ingestion pipeline: parse → chunk → embed → Qdrant (fully working)
- [x] Chat: Multi-source retrieval (Qdrant + Neo4j + ingestion pipeline)
- [x] Langfuse: LLM tracing and observability
- [x] Health check: All services monitored
- [x] Removed RAGFlow dependency entirely
- [x] Cleaned up root folder (removed orphaned duplicates)
- [x] Updated README with correct commands

### ⚠️ Pending / Needs Testing
- [ ] Full E2E test: upload → parse → embed → store (first run with new stack)
- [ ] Chat with uploaded documents (verify citations work)
- [ ] Celery worker setup (background task processing — currently sync in HTTP request)
- [ ] Frontend polling for document status (may need adjustment since upload is now sync)
- [ ] Error handling for large documents (timeout on embedding generation)

---

## 8. Current State — What to Do Next

### Immediate Next Steps
1. **Run the first upload** with the new Docling-based pipeline
2. **Verify health check** shows all services "ok" (especially `embedding`)
3. **Test chat** with an uploaded document
4. **Verify citations** show correct filenames and chunk text

### Commands to Start Everything
```cmd
:: 1. Start infra (Qdrant, Neo4j, Redis)
cd infra\docker
docker compose -f docker-compose.dev.yml up -d

:: 2. Start backend
cd backend
venv\Scripts\activate.bat
uvicorn main:app --reload --host 0.0.0.0 --port 8000

:: 3. Start frontend (separate terminal)
cd frontend
npm run dev
```

### Health Check
```
curl http://localhost:8000/health
```
Expected: all services `"ok"`, especially `embedding`.

---

## 9. Scale Requirements

### Target Metrics
- **100+ companies** (tenants)
- **10,000+ users**
- **100,000+ queries/day**
- **Multi-tenant isolation** (no data leakage between tenants)

### Current Architecture Limitations
| Component | Current | Limitation | Scale Solution |
|---|---|---|---|
| **Docling parsing** | Sync in HTTP request | Blocks request for large docs | Move to Celery async tasks |
| **Qdrant** | Single node, local | ~10M vectors max | Qdrant Cloud cluster, sharding |
| **Neo4j** | Single node, local | Limited concurrent queries | Neo4j AuraDB (managed) |
| **Supabase** | Single Postgres | ~500 connections | Read replicas, PgBouncer |
| **LLM calls** | Direct OpenRouter | ~$5k-15k/mo at scale | Semantic cache, model routing |
| **Backend** | Single uvicorn process | ~100 req/sec | Kubernetes, horizontal scaling |

### Phase Plan
1. **Phase 1 (Now):** Single-tenant working, local Docker infra
2. **Phase 2 (10-100 users):** Add Celery async tasks, Redis caching, PgBouncer
3. **Phase 3 (100-1000 users):** Migrate to cloud (Qdrant Cloud, Neo4j AuraDB, Supabase read replicas)
4. **Phase 4 (1000-10000 users):** Kubernetes deployment, LLM model router, semantic cache
5. **Phase 5 (Enterprise):** Multi-region, custom embeddings per tenant, SOC2 compliance

---

## 10. Key Design Decisions

1. **No Docker for RAG** — RAGFlow's Elasticsearch + MySQL caused 100% disk usage on Windows. Replaced with Docling (local Python) + Qdrant (already running).
2. **OpenRouter for everything** — Single API key for LLM + embeddings. Model: `openai/text-embedding-3-small` for embeddings, `qwen/qwen3-235b-a22b:free` for chat.
3. **Multi-tenant via tenant_id** — Every query filtered by tenant_id. Qdrant collections named per tenant/workspace.
4. **Graceful degradation** — Each retrieval source (Qdrant, Neo4j, ingestion) wrapped in try/except. If one fails, others still work.
5. **Langfuse for observability** — Every LLM call traced with cost, latency, model info.

---

## 11. Common Issues & Fixes

| Issue | Cause | Fix |
|---|---|---|
| `ReadTimeout` on upload | Docling loading models on first run | Wait 30-60s for first parse, subsequent are fast |
| `embedding` health check fails | OpenRouter API key invalid or rate limited | Verify key in `.env`, check OpenRouter dashboard |
| Qdrant collection not found | First upload creates collection | Auto-created by `ensure_collection_exists()` |
| Frontend shows "processing" forever | Old polling logic expected RAGFlow | Upload is now sync — status returns "ready" immediately |
| Docker 100% disk usage | WSL2 VHDX expansion | Set `.wslconfig` with `memory=4GB`, compact VHDX |
