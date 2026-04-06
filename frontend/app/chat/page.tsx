"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { ChatSidebar } from "@/components/chat/ChatSidebar"
import { ChatView } from "@/components/chat/ChatView"
import { useAppStore } from "@/stores/app-store"
import {
  fetchWorkspaces,
  fetchChatHistory,
  sendChatMessage,
  type Workspace,
  type ChatSession,
  type Citation,
} from "@/lib/api"
import { toast } from "sonner"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Citation[]
  timestamp: Date
}

export default function ChatPage() {
  const { session, loading: authLoading } = useAuth()
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [citations, setCitations] = useState<Citation[]>([])
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null)
  const [historyLoading, setHistoryLoading] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  const { selectedWorkspace, setSelectedWorkspace, selectedSession, setSelectedSession } = useAppStore()

  const loadData = useCallback(async () => {
    if (!session?.access_token) return
    try {
      setHistoryLoading(true)
      const [ws, history] = await Promise.all([
        fetchWorkspaces(session.access_token),
        fetchChatHistory(session.access_token),
      ])
      setWorkspaces(ws)
      setSessions(history)
      if (ws.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(ws[0].id)
      }
    } catch {
      // silent
    } finally {
      setHistoryLoading(false)
    }
  }, [session?.access_token, selectedWorkspace, setSelectedWorkspace])

  useEffect(() => {
    if (!authLoading) loadData()
  }, [authLoading, loadData])

  const loadSessionMessages = useCallback(
    (sessionId: string) => {
      const sessionData = sessions.find((s) => s.session_id === sessionId)
      if (sessionData) {
        const msgs: Message[] = sessionData.messages.map((m) => ({
          id: m.id || crypto.randomUUID(),
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: m.created_at ? new Date(m.created_at) : new Date(),
        }))
        setMessages(msgs)
        const allCitations = msgs.flatMap((m) => m.citations || [])
        setCitations(allCitations)
      }
    },
    [sessions]
  )

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      setSelectedSession(sessionId)
      loadSessionMessages(sessionId)
    },
    [setSelectedSession, loadSessionMessages]
  )

  async function handleSend(content: string) {
    if (!session?.access_token || !selectedWorkspace) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)
    setStreaming(true)

    try {
      const response = await sendChatMessage(
        session.access_token,
        selectedWorkspace,
        content,
        selectedSession || undefined
      )

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.answer,
        citations: response.citations,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      setCitations((prev) => [...prev, ...response.citations])
      setSelectedSession(response.session_id)

      const updatedHistory = await fetchChatHistory(session.access_token)
      setSessions(updatedHistory)
    } catch {
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
      toast.error("Failed to get response")
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  function handleStop() {
    abortRef.current?.abort()
    setLoading(false)
    setStreaming(false)
  }

  function handleNewChat() {
    setSelectedSession(null)
    setMessages([])
    setCitations([])
    setSelectedCitation(null)
  }

  function handleCitationClick(citation: Citation) {
    setSelectedCitation(citation)
  }

  if (authLoading || historyLoading) {
    return (
      <div className="flex h-dvh bg-background">
        <div className="hidden md:block w-64 border-r bg-sidebar animate-pulse" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  if (workspaces.length === 0) {
    return (
      <div className="flex h-dvh bg-background items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-3.75l-3.6 3.6m0 0l3.6 3.6m-3.6-3.6h10.5" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-1.5">Create a workspace to get started</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Workspaces help you organize your documents and conversations by team or project.
          </p>
          <button
            onClick={() => router.push("/workspaces")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Create your first workspace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-dvh bg-background">
      <ChatSidebar
        sessions={sessions}
        workspaces={workspaces}
        selectedSession={selectedSession}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        loading={historyLoading}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <ChatView
          messages={messages}
          loading={loading}
          streaming={streaming}
          onSend={handleSend}
          onStop={handleStop}
          onCitationClick={handleCitationClick}
          citations={citations}
          selectedCitation={selectedCitation}
          onSelectCitation={setSelectedCitation}
          historyLoading={historyLoading}
        />
      </div>
    </div>
  )
}
