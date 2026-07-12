import { db } from "@/lib/db";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Search, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AddUserModal } from "@/components/directory/add-user-modal";

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const q = params?.q || "";

  const users = await db.user.findMany({
    where: q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { department: { contains: q, mode: "insensitive" } },
      ]
    } : undefined,
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-2xl bg-zinc-900/50 border border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center">
            <Users className="mr-3 h-8 w-8 text-zinc-400" />
            Employee Directory
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users, roles, and department access.
          </p>
        </div>
        <div>
          <AddUserModal />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center space-x-2">
        <SearchInput placeholder="Search users by name, email, or department..." />
      </div>

      {/* Glassmorphic Table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <Table>
          <TableHeader className="bg-black/20">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="font-semibold text-zinc-300">Name</TableHead>
              <TableHead className="font-semibold text-zinc-300">Email</TableHead>
              <TableHead className="font-semibold text-zinc-300">Department</TableHead>
              <TableHead className="font-semibold text-zinc-300">Role</TableHead>
              <TableHead className="font-semibold text-zinc-300 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow className="border-white/5">
                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="border-white/5 hover:bg-white/5 cursor-pointer transition-colors">
                  <TableCell className="font-medium text-white">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="text-muted-foreground">{user.department || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      user.role === "ADMIN" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                        user.role === "ASSET_MANAGER" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                          user.role === "DEPARTMENT_HEAD" ? "bg-purple-500/10 text-purple-500 border-purple-500/20" :
                            "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                    }>
                      {user.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={
                      user.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                        "bg-destructive/10 text-destructive border-destructive/20"
                    }>
                      {user.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
