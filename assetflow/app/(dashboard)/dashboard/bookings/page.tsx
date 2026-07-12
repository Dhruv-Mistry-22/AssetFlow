import { db } from "@/lib/db";
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
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";

export const metadata = {
  title: "Bookings - AssetFlow",
};

export default async function BookingsPage() {
  const bookings = await db.booking.findMany({
    include: { 
      asset: { select: { name: true, assetTag: true } },
      employee: { select: { name: true } }
    },
    orderBy: { startTime: "asc" },
  });

  const bookableAssets = await db.asset.findMany({
    where: { isBookable: true, status: "AVAILABLE" },
    select: { id: true, name: true, assetTag: true },
    orderBy: { name: "asc" },
  });

  // Fetch all upcoming bookings for the live overlap validation in the modal
  const upcomingBookings = await db.booking.findMany({
    where: { status: { in: ["UPCOMING", "ONGOING"] } },
    select: {
      assetId: true,
      startTime: true,
      endTime: true,
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Resource bookings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Schedule conference rooms, projectors, and other bookable assets.
          </p>
        </div>
        <div>
          <BookAssetModal 
            assets={bookableAssets} 
            existingBookings={upcomingBookings} 
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center space-x-2">
        <div className="w-full max-w-sm">
          <SearchInput placeholder="Search bookings by asset or person" />
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Booked by</TableHead>
              <TableHead>Start time</TableHead>
              <TableHead>End time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell text-right">Purpose</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <p className="font-medium">No bookings found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    There are no resource bookings yet. Create one to get started.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow key={booking.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    {booking.asset.assetTag} - {booking.asset.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{booking.employee.name}</TableCell>
                  <TableCell>
                    {new Date(booking.startTime).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {new Date(booking.endTime).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      booking.status === "UPCOMING" ? "bg-status-allocated/10 text-status-allocated border-status-allocated/20" :
                      booking.status === "ONGOING" ? "bg-status-available/10 text-status-available border-status-available/20" :
                      booking.status === "CANCELLED" ? "bg-status-lost/10 text-status-lost border-status-lost/20" :
                      "bg-status-retired/10 text-status-retired border-status-retired/20"
                    }>
                      {booking.status.charAt(0) + booking.status.slice(1).toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell text-right">
                    {booking.purpose || "—"}
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
