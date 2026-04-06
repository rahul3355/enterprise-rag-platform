"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { DashboardShell } from "@/components/DashboardShell"
import { DocumentUploader } from "@/components/DocumentUploader"
import { WorkspaceSelector } from "@/components/WorkspaceSelector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchDocuments, fetchWorkspaces, type Document, type Workspace } from "@/lib/api"
import { FileText, RefreshCw, CheckCircle2, Loader2, AlertCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  ready: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-500/10",
  },
  processing: {
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-500/10",
  },
  failed: {
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-500/10",
  },
  uploading: {
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
  },
}

function DocumentRow({ doc }: { doc: Document }) {
  const config = statusConfig[doc.status] || {
    icon: <Clock className="h-3.5 w-3.5" />,
    color: "text-muted-foreground",
    bg: "bg-muted",
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/30 transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{doc.filename}</p>
          <p className="text-[11px] text-muted-foreground/60">
            {formatSize(doc.file_size)} · {doc.chunk_count} chunks · {new Date(doc.uploaded_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <Badge variant="outline" className={`gap-1 ${config.bg} ${config.color} border-transparent hover:${config.bg}`}>
        {config.icon}
        <span className="capitalize">{doc.status}</span>
      </Badge>
    </motion.div>
  )
}

export default function UploadPage() {
  const { session, loading: authLoading } = useAuth()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)

  const loadData = useCallback(async () => {
    if (!session?.access_token) return
    try {
      setLoading(true)
      setError(null)
      const [ws, docs] = await Promise.all([
        fetchWorkspaces(session.access_token),
        fetchDocuments(session.access_token),
      ])
      setWorkspaces(ws)
      setDocuments(docs)
      if (ws.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(ws[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [session?.access_token, selectedWorkspace])

  useEffect(() => {
    if (!authLoading) loadData()
  }, [authLoading, loadData])

  useEffect(() => {
    const hasActiveUploads = documents.some(
      (d) => d.status === "uploading" || d.status === "processing"
    )
    setPolling(hasActiveUploads)
  }, [documents])

  useEffect(() => {
    if (!polling || !session?.access_token) return
    const interval = setInterval(() => {
      fetchDocuments(session.access_token).then(setDocuments).catch(() => {})
    }, 3000)
    return () => clearInterval(interval)
  }, [polling, session?.access_token])

  if (authLoading || loading) {
    return (
      <DashboardShell workspaces={[]}>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
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
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Create a workspace first</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You need to create a workspace before you can upload documents.
            </p>
            <Button onClick={() => router.push("/workspaces")}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Your First Workspace
            </Button>
          </motion.div>
        </div>
      </DashboardShell>
    )
  }

  const filteredDocs = selectedWorkspace
    ? documents.filter((d) => d.workspace_id === selectedWorkspace)
    : documents

  return (
    <DashboardShell workspaces={workspaces}>
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Upload Documents</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Add documents to your knowledge base
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex items-center gap-4">
          <WorkspaceSelector
            workspaces={workspaces}
            selectedWorkspace={selectedWorkspace}
            onSelect={setSelectedWorkspace}
          />
        </div>

        <DocumentUploader
          token={session?.access_token || ""}
          workspaceId={selectedWorkspace}
          onUploadComplete={() => loadData()}
        />

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Documents
                {filteredDocs.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({filteredDocs.length})
                  </span>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {filteredDocs.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <FileText className="mx-auto h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">No documents yet</p>
                <p className="text-xs mt-1 text-muted-foreground/60">
                  Upload a document to get started
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredDocs.map((doc) => (
                  <DocumentRow key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
