import { mockRequests } from "@/lib/mock-data";
import { Inbox, CheckCircle } from "lucide-react";
import { ProcessRequestButton } from "@/components/directory/process-request-button";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AccessRequestsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const requests = mockRequests.filter(r => r.status === "PENDING");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center">
            <Inbox className="mr-3 h-8 w-8 text-primary" />
            Access Requests
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and approve pending requests to join AssetFlow.
          </p>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="glass-card rounded-xl border border-white/5 p-12 text-center flex flex-col items-center">
          <CheckCircle className="h-12 w-12 text-emerald-500 mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-white mb-2">You're all caught up!</h3>
          <p className="text-muted-foreground">There are no pending access requests at this time.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <div key={req.id} className="glass-card rounded-xl border border-white/5 p-6 flex flex-col md:flex-row gap-6 md:items-center justify-between">
              
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">{req.name}</h3>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                    PENDING
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-muted-foreground">
                  <div><strong className="text-zinc-300">Email:</strong> {req.email}</div>
                  <div><strong className="text-zinc-300">Department:</strong> {req.department}</div>
                  <div className="sm:col-span-2 mt-2">
                    <strong className="text-zinc-300 block mb-1">Reason for Access:</strong>
                    <div className="bg-background/50 p-3 rounded-md border border-white/5">
                      {req.reason}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-zinc-500 mt-2">
                  Requested on {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString()}
                </div>
              </div>

              <div className="flex md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 justify-center">
                <ProcessRequestButton requestId={req.id} action="APPROVE" />
                <ProcessRequestButton requestId={req.id} action="REJECT" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
