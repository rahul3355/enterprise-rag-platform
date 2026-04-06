const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

async function fetchWithAuth<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers,
    })
  } catch (networkError) {
    throw new Error("Network error. Please check your connection and try again.")
  }

  if (!res.ok) {
    let errorMessage = "An unexpected error occurred."
    
    try {
      const error = await res.json()
      
      // Handle specific HTTP status codes
      if (res.status === 401) {
        errorMessage = "Your session has expired. Please log in again."
      } else if (res.status === 403) {
        errorMessage = "You don't have permission to perform this action."
      } else if (res.status === 404) {
        errorMessage = "The requested resource was not found."
      } else if (res.status >= 500) {
        errorMessage = "Server error. Please try again later."
      } else {
        errorMessage = error.detail || error.message || `Request failed: ${res.status}`
      }
    } catch {
      errorMessage = res.statusText || `Request failed: ${res.status}`
    }
    
    throw new Error(errorMessage)
  }

  return res.json()
}

export interface UserInfo {
  user_id: string
  email: string | null
  tenant_id: string
  role: string
  workspaces: string[]
}

export interface Workspace {
  id: string
  name: string
  description: string | null
  tenant_id: string
  created_at: string
}

export interface Document {
  id: string
  filename: string
  workspace_id: string
  tenant_id: string
  status: string
  chunk_count: number
  file_size: number
  uploaded_at: string
  updated_at: string
}

export interface Citation {
  document_id: string
  filename: string
  chunk_text: string
  score: number
}

export interface ChatResponse {
  session_id: string
  answer: string
  citations: Citation[]
  model: string
}

export interface ChatMessage {
  id: string | null
  role: string
  content: string
  created_at: string | null
}

export interface ChatSession {
  session_id: string
  workspace_id: string
  messages: ChatMessage[]
  created_at: string | null
  updated_at: string | null
}

export async function validateSession(token: string): Promise<UserInfo> {
  return fetchWithAuth<UserInfo>("/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  })
}

export async function fetchWorkspaces(token: string): Promise<Workspace[]> {
  const data = await fetchWithAuth<{ workspaces: Workspace[] }>(
    "/workspaces/",
    { method: "GET" },
    token
  )
  return data.workspaces
}

export async function createWorkspace(
  token: string,
  name: string,
  description?: string
): Promise<Workspace> {
  return fetchWithAuth<Workspace>("/workspaces/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  }, token)
}

export async function fetchDocuments(
  token: string,
  workspaceId?: string
): Promise<Document[]> {
  const params = workspaceId ? `?workspace_id=${workspaceId}` : ""
  const data = await fetchWithAuth<{ documents: Document[] }>(
    `/documents/${params}`,
    { method: "GET" },
    token
  )
  return data.documents
}

export async function uploadDocument(
  token: string,
  file: File,
  workspaceId: string
): Promise<{ document_id: string; filename: string; status: string; workspace_id: string; uploaded_at: string }> {
  const formData = new FormData()
  formData.append("file", file)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000)

  try {
    const res = await fetch(
      `${BACKEND_URL}/documents/upload?workspace_id=${workspaceId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        signal: controller.signal,
      }
    )

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(error.detail || `Upload failed: ${res.status}`)
    }

    return res.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function sendChatMessage(
  token: string,
  workspaceId: string,
  message: string,
  sessionId?: string
): Promise<ChatResponse> {
  return fetchWithAuth<ChatResponse>("/chat/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workspace_id: workspaceId,
      message,
      session_id: sessionId,
    }),
  }, token)
}

export async function fetchChatHistory(
  token: string,
  workspaceId?: string
): Promise<ChatSession[]> {
  const params = workspaceId ? `?workspace_id=${workspaceId}` : ""
  const data = await fetchWithAuth<{ sessions: ChatSession[] }>(
    `/chat/history${params}`,
    { method: "GET" },
    token
  )
  return data.sessions
}
