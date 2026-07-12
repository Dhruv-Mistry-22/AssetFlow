"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function GlobalSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      router.push(`/dashboard/assets?q=${encodeURIComponent(value)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative hidden md:flex items-center">
      <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search assets globally..."
        className="w-64 pl-9 bg-background/50 border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 h-9 transition-all focus:w-80"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </form>
  );
}
