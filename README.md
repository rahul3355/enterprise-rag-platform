# Enterprise RAG Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.135+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-000000?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)

A multi-tenant, production-grade RAG (Retrieval-Augmented Generation) platform that enables enterprises to upload documents and chat with them using AI — with full citations, tenant isolation, and white-label support.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [API Reference](#api-reference)
- [How It Works](#how-it-works)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Scaling Roadmap](#scaling-roadmap)
- [Design Decisions](#design-decisions)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## Overview

Enterprises generate and store massive amounts of documents — policies, contracts, technical manuals, training materials. Finding answers within them is slow and error-prone. Traditional search returns documents; it doesn't answer questions.

**Enterprise RAG Platform** solves this by combining document parsing, vector search, graph relationships, and large language models into a single system. Upload any document, ask questions in natural language, and get grounded answers with citations back to the source material.

Built from the ground up as a **multi-tenant SaaS**, the platform supports 100+ organizations, each with isolated data, workspaces, and users — all running on a single deployment.

### Who Is This For?

- **SaaS founders** who want to offer document chat as a service
- **Enterprises** building internal knowledge bases
- **Developers** learning RAG architecture with a production-ready reference implementation

---

## Features

### Document Management
- Upload PDF, DOCX, PPTX, TXT, CSV, MD, and XLSX files
- Automatic parsing via [Docling](https://github.com/DS4SD/docling) (IBM open-source)
- Intelligent chunking with configurable size and overlap
- Real-time processing status and error handling

### Intelligent Chat
- Multi-source retrieval: vector search (Qdrant) + graph search (Neo4j)
- Grounded responses with source citations
- Conversation history with session management
- Graceful degradation — if one retrieval source fails, others continue working

### Multi-Tenant Architecture
- Complete data isolation between organizations
- Workspace-level segmentation within each tenant
- JWT-based authentication with Supabase
- Tenant-aware vector collections and graph nodes

### White-Label Ready
- Configurable branding (name, colors)
- Clean, enterprise-grade UI
- Customizable via environment variables

### Observability
- Full LLM call tracing with [Langfuse](https://langfuse.com/)
- Cost tracking per request
- Latency monitoring across all services
- Health check endpoint for all dependencies

### Developer Experience
- RESTful API with OpenAPI/Swagger docs
- Pydantic request/response validation
- Typed TypeScript frontend
- Docker Compose for local infrastructure

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Next.js Frontend                       │
│              (localhost:3000)                            │
│  ┌──────────┬──────────┬──────────┬──────────────────┐  │
│  │  Login   │ Dashboard│  Upload  │  Chat + Citations│  │
│  └──────────┴──────────┴──────────┴──────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/REST + JWT
┌────────────────────────▼────────────────────────────────┐
│                   FastAPI Backend                        │
│              (localhost:8000)                            │
│  ┌────────────────────┬──────────────────────────────┐  │
│  │  Auth Middleware   │  Tenant Isolation Layer      │  │
│  │  (Supabase JWKS)   │  (per-request context)        │  │
│  └────────────────────┴──────────────────────────────┘  │
│  ┌──────────┬──────────┬──────────┬──────────────────┐  │
│  │ Documents│   Chat   │ Workspaces│    Health       │  │
│  │  Router  │  Router  │  Router   │    Endpoint     │  │
│  └──────────┴──────────┴──────────┴──────────────────┘  │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Ingestion Pipeline                      │   │
│  │  Docling → Chunker → Embedder → Qdrant Upsert    │   │
│  └──────────────────────────────────────────────────┘   │
└──┬──────────┬──────────┬──────────┬─────────────────────┘
   │          │          │          │
   ▼          ▼          ▼          ▼
┌──────┐  ┌──────┐  ┌──────┐  ┌──────────┐
│Qdrant│  │ Neo4j│  │Redis │  │ OpenRouter│
│:6333 │  │:7687 │  │:6379 │  │  (API)    │
└──────┘  └──────┘  └──────┘  └──────────┘
   │          │          │          │
   ▼          ▼          ▼          ▼
┌─────────────────────────────────────────┐
│              Supabase (Cloud)            │
│  ┌─────────┬──────────┬──────────────┐  │
│  │ Postgres│  Storage │     Auth     │  │
│  │  (DB)   │ (Files)  │  (JWT/OIDC)  │  │
│  └─────────┴──────────┴──────────────┘  │
└─────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 15, TypeScript, Tailwind, shadcn/ui | UI components, routing, auth |
| **Backend** | FastAPI, Pydantic, python-jose | REST API, validation, JWT |
| **Auth** | Supabase Auth (ES256 JWKS) | User management, JWT tokens |
| **Database** | Supabase Postgres | Tenants, workspaces, documents, chat |
| **Storage** | Supabase Storage | Raw document files |
| **Vector DB** | Qdrant | Semantic search over document chunks |
| **Graph DB** | Neo4j | Entity relationships, graph retrieval |
| **Cache/Broker** | Redis | Celery message broker, caching |
| **Document Parsing** | Docling (IBM) | PDF/DOCX → markdown conversion |
| **Embeddings** | OpenRouter (`openai/text-embedding-3-small`) | 1536-dim vector generation |
| **LLM** | OpenRouter (configurable model) | Chat response generation |
| **Observability** | Langfuse | LLM tracing, cost tracking |

---

## Quick Start

Get the platform running locally in under 5 minutes.

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Python 3.12+](https://www.python.org/downloads/)
- [Node.js 20+](https://nodejs.org/) and npm
- A [Supabase](https://supabase.com/) project (free tier works)
- An [OpenRouter](https://openrouter.ai/) API key

### 1. Clone and Configure

```bash
git clone https://github.com/your-org/enterprise-rag-platform.git
cd enterprise-rag-platform
cp .env.example .env
```

Edit `.env` with your API keys (see [Detailed Setup](#detailed-setup) for guidance).

### 2. Start Infrastructure

```bash
cd infra/docker
docker compose -f docker-compose.dev.yml up -d
```

This starts Qdrant (vector DB), Neo4j (graph DB), and Redis (cache/broker).

### 3. Start Backend

```bash
cd backend
python -m venv venv
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate.bat
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Verify

Open your browser to **http://localhost:3000** and sign up. Check service health:

```bash
curl http://localhost:8000/health
```

Expected response: all services report `"ok"`.

---

## Detailed Setup

### Supabase Configuration

1. **Create a project** at [supabase.com](https://supabase.com/)
2. **Run the SQL schema** in the Supabase SQL Editor to create tables:

```sql
-- Tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT DEFAULT 'uploading',
  chunk_count INTEGER DEFAULT 0,
  file_size INTEGER,
  content_type TEXT,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Sessions
CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  citations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
```

3. **Create a Storage bucket** named `documents` in Supabase Storage
4. **Copy your keys** from Project Settings → API into `.env`

### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Example | Required |
|---|---|---|---|
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) | `eyJ...` | Yes |
| `SUPABASE_ANON_KEY` | Anonymous key (frontend-safe) | `eyJ...` | Yes |
| `OPENROUTER_API_KEY` | OpenRouter API key | `sk-or-v1-...` | Yes |
| `QDRANT_URL` | Qdrant instance URL | `http://localhost:6333` | Yes |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | Yes |
| `JWT_SECRET` | JWT signing secret (generate random) | `openssl rand -hex 32` | Yes |
| `LANGFUSE_PUBLIC_KEY` | Langfuse public key | `pk-lf-...` | Yes |
| `LANGFUSE_SECRET_KEY` | Langfuse secret key | `sk-lf-...` | Yes |
| `LANGFUSE_HOST` | Langfuse host | `https://cloud.langfuse.com` | Yes |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:3000` | Yes |
| `NEO4J_URI` | Neo4j connection URI | `bolt://localhost:7687` | No |
| `NEO4J_USER` | Neo4j username | `neo4j` | No |
| `NEO4J_PASSWORD` | Neo4j password | `your-password` | No |
| `ENABLE_NEO4J` | Enable graph retrieval | `false` | No |
| `CELERY_BROKER_URL` | Celery message broker | `redis://localhost:6379/0` | No |
| `CELERY_RESULT_BACKEND` | Celery result backend | `redis://localhost:6379/0` | No |
| `LLAMA_CLOUD_API_KEY` | LlamaParse API key | `llx-...` | No |

### Frontend Environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_CLIENT_NAME=Enterprise RAG
```

---

## API Reference

The backend exposes a RESTful API at `http://localhost:8000`. Interactive docs are available at `http://localhost:8000/docs`.

### Authentication

All protected endpoints require a Supabase JWT in the `Authorization` header:

```
Authorization: Bearer <supabase_jwt_token>
```

Obtain the token by logging in via the frontend or calling `POST /auth/session`.

### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/session` | No | Validate JWT, return user info |
| `GET` | `/me` | Yes | Get current user, tenant, workspaces |
| `POST` | `/documents/upload` | Yes | Upload and ingest a document |
| `GET` | `/documents` | Yes | List all tenant documents |
| `POST` | `/chat` | Yes | Chat with document retrieval |
| `GET` | `/chat/history` | Yes | Get chat sessions and messages |
| `POST` | `/workspaces/create` | Yes | Create a new workspace |
| `GET` | `/workspaces` | Yes | List tenant workspaces |
| `GET` | `/health` | No | Service health check |

### Example: Upload Document

```bash
curl -X POST "http://localhost:8000/documents/upload?workspace_id=YOUR_WORKSPACE_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/document.pdf"
```

Response:

```json
{
  "document_id": "abc-123",
  "filename": "document.pdf",
  "status": "ready",
  "workspace_id": "YOUR_WORKSPACE_ID",
  "uploaded_at": "2026-04-06T12:00:00Z"
}
```

### Example: Chat

```bash
curl -X POST "http://localhost:8000/chat" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "YOUR_WORKSPACE_ID",
    "message": "What are the key findings in the uploaded report?",
    "session_id": "optional-session-id"
  }'
```

Response:

```json
{
  "session_id": "abc-123",
  "answer": "Based on the uploaded documents, the key findings are...",
  "citations": [
    {
      "document_id": "doc-456",
      "filename": "report.pdf",
      "chunk_text": "The study found that...",
      "score": 0.87
    }
  ],
  "model": "qwen/qwen3-235b-a22b:free"
}
```

---

## How It Works

### Document Upload Flow

```
User uploads PDF
    │
    ▼
POST /documents/upload ──── JWT Auth ──── Tenant Resolution
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. Upload file to Supabase Storage      │
│ 2. Insert document record (status:      │
│    "uploading")                         │
│ 3. Parse with Docling → markdown        │
│ 4. Chunk into 512-word segments         │
│ 5. Generate embeddings (OpenRouter)     │
│ 6. Upsert vectors into Qdrant           │
│ 7. Update status to "ready"             │
└─────────────────────────────────────────┘
    │
    ▼
Return: { document_id, filename, status, chunk_count }
```

### Chat & Retrieval Flow

```
User sends message
    │
    ▼
POST /chat ──── JWT Auth ──── Tenant + Workspace Resolution
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. Load last 10 messages from history   │
│ 2. Generate query embedding             │
│ 3. Multi-source retrieval:              │
│    a. Qdrant vector search (top 5)      │
│    b. Neo4j graph search (top 5)        │
│ 4. Build composite prompt with context  │
│ 5. Call LLM via OpenRouter              │
│ 6. Trace with Langfuse                  │
│ 7. Save messages + citations            │
└─────────────────────────────────────────┘
    │
    ▼
Return: { answer, citations, session_id, model }
```

### Multi-Tenant Isolation

Data isolation is enforced at every layer:

| Layer | Isolation Mechanism |
|---|---|
| **Authentication** | Supabase JWT contains `tenant_id`; middleware validates on every request |
| **Database** | Every query scoped by `tenant_id`; Row Level Security on all tables |
| **Vector Search** | Qdrant collections named per tenant: `tenant_{id}_workspace_{id}` |
| **Graph** | Neo4j nodes tagged with `tenant_id` property |
| **Storage** | Supabase Storage paths prefixed: `{tenant_id}/{workspace_id}/...` |
| **API** | `tenant_id` is never accepted from client request bodies — always extracted from JWT |

---

## Database Schema

### Supabase Tables

**`tenants`** — Organization records

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | TEXT | Organization name |
| `description` | TEXT | Optional description |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

**`workspaces`** — Workspace per tenant

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | TEXT | Workspace name |
| `description` | TEXT | Optional description |
| `tenant_id` | UUID | FK → tenants(id) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

**`documents`** — Uploaded document metadata

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `filename` | TEXT | Original filename |
| `storage_path` | TEXT | Supabase Storage path |
| `status` | TEXT | `uploading`, `ready`, `failed` |
| `chunk_count` | INTEGER | Number of vector chunks |
| `file_size` | INTEGER | File size in bytes |
| `content_type` | TEXT | MIME type |
| `workspace_id` | UUID | FK → workspaces(id) |
| `tenant_id` | UUID | FK → tenants(id) |
| `user_id` | UUID | Uploading user |
| `uploaded_at` | TIMESTAMPTZ | Upload timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**`chat_sessions`** and **`chat_messages`** — Conversation storage (see schema above).

### Qdrant Collections

- **Naming convention:** `tenant_{tenant_id}_workspace_{workspace_id}`
- **Vector size:** 1536 (OpenAI text-embedding-3-small)
- **Distance metric:** COSINE

**Payload schema:**

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
- All nodes tagged with `tenant_id` for isolation

### Supabase Storage

- **Bucket:** `documents`
- **Path pattern:** `{tenant_id}/{workspace_id}/{document_id}_{filename}`

---

## Deployment

### Development (Local)

The Quick Start instructions cover local development with Docker Compose for infrastructure.

### Production Considerations

For production deployment, address the following:

| Area | Recommendation |
|---|---|
| **Backend** | Deploy with Gunicorn + Uvicorn workers behind a reverse proxy (nginx, Caddy) |
| **Frontend** | Build with `next build` and serve with `next start`, or deploy to Vercel |
| **Database** | Use Supabase managed Postgres with connection pooling (PgBouncer) |
| **Vector DB** | Migrate to Qdrant Cloud or a managed cluster with replication |
| **Graph DB** | Use Neo4j AuraDB (managed service) |
| **Infrastructure** | Containerize with Docker, orchestrate with Kubernetes or ECS |
| **Secrets** | Use a secrets manager (AWS Secrets Manager, HashiCorp Vault) — never `.env` files |
| **HTTPS** | Terminate TLS at the load balancer or reverse proxy |
| **Monitoring** | Set up Langfuse dashboards, health check alerts, and log aggregation |

### Environment-Specific Configuration

```env
# Production overrides
ENVIRONMENT=production
CORS_ORIGINS=https://your-domain.com
ENABLE_NEO4J=true
OPENROUTER_MODEL_PROD=anthropic/claude-sonnet-4-5
```

---

## Scaling Roadmap

The platform is designed to grow. Here's the path from prototype to enterprise-scale:

| Phase | Users | Key Changes |
|---|---|---|
| **Phase 1** (Current) | 1-10 | Single-tenant, local Docker, sync ingestion |
| **Phase 2** | 10-100 | Celery async tasks, Redis caching, PgBouncer |
| **Phase 3** | 100-1,000 | Qdrant Cloud, Neo4j AuraDB, Supabase read replicas |
| **Phase 4** | 1,000-10,000 | Kubernetes, LLM model router, semantic cache |
| **Phase 5** | 10,000+ | Multi-region, custom embeddings per tenant, SOC2 |

### Target Metrics

- **100+ companies** (tenants)
- **10,000+ users**
- **100,000+ queries/day**
- **Zero cross-tenant data leakage**

---

## Design Decisions

### Why Docling Over RAGFlow

RAGFlow's Docker-based architecture (Elasticsearch + MySQL) caused severe resource issues on Windows. Docling runs as a local Python library — no containers, no disk bloat, and higher parsing quality for complex documents.

### Why OpenRouter for Everything

A single API key for both embeddings and LLM calls simplifies configuration. OpenRouter's model routing allows switching providers without code changes.

### Why Multi-Tenant via `tenant_id`

Every query, vector collection, and graph node is scoped by `tenant_id`. This approach is simpler than separate databases per tenant while maintaining strong isolation.

### Graceful Degradation

Each retrieval source (Qdrant, Neo4j) is wrapped in try/except. If the graph database is down, vector search still works. If embeddings fail, the LLM responds from conversation history alone.

### Langfuse for Observability

Every LLM call is traced with cost, latency, token usage, and model info. This is essential for production RAG systems where LLM costs can be unpredictable.

---

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| First upload is slow | Docling loading models into memory | Wait 30-60s for first parse; subsequent uploads are fast |
| `embedding` health check fails | OpenRouter API key invalid or rate limited | Verify key in `.env`, check OpenRouter dashboard for quota |
| Qdrant collection not found | First upload creates the collection | Auto-created by `ensure_collection_exists()` — no action needed |
| Neo4j connection refused | Neo4j not running or wrong credentials | Run `docker compose up -d` in `infra/docker/` |
| CORS errors | Frontend origin not in `CORS_ORIGINS` | Add your frontend URL to `CORS_ORIGINS` in `.env` |
| JWT verification fails | Wrong `JWT_SECRET` or Supabase JWKS unreachable | Verify `SUPABASE_URL` is correct and accessible |

### Health Check Diagnostics

```bash
curl http://localhost:8000/health | python -m json.tool
```

All services should report `"status": "ok"`. If any show `"error"`, check the `details` field for the specific error message.

---

## Project Structure

```
enterprise-rag-platform/
├── .env.example                    # Environment variable template
├── .gitignore                      # Git ignore rules
├── .dockerignore                   # Docker build context exclusions
├── LICENSE                         # MIT License
├── README.md                       # This file
│
├── backend/
│   ├── main.py                     # FastAPI entry point, health checks, CORS
│   ├── celery_app.py               # Celery configuration (async tasks)
│   ├── tasks.py                    # Background task definitions
│   ├── requirements.txt            # Python dependencies
│   │
│   ├── routers/
│   │   ├── auth.py                 # Authentication endpoints
│   │   ├── documents.py            # Document upload + listing
│   │   ├── chat.py                 # Multi-source RAG chat
│   │   └── workspaces.py           # Workspace CRUD
│   │
│   ├── services/
│   │   ├── docling_parser.py       # Document parsing (Docling)
│   │   ├── embedding_service.py    # OpenRouter embeddings client
│   │   ├── ingestion_pipeline.py   # Parse → chunk → embed → store
│   │   ├── supabase_client.py      # Supabase DB + Storage operations
│   │   ├── qdrant_client.py        # Qdrant vector DB operations
│   │   ├── neo4j_client.py         # Neo4j graph DB operations
│   │   └── llm_client.py           # OpenRouter LLM + Langfuse tracing
│   │
│   ├── middleware/
│   │   └── tenant.py               # JWT auth + tenant enforcement
│   │
│   └── models/
│       ├── __init__.py             # Schema exports
│       └── schemas.py              # Pydantic request/response models
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/login/           # Login page
│   │   ├── (auth)/signup/          # Signup page
│   │   ├── dashboard/              # Main dashboard
│   │   ├── upload/                 # Document upload UI
│   │   ├── chat/                   # Chat with citations
│   │   └── workspaces/             # Workspace management
│   ├── lib/api.ts                  # Frontend API client
│   ├── middleware.ts               # Auth redirect middleware
│   └── .env.example                # Frontend environment template
│
├── infra/docker/
│   └── docker-compose.dev.yml      # Qdrant, Neo4j, Redis compose
│
└── prompts/
    └── (development prompts)       # AI-assisted generation prompts
```

---

## Contributing

Contributions are welcome! Here's how to get started:

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Test locally (see Quick Start)
5. Commit with a descriptive message
6. Push and open a Pull Request

### Code Standards

- **Backend:** Follow PEP 8, use type hints, add docstrings for public functions
- **Frontend:** Use TypeScript strictly, follow ESLint rules, prefer server components
- **Commits:** Write clear, imperative commit messages (`Add document validation` not `Fixed stuff`)

### Reporting Issues

- Use the GitHub Issues tab
- Include steps to reproduce
- Share relevant logs and environment details
- Label with the appropriate category (bug, feature, docs)

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Acknowledgments

- [Docling](https://github.com/DS4SD/docling) by IBM — Document parsing
- [Qdrant](https://qdrant.tech/) — Vector database
- [Neo4j](https://neo4j.com/) — Graph database
- [Supabase](https://supabase.com/) — Auth, database, and storage
- [OpenRouter](https://openrouter.ai/) — LLM and embedding API
- [Langfuse](https://langfuse.com/) — LLM observability
- [FastAPI](https://fastapi.tiangolo.com/) — Backend framework
- [Next.js](https://nextjs.org/) — Frontend framework
