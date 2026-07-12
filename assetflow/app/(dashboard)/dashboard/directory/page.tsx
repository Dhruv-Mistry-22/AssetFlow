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
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center">
            <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-blue-500 shadow-lg shadow-blue-500/20 border border-blue-500/30">
              <Users className="h-6 w-6" />
            </div>
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
      <div className="flex items-center space-x-2 bg-black/20 p-2 rounded-xl border border-white/5">
        <SearchInput placeholder="Search users by name, email, or department..." />
      </div>

      {/* Glassmorphic Table */}
      <div className="glass-card rounded-2xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl">
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
                <TableRow key={user.id} className="border-white/5 hover:bg-white/10 hover:shadow-md hover:scale-[1.01] cursor-pointer transition-all duration-300">
                  <TableCell className="font-medium text-white">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="text-muted-foreground">{user.department || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      user.role === "ADMIN" ? "bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]" :
                        user.role === "ASSET_MANAGER" ? "bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]" :
                          user.role === "DEPARTMENT_HEAD" ? "bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.1)]" :
                            "bg-zinc-500/20 text-zinc-300 border-zinc-500/30"
                    }>
                      {user.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={
                      user.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse" :
                        "bg-destructive/20 text-red-400 border-destructive/40"
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
