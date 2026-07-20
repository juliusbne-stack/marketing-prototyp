"use client";

import { DashboardSidebar } from "./DashboardSidebar";
import { PrototypeBanner } from "./PrototypeBanner";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <PrototypeBanner />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
