"use client";

import { DialogProvider } from "@/components/ui/DialogProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <DialogProvider>{children}</DialogProvider>;
}
