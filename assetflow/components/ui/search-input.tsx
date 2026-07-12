"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useState, useEffect } from "react";

export function SearchInput({ placeholder = "Search..." }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(searchParams?.get("q") || "");

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      if (value) {
        params.set("q", value);
      } else {
        params.delete("q");
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }, 300); // 300ms debounce
    return () => clearTimeout(timer);
  }, [value, pathname, router, searchParams]);

  return (
    <div className="relative flex-1 max-w-md">
      <Search className={`absolute left-2.5 top-2.5 h-4 w-4 ${isPending ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
      <Input
        type="search"
        placeholder={placeholder}
        className="pl-9 bg-background/50 border-white/10 focus-visible:ring-primary/50"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
