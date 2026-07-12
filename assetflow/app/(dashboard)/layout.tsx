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
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-secondary/20 blur-[120px]" />
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col relative z-10">
          <Sidebar />
        </div>

        {/* Main Content Area */}
        <div className="flex w-0 flex-1 flex-col overflow-hidden relative z-10">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 bg-zinc-950/30">
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
