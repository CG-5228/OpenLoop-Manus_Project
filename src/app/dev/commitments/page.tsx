/**
 * /dev/commitments — Module D (Commitment Management) TEST HARNESS.
 *
 * Internal developer tool for exercising storage, status actions, deadline
 * editing, completion suggestions and follow-ups with SYNTHETIC data.
 * Not part of the product UI (Module A owns the dashboard).
 *
 * Disabled in production builds unless NEXT_PUBLIC_OPENLOOP_DEV_TOOLS=1.
 * PLACEHOLDER: remove or keep disabled before final submission.
 */

import { notFound } from "next/navigation";
import CommitmentsHarness from "./CommitmentsHarness";

export const metadata = {
  title: "Commitments test harness · OpenLoop (dev)",
  robots: { index: false, follow: false },
};

export default function Page() {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_OPENLOOP_DEV_TOOLS !== "1") {
    notFound();
  }
  return <CommitmentsHarness />;
}
