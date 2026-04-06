"use client"

import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { DashboardShell } from "@/components/DashboardShell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  fetchWorkspaces,
  createWorkspace,
  type Workspace,
} from "@/lib/api"
import { Plus, FolderKanban, ArrowRight, FileText, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function WorkspacesPage() {
  const { session, loading: authLoading } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [creating, setCreating] = useState(false)

  const loadWorkspaces = useCallback(async () => {
    if (!session?.access_token) return
    try {
      setLoading(true)
      setError(null)
      const data = await fetchWorkspaces(session.access_token)
      setWorkspaces(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspaces")
    } finally {
      setLoading(false)
    }
  }, [session?.access_token])

  useEffect(() => {
    if (!authLoading) loadWorkspaces()
  }, [authLoading, loadWorkspaces])

  const handleCreate = async () => {
    if (!session?.access_token || !newName.trim()) return
    setCreating(true)
    try {
      await createWorkspace(session.access_token, newName.trim(), newDesc.trim() || undefined)
      toast.success("Workspace created")
      setNewName("")
      setNewDesc("")
      setDialogOpen(false)
      await loadWorkspaces()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create workspace")
    } finally {
      setCreating(false)
    }
  }

  return (
    <DashboardShell workspaces={workspaces}>
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Workspaces</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Organize your documents and conversations
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            New Workspace
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-sm"
            >
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
                <FolderKanban className="h-7 w-7 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold mb-2">No workspaces yet</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Create your first workspace to start organizing your documents and conversations.
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Create Workspace
              </Button>
            </motion.div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {workspaces.map((ws, i) => (
              <motion.div
                key={ws.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/chat`}>
                  <Card className="border-border/50 hover:border-border hover:shadow-sm transition-all cursor-pointer group h-full">
                    <CardContent className="pt-5">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-muted/80 transition-colors">
                          <span className="text-sm font-semibold text-muted-foreground">
                            {ws.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{ws.name}</p>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                              Active
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {ws.description || "No description"}
                          </p>
                          <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground/60">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Documents
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              Chats
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workspace</DialogTitle>
              <DialogDescription>
                Add a new workspace for your organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ws-name">Name</Label>
                <Input
                  id="ws-name"
                  placeholder="e.g. Engineering Docs"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ws-desc">Description</Label>
                <Textarea
                  id="ws-desc"
                  placeholder="Optional description"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  )
}
