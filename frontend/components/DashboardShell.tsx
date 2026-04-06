"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  LayoutDashboard,
  FolderKanban,
  Upload,
  MessageSquare,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
} from "lucide-react"

export interface WorkspaceBrief {
  id: string
  name: string
}

interface DashboardShellProps {
  children: React.ReactNode
  workspaces?: WorkspaceBrief[]
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, requiresWorkspace: false },
  { href: "/workspaces", label: "Workspaces", icon: FolderKanban, requiresWorkspace: false },
  { href: "/upload", label: "Upload", icon: Upload, requiresWorkspace: true },
  { href: "/chat", label: "Chat", icon: MessageSquare, requiresWorkspace: true },
  { href: "/settings", label: "Settings", icon: Settings, requiresWorkspace: false },
  { href: "/admin", label: "Admin", icon: Shield, requiresWorkspace: false },
]

function NavItem({ item, isActive, onClick }: {
  item: typeof navItems[number]
  isActive: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-all ${
        isActive
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { user, signOut, loading } = useAuth()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "U"

  const sidebarContent = (
    <>
      <div className="px-4 h-12 flex items-center border-b border-sidebar-border">
        <h1 className="text-sm font-semibold truncate">
          {process.env.NEXT_PUBLIC_CLIENT_NAME || "Enterprise RAG"}
        </h1>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={pathname === item.href}
          />
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-2.5 px-2">
          <Avatar size="sm">
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">
              {user?.email?.split("@")[0] || "User"}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs h-8"
          onClick={signOut}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex lg:flex-col lg:w-56 border-r bg-sidebar shrink-0">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-card border-r z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 h-12 border-b">
              <h1 className="text-sm font-semibold">
                {process.env.NEXT_PUBLIC_CLIENT_NAME || "Enterprise RAG"}
              </h1>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <nav className="flex-1 px-3 py-3 space-y-0.5">
              {navItems.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </nav>
            <div className="p-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-8"
                onClick={signOut}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b bg-card flex items-center px-4 lg:px-6 gap-4 shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex-1" />
          <Avatar size="sm">
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
