import { db } from "@/lib/db";
import { RequireRole } from "@/components/auth/require-role";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Organization Setup",
};

export default async function OrganizationSetupPage() {
  const [users, departments, categories] = await Promise.all([
    db.user.findMany({ orderBy: { name: "asc" } }),
    db.department.findMany({ orderBy: { name: "asc" } }),
    db.assetCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <RequireRole
      roles={["ADMIN"]}
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-2">
          <h2 className="text-xl font-semibold">Access denied</h2>
          <p className="text-sm text-muted-foreground">
            You do not have permission to view organization settings.
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organization setup</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage employees, departments, and asset categories.
          </p>
        </div>

        <Tabs defaultValue="employees" className="space-y-4">
          <TabsList>
            <TabsTrigger value="employees">Employee directory</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          {/* EMPLOYEES TAB */}
          <TabsContent value="employees" className="space-y-4">
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <p className="font-medium">No employees found</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          No users are registered in the system yet.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>{user.department || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            className={
                              user.status === "ACTIVE" 
                                ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" 
                                : ""
                            }
                          >
                            {user.status.charAt(0) + user.status.slice(1).toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Edit role</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* DEPARTMENTS TAB */}
          <TabsContent value="departments" className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm">Add department</Button>
            </div>
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center">
                        <p className="font-medium">No departments found</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Create a department to organize your users and assets.
                        </p>
                        <Button variant="outline" size="sm" className="mt-4">
                          Create department
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    departments.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">{dept.name}</TableCell>
                        <TableCell className="text-muted-foreground">{dept.description || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{dept.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* CATEGORIES TAB */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm">Add category</Button>
            </div>
            <div className="rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-32 text-center">
                        <p className="font-medium">No categories found</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Asset categories help you classify and filter assets.
                        </p>
                        <Button variant="outline" size="sm" className="mt-4">
                          Create category
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell className="text-muted-foreground">{cat.description || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Edit</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </RequireRole>
  );
}
