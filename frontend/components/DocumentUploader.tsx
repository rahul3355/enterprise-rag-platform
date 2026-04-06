"use client"

import { useState, useRef, useCallback } from "react"
import { uploadDocument } from "@/lib/api"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload as UploadIcon, FileText, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface UploadFile {
  file: File
  id: string
  status: "uploading" | "processing" | "ready" | "failed"
  progress: number
  error?: string
}

interface DocumentUploaderProps {
  token: string
  workspaceId: string
  onUploadComplete: () => void
}

export function DocumentUploader({ token, workspaceId, onUploadComplete }: DocumentUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (!token) {
        toast.error("Please log in first")
        return
      }
      if (!workspaceId) {
        toast.error("No workspace selected. Please create or select a workspace first.")
        return
      }

      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
        "text/csv",
      ]
      const allowedExtensions = [".pdf", ".docx", ".pptx", ".txt", ".csv"]

      const newFiles: UploadFile[] = []

      for (const file of Array.from(fileList)) {
        const ext = "." + file.name.split(".").pop()?.toLowerCase()
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
          toast.error(`${file.name} is not a supported file type`)
          continue
        }

        const uploadFile: UploadFile = {
          file,
          id: crypto.randomUUID(),
          status: "uploading",
          progress: 0,
        }
        newFiles.push(uploadFile)
      }

      if (newFiles.length === 0) return

      setFiles((prev) => [...prev, ...newFiles])

      for (const uf of newFiles) {
        try {
          setFiles((prev) =>
            prev.map((f) => (f.id === uf.id ? { ...f, progress: 50 } : f))
          )

          const result = await uploadDocument(token, uf.file, workspaceId)

          setFiles((prev) =>
            prev.map((f) =>
              f.id === uf.id ? { ...f, status: result.status as "ready" | "failed", progress: 100 } : f
            )
          )
          if (result.status === "ready") {
            toast.success(`${uf.file.name} uploaded successfully`)
          } else {
            toast.error(`Processing failed for ${uf.file.name}`)
          }
        } catch (err) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uf.id
                ? {
                    ...f,
                    status: "failed" as const,
                    error: err instanceof Error ? err.message : "Upload failed",
                  }
                : f
            )
          )
          toast.error(`Failed to upload ${uf.file.name}`)
        }
      }

      onUploadComplete()
    },
    [token, workspaceId, onUploadComplete]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
      e.target.value = ""
    }
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const handleRetry = async (fileId: string) => {
    const fileToRetry = files.find(f => f.id === fileId)
    if (!fileToRetry || !workspaceId || !token) return

    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, status: "uploading" as const, progress: 0, error: undefined } : f
    ))

    try {
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: 50 } : f))
      const result = await uploadDocument(token, fileToRetry.file, workspaceId)
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: result.status as "ready" | "failed", progress: 100 } : f))
      if (result.status === "ready") {
        toast.success(`${fileToRetry.file.name} uploaded successfully`)
      } else {
        toast.error(`Processing failed for ${fileToRetry.file.name}`)
      }
      onUploadComplete()
    } catch (err) {
      setFiles(prev => prev.map(f =>
        f.id === fileId
          ? { ...f, status: "failed" as const, error: err instanceof Error ? err.message : "Upload failed" }
          : f
      ))
      toast.error(`Failed to upload ${fileToRetry.file.name}`)
    }
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
      case "ready":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "uploading":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/20 text-[10px] px-1.5 py-0 h-5">Uploading</Badge>
      case "processing":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-500/20 dark:text-yellow-400 dark:hover:bg-yellow-500/20 text-[10px] px-1.5 py-0 h-5">Processing</Badge>
      case "ready":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-500/20 dark:text-green-400 dark:hover:bg-green-500/20 text-[10px] px-1.5 py-0 h-5">Ready</Badge>
      case "failed":
        return <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">Failed</Badge>
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">{status}</Badge>
    }
  }

  const noWorkspaceSelected = !workspaceId

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !noWorkspaceSelected && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          noWorkspaceSelected
            ? "border-border bg-muted/20 cursor-not-allowed opacity-50"
            : dragging
              ? "border-primary bg-primary/5 cursor-pointer scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.pptx,.txt,.csv"
          onChange={handleInputChange}
          className="hidden"
          disabled={noWorkspaceSelected}
        />
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
          <UploadIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        {noWorkspaceSelected ? (
          <p className="text-sm font-medium text-muted-foreground">
            Select a workspace to upload documents
          </p>
        ) : (
          <>
            <p className="text-sm font-medium">
              Drag & drop files here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, DOCX, PPTX, TXT, CSV
            </p>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
            >
              {statusIcon(f.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{f.file.name}</p>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    {statusBadge(f.status)}
                    {f.status === "failed" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRetry(f.id)
                        }}
                        className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(f.id)
                      }}
                      className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {f.status === "uploading" && (
                  <Progress value={f.progress} className="mt-2 h-1" />
                )}
                {f.error && (
                  <p className="text-xs text-destructive mt-1">{f.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
