"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProcessRequestButton({ requestId, action }: { requestId: string, action: "APPROVE" | "REJECT" }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleProcess = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/access-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to process request");
      }

      toast.success(`Request ${action === "APPROVE" ? "Approved" : "Rejected"}`, {
        description: action === "APPROVE" ? "User account has been created." : "Access request has been discarded.",
      });
      
      router.refresh();
    } catch (error: any) {
      toast.error("Process Failed", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isApprove = action === "APPROVE";

  return (
    <Button 
      variant={isApprove ? "default" : "destructive"} 
      size="sm" 
      onClick={handleProcess} 
      disabled={isLoading}
      className={isApprove ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-destructive/10 text-destructive hover:bg-destructive/20"}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isApprove ? (
        <Check className="h-4 w-4 mr-1" />
      ) : (
        <X className="h-4 w-4 mr-1" />
      )}
      {isApprove ? "Approve" : "Reject"}
    </Button>
  );
}
