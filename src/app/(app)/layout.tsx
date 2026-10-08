import { Toaster } from "sonner";
import { DashboardDataProvider } from "@/components/providers/dashboard-data-provider";
import { AppShell } from "@/components/app-shell/app-shell";

/**
 * Layout for the signed-in app area (dashboard, commitment details).
 * Pages in this group (dashboard, import, commitment details) inherit
 * this shell and the shared DashboardDataProvider.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardDataProvider>
      <AppShell>{children}</AppShell>
      <Toaster
        position="bottom-right"
        offset={20}
        toastOptions={{
          classNames: {
            toast:
              "!rounded-xl !border !border-line !bg-surface !text-ink !shadow-pop !font-sans !gap-2",
            title: "!text-[13px] !font-semibold",
            description: "!text-[12px] !text-ink-2",
            actionButton: "!bg-ink !text-ink-inverse !rounded-md !text-xs !font-medium",
          },
        }}
      />
    </DashboardDataProvider>
  );
}
