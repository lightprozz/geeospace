"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { LmsUiScope } from "@/components/ui/lms-ui-scope";
import { Toaster } from "@/components/ui/sonner";
import { installLmsBrowserTransport } from "@/features/lms/lib/browser-transport";
import { isApiError } from "@/features/lms/lib/transport";
import { onAuthReset } from "@/stores/use-auth-store";

// The adapter is shared by all windows; it looks up credentials per request.
if (typeof window !== "undefined") installLmsBrowserTransport();

export function LmsProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (attempt, error) =>
          attempt < 1 && (!isApiError(error) || error.status >= 500),
      },
    },
  }));

  useEffect(() => {
    const unsubscribe = onAuthReset(() => {
      client.clear();
      toast.dismiss();
    });
    return () => {
      unsubscribe();
      client.clear();
    };
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      {children}
      <LmsUiScope><Toaster /></LmsUiScope>
    </QueryClientProvider>
  );
}
