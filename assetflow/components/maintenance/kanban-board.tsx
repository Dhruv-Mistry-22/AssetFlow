"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type Ticket = any; // simplified for this component

const COLUMNS = [
  { id: "PENDING", title: "Pending" },
  { id: "APPROVED", title: "Approved" },
  { id: "IN_PROGRESS", title: "In progress" },
  { id: "COMPLETED", title: "Resolved" },
];

export function MaintenanceKanban({ 
  tickets, 
  userRole 
}: { 
  tickets: Ticket[],
  userRole: string
}) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const canApprove = ["ADMIN", "ASSET_MANAGER"].includes(userRole);

  const updateStatus = async (ticketId: string, newStatus: string) => {
    setUpdatingId(ticketId);
    try {
      const res = await fetch(`/api/maintenance/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      toast.success("Status updated", {
        description: `Ticket moved to ${newStatus.replace("_", " ").toLowerCase()}.`,
      });
      router.refresh();
    } catch (error) {
      toast.error("Update failed", {
        description: "Could not update the ticket status.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((column) => {
        const columnTickets = tickets.filter(t => t.status === column.id);
        
        return (
          <div key={column.id} className="min-w-[300px] flex-1 flex flex-col bg-muted/30 rounded-lg p-3">
            <div className="flex justify-between items-center mb-4 px-1">
              <h3 className="font-semibold text-sm">{column.title}</h3>
              <Badge variant="secondary">{columnTickets.length}</Badge>
            </div>
            
            <div className="flex-1 space-y-3">
              {columnTickets.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed border-border rounded-md">
                  No tickets
                </div>
              ) : (
                columnTickets.map(ticket => (
                  <Card key={ticket.id} className="p-4 shadow-sm flex flex-col space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono text-muted-foreground">
                        #{ticket.id.slice(-6).toUpperCase()}
                      </span>
                      <Badge variant="outline" className={
                        ticket.priority === "CRITICAL" ? "bg-destructive/10 text-destructive border-destructive/20" :
                        ticket.priority === "HIGH" ? "bg-status-maintenance/10 text-status-maintenance border-status-maintenance/20" :
                        "bg-muted text-muted-foreground"
                      }>
                        {ticket.priority.charAt(0) + ticket.priority.slice(1).toLowerCase()}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="font-medium text-sm leading-tight">
                        {ticket.asset.assetTag} - {ticket.asset.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {ticket.description}
                      </p>
                    </div>
                    
                    <div className="text-xs text-muted-foreground pt-2 border-t flex justify-between items-center">
                      <span>{ticket.requestedByUser.name}</span>
                      <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Actions based on column and role */}
                    <div className="pt-2 flex gap-2">
                      {column.id === "PENDING" && canApprove && (
                        <>
                          <Button 
                            size="sm" 
                            className="w-full text-xs" 
                            variant="default"
                            disabled={updatingId === ticket.id}
                            onClick={() => updateStatus(ticket.id, "APPROVED")}
                          >
                            {updatingId === ticket.id && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            className="w-full text-xs" 
                            variant="destructive"
                            disabled={updatingId === ticket.id}
                            onClick={() => updateStatus(ticket.id, "REJECTED")}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      
                      {column.id === "APPROVED" && (
                        <Button 
                          size="sm" 
                          className="w-full text-xs" 
                          variant="secondary"
                          disabled={updatingId === ticket.id}
                          onClick={() => updateStatus(ticket.id, "IN_PROGRESS")}
                        >
                          {updatingId === ticket.id && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                          Start work
                        </Button>
                      )}

                      {column.id === "IN_PROGRESS" && (
                        <Button 
                          size="sm" 
                          className="w-full text-xs" 
                          variant="secondary"
                          disabled={updatingId === ticket.id}
                          onClick={() => updateStatus(ticket.id, "COMPLETED")}
                        >
                          {updatingId === ticket.id && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                          Resolve
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
