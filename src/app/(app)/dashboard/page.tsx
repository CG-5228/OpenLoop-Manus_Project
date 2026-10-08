import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardSkeleton, DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[1180px] px-4 pt-5 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10">
          <div className="skeleton h-12 w-64" />
          <div className="mt-9">
            <DashboardSkeleton />
          </div>
        </div>
      }
    >
      <DashboardView />
    </Suspense>
  );
}
