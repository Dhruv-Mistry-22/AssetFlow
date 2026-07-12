"use client";

import { useSession } from "next-auth/react";
import { StateProvider } from "../../context/StateContext";
import AssetFlowApp from "../../components/AssetFlowApp";

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <StateProvider>
      <AssetFlowApp />
    </StateProvider>
  );
}
