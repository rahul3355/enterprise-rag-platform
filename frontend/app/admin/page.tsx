"use client"

import { useAuth } from "@/contexts/auth-context"
import { DashboardShell } from "@/components/DashboardShell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Shield, Users, FolderKanban, Palette } from "lucide-react"

export default function AdminPage() {
  const { userInfo } = useAuth()

  const isAdmin = userInfo?.role === "admin" || userInfo?.role === "super_admin"

  if (!isAdmin) {
    return (
      <DashboardShell workspaces={[]}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
            <p className="text-muted-foreground">
              You do not have permission to access the admin panel.
            </p>
          </div>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell workspaces={[]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Admin Panel</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage tenant settings, users, and workspaces
          </p>
        </div>

        <Tabs defaultValue="tenant">
          <TabsList>
            <TabsTrigger value="tenant">
              <Shield className="mr-2 h-4 w-4" />
              Tenant Settings
            </TabsTrigger>
            <TabsTrigger value="branding">
              <Palette className="mr-2 h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="workspaces">
              <FolderKanban className="mr-2 h-4 w-4" />
              Workspaces
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tenant" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Tenant Configuration</CardTitle>
                <CardDescription>
                  Manage your organization settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tenant ID</Label>
                  <Input value={userInfo?.tenant_id || ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input
                    defaultValue={process.env.NEXT_PUBLIC_CLIENT_NAME || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <Input
                    defaultValue={process.env.NEXT_PUBLIC_PRIMARY_COLOR || "#1a56db"}
                    type="color"
                    className="h-10 w-24"
                  />
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Branding Settings</CardTitle>
                <CardDescription>
                  Customize the look and feel of your platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Platform Name</Label>
                  <Input
                    defaultValue={process.env.NEXT_PUBLIC_CLIENT_NAME || ""}
                    placeholder="Your platform name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input placeholder="https://example.com/logo.png" />
                </div>
                <div className="space-y-2">
                  <Label>Favicon URL</Label>
                  <Input placeholder="https://example.com/favicon.ico" />
                </div>
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      defaultValue={process.env.NEXT_PUBLIC_PRIMARY_COLOR || "#1a56db"}
                      type="color"
                      className="h-10 w-24"
                    />
                    <Input
                      defaultValue={process.env.NEXT_PUBLIC_PRIMARY_COLOR || "#1a56db"}
                      className="flex-1"
                    />
                  </div>
                </div>
                <Button>Save Branding</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  View and manage users in your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">
                        {userInfo?.email || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge>{userInfo?.role || "user"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          Active
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workspaces" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Workspace Management</CardTitle>
                <CardDescription>
                  View all workspaces in your tenant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FolderKanban className="mx-auto h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">
                    Manage workspaces from the Workspaces page
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  )
}
