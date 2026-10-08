import type { Metadata } from "next";
import { CommitmentTestPlayground } from "../../../components/import/CommitmentTestPlayground";

export const metadata: Metadata = {
  title: "OpenLoop | Live commitment test",
  robots: { index: false, follow: false },
};

export default function CommitmentTestPage() {
  return <CommitmentTestPlayground />;
}
