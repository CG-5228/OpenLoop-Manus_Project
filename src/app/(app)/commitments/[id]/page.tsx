import type { Metadata } from "next";
import { Suspense } from "react";
import { CommitmentDetail } from "@/components/commitment/commitment-detail";

export const metadata: Metadata = { title: "Commitment" };

export default function CommitmentPage({ params }: PageProps<"/commitments/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[1080px] px-4 pt-5 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton mt-8 h-11 w-3/4" />
        </div>
      }
    >
      {params.then(({ id }) => (
        <CommitmentDetail id={decodeURIComponent(id)} />
      ))}
    </Suspense>
  );
}
