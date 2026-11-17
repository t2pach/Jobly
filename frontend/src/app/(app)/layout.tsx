"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, authed } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready && !authed) router.replace(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
  }, [ready, authed, router]);

  if (!ready || !authed)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  return <AppShell>{children}</AppShell>;
}
