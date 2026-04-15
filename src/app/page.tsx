"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[var(--bg-primary)]">
      <div className="m3-progress-morph" role="progressbar" aria-label="Loading Oura dashboard" aria-live="polite" />
    </div>
  );
}
