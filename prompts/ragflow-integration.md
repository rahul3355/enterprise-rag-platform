# RAGFlow Integration - Complete Setup Prompt

You are integrating RAGFlow into an Enterprise RAG application. Your goal is to make RAGFlow work end-to-end: upload documents → process → chat with AI using document context.

## CURRENT SYSTEM STATE

### Already Working:
1. User authentication (Supabase JWT with ES256)
2. Tenant auto-creation
3. Workspace CRUD
4. Document upload to Supabase Storage
5. Chat with LLM (OpenRouter) - works but no document context yet
6. Frontend empty states and error handling

### Not Working:
- RAGFlow not running → documents stuck at "Processing"
- No document parsing/embedding generation

---

## YOUR TASK: Integrate RAGFlow

### Step 1: Start RAGFlow with Docker

**Location:** `C:\Coding\enterprise-rag\enterprise-rag-platform\vendors\ragflow\docker`

**Setup:**
```powershell
# Navigate to RAGFlow docker directory
cd C:\Coding\enterprise-rag\enterprise-rag-platform\vendors\ragflow\docker

# Start RAGFlow (CPU mode - no GPU required)
docker compose -f docker-compose.yml up -d

# Wait 2-3 minutes for startup
# Check if running
docker ps
```

**Expected containers:**
- ragflow-cpu (port 80 → maps to some port)
- mysql
- redis
- minio
- elasticsearch

**Verify RAGFlow is running:**
```bash
# Check health
curl http://localhost:80/api/v1/system/version
# OR visit http://localhost in browser
```

### Step 2: Configure RAGFlow API Access

RAGFlow requires:
1. API Key from the UI (after login)
2. Update backend `.env` with API key and URL

**Get API Key:**
1. Open http://localhost in browser
2. Login (default: admin / ragflow)
3. Go to Settings → API
4. Copy the API key

**Update `.env`:**
```
RAGFLOW_API_URL=http://localhost
RAGFLOW_API_KEY=your_api_key_here
```

### Step 3: Fix Backend RAGFlow Client

**File:** `backend/services/ragflow_client.py`

The current code has issues. Fix these functions to match RAGFlow's actual API:

1. **upload_document** - May need different endpoint
2. **start_ingestion** - The chunk endpoint format may be wrong
3. **search_documents** - Search endpoint format
4. **get_document_status** - Check document status

**Expected RAGFlow API Patterns:**
- Create dataset first (if not exists)
- Upload document to dataset
- Start sync/ingestion
- Wait for processing
- Search using dataset

### Step 4: Fix Document Upload Flow

**File:** `backend/routers/documents.py`

Current flow has issues. Fix to:

1. **Create dataset** if not exists (name = workspace_id)
2. **Upload file** to RAGFlow
3. **Start sync** (not chunk - sync triggers parsing)
4. **Poll status** until "ready"
5. **Update Supabase** with final status

**CRITICAL:** Add status polling with timeout:
- Check every 5 seconds
- Max wait: 5 minutes
- If timeout → mark as "failed"

### Step 5: Add Progress Updates

**File:** `frontend/app/upload/page.tsx`

Current polling already exists (every 3s). Verify it works:
1. Status: "uploading" → "processing" → "ready" (or "failed")
2. Show progress percentage if available

### Step 6: Test End-to-End

**Test Flow:**
1. Upload PDF document
2. Wait for status to become "ready" (may take 1-2 minutes)
3. Go to Chat
4. Ask question about the document
5. Verify citations appear from the document

---

## TECHNICAL DETAILS

### RAGFlow API Endpoints (verify actual paths):
```
# Auth
POST /api/v1/login
GET /api/v1/user/profile

# Datasets
GET /api/v1/datasets
POST /api/v1/datasets
GET /api/v1/datasets/{dataset_id}

# Documents
POST /api/v1/datasets/{dataset_id}/documents
GET /api/v1/datasets/{dataset_id}/documents/{document_id}
DELETE /api/v1/datasets/{dataset_id}/documents/{document_id}

# Sync/Ingest
POST /api/v1/datasets/{dataset_id}/sync
POST /api/v1/datasets/{dataset_id}/chunks (this triggers chunking)

# Search
POST /api/v1/datasets/{dataset_id}/retrieval
```

### Environment Variables:
```
RAGFLOW_API_URL=http://localhost
RAGFLOW_API_KEY=ragflow_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## SUCCESS CRITERIA

After your fixes, ALL these must work:

1. ✅ `docker compose -f docker-compose.yml up` starts RAGFlow
2. ✅ Backend health check shows RAGFlow as "ok"
3. ✅ Upload PDF → Status goes "uploading" → "processing" → "ready"
4. ✅ Upload takes < 5 minutes for a small PDF
5. ✅ Chat with question about document returns citations from that document
6. ✅ No errors in backend logs during upload/chat

---

## FILES YOU CAN EDIT

1. `backend/services/ragflow_client.py` - Fix API calls
2. `backend/routers/documents.py` - Fix upload + status polling
3. `backend/main.py` - Check RAGFlow health
4. `.env` - Add RAGFlow credentials
5. `infra/docker/docker-compose.dev.yml` - Add RAGFlow service

---

## DEBUGGING COMMANDS

```bash
# Check RAGFlow logs
docker logs ragflow-cpu -f

# Check RAGFlow API
curl http://localhost/api/v1/system/version

# Check MySQL in RAGFlow
docker exec -it ragflow-mysql mysql -u root -p

# Test upload via API
curl -X POST http://localhost/api/v1/datasets \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "test", "embedding_model": "BAAI/bge-small-en-v1.5"}'
```

---

## INSTRUCTIONS

1. First start RAGFlow with Docker and verify it works in browser
2. Get API key from RAGFlow UI
3. Fix the backend code to properly interact with RAGFlow's actual API
4. Test the full flow: upload → wait → chat with citations

Use ultrathink - anticipate what can go wrong at each step. The RAGFlow API may have changed from what the code expects. Read the code, test with curl, then fix.
