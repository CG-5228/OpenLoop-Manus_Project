import { notFound } from "next/navigation";

/**
 * Developer tool pages (/dev/*) are for local testing only. They are hidden in
 * production builds unless NEXT_PUBLIC_OPENLOOP_DEV_TOOLS=1, the same rule
 * /dev/commitments already used, so the public demo exposes only the product.
 */
export default function DevToolsLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_OPENLOOP_DEV_TOOLS !== "1") {
    notFound();
  }
  return children;
}
