/**
 * Central route map for navigation.
 *
 * `/import` is the page frame owned by Member 1; Member 2's ConversationImporter
 * mounts inside it (see components/import-flow/importer-slot.tsx).
 */
import type { StatusFilter, ViewKey } from "@/lib/ui/commitment-view";

export const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  import: "/import",
  commitment: (id: string) => `/commitments/${encodeURIComponent(id)}`,
} as const;

export function dashboardHref(
  params: { view?: ViewKey; status?: StatusFilter; q?: string } = {},
) {
  const sp = new URLSearchParams();
  if (params.view && params.view !== "overview") sp.set("view", params.view);
  if (params.status && params.status !== "open") sp.set("status", params.status);
  if (params.q) sp.set("q", params.q);
  const qs = sp.toString();
  return qs ? `${ROUTES.dashboard}?${qs}` : ROUTES.dashboard;
}
