"use client"

import { useState } from "react"
import type { ChatSession } from "@/lib/api"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, ChevronDown, ChevronRight } from "lucide-react"

interface ChatHistorySidebarProps {
  sessions: ChatSession[]
  selectedSession: string | null
  onSelectSession: (sessionId: string) => void
  loading: boolean
}

function getDateGroup(dateStr: string | null): string {
  if (!dateStr) return "Older"
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  if (date >= today) return "Today"
  if (date >= yesterday) return "Yesterday"
  if (date >= weekAgo) return "This Week"
  return "Older"
}

function groupSessionsByDate(sessions: ChatSession[]): Record<string, ChatSession[]> {
  const groups: Record<string, ChatSession[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Older: [],
  }

  for (const session of sessions) {
    const group = getDateGroup(session.updated_at || session.created_at)
    groups[group].push(session)
  }

  return groups
}

export function ChatHistorySidebar({
  sessions,
  selectedSession,
  onSelectSession,
  loading,
}: ChatHistorySidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Today: true,
    Yesterday: true,
    "This Week": true,
    Older: true,
  })

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }))
  }

  const groups = groupSessionsByDate(sessions)

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {Object.entries(groups).map(([groupName, groupSessions]) => {
          if (groupSessions.length === 0) return null
          const isExpanded = expandedGroups[groupName]

          return (
            <div key={groupName}>
              <button
                onClick={() => toggleGroup(groupName)}
                className="flex items-center gap-1 w-full text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1 py-1 hover:text-foreground transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                {groupName}
                <span className="ml-auto text-muted-foreground/60 normal-case">
                  {groupSessions.length}
                </span>
              </button>
              {isExpanded && (
                <div className="space-y-0.5">
                  {groupSessions.map((session) => {
                    const firstUserMsg = session.messages.find(
                      (m) => m.role === "user"
                    )
                    const title =
                      firstUserMsg?.content || "Empty chat"
                    const isSelected = selectedSession === session.session_id

                    return (
                      <button
                        key={session.session_id}
                        onClick={() => onSelectSession(session.session_id)}
                        className={`w-full text-left px-2 py-1.5 rounded-md text-sm truncate transition-colors ${
                          isSelected
                            ? "bg-muted font-medium"
                            : "hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3 w-3 shrink-0" />
                          <span className="truncate">{title}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {loading && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Loading...
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No chat history</p>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
