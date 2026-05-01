"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { AppBootstrap } from "@/components/system/AppBootstrap";
import { SettingsProvider } from "@/context/SettingsContext";

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 1000 * 60 * 5,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <AppBootstrap />
        {children}
        <Toaster richColors closeButton position="top-right" theme="dark" />
      </SettingsProvider>
    </QueryClientProvider>
  );
}
