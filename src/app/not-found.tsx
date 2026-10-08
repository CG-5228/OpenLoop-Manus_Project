import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/ui/routes";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Link href={ROUTES.home} aria-label="OpenLoop home">
        <Logo />
      </Link>
      <p className="mt-10 font-mono text-xs uppercase tracking-[0.14em] text-ink-3">404</p>
      <h1 className="mt-3 font-display text-[44px] leading-tight tracking-[-0.015em] text-ink">
        This loop leads nowhere.
      </h1>
      <p className="mt-2 max-w-md text-[15px] text-ink-2">
        The page you&apos;re looking for doesn&apos;t exist or isn&apos;t available yet.
      </p>
      <div className="mt-7 flex gap-2">
        <Button asChild variant="primary">
          <Link href={ROUTES.dashboard}>Open dashboard</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={ROUTES.home}>Home</Link>
        </Button>
      </div>
    </div>
  );
}
