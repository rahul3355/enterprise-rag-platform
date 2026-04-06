"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { useAuth } from "@/contexts/auth-context"
import { createClient } from "@/lib/supabase"
import { DashboardShell } from "@/components/DashboardShell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User, Lock, Bell, Palette, Monitor, Moon, Sun } from "lucide-react"
import { toast } from "sonner"

export default function SettingsPage() {
  const { user, userInfo } = useAuth()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    emailDigest: false,
    uploadComplete: true,
    processingComplete: true,
  })

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success("Password updated successfully")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      toast.error("Failed to update password")
    } finally {
      setChangingPassword(false)
    }
  }

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "U"

  function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
      <button
        onClick={onChange}
        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
          checked ? "bg-primary" : "bg-muted"
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "left-4" : "left-0.5"
          }`}
        />
      </button>
    )
  }

  return (
    <DashboardShell workspaces={[]}>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your account and preferences
          </p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="mb-4">
            <TabsTrigger value="profile" className="gap-1.5">
              <User className="h-3.5 w-3.5" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="password" className="gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Password
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Profile</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar size="lg">
                    <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user?.email?.split("@")[0] || "User"}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user?.email || ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input value={userInfo?.role || "user"} disabled />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="new-pass">New Password</Label>
                  <Input
                    id="new-pass"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-pass">Confirm Password</Label>
                  <Input
                    id="confirm-pass"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                  />
                </div>
                <Button onClick={handlePasswordChange} disabled={changingPassword}>
                  {changingPassword ? "Updating..." : "Update Password"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Appearance</CardTitle>
                <CardDescription>Customize the look and feel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        theme === "light"
                          ? "border-primary bg-muted/50"
                          : "border-border hover:border-border/80"
                      }`}
                    >
                      <Sun className="h-5 w-5" />
                      <span className="text-xs font-medium">Light</span>
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        theme === "dark"
                          ? "border-primary bg-muted/50"
                          : "border-border hover:border-border/80"
                      }`}
                    >
                      <Moon className="h-5 w-5" />
                      <span className="text-xs font-medium">Dark</span>
                    </button>
                    <button
                      onClick={() => setTheme("system")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        theme === "system"
                          ? "border-primary bg-muted/50"
                          : "border-border hover:border-border/80"
                      }`}
                    >
                      <Monitor className="h-5 w-5" />
                      <span className="text-xs font-medium">System</span>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Notifications</CardTitle>
                <CardDescription>Choose what notifications you receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    key: "emailUpdates" as const,
                    title: "Email Updates",
                    desc: "Receive updates about platform changes",
                  },
                  {
                    key: "emailDigest" as const,
                    title: "Weekly Digest",
                    desc: "Receive a weekly summary of activity",
                  },
                  {
                    key: "uploadComplete" as const,
                    title: "Upload Complete",
                    desc: "Get notified when document uploads finish",
                  },
                  {
                    key: "processingComplete" as const,
                    title: "Processing Complete",
                    desc: "Get notified when document processing finishes",
                  },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Toggle
                      checked={notifications[item.key]}
                      onChange={() =>
                        setNotifications((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key],
                        }))
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  )
}
