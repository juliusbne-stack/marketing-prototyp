"use client";

import { DialogProvider } from "@/components/ui/DialogProvider";
import { PrototypeNoticeProvider } from "@/components/dashboard/PrototypeNoticeProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <DialogProvider>
      <PrototypeNoticeProvider>{children}</PrototypeNoticeProvider>
    </DialogProvider>
  );
}
