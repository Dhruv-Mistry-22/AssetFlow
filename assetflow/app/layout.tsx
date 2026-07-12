import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "AssetFlow | Enterprise Asset Management",
  description: "Dynamic and seamless asset lifecycle and booking management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased overflow-x-hidden selection:bg-primary/30">
        {/* We can place our Sidebar/Navbar layout wrappers here later */}
        {children}
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}
