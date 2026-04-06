"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { DashboardShell } from "@/components/DashboardShell"
import { WorkspaceSelector } from "@/components/WorkspaceSelector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  fetchDocuments,
  fetchChatHistory,
  fetchWorkspaces,
  type Document,
  type ChatSession,
  type Workspace,
} from "@/lib/api"
import {
  FileText,
  MessageSquare,
  FolderKanban,
  Upload,
  ArrowRight,
  Plus,
  Sparkles,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react"

function AnimatedCounter({ value, duration = 0.6 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let start = 0
    const startTime = performance.now()

    function update(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      start = Math.round(eased * value)
      setDisplay(start)
      if (progress < 1) {
        requestAnimationFrame(update)
      }
    }

    requestAnimationFrame(update)
  }, [value, duration])

  return <>{display}</>
}

export default function DashboardPage() {
  const { session, loading: authLoading } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!session?.access_token || authLoading) return

    try {
      setLoading(true)
      setError(null)
      const [ws, docs, chats] = await Promise.all([
        fetchWorkspaces(session.access_token),
        fetchDocuments(session.access_token),
        fetchChatHistory(session.access_token),
      ])
      setWorkspaces(ws)
      setDocuments(docs)
      setSessions(chats)
      if (ws.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(ws[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }, [session?.access_token, authLoading, selectedWorkspace])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (authLoading || loading) {
    return (
      <DashboardShell workspaces={[]}>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-7 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardShell>
    )
  }

  if (workspaces.length === 0) {
    return (
      <DashboardShell workspaces={[]}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md"
          >
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
              <FolderKanban className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Welcome to Enterprise RAG</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Get started by creating your first workspace. Workspaces help you organize
              your documents and conversations by team or project.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/workspaces">
                <Button size="sm">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Create Workspace
                </Button>
              </Link>
              <Link href="/chat">
                <Button variant="outline" size="sm">
                  Try Chat
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </DashboardShell>
    )
  }

  const recentDocs = documents
    .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
    .slice(0, 5)

  const recentChats = sessions
    .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
    .slice(0, 5)

  const totalDocs = documents.length
  const totalChats = sessions.length
  const readyDocs = documents.filter((d) => d.status === "ready").length

  const statusIcon = (status: string) => {
    switch (status) {
      case "ready":
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
      case "processing":
        return <Loader2 className="h-3.5 w-3.5 text-yellow-500 animate-spin" />
      case "failed":
        return <Loader2 className="h-3.5 w-3.5 text-red-500" />
      default:
        return <Clock className="h-3.5 w-3.5 text-muted-foreground" />
    }
  }

  return (
    <DashboardShell workspaces={workspaces}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Overview of your documents and conversations
            </p>
          </div>
          <WorkspaceSelector
            workspaces={workspaces}
            selectedWorkspace={selectedWorkspace}
            onSelect={setSelectedWorkspace}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <Card className="border-border/50 hover:border-border transition-colors">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Documents</p>
                    <p className="text-xl font-semibold tracking-tight">
                      <AnimatedCounter value={totalDocs} />
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="border-border/50 hover:border-border transition-colors">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ready</p>
                    <p className="text-xl font-semibold tracking-tight">
                      <AnimatedCounter value={readyDocs} />
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-border/50 hover:border-border transition-colors">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Chat Sessions</p>
                    <p className="text-xl font-semibold tracking-tight">
                      <AnimatedCounter value={totalChats} />
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-border/50 hover:border-border transition-colors">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Workspaces</p>
                    <p className="text-xl font-semibold tracking-tight">
                      <AnimatedCounter value={workspaces.length} />
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Recent Uploads</CardTitle>
                <Link href="/upload">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                    View All
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentDocs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Upload className="mx-auto h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm mb-1">No documents uploaded yet</p>
                  <Link href="/upload">
                    <Button variant="link" size="sm" className="text-xs">
                      Upload your first document
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {recentDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {statusIcon(doc.status)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.filename}</p>
                          <p className="text-[11px] text-muted-foreground/60">
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 capitalize shrink-0">
                        {doc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Recent Chats</CardTitle>
                <Link href="/chat">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                    View All
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentChats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="mx-auto h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm mb-1">No chat sessions yet</p>
                  <Link href="/chat">
                    <Button variant="link" size="sm" className="text-xs">
                      Start a new chat
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {recentChats.map((s) => {
                    const firstMsg = s.messages.find((m) => m.role === "user")
                    return (
                      <Link
                        key={s.session_id}
                        href={`/chat?session=${s.session_id}`}
                        className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors group"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {firstMsg?.content || "Empty chat"}
                          </p>
                          <p className="text-[11px] text-muted-foreground/60">
                            {s.updated_at
                              ? new Date(s.updated_at).toLocaleDateString()
                              : ""}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/upload">
            <Card className="border-border/50 hover:border-border hover:shadow-sm transition-all cursor-pointer group">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium">Upload Documents</h3>
                    <p className="text-xs text-muted-foreground">
                      Add PDF, DOCX, PPTX, TXT, or CSV files
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/chat">
            <Card className="border-border/50 hover:border-border hover:shadow-sm transition-all cursor-pointer group">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium">Chat with AI</h3>
                    <p className="text-xs text-muted-foreground">
                      Ask questions about your documents
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardShell>
  )
}
