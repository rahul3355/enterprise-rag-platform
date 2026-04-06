import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  MessageSquare,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  LayoutDashboard,
  Upload,
  FolderKanban,
  Settings,
  LogOut,
} from "lucide-react"
import type { ChatSession, Workspace } from "@/lib/api"
import { useAppStore } from "@/stores/app-store"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"

interface ChatSidebarProps {
  sessions: ChatSession[]
  workspaces: Workspace[]
  selectedSession: string | null
  onSelectSession: (sessionId: string) => void
  onNewChat: () => void
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
  const monthAgo = new Date(today)
  monthAgo.setDate(monthAgo.getDate() - 30)

  if (date >= today) return "Today"
  if (date >= yesterday) return "Yesterday"
  if (date >= weekAgo) return "This Week"
  if (date >= monthAgo) return "This Month"
  return "Older"
}

function groupSessionsByDate(sessions: ChatSession[]): Record<string, ChatSession[]> {
  const groups: Record<string, ChatSession[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    "This Month": [],
    Older: [],
  }
  for (const session of sessions) {
    const group = getDateGroup(session.updated_at || session.created_at)
    groups[group].push(session)
  }
  return groups
}

export function ChatSidebar({
  sessions,
  workspaces,
  selectedSession,
  onSelectSession,
  onNewChat,
  loading,
}: ChatSidebarProps) {
  const { sidebarCollapsed, setSidebarCollapsed, selectedWorkspace, setSelectedWorkspace } = useAppStore()
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Today: true,
    Yesterday: true,
    "This Week": true,
    "This Month": true,
    Older: false,
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }))
  }

  const groups = groupSessionsByDate(sessions)

  const filteredGroups = searchQuery
    ? Object.fromEntries(
        Object.entries(groups).map(([key, items]) => [
          key,
          items.filter((s) => {
            const firstMsg = s.messages.find((m) => m.role === "user")
            return firstMsg?.content.toLowerCase().includes(searchQuery.toLowerCase())
          }),
        ])
      )
    : groups

  const currentWorkspace = workspaces.find((w) => w.id === selectedWorkspace)
  const wsInitial = currentWorkspace?.name?.charAt(0).toUpperCase() || "W"
  const userName = user?.email?.split("@")[0] || "User"
  const userInitials = user?.email?.substring(0, 2).toUpperCase() || "U"

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/upload", label: "Upload", icon: Upload },
    { href: "/workspaces", label: "Workspaces", icon: FolderKanban },
    { href: "/settings", label: "Settings", icon: Settings },
  ]

  function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) {
    const isActive = pathname === href
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all",
          isActive
            ? "bg-sidebar-accent text-sidebar-foreground font-medium"
            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
    )
  }

  if (sidebarCollapsed) {
    return (
      <div className="hidden md:flex flex-col w-14 border-r bg-sidebar shrink-0">
        <div className="flex flex-col items-center py-3 gap-1">
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center gap-1 py-2">
          <button
            onClick={onNewChat}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            title="New chat"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            title="Search chats"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-1 py-2 border-t border-sidebar-border">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              title={item.label}
            >
              <item.icon className="h-4 w-4" />
            </Link>
          ))}
        </div>

        <div className="p-2 border-t border-sidebar-border">
          <button
            onClick={() => {
              const idx = workspaces.findIndex((w) => w.id === selectedWorkspace)
              const next = workspaces[(idx + 1) % workspaces.length]
              if (next) setSelectedWorkspace(next.id)
            }}
            className="w-full flex items-center justify-center"
            title={currentWorkspace?.name || "Switch workspace"}
          >
            <Avatar size="sm">
              <AvatarFallback className="text-[10px] bg-sidebar-accent text-sidebar-foreground">
                {wsInitial}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="hidden md:flex flex-col w-64 border-r bg-sidebar shrink-0">
      <div className="flex items-center gap-2 px-3 h-12 border-b border-sidebar-border">
        <button
          onClick={() => {
            const idx = workspaces.findIndex((w) => w.id === selectedWorkspace)
            const next = workspaces[(idx + 1) % workspaces.length]
            if (next) setSelectedWorkspace(next.id)
          }}
          className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-left"
          title="Switch workspace"
        >
          <Avatar size="sm">
            <AvatarFallback className="text-[10px] bg-sidebar-accent text-sidebar-foreground">
              {wsInitial}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate text-sidebar-foreground">
            {currentWorkspace?.name || "Select workspace"}
          </span>
        </button>
        <button
          onClick={() => setSidebarCollapsed(true)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors shrink-0"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-3 py-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
      </div>

      {searchOpen && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-sidebar-border bg-background text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="px-3 py-1 space-y-3">
          {loading ? (
            <div className="space-y-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-sidebar-accent/50 rounded-md animate-pulse" />
              ))}
            </div>
          ) : (
            Object.entries(filteredGroups).map(
              ([groupName, groupSessions]) => {
                if (groupSessions.length === 0) return null
                const isExpanded = expandedGroups[groupName]

                return (
                  <div key={groupName}>
                    <button
                      onClick={() => toggleGroup(groupName)}
                      className="flex items-center gap-1 w-full text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1 px-1 py-1 hover:text-foreground transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      {groupName}
                      <span className="ml-auto text-muted-foreground/50 normal-case font-normal">
                        {groupSessions.length}
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-0.5 overflow-hidden"
                        >
                          {groupSessions.map((session) => {
                            const firstUserMsg = session.messages.find(
                              (m) => m.role === "user"
                            )
                            const title = firstUserMsg?.content || "Empty chat"
                            const isSelected = selectedSession === session.session_id

                            return (
                              <button
                                key={session.session_id}
                                onClick={() => onSelectSession(session.session_id)}
                                className={cn(
                                  "group w-full text-left px-2 py-1.5 rounded-lg text-sm truncate transition-all flex items-center gap-2",
                                  isSelected
                                    ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                                )}
                              >
                                <Sparkles className="h-3 w-3 shrink-0 opacity-40 group-hover:opacity-70 transition-opacity" />
                                <span className="truncate">{title}</span>
                              </button>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              }
            )
          )}

          {!loading && sessions.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No chats yet</p>
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                Start a new conversation
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-sidebar-border">
        <div className="px-3 py-2 space-y-0.5">
          {navItems.map((item) => (
            <NavItem key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </div>
      </div>

      <div className="px-3 py-2 border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-2">
          <Avatar size="sm">
            <AvatarFallback className="text-[10px]">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{userName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors shrink-0"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
