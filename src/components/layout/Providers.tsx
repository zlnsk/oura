"use client";

import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { OuraDataProvider } from "@/components/layout/OuraDataProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { ServiceWorkerRegistrar } from "@/components/ui/ServiceWorkerRegistrar";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <OuraDataProvider>
          <ServiceWorkerRegistrar />
          {children}
        </OuraDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
