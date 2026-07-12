import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Providers } from "@/components/providers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col border-r border-border bg-card">
          <Sidebar />
        </div>

        {/* Main Content Area */}
        <div className="flex w-0 flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 bg-muted/30">
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
