import { mockBookings, mockAssets } from "@/lib/mock-data";
import { BookAssetModal } from "@/components/bookings/book-asset-modal";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarClock, Search, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

export default async function BookingsPage() {
  // Use mock data for UI testing
  const bookings = mockBookings;
  const bookableAssets = mockAssets.filter(a => a.status === "AVAILABLE" || a.status === "ALLOCATED");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center">
            <CalendarClock className="mr-3 h-8 w-8 text-emerald-500" />
            Resource Bookings
          </h1>
          <p className="text-muted-foreground mt-1">
            Schedule conference rooms, projectors, and other bookable assets.
          </p>
        </div>
        <div>
          <BookAssetModal assets={bookableAssets} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search bookings by asset or person..."
            className="pl-9 bg-background/50 border-white/10 focus-visible:ring-emerald-500/50"
          />
        </div>
      </div>

      {/* Glassmorphic Table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <Table>
          <TableHeader className="bg-black/20">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="font-semibold text-zinc-300">Asset</TableHead>
              <TableHead className="font-semibold text-zinc-300">Booked By</TableHead>
              <TableHead className="font-semibold text-zinc-300">Start Time</TableHead>
              <TableHead className="font-semibold text-zinc-300">End Time</TableHead>
              <TableHead className="font-semibold text-zinc-300">Status</TableHead>
              <TableHead className="font-semibold text-zinc-300 hidden md:table-cell text-right">Purpose</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.length === 0 ? (
              <TableRow className="border-white/5">
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                    No bookings found.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow key={booking.id} className="border-white/5 hover:bg-white/5 cursor-pointer transition-colors">
                  <TableCell className="font-medium text-white">
                    {booking.asset.assetTag} - {booking.asset.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{booking.employee.name}</TableCell>
                  <TableCell className="text-zinc-300">
                    {new Date(booking.startTime).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    {new Date(booking.endTime).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      booking.status === "UPCOMING" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                      booking.status === "ONGOING" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                      booking.status === "CANCELLED" ? "bg-destructive/10 text-destructive border-destructive/20" :
                      "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                    }>
                      {booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell text-right italic">
                    {booking.purpose || "-"}
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
