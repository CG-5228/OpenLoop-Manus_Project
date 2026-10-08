"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/ui/routes";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-16 sm:px-6">
      <ErrorState
        title="This view hit a problem"
        description="Something unexpected happened while rendering. Your commitments haven't been changed."
        onRetry={retry}
      />
      <div className="mt-4 text-center">
        <Button asChild variant="ghost" size="sm">
          <Link href={ROUTES.dashboard}>Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
