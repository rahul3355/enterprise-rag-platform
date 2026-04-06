"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Workspace } from "@/lib/api"

interface WorkspaceSelectorProps {
  workspaces: Workspace[]
  selectedWorkspace: string
  onSelect: (workspaceId: string) => void
}

export function WorkspaceSelector({
  workspaces,
  selectedWorkspace,
  onSelect,
}: WorkspaceSelectorProps) {
  if (workspaces.length === 0) {
    return null
  }

  return (
    <Select value={selectedWorkspace} onValueChange={(v) => v && onSelect(v)}>
      <SelectTrigger className="w-[200px] h-8 text-xs">
        <SelectValue placeholder="Select workspace" />
      </SelectTrigger>
      <SelectContent>
        {workspaces.map((ws) => (
          <SelectItem key={ws.id} value={ws.id} className="text-sm">
            {ws.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
